import { readFileSync, writeFileSync } from "node:fs";
import { argv } from "node:process";
import { read, utils } from "xlsx";

const BULAN_MS = [
  "Januari", "Februari", "Mac", "April", "Mei", "Jun",
  "Julai", "Ogos", "September", "Oktober", "November", "Disember",
];
const BULAN_KEY = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogos", "Sep", "Okt", "Nov", "Dis"];
const CUMUL_KEY = ["jan", "feb", "mac", "apr", "may", "jun", "jul", "ogos", "sep", "okt", "nov", "dis"];

// Pemetaan header (dinormalkan) → kunci logik
const HEADER_KEY = {
  "pol/pn": "pol",
  "pol /pn": "pol",
  "pol pn": "pol",
  "bil": "bil",
  "bil.": "bil",
  "nama projek": "nama",
  "luas kawasan (hek)": "luas_hek",
  "luas dituai (hek)": "luas_operasi_sawit",
  "luas ditoreh (hek)": "luas_operasi_getah",
  "bilangan peserta": "peserta",
  "bil. peserta": "peserta",
  "jan": "jan",
  "hasil feb": "feb_c",
  "feb": "feb",
  "hasil mac": "mac_c",
  "mac": "mac",
  "hasil mar": "mac_c",
  "mar": "mac",
  "hasil apr": "apr_c",
  "apr": "apr",
  "hasil may": "may_c",
  "may": "may",
  "hasil jun": "jun_c",
  "jun": "jun",
  "hasil jul": "jul_c",
  "jul": "jul",
  "hasil aug": "ogos_c",
  "aug": "ogos",
  "hasil sep": "sep_c",
  "sep": "sep",
  "hasil oct": "okt_c",
  "oct": "okt",
  "hasil nov": "nov_c",
  "nov": "nov",
  "hasil dec": "dis_c",
  "hasil dis": "dis_c",
  "dis": "dis",
  "dec": "dis",
};

function normHeader(h) {
  return (h ?? "").toString().trim().toLowerCase().replace(/\s+/g, " ");
}

function findHeaderRow(rows) {
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    for (const c of rows[i] || []) {
      if (typeof c === "string" && /^pol\s*[\/]?\s*p\.?n\.?$/i.test(c.trim())) return i;
    }
  }
  return -1;
}

function buildColMap(headerRow) {
  const m = {};
  headerRow.forEach((h, idx) => {
    const k = HEADER_KEY[normHeader(h)];
    if (k && !(k in m)) m[k] = idx;
  });
  return m;
}

function kunciNama(nama) {
  return (nama ?? "").toString().trim().toUpperCase().replace(/\s+/g, " ");
}

function namaSah(nama) {
  nama = (nama ?? "").toString().trim();
  if (!nama) return false;
  if (!isNaN(Number(nama))) return false;
  if (/^(pol\s*[\/]?\s*p\.?n\.?|nama\s+projek|bil\.?)$/i.test(nama)) return false;
  return true;
}

// ── Parse args ──
const args = argv.slice(2);
const failExcel = args.find((a) => !a.startsWith("--"));
const tahun = args.includes("--tahun") ? parseInt(args[args.indexOf("--tahun") + 1]) : null;
const bulanAktif = args.includes("--bulan-aktif")
  ? args[args.indexOf("--bulan-aktif") + 1].split(",")
  : tahun
    ? Array.from({ length: 12 }, (_, i) => `${tahun}-${String(i + 1).padStart(2, "0")}`)
    : null;

if (!failExcel || !bulanAktif) {
  console.log("Guna: node scripts/import-hasil-excel.mjs <fail.xlsx> --tahun YYYY");
  console.log("       atau: --bulan-aktif 2025-01,2025-02,...");
  process.exit(1);
}

console.log(`\nMembaca Excel: ${failExcel}`);
const wb = read(readFileSync(failExcel), { type: "buffer" });

const sawits = wb.SheetNames.filter((n) => /^sawit/i.test(n));
const getahs = wb.SheetNames.filter((n) => /^getah/i.test(n));
console.log(`  Sheet sawit: ${sawits.join(", ") || "(tiada)"}`);
console.log(`  Sheet getah: ${getahs.join(", ") || "(tiada)"}`);

function readSheet(ws) {
  const rows = utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
  const headerIdx = findHeaderRow(rows);
  if (headerIdx < 0) return { projek: [], error: "Header tidak dijumpai" };
  const cm = buildColMap(rows[headerIdx]);
  if (cm.pol === undefined || cm.nama === undefined) {
    return { projek: [], error: `Header rosak: pol=${cm.pol} nama=${cm.nama}` };
  }

  const out = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const pol = (r[cm.pol] ?? "").toString().trim();
    const nama = (r[cm.nama] ?? "").toString().trim();
    if (!namaSah(pol) || !namaSah(nama)) continue;
    if (kunciNama(pol) === kunciNama(nama)) continue;
    out.push({
      label: (r[0] ?? "").toString().trim(),
      pol_pn: pol,
      nama,
      luas_hek: Number(r[cm.luas_hek]) || 0,
      luas_operasi: Number(r[cm.luas_operasi_sawit] ?? r[cm.luas_operasi_getah]) || 0,
      peserta: Number(r[cm.peserta]) || 0,
      raw: r,
      cm,
    });
  }
  return { projek: out };
}

function getCumulIdx(p, monthKey) {
  const order = BULAN_KEY.indexOf(monthKey);
  if (order === 0) return p.cm.jan; // Januari: kolum JAN itu sendiri
  return p.cm[CUMUL_KEY[order] + "_c"];
}

function bulanan(p, monthKey) {
  const order = BULAN_KEY.indexOf(monthKey);
  const idx = getCumulIdx(p, monthKey);
  if (idx === undefined) return 0;
  const cur = Number(p.raw[idx]) || 0;
  if (order === 0) return cur;
  const prevIdx = getCumulIdx(p, BULAN_KEY[order - 1]);
  if (prevIdx === undefined) return cur;
  const prev = Number(p.raw[prevIdx]) || 0;
  return cur - prev;
}

// Parser khas untuk "Sheet1" (format agregat 2022/2024 dengan kolum tak standard)
function readSheet1(ws) {
  const rows = utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
  const out = [];
  for (let i = 4; i < rows.length; i++) {
    const r = rows[i] || [];
    if (r.length < 5) continue;

    let pol, nama, luas, dituai, peserta, hasHasilStart;

    if (typeof r[0] === "number") {
      // Format 2022: [bil, POL, _, nama, luas, dituai, peserta, JAN, HASIL_FEB, ...]
      pol = (r[1] ?? "").toString().trim();
      nama = (r[3] ?? "").toString().trim();
      luas = Number(r[4]) || 0;
      dituai = Number(r[5]) || 0;
      peserta = Number(r[6]) || 0;
      hasHasilStart = 7;
    } else {
      // Format 2024: [POL, total, _, _, POL, nama, luas, JAN, HASIL_FEB, ...]
      nama = "";
      hasHasilStart = -1;
      for (let j = 0; j < Math.min(10, r.length); j++) {
        const c = (r[j] ?? "").toString().trim();
        if (/^(TSK|OA\b|LADANG|AGRO)/i.test(c) && c.length > 3) {
          nama = c;
          pol = (r[j - 1] ?? "").toString().trim();
          luas = Number(r[j + 1]) || 0;
          dituai = luas; // tiada kolum Dituai berasingan
          peserta = 0;
          hasHasilStart = j + 2;
          break;
        }
      }
      if (!nama) continue;
    }

    if (!namaSah(pol) || !namaSah(nama)) continue;
    if (kunciNama(pol) === kunciNama(nama)) continue;
    if (hasHasilStart < 0) continue;
    if (typeof r[hasHasilStart] !== "number") continue;

    out.push({
      label: "",
      pol_pn: pol,
      nama,
      luas_hek: luas,
      luas_operasi: dituai,
      peserta,
      raw: r,
      cm: {
        jan: hasHasilStart,
        feb_c: hasHasilStart + 1, feb: hasHasilStart + 2,
        mac_c: hasHasilStart + 3, mac: hasHasilStart + 4,
        apr_c: hasHasilStart + 5, apr: hasHasilStart + 6,
        may_c: hasHasilStart + 7, may: hasHasilStart + 8,
        jun_c: hasHasilStart + 9, jun: hasHasilStart + 10,
        jul_c: hasHasilStart + 11, jul: hasHasilStart + 12,
        ogos_c: hasHasilStart + 13, ogos: hasHasilStart + 14,
        sep_c: hasHasilStart + 15, sep: hasHasilStart + 16,
        okt_c: hasHasilStart + 17, okt: hasHasilStart + 18,
        nov_c: hasHasilStart + 19, nov: hasHasilStart + 20,
        dis_c: hasHasilStart + 21, dis: hasHasilStart + 22,
      },
    });
  }
  return out;
}

const sawitProjek = [];
const getahProjek = [];
// Proses Sheet1 DULU supaya nilainya menang untuk projek yang sama
const sheet1s = wb.SheetNames.filter((n) => n === "Sheet1");
for (const sn of sheet1s) {
  const projek = readSheet1(wb.Sheets[sn]);
  if (projek.length > 0) {
    console.log(`  [${sn}] ${projek.length} baris (Sheet1 format)`);
    sawitProjek.push(...projek);
  } else {
    console.log(`  [${sn}] 0 baris (bukan data projek)`);
  }
}
for (const sn of sawits) {
  const { projek, error } = readSheet(wb.Sheets[sn]);
  if (error) console.log(`  [${sn}] SKIP: ${error}`);
  else console.log(`  [${sn}] ${projek.length} baris`);
  sawitProjek.push(...projek);
}
for (const sn of getahs) {
  const { projek, error } = readSheet(wb.Sheets[sn]);
  if (error) console.log(`  [${sn}] SKIP: ${error}`);
  else console.log(`  [${sn}] ${projek.length} baris`);
  getahProjek.push(...projek);
}

function dedupe(list) {
  const seen = new Set();
  return list.filter((p) => {
    const k = kunciNama(p.nama);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const sawitUnik = dedupe(sawitProjek);
const getahUnik = dedupe(getahProjek);
console.log(`\nUnik selepas dedupe: ${sawitUnik.length} sawit, ${getahUnik.length} getah`);

function assignBil(list) {
  const k = {};
  list.forEach((p) => {
    k[p.pol_pn] = (k[p.pol_pn] || 0) + 1;
    p.bil = k[p.pol_pn];
  });
}
assignBil(sawitUnik);
assignBil(getahUnik);

const failJson = "src/data/hasil-bulanan.json";
const json = JSON.parse(readFileSync(failJson, "utf8"));
const semuaBulan = json.bulan;

console.log(`\nBulan aktif: ${bulanAktif.join(", ")}`);

for (const kodBulan of bulanAktif) {
  const [tahunStr, bulanStr] = kodBulan.split("-");
  const bulanIdx = parseInt(bulanStr);
  const namaBulan = `${BULAN_MS[bulanIdx - 1]} ${tahunStr}`;
  const monthKey = BULAN_KEY[bulanIdx - 1];

  const sawitList = sawitUnik.map((p) => {
    const h = bulanan(p, monthKey);
    return {
      pol_pn: p.pol_pn,
      bil: p.bil,
      nama: p.nama,
      luas_hek: p.luas_hek,
      luas_dituai: p.luas_operasi,
      peserta: p.peserta,
      hasil_mt: h,
      mtan_hek: p.luas_operasi > 0 ? Number((h / p.luas_operasi).toFixed(6)) : 0,
      mtan_hek_dituai: p.luas_operasi > 0 ? Number((h / p.luas_operasi).toFixed(6)) : 0,
      matlamat_setahun: 0,
      pct_setahun: 0,
      pendapatan: 0,
      kos: 0,
      untung_rugi: 0,
      label: p.label,
    };
  });

  const getahList = getahUnik.map((p) => {
    const h = bulanan(p, monthKey);
    return {
      pol_pn: p.pol_pn,
      bil: p.bil,
      nama: p.nama,
      luas_hek: p.luas_hek,
      luas_ditoreh: p.luas_operasi,
      peserta: p.peserta,
      hasil_kg: h,
      kg_hek: p.luas_operasi > 0 ? Number((h / p.luas_operasi).toFixed(6)) : 0,
      kg_hek_ditoreh: p.luas_operasi > 0 ? Number((h / p.luas_operasi).toFixed(6)) : 0,
      matlamat_setahun: 0,
      pct_setahun: 0,
      pendapatan: 0,
      kos: 0,
      untung_rugi: 0,
      label: p.label,
    };
  });

  let idx = semuaBulan.findIndex((b) => b.kod === kodBulan);
  if (idx >= 0) {
    semuaBulan[idx].sawit = sawitList;
    semuaBulan[idx].getah = getahList;
    console.log(`  ${namaBulan}: DIKEMASKINI (${sawitList.length} sawit, ${getahList.length} getah)`);
  } else {
    semuaBulan.push({ kod: kodBulan, nama: namaBulan, sawit: sawitList, getah: getahList });
    console.log(`  ${namaBulan}: DITAMBAH (${sawitList.length} sawit, ${getahList.length} getah)`);
  }
}

semuaBulan.sort((a, b) => a.kod.localeCompare(b.kod));
json.bulan = semuaBulan;
writeFileSync(failJson, JSON.stringify(json, null, 2) + "\n");
console.log(`\nDisimpan ke ${failJson}`);
console.log("Langkah seterusnya: node scripts/seed-hasil-supabase.mjs");
