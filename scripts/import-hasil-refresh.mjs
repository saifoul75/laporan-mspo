import { readFileSync, writeFileSync } from "node:fs";
import { read, utils } from "xlsx";
import { resolve } from "node:path";

const FOLDER_LAPORAN = "C:/Users/USER/Desktop/LAPORAN HASIL";
const FAIL_JSON = "src/data/hasil-bulanan.json";

const BULAN_MS = [
  "Januari", "Februari", "Mac", "April", "Mei", "Jun",
  "Julai", "Ogos", "September", "Oktober", "November", "Disember",
];
const BULAN_KEY = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogos", "Sep", "Okt", "Nov", "Dis"];

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

const normHeader = (h) => (h ?? "").toString().trim().toLowerCase().replace(/\s+/g, " ");

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

const kunciNama = (nama) => (nama ?? "").toString().trim().toUpperCase().replace(/\s+/g, " ");

function namaSah(nama) {
  nama = (nama ?? "").toString().trim();
  if (!nama) return false;
  if (!isNaN(Number(nama))) return false;
  if (/^(pol\s*[\/]?\s*p\.?n\.?|nama\s+projek|bil\.?)$/i.test(nama)) return false;
  return true;
}

function readSheetProjek(ws) {
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
  if (order === 0) return p.cm.jan;
  return p.cm[BULAN_KEY[order].toLowerCase() + "_c"] ?? p.cm[CUMUL_KEY_ALT[order] + "_c"];
}

const CUMUL_KEY_ALT = ["jan", "feb", "mac", "apr", "may", "jun", "jul", "ogos", "sep", "okt", "nov", "dis"];

function bulanan(p, monthKey) {
  const order = BULAN_KEY.indexOf(monthKey);
  const idx = getCumulIdx(p, monthKey);
  if (idx === undefined) return 0;
  const rawVal = p.raw[idx];
  if (rawVal === null || rawVal === undefined || rawVal === "") return 0;
  const cur = Number(rawVal) || 0;
  if (order === 0) return cur;
  const prevIdx = getCumulIdx(p, BULAN_KEY[order - 1]);
  if (prevIdx === undefined) return cur;
  const prevRaw = p.raw[prevIdx];
  if (prevRaw === null || prevRaw === undefined || prevRaw === "") return 0;
  const prev = Number(prevRaw) || 0;
  return cur - prev;
}

const json = JSON.parse(readFileSync(FAIL_JSON, "utf8"));
let semuaBulan = json.bulan;

const indeks = new Map();
semuaBulan.forEach((b, i) => indeks.set(b.kod || b.kod_bulan, i));

const fail2026 = resolve(FOLDER_LAPORAN, "Unt Cawangan 2026.xlsx");
console.log(`\n=== STEP 1: Baca master projek dari 2026 (sheet SAWIT & GETAH sahaja) ===`);
console.log(`Sumber: ${fail2026}`);

const wb2026 = read(readFileSync(fail2026), { type: "buffer" });
const sawit2026 = wb2026.Sheets["SAWIT"];
const getah2026 = wb2026.Sheets["GETAH"];
if (!sawit2026 || !getah2026) {
  console.error("ERROR: Sheet 'SAWIT' atau 'GETAH' tidak dijumpai dalam 2026");
  process.exit(1);
}

const { projek: sawitProjek2026 } = readSheetProjek(sawit2026);
const { projek: getahProjek2026 } = readSheetProjek(getah2026);
console.log(`  Master SAWIT: ${sawitProjek2026.length} projek`);
console.log(`  Master GETAH: ${getahProjek2026.length} projek`);

const masterSawitSet = new Set(sawitProjek2026.map((p) => kunciNama(p.nama)));
const masterGetahSet = new Set(getahProjek2026.map((p) => kunciNama(p.nama)));

const TAHUN = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
let jumlahDiimport = 0;
let jumlahTapis = 0;

for (const tahun of TAHUN) {
  const failExcel = resolve(FOLDER_LAPORAN, `Unt Cawangan ${tahun}.xlsx`);
  console.log(`\n=== STEP 2.${TAHUN.indexOf(tahun) + 1}: Import ${tahun} ===`);
  console.log(`Sumber: ${failExcel}`);

  const wb = read(readFileSync(failExcel), { type: "buffer" });
  const wsSawit = wb.Sheets["SAWIT"];
  const wsGetah = wb.Sheets["GETAH"];
  if (!wsSawit || !wsGetah) {
    console.log(`  SKIP: sheet SAWIT/GETAH tidak dijumpai`);
    continue;
  }

  const { projek: sawitMentah } = readSheetProjek(wsSawit);
  const { projek: getahMentah } = readSheetProjek(wsGetah);
  console.log(`  Mentah: ${sawitMentah.length} sawit, ${getahMentah.length} getah`);

  const sawitUnik = [];
  const sawitDilihat = new Set();
  for (const p of sawitMentah) {
    const k = kunciNama(p.nama);
    if (!masterSawitSet.has(k)) { jumlahTapis++; continue; }
    if (sawitDilihat.has(k)) { jumlahTapis++; continue; }
    sawitDilihat.add(k);
    sawitUnik.push(p);
  }

  const getahUnik = [];
  const getahDilihat = new Set();
  for (const p of getahMentah) {
    const k = kunciNama(p.nama);
    if (!masterGetahSet.has(k)) { jumlahTapis++; continue; }
    if (getahDilihat.has(k)) { jumlahTapis++; continue; }
    getahDilihat.add(k);
    getahUnik.push(p);
  }
  console.log(`  Selepas tapis master: ${sawitUnik.length} sawit, ${getahUnik.length} getah`);

  const kiraan = {};
  sawitUnik.forEach((p) => { kiraan[p.pol_pn] = (kiraan[p.pol_pn] || 0) + 1; p.bil = kiraan[p.pol_pn]; });
  getahUnik.forEach((p) => { kiraan[p.pol_pn] = (kiraan[p.pol_pn] || 0) + 1; p.bil = kiraan[p.pol_pn]; });

  for (let bulanIdx = 1; bulanIdx <= 12; bulanIdx++) {
    const kodBulan = `${tahun}-${String(bulanIdx).padStart(2, "0")}`;
    const namaBulan = `${BULAN_MS[bulanIdx - 1]} ${tahun}`;
    const monthKey = BULAN_KEY[bulanIdx - 1];

    const sawitList = sawitUnik.map((p) => {
      const h = bulanan(p, monthKey);
      return {
        pol_pn: p.pol_pn, bil: p.bil, nama: p.nama,
        luas_hek: p.luas_hek, luas_dituai: p.luas_operasi, peserta: p.peserta,
        hasil_mt: h,
        mtan_hek: p.luas_operasi > 0 ? Number((h / p.luas_operasi).toFixed(6)) : 0,
        mtan_hek_dituai: p.luas_operasi > 0 ? Number((h / p.luas_operasi).toFixed(6)) : 0,
        matlamat_setahun: 0, pct_setahun: 0,
        pendapatan: 0, kos: 0, untung_rugi: 0,
        label: p.label,
      };
    });

    const getahList = getahUnik.map((p) => {
      const h = bulanan(p, monthKey);
      return {
        pol_pn: p.pol_pn, bil: p.bil, nama: p.nama,
        luas_hek: p.luas_hek, luas_ditoreh: p.luas_operasi, peserta: p.peserta,
        hasil_kg: h,
        kg_hek: p.luas_operasi > 0 ? Number((h / p.luas_operasi).toFixed(6)) : 0,
        kg_hek_ditoreh: p.luas_operasi > 0 ? Number((h / p.luas_operasi).toFixed(6)) : 0,
        matlamat_setahun: 0, pct_setahun: 0,
        pendapatan: 0, kos: 0, untung_rugi: 0,
        label: p.label,
      };
    });

    const idx = indeks.get(kodBulan);
    if (idx >= 0) {
      semuaBulan[idx].sawit = sawitList;
      semuaBulan[idx].getah = getahList;
    } else {
      semuaBulan.push({ kod: kodBulan, nama: namaBulan, sawit: sawitList, getah: getahList });
      indeks.set(kodBulan, semuaBulan.length - 1);
    }
    jumlahDiimport += sawitList.length + getahList.length;
  }
}

semuaBulan.sort((a, b) => (a.kod || a.kod_bulan).localeCompare(b.kod || b.kod_bulan));
json.bulan = semuaBulan;
writeFileSync(FAIL_JSON, JSON.stringify(json, null, 2) + "\n");

console.log(`\n=== RINGKASAN ===`);
console.log(`Jumlah baris diimport: ${jumlahDiimport}`);
console.log(`Jumlah baris ditapis (bukan master): ${jumlahTapis}`);
console.log(`Disimpan ke ${FAIL_JSON}`);
console.log(`\nLangkah seterusnya: node scripts/seed-hasil-supabase.mjs`);
