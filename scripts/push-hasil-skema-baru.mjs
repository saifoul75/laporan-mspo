import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const PO_WILAYAH = {
  'GERIK':'UTARA','KEDAH':'UTARA','KG.GAJAH':'UTARA','KUALA KANGSAR':'UTARA',
  'LENGGONG':'UTARA','MANJUNG':'UTARA','SELANGOR':'UTARA','SIK':'UTARA','TAPAH':'UTARA',
  'BENTONG':'TENGAH','JERANTUT':'TENGAH','KUANTAN':'TENGAH','LIPIS':'TENGAH',
  'PEKAN':'TENGAH','RAUB':'TENGAH','ROMPIN':'TENGAH','TEMERLOH':'TENGAH',
  'BESUT':'TIMUR','DUNGUN':'TIMUR','KUALA BERANG':'TIMUR','MACHANG':'TIMUR',
  'ALOR GAJAH':'SELATAN','BUKIT KEPONG':'SELATAN','GEMENCEH':'SELATAN',
  'JASIN':'SELATAN','JOHOR':'SELATAN','MASJID TANAH':'SELATAN','MELAKA':'SELATAN',
  'MUAR':'SELATAN','N.SEMBILAN':'SELATAN','REMBAU':'SELATAN'
};

const BULAN_NAMA = ['','Januari','Februari','Mac','April','Mei','Jun','Julai','Ogos','September','Oktober','November','Disember'];

const json = JSON.parse(readFileSync("src/data/hasil-bulanan.json", "utf8"));

console.log("Ambil master 2026 dari DB...");
const { data: masterSawit } = await sb.from("projek_master_2026").select("nama_projek").eq("jenis", "SAWIT");
const { data: masterGetah } = await sb.from("projek_master_2026").select("nama_projek").eq("jenis", "GETAH");
const masterSet = {
  SAWIT: new Set((masterSawit || []).map(r => r.nama_projek.toUpperCase().trim())),
  GETAH: new Set((masterGetah || []).map(r => r.nama_projek.toUpperCase().trim())),
};

const semuaBaris = [];
for (const bulan of json.bulan) {
  const kod = bulan.kod || bulan.kod_bulan;
  const [tahunStr, bulanStr] = kod.split("-");
  const tahun = parseInt(tahunStr);
  const bulanNum = parseInt(bulanStr);
  const bulanNama = `${BULAN_NAMA[bulanNum]} ${tahun}`;

  for (const jenisAsal of ["sawit", "getah"]) {
    const jenisUpper = jenisAsal === "sawit" ? "SAWIT" : "GETAH";
    const senarai = bulan[jenisAsal] || [];

    for (const p of senarai) {
      const nama = (p.nama || "").toString().trim();
      if (!nama) continue;
      const pol = (p.pol_pn || "").toString().trim();
      const luasProd = jenisAsal === "sawit" ? (p.luas_dituai || 0) : (p.luas_ditoreh || 0);
      const hasil = jenisAsal === "sawit" ? (p.hasil_mt || 0) : (p.hasil_kg || 0);
      const wilayah = PO_WILAYAH[pol] || null;
      const inMaster = masterSet[jenisUpper].has(nama.toUpperCase().trim());

      semuaBaris.push({
        tahun,
        jenis: jenisUpper,
        kategori: null,
        pusat_operasi: pol,
        pusat_operasi_master: inMaster ? pol : null,
        pusat_operasi_final: inMaster ? pol : pol,
        wilayah,
        kategori_master: null,
        nama_projek: nama,
        luas_kawasan_hek: p.luas_hek || 0,
        luas_produktif_hek: luasProd,
        bilangan_peserta: p.peserta || 0,
        bulan: bulanNum,
        bulan_nama: bulanNama,
        hasil,
        unit: jenisAsal === "sawit" ? "MT" : "KG",
        in_master_2026: inMaster,
      });
    }
  }
}

console.log(`Jumlah baris untuk insert: ${semuaBaris.length}`);

const BATCH = 500;
let ok = 0;
let gagal = 0;
const mula = Date.now();

for (let i = 0; i < semuaBaris.length; i += BATCH) {
  const kumpulan = semuaBaris.slice(i, i + BATCH);
  const noBatch = Math.floor(i / BATCH) + 1;
  const totalBatch = Math.ceil(semuaBaris.length / BATCH);

  const { error } = await sb.from("hasil_bulanan").insert(kumpulan);

  if (error) {
    gagal += kumpulan.length;
    console.error(`  Batch ${noBatch}/${totalBatch} GAGAL: ${error.message}`);
    if (gagal > 200) { console.error("Terlalu gagal, berhenti."); process.exit(1); }
  } else {
    ok += kumpulan.length;
    const pct = ((ok / semuaBaris.length) * 100).toFixed(1);
    const elapsed = ((Date.now() - mula) / 1000).toFixed(1);
    process.stdout.write(`\r  Batch ${noBatch}/${totalBatch} OK (${pct}%, ${elapsed}s)`);
  }
}

const masa = ((Date.now() - mula) / 1000).toFixed(1);
console.log(`\n\n=== RINGKASAN ===`);
console.log(`Berjaya: ${ok} baris`);
console.log(`Gagal:   ${gagal} baris`);
console.log(`Masa:    ${masa} saat`);

const { count: finalCount } = await sb.from("hasil_bulanan").select("*", { count: "exact", head: true });
console.log(`\nJumlah baris dalam DB: ${finalCount}`);
