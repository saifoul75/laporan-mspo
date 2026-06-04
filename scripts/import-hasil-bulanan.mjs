import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const files = [
  { kod: '2026-01', nama: 'Januari 2026', path: 'D:\\JANET COWORKER\\LAPORAN BULANAN\\Senarai Hasil Projek JAN 2026 RISDA Plantation.xlsx' },
  { kod: '2026-02', nama: 'Februari 2026', path: 'D:\\JANET COWORKER\\LAPORAN BULANAN\\Senarai Hasil Projek FEB 2026 RISDA Plantation.xlsx' },
  { kod: '2026-03', nama: 'Mac 2026', path: 'D:\\JANET COWORKER\\LAPORAN BULANAN\\Senarai Hasil Projek MAC 2026 RISDA Plantation.xlsx' },
  { kod: '2026-04', nama: 'April 2026', path: 'D:\\JANET COWORKER\\LAPORAN BULANAN\\Senarai Hasil Projek APRIL 2026 RISDA Plantation.xlsx' },
];

function extractSawit(wb) {
  const ws = wb.Sheets['MASTER SWT'];
  if (!ws) return [];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0, defval: null });
  const data = [];
  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0] || !r[3]) continue; // Skip jika tiada DAERAH atau NAMA PROJEK
    if (r[0] === 'DAERAH/JAJAHAN' || String(r[3]).includes('JUMLAH')) continue;

    data.push({
      pol_pn: String(r[0]).trim(),
      bil: Number(r[2]) || 0,
      nama: String(r[3]).trim(),
      luas_hek: Number(r[5] || r[4]) || 0,
      luas_dituai: Number(r[7] || r[6]) || 0,
      peserta: Number(r[11] || r[10]) || 0,
      hasil_mt: Number(r[15]) || 0,
      mtan_hek: Number(r[16]) || 0,
      mtan_hek_dituai: Number(r[17]) || 0,
      matlamat_setahun: Number(r[18]) || 0,
      pct_setahun: Number(r[19]) || 0,
      pendapatan: Number(r[20]) || 0,
      kos: Number(r[24]) || 0,
      untung_rugi: Number(r[29]) || 0
    });
  }
  return data;
}

function extractGetah(wb) {
  const ws = wb.Sheets['MASTER GTH'];
  if (!ws) return [];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0, defval: null });
  const data = [];
  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    if (!r[1] || !r[3]) continue;
    if (r[1] === 'Daerah/Jajahan' || String(r[3]).includes('JUMLAH')) continue;

    data.push({
      pol_pn: String(r[1]).trim(),
      bil: Number(r[2]) || 0,
      nama: String(r[3]).trim(),
      luas_hek: Number(r[5] || r[4]) || 0,
      luas_ditoreh: Number(r[7] || r[6]) || 0,
      peserta: Number(r[14] || r[13]) || 0,
      hasil_kg: Number(r[15]) || 0,
      kg_hek: Number(r[20] || r[21]) || 0,
      matlamat_setahun: Number(r[23]) || 0,
      pct_setahun: Number(r[24]) || 0,
      pendapatan: Number(r[25]) || 0,
      kos: Number(r[32]) || 0,
      untung_rugi: Number(r[37]) || 0
    });
  }
  return data;
}

const result = {
  bulan: []
};

for (const f of files) {
  console.log(`Membaca ${f.nama}...`);
  try {
    const wb = XLSX.readFile(f.path);
    const sawit = extractSawit(wb);
    const getah = extractGetah(wb);
    
    result.bulan.push({
      kod: f.kod,
      nama: f.nama,
      sawit,
      getah
    });
    console.log(`  -> ${sawit.length} projek sawit, ${getah.length} projek getah`);
  } catch (err) {
    console.error(`  Ralat: ${err.message}`);
  }
}

const outPath = path.join(process.cwd(), 'src/data/hasil-bulanan.json');
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(`\nSelesai! Disimpan ke ${outPath}`);
