import { readFileSync, writeFileSync } from "node:fs";

const BULAN_MS = [
  "Januari", "Februari", "Mac", "April", "Mei", "Jun",
  "Julai", "Ogos", "September", "Oktober", "November", "Disember",
];

const fail = "src/data/hasil-bulanan.json";
const json = JSON.parse(readFileSync(fail, "utf8"));
const semuaBulan = json.bulan;
const terakhir = semuaBulan[semuaBulan.length - 1];

// Kira bulan baru
const [tahunStr, bulanStr] = terakhir.kod.split("-");
let tahun = parseInt(tahunStr);
let bulanIdx = parseInt(bulanStr); // 1-based
if (bulanIdx >= 12) {
  tahun++;
  bulanIdx = 1;
} else {
  bulanIdx++;
}
const kodBaru = `${tahun}-${String(bulanIdx).padStart(2, "0")}`;
const namaBaru = `${BULAN_MS[bulanIdx - 1]} ${tahun}`;

// Check duplicate
if (semuaBulan.some((b) => b.kod === kodBaru)) {
  console.error(`Bulan ${kodBaru} (${namaBaru}) dah wujud!`);
  process.exit(1);
}

// Clone projek sawit — kosongkan data hasil/kewangan
const sawitBaru = terakhir.sawit.map((p) => ({
  pol_pn: p.pol_pn,
  bil: p.bil,
  nama: p.nama,
  luas_hek: p.luas_hek,
  luas_dituai: p.luas_dituai,
  peserta: p.peserta,
  hasil_mt: 0,
  mtan_hek: 0,
  matlamat_setahun: p.matlamat_setahun,
  pct_setahun: 0,
  pendapatan: 0,
  kos: 0,
  untung_rugi: 0,
}));

// Clone projek getah — kosongkan data hasil/kewangan
const getahBaru = terakhir.getah.map((p) => ({
  pol_pn: p.pol_pn,
  bil: p.bil,
  nama: p.nama,
  luas_hek: p.luas_hek,
  luas_ditoreh: p.luas_ditoreh,
  peserta: p.peserta,
  hasil_kg: 0,
  kg_hek: 0,
  matlamat_setahun: p.matlamat_setahun,
  pct_setahun: 0,
  pendapatan: 0,
  kos: 0,
  untung_rugi: 0,
}));

// Tambah bulan baru
semuaBulan.push({
  kod: kodBaru,
  nama: namaBaru,
  sawit: sawitBaru,
  getah: getahBaru,
});

writeFileSync(fail, JSON.stringify(json, null, 2) + "\n");

console.log(`✓ Bulan baru ditambah: ${kodBaru} (${namaBaru})`);
console.log(`  Sawit: ${sawitBaru.length} projek (hasil = 0)`);
console.log(`  Getah: ${getahBaru.length} projek (hasil = 0)`);
console.log(`\nSekarang edit ${fail} — isikan data hasil sebenar untuk ${namaBaru}.`);
