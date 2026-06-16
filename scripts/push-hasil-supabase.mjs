import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("ERROR: env SUPABASE_URL / SERVICE_ROLE_KEY not set");
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { persistSession: false },
  db: { schema: "public" },
});

const BATCH = 500;
const json = JSON.parse(readFileSync("src/data/hasil-bulanan.json", "utf8"));
const semuaBulan = json.bulan;

function num(v) {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function prosesSenarai(senarai, jenis) {
  if (!Array.isArray(senarai)) return [];
  const keluar = [];
  for (const p of senarai) {
    const nama = (p?.nama ?? "").toString().trim();
    if (!nama) continue;
    if (p?.pol_pn && nama.toUpperCase() === p.pol_pn.toString().trim().toUpperCase()) continue;
    if (/^\d+(\.\d+)?$/.test(nama)) continue;

    const luasOperasi = jenis === "sawit" ? num(p.luas_dituai) : num(p.luas_ditoreh);
    const hasil = jenis === "sawit" ? num(p.hasil_mt) : num(p.hasil_kg);
    const matlamat = num(p.matlamat_setahun);
    const hasilPerHek = luasOperasi > 0 ? Number((hasil / luasOperasi).toFixed(6)) : 0;
    const pctSetahun = matlamat > 0 ? Number(((hasil / matlamat) * 100).toFixed(4)) : 0;

    keluar.push({
      kod_bulan: "",
      nama_bulan: "",
      jenis,
      pol_pn: p.pol_pn || "",
      bil: num(p.bil),
      nama,
      peserta: num(p.peserta),
      luas_hek: num(p.luas_hek),
      luas_operasi: luasOperasi,
      hasil,
      hasil_per_hek: hasilPerHek,
      matlamat_setahun: matlamat,
      pct_setahun: pctSetahun,
      pendapatan: num(p.pendapatan),
      kos: num(p.kos),
      untung_rugi: num(p.untung_rugi),
    });
  }
  return keluar;
}

const semuaBaris = [];
for (const bulan of semuaBulan) {
  const kod = bulan.kod || bulan.kod_bulan;
  for (const jenis of ["sawit", "getah"]) {
    const baris = prosesSenarai(bulan[jenis], jenis);
    for (const r of baris) {
      r.kod_bulan = kod;
      r.nama_bulan = bulan.nama;
    }
    semuaBaris.push(...baris);
  }
}

console.log(`Jumlah baris untuk push: ${semuaBaris.length}`);
console.log(`Saiz batch: ${BATCH}`);
console.log(`Bilangan batch: ${Math.ceil(semuaBaris.length / BATCH)}`);

let ok = 0;
let gagal = 0;
const mula = Date.now();

for (let i = 0; i < semuaBaris.length; i += BATCH) {
  const kumpulan = semuaBaris.slice(i, i + BATCH);
  const noBatch = Math.floor(i / BATCH) + 1;
  const totalBatch = Math.ceil(semuaBaris.length / BATCH);

  const { error } = await sb
    .from("hasil_bulanan")
    .upsert(kumpulan, { onConflict: "kod_bulan,jenis,nama", count: "exact" });

  if (error) {
    gagal += kumpulan.length;
    console.error(`  Batch ${noBatch}/${totalBatch} GAGAL: ${error.message}`);
    if (gagal > 100) {
      console.error("Terlalu banyak kegagalan, berhenti.");
      process.exit(1);
    }
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

const { count: finalCount, error: countErr } = await sb
  .from("hasil_bulanan")
  .select("*", { count: "exact", head: true });
if (!countErr) console.log(`\nJumlah baris dalam DB sekarang: ${finalCount}`);
