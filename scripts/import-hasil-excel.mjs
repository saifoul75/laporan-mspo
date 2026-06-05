import { readFileSync, writeFileSync } from "node:fs";
import { argv } from "node:process";
import { read, utils } from "xlsx";

const BULAN_MS = [
  "Januari", "Februari", "Mac", "April", "Mei", "Jun",
  "Julai", "Ogos", "September", "Oktober", "November", "Disember",
];

const COL_SAWIT = [
  "pol_pn", "bil", "nama", "luas_hek", "luas_dituai", "peserta",
  "hasil_mt", "mtan_hek", "matlamat_setahun", "pct_setahun",
  "pendapatan", "kos", "untung_rugi",
];

const COL_GETAH = [
  "pol_pn", "bil", "nama", "luas_hek", "luas_ditoreh", "peserta",
  "hasil_kg", "kg_hek", "matlamat_setahun", "pct_setahun",
  "pendapatan", "kos", "untung_rugi",
];

// ── Parse args ──
const args = argv.slice(2);
const failExcel = args.find((a) => !a.startsWith("--"));
const bulanArg = args[args.indexOf("--bulan") + 1];

if (!failExcel || !bulanArg) {
  console.log("Guna: node scripts/import-hasil-excel.mjs <fail.xlsx> --bulan 2026-05");
  console.log("  fail.xlsx  — fail Excel dengan sheet Sawit & Getah");
  console.log("  --bulan    — kod bulan (YYYY-XX), cth: 2026-05 untuk Mei 2026");
  process.exit(1);
}

const [tahunStr, bulanStr] = bulanArg.split("-");
const bulanIdx = parseInt(bulanStr);
const namaBulan = `${BULAN_MS[bulanIdx - 1]} ${tahunStr}`;
const kodBulan = bulanArg;

// ── Baca Excel ──
console.log(`\n📂 Membaca Excel: ${failExcel}`);
const wb = read(readFileSync(failExcel), { type: "buffer" });

function bacaSheet(namaSheet, colMap) {
  const ws = wb.Sheets[namaSheet];
  if (!ws) {
    console.error(`  ⚠ Sheet "${namaSheet}" tidak ditemui!`);
    return [];
  }
  const rows = utils.sheet_to_json(ws, { defval: null });
  return rows.map((row) => {
    const mapped = {};
    colMap.forEach((col) => {
      let v = row[col];
      if (v == null) {
        // Cuba cari case-insensitive
        const key = Object.keys(row).find((k) => k.toLowerCase() === col.toLowerCase());
        if (key) v = row[key];
      }
      if (typeof v === "string") v = v.trim();
      mapped[col] = v ?? (col === "pol_pn" || col === "nama" ? "" : 0);
    });
    return mapped;
  });
}

const sawitBaru = bacaSheet("Sawit", COL_SAWIT);
const getahBaru = bacaSheet("Getah", COL_GETAH);

console.log(`  Sawit: ${sawitBaru.length} baris`);
console.log(`  Getah: ${getahBaru.length} baris`);

if (sawitBaru.length === 0 && getahBaru.length === 0) {
  console.error("❌ Tiada data dalam Excel!");
  process.exit(1);
}

// ── Baca JSON sedia ada ──
const failJson = "src/data/hasil-bulanan.json";
const json = JSON.parse(readFileSync(failJson, "utf8"));
const semuaBulan = json.bulan;
const idxBulan = semuaBulan.findIndex((b) => b.kod === kodBulan);
const bulanSebelum = idxBulan > 0 ? semuaBulan[idxBulan - 1] : null;

// ── Bandingkan & lapor ──
function laporPerubahan(label, namaLama, namaBaru) {
  const setLama = new Set(namaLama);
  const setBaru = new Set(namaBaru);
  const tambah = [...setBaru].filter((n) => !setLama.has(n));
  const buang = [...setLama].filter((n) => !setBaru.has(n));

  if (tambah.length > 0) {
    console.log(`\n  ➕ ${label} BARU (${tambah.length}):`);
    tambah.forEach((n) => console.log(`     + ${n}`));
  }
  if (buang.length > 0) {
    console.log(`\n  ➖ ${label} TIADA DALAM EXCEL (${buang.length}):`);
    buang.forEach((n) => console.log(`     - ${n}`));
  }
  if (tambah.length === 0 && buang.length === 0) {
    console.log(`\n  ✅ ${label}: tiada perubahan projek`);
  }
}

console.log(`\n📊 Perbandingan untuk ${namaBulan}:`);

if (bulanSebelum) {
  const namaSawitLama = bulanSebelum.sawit.map((p) => p.nama);
  const namaSawitBaru = sawitBaru.map((p) => p.nama);
  laporPerubahan("Sawit", namaSawitLama, namaSawitBaru);

  const namaGetahLama = bulanSebelum.getah.map((p) => p.nama);
  const namaGetahBaru = getahBaru.map((p) => p.nama);
  laporPerubahan("Getah", namaGetahLama, namaGetahBaru);
} else {
  console.log("  (bulan pertama — tiada data sebelum untuk banding)");
}

// ── Kemaskini JSON ──
if (idxBulan >= 0) {
  // Bulan dah wujud — overwrite data
  semuaBulan[idxBulan].sawit = sawitBaru;
  semuaBulan[idxBulan].getah = getahBaru;
  console.log(`\n✅ Data ${namaBulan} dikemaskini (${sawitBaru.length} sawit, ${getahBaru.length} getah)`);
} else {
  // Bulan baru — tambah
  semuaBulan.push({
    kod: kodBulan,
    nama: namaBulan,
    sawit: sawitBaru,
    getah: getahBaru,
  });
  console.log(`\n✅ Bulan baru ditambah: ${namaBulan} (${sawitBaru.length} sawit, ${getahBaru.length} getah)`);
}

// Susun ikut kod bulan
semuaBulan.sort((a, b) => a.kod.localeCompare(b.kod));
json.bulan = semuaBulan;

writeFileSync(failJson, JSON.stringify(json, null, 2) + "\n");
console.log(`\n💾 Disimpan ke ${failJson}`);
