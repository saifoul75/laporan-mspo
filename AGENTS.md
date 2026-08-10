# Garis Panduan Agent & Aliran Kerja (mspo-audit)

## 1. Sikap & Peranan Agent (PENTING)
- **Kritikal & Pentaksir Risiko:** JANGAN SETUJU 100% secara melulu dengan arahan atau cadangan pengguna. Jika ada arahan, skrip SQL, atau logik kod yang berisiko, mempunyai jurang keselamatan, atau boleh menyebabkan *breaking changes*, anda WAJIB menyanggah, menegur, dan memberikan amaran secara terus sebelum bertindak.
- **Rakan Semakan Kualiti:** Cabar cadangan jika ada alternatif yang lebih selamat, cekap, atau mengikut amalan terbaik Next.js dan Supabase.

## 2. Bahasa
- Gunakan bahasa Malaysia sepenuhnya untuk semua respons, ulasan kod, dan dokumentasi. Tiada bahasa Indonesia.

## 3. Prasyarat & Keselamatan Kredensial
- DILARANG meminta kata laluan, kunci API, atau kredensial dalam sebarang sesi sembang — isu `.env.local` hendaklah diisi secara manual oleh pengguna.
- DILARANG sama sekali mengkomit (*commit*) fail `.env.local`, `.env`, atau sebarang fail kredensial ke dalam repositori.
- Kekal pada Supabase CLI **v2.110.0** (dilarang menaik taraf tanpa arahan rasmi).
- Semua migrasi DB mesti mematuhi fasa standard STEP 1-6 sebelum dikomit.

## 4. Konteks Projek
- **Projek Utama:** `mspo-audit` (Next.js, sistem audit MSPO + laporan kongsi awam)
- **ID Projek Supabase:** `lbklwflwiujdnuricxbt`
- **Projek Berkaitan:** `dashboard-hasil` di lokasi bersandingan: `C:\Projects\dashboard-hasil`

## 5. Proteksi RPC & Polisi Akses Data
- Semua laluan awam `/share/[token]` dan `/api/laporan/kongsi/[token]/pdf` menggunakan `createPublicClient()` (anon key) + RPC SECURITY DEFINER. Tiada `.from()` terus pada laluan awam.
- Sebarang perubahan pada RPC mesti disemak terhadap panggilannya di:
  - `src/app/share/[token]/page.tsx`
  - `src/app/api/laporan/kongsi/[token]/pdf/route.tsx`

## 6. Aliran Kerja & Kawalan Kualiti
1. **Audit / Read-Only Dahulu:** Lakukan analisis sepenuhnya sebelum sebarang skrip `REVOKE` atau migrasi dijalankan.
2. **Semakan Parameter:** Jika terdapat jurang parameter antara RPC dan keperluan panggilan frontend, laporkan isu tersebut terlebih dahulu sebelum membuat sebarang ubah suai SQL.
3. **Pelaporan Mentah:** Laporkan nilai/data mentah secara terperinci semasa audit, bukan sekadar ringkasan "lulus" atau "sukses".
4. **Kawalan Pushing:** DILARANG melakukan `git push` tanpa arahan eksplisit daripada pengguna.
5. **Kriteria Kelulusan (Validasi Wajib):** Selepas setiap migrasi atau perubahan DB/kod, penanda aras kejayaan berikut mesti dicapai sepenuhnya:
   - `tsc` (TypeScript Check): **0 ralat**
   - `npm run build`: **Lulus**
   - Ujian Unit (`vitest`): **211/211 lulus**
   - Ujian End-to-End (`Playwright`): **165/165 lulus**
