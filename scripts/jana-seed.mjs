// Generate seed SQL dari checklist JSON
// Guna: node scripts/jana-seed.mjs <input-json> <output-sql>

import { readFileSync, writeFileSync } from "fs";

const IN = process.argv[2];
const OUT = process.argv[3];
if (!IN || !OUT) {
  console.error("Usage: node jana-seed.mjs <input-json> <output-sql>");
  process.exit(1);
}

const { rows } = JSON.parse(readFileSync(IN, "utf8"));

// Escape single quotes for SQL
const sq = (v) => {
  if (v === null || v === undefined || v === "") return "null";
  const s = String(v).replace(/'/g, "''").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return `'${s}'`;
};

// Mapping prinsip
const PRINSIP_DATA = {
  P1: {
    nombor: 1,
    tajuk: "Komitmen Pengurusan dan Tanggungjawab",
    fokus: "Komitmen pengurusan, SOP, latihan, audit, MRM",
  },
  P2: {
    nombor: 2,
    tajuk: "Ketelusan",
    fokus: "Ketelusan, stakeholder, traceability, etika",
  },
  P3: {
    nombor: 3,
    tajuk: "Pematuhan Undang-Undang dan Hak Tanah",
    fokus: "Pematuhan undang-undang, hak guna tanah, NCR",
  },
  P4: {
    nombor: 4,
    tajuk: "Tanggungjawab Sosial, Keselamatan dan Kesihatan Pekerjaan",
    fokus: "SIA, OSH, syarat pekerjaan, perumahan",
  },
  P5: {
    nombor: 5,
    tajuk: "Alam Sekitar, Sumber Asli, Biodiversiti dan Perkhidmatan Ekosistem",
    fokus: "Alam sekitar, tenaga, sisa, GHG, air, HCV, zero burning",
  },
};

// Fail kulit keras dari Skill v2.4
const FAIL_DATA = [
  { nombor: 1, nama: "MANUAL DAN SOP LESTARI", ringkasan: "Manual Lestari dan Prosedur Lestari" },
  { nombor: 2, nama: "PENGURUSAN MSPO", ringkasan: "MRM, Audit Dalaman, Penambahbaikan, Kawalan Dokumen" },
  { nombor: 3, nama: "KETELUSAN", ringkasan: "Ketelusan, Peserta, Aduan, Kebolehjejakan" },
  { nombor: 4, nama: "PELAN PENGURUSAN", ringkasan: "KKP/Sosial, Alam Sekitar, Perniagaan" },
  { nombor: 5, nama: "PENGURUSAN PERUNDANGAN", ringkasan: "Pengawasan Undang-Undang, Tanah" },
  { nombor: 6, nama: "PENGURUSAN SOSIAL", ringkasan: "Pihak Berkepentingan, Aduan, CSR" },
  { nombor: 7, nama: "PENGURUSAN KKP", ringkasan: "Risiko KKP, Kecemasan, Bahan Kimia" },
  { nombor: 8, nama: "ALAM SEKITAR, SUMBER ASLI, BIODIVERSITI", ringkasan: "EAI, GHG, Sisa, Air, Biodiversiti" },
  { nombor: 9, nama: "PENTADBIRAN", ringkasan: "Pengurusan Harga, Kontraktor" },
  { nombor: 10, nama: "PENGURUSAN PEKERJA", ringkasan: "Senarai pekerja, kontrak, gaji, EPF/SOCSO" },
  { nombor: 11, nama: "LATIHAN PEKERJA", ringkasan: "Perancangan latihan, rekod, laporan" },
  { nombor: 12, nama: "INTEGRITI", ringkasan: "OACP, Pegawai Integriti, anti-rasuah" },
  { nombor: 13, nama: "TANAM SEMULA & PEMBANGUNAN TANAMAN BARU", ringkasan: "Blueprint, program, mesyuarat" },
];

// Kumpul kriteria unik dari item: kriteria = bahagian klausa sebelum bahagian terakhir
// contoh: 4.1.1.1 -> kriteria 4.1.1
function kodKriteriaDari(klausa) {
  const parts = String(klausa).split(".");
  if (parts.length >= 4) return parts.slice(0, 3).join(".");
  return klausa;
}

// Kumpul kriteria + tajuk dari item pertama setiap kriteria
const kriteriaMap = new Map(); // kod -> { prinsip, kod, tajuk, susunan }
const itemByKriteria = new Map(); // kodKriteria -> [items...]

// Derive prinsip dari kod klausa (4.X.Y.Z -> PX). Source Excel kadang salah label.
function prinsipDariKlausa(klausa) {
  const m = /^4\.(\d)\./.exec(String(klausa));
  if (!m) return null;
  return "P" + m[1];
}

for (const r of rows) {
  const klausa = String(r["Klausa"]).trim();
  const prinsipAsal = String(r["Prinsipal"]).trim();
  const prinsip = prinsipDariKlausa(klausa) ?? prinsipAsal;
  if (prinsipAsal && prinsip !== prinsipAsal) {
    console.warn(`[fix] ${klausa}: Excel label '${prinsipAsal}' diubah ke '${prinsip}'`);
  }
  const fokus = String(r["Fokus"] ?? "").trim();
  const tajuk = String(r["Indicator / Tajuk Klausa"] ?? "").trim();
  const buktiWajib = String(r["Dokumen / Bukti Wajib"] ?? "").trim();
  const semakanTapak = String(r["Semakan Tapak"] ?? "").trim();
  const noFail = String(r["No. Fail"] ?? "").trim();
  const namaFail = String(r["Nama Fail"] ?? "").trim();

  const kodK = kodKriteriaDari(klausa);

  if (!kriteriaMap.has(kodK)) {
    kriteriaMap.set(kodK, {
      prinsip,
      kod: kodK,
      tajuk: fokus, // guna fokus sebagai tajuk kriteria untuk sementara
      susunan: kriteriaMap.size + 1,
    });
  }

  const arr = itemByKriteria.get(kodK) ?? [];
  // Extract no fail
  const m = /Fail\s+(\d+)/i.exec(noFail);
  const failNo = m ? parseInt(m[1], 10) : null;
  arr.push({
    kod: klausa,
    tajuk,
    bukti_wajib: buktiWajib,
    semakan_tapak: semakanTapak,
    fail_rujukan: failNo,
    nama_fail: namaFail,
    susunan: arr.length + 1,
  });
  itemByKriteria.set(kodK, arr);
}

// Build SQL
let sql = "-- Seed data MSPO Audit (MS2530-2-2:2022)\n";
sql += "-- Auto-generated dari Master Checklist v6.5\n";
sql += "-- 5 Prinsip, " + kriteriaMap.size + " Kriteria, " + rows.length + " Item Semakan, 13 Fail\n\n";

// PRINSIP
sql += "-- =====================================================\n-- PRINSIP\n-- =====================================================\n\n";
sql += "insert into public.prinsip (nombor, kod, tajuk, fokus_utama, bil_klausa) values\n";
const pLines = Object.entries(PRINSIP_DATA).map(([kod, p]) => {
  const bil = [...kriteriaMap.values()].filter((k) => k.prinsip === kod).length;
  return `  (${p.nombor}, ${sq(kod)}, ${sq(p.tajuk)}, ${sq(p.fokus)}, ${bil})`;
});
sql += pLines.join(",\n") + "\non conflict (kod) do nothing;\n\n";

// FAIL KULIT KERAS
sql += "-- =====================================================\n-- FAIL KULIT KERAS\n-- =====================================================\n\n";
sql += "insert into public.fail_kulit_keras (nombor, nama, ringkasan) values\n";
sql += FAIL_DATA.map((f) => `  (${f.nombor}, ${sq(f.nama)}, ${sq(f.ringkasan)})`).join(",\n");
sql += "\non conflict (nombor) do nothing;\n\n";

// KRITERIA
sql += "-- =====================================================\n-- KRITERIA\n-- =====================================================\n\n";
sql += "insert into public.kriteria (prinsip_id, kod, tajuk, susunan)\n";
sql += "select p.id, k.kod, k.tajuk, k.susunan from public.prinsip p\njoin (values\n";
const kLines = [...kriteriaMap.values()].map((k, idx) => {
  return `  (${sq(k.prinsip)}, ${sq(k.kod)}, ${sq(k.tajuk)}, ${idx + 1})`;
});
sql += kLines.join(",\n");
sql += "\n) as k(kod_p, kod, tajuk, susunan) on p.kod = k.kod_p\non conflict (prinsip_id, kod) do nothing;\n\n";

// ITEM SEMAKAN
sql += "-- =====================================================\n-- ITEM SEMAKAN (74 item dari Master Checklist v6.5)\n-- =====================================================\n\n";
sql += "insert into public.item_semakan (kriteria_id, kod, tajuk, bukti_wajib, fail_rujukan, jenis_klausa, susunan)\n";
sql += "select k.id, i.kod, i.tajuk, i.bukti_wajib, i.fail_rujukan, i.jenis_klausa::jenis_klausa, i.susunan\n";
sql += "from public.kriteria k\njoin (values\n";

const iLines = [];
for (const [kodK, items] of itemByKriteria.entries()) {
  for (const it of items) {
    // Heuristik: sebahagian indikator polisi + dokumen wajib = major
    // Default minor untuk yang lain. Boleh diubah kemudian.
    const jenis = "minor";
    iLines.push(
      `  (${sq(kodK)}, ${sq(it.kod)}, ${sq(it.tajuk)}, ${sq(it.bukti_wajib)}, ${it.fail_rujukan ?? "null"}, ${sq(jenis)}, ${it.susunan})`
    );
  }
}
sql += iLines.join(",\n");
sql += "\n) as i(kod_kriteria, kod, tajuk, bukti_wajib, fail_rujukan, jenis_klausa, susunan) on k.kod = i.kod_kriteria\non conflict (kriteria_id, kod) do nothing;\n\n";

// STORAGE BUCKET
sql += "-- =====================================================\n-- STORAGE BUCKET untuk bukti audit\n-- =====================================================\n\n";
sql += `insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bukti-audit', 'bukti-audit', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "Auditor muat naik bukti" on storage.objects for insert
  with check (bucket_id = 'bukti-audit' and auth.uid() is not null);

create policy "Auditor baca bukti" on storage.objects for select
  using (bucket_id = 'bukti-audit' and auth.uid() is not null);
`;

writeFileSync(OUT, sql);
console.log("Saved:", OUT);
console.log("Total kriteria:", kriteriaMap.size);
console.log("Total item:", rows.length);
