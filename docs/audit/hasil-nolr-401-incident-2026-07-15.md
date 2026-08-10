# Laporan Insiden: dashboard-hasil-nolr Down (401/RLS) — Tiket hasil-nolr-401

- **Tarikh/masa (Malaysia, UTC+8):** 2026-07-15
- **Projek Supabase:** `lbklwflwiujdnuricxbt`
- **Projek Vercel:** `dashboard-hasil-nolr` (`prj_Kohsmg77Ww6yu3qfMoCQFDh1YuNC`)
- **Domain terjejas:** `dashboard-hasil-nolr.vercel.app` (Papan Pemuka Eksekutif, awam tanpa login)
- **Pemilik:** Mohd Saifoul Azuan (Ronie), Jabatan Perladangan
- **Status:** DISELESAIKAN SEMENTARA (P0 exception). Semakan wajib dijadualkan 2026-08-15.

---

## a. Gejala

Dashboard-hasil-nolr.vercel.app papar "Data sementara tidak tersedia" pada semua halaman
(Papan Pemuka Eksekutif, Ranking Projek, Report Projek). Log Supabase tunjuk:

```
permission denied for view hasil_bulanan
permission denied for table hasil_bulanan_src
```

## b. Punca akar

Migration `0027_hardening_hasil_bulanan_dan_storage.sql` (hardening keselamatan umum, bukan
disebabkan insiden khusus `hasil_bulanan`) dan `0030_hardening_anon_loose_cleanup.sql` revoke
akses `anon` pada `hasil_bulanan` (VIEW) dan `hasil_bulanan_src` (TABLE), atas anggapan `/share`
tidak bergantung kepada dua sumber ini. Tapi `dashboard-hasil-nolr` (papan pemuka awam, guna
`anon key` sahaja, tiada login) turut bergantung terus kepada dua sumber tersebut — hardening
tersebut adalah regresi tidak disengajakan untuk use-case ini.

## c. Tindakan diambil

1. **Migration `0031_fix_hasil_bulanan_anon_dashboard.sql`** — column-scoped GRANT SELECT
   untuk `anon`, whitelist kolum Awam + Dalaman-perlu-bisnes sahaja:
   - `hasil_bulanan` (13 kolum, `id` dikecualikan)
   - `hasil_bulanan_src` (12 kolum; 8 kolum Dalaman dikecualikan: `id`, `kategori`,
     `pusat_operasi`, `pusat_operasi_master`, `kategori_master`, `bilangan_peserta`,
     `in_master_2026`, `negeri`)
   - Diverifikasi penuh di prod: 8 kolum Dalaman denied, kolum whitelist berjaya,
     regression `laporan`/`audit`/`nc`/`ofi` kekal locked, `projek_ref`/`matlamat_projek`
     kekal anon. **LULUS.**

2. **Isu susulan ditemui:** Dashboard masih down selepas 0031 kerana kod front-end production
   (deployment Vercel `dpl_4qCoknatFwz8D2SUZ6nc8Yan6N3F`, commit lama branch `master`,
   dipromosi ke production `2026-07-07`) masih guna `select("*")` / kolum penuh — bukan
   whitelist. Kod whitelist-select yang didakwa "siap di branch" oleh Kilo **tidak dapat
   disahkan wujud** dalam mana-mana deployment Vercel (preview atau production) semasa
   semakan — tiada commit yang sepadan dengan diff tersebut ditemui setakat masa insiden.

3. **Migration `0031b_temp_widen_anon_grant_hasil_bulanan_src.sql`** — P0 EXCEPTION
   WIDENING SEMENTARA. Widen balik GRANT SELECT penuh table (semua kolum, termasuk 8 kolum
   Dalaman) untuk `anon` pada `hasil_bulanan` dan `hasil_bulanan_src`, supaya kod production
   sedia ada (select penuh) berfungsi semula tanpa perlu tunggu deploy kod baru. Disahkan
   berfungsi — fetch terus ke `dashboard-hasil-nolr.vercel.app` (bypass deployment protection)
   memulangkan data KPI sebenar.

4. **Isu berkaitan ditemui semasa regression check:** `public.dapatan` — anon ada GRANT
   penuh (`INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER`), bukan sekadar `SELECT`.
   RLS sudah block operasi tulis (tiada policy anon untuk INSERT/UPDATE/DELETE), jadi
   **bukan exploit aktif**, tapi over-grant tidak selari least-privilege.
   - **Migration `0033_revoke_excess_anon_grants_dapatan.sql`** — REVOKE
     INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER dari `anon`, kekalkan `SELECT` sahaja
     (diperlukan untuk fitur `/share` kongsi awam). Disahkan tidak pecahkan fitur sedia ada.
   - **Isu reka bentuk belum ditangani:** policy `"Baca dapatan untuk laporan kongsi awam"`
     guna `audit_ada_kongsi(audit_id)` yang semak "adakah audit ini ada kongsi aktif" sahaja,
     **tanpa validasi token eksplisit** — berbeza daripada `laporan` yang sudah RPC-only
     (`dapatkan_laporan_dengan_token`, di-harden `0026`/`0029`). Bermakna raw query terus
     boleh dapat data dari mana-mana audit yang sedang dikongsi tanpa perlu tahu token
     sebenar. **TANGGUH** — dimasukkan dalam semakan berjadual 2026-08-15.

## d. Status akhir hari ini

| Item | Status |
|---|---|
| Dashboard-hasil-nolr berfungsi | ✅ Disahkan (data KPI sebenar dipulangkan) |
| Migration 0031 (column-scoped, design kekal) | ✅ Applied, lulus verifikasi |
| Migration 0031b (widen sementara, P0 exception) | ✅ Applied — **AKTIF**, perlu ditamatkan |
| Migration 0033 (least-privilege dapatan) | ✅ Applied, lulus verifikasi |
| Kod front-end whitelist-select live di production | ❌ **BELUM DISAHKAN** — outstanding |
| Migration 0032 (RPC SECURITY DEFINER kekal) | 📄 Fail draf sedia ada di repo (`0032_hasil_bulanan_rpc_public.sql`), **belum diaktifkan/apply** |
| Isu token-validation `dapatan` share | ⚠️ Ditangguh, belum ditangani |

## e. Item outstanding (rujuk juga reminder berjadual 2026-08-15)

1. Sahkan (dengan commit SHA + deployment `target=production` sebenar) kod whitelist-select
   front-end sudah live — bukan andaian.
2. Selepas disahkan: ketatkan balik `hasil_bulanan`/`hasil_bulanan_src` ke column-scoped
   (0031) — REVOKE grant penuh 0031b.
3. Semak dan aktifkan `0032_hasil_bulanan_rpc_public.sql` sebagai penyelesaian kekal
   (gantikan pendekatan GRANT column-scoped sepenuhnya).
4. Pindah `dapatan` SELECT (anon) ke RPC-gated pattern sama seperti `laporan`
   (perlukan token eksplisit, bukan sekadar semak status kongsi).

## f. Migration yang dijalankan (susunan)

1. `0031_fix_hasil_bulanan_anon_dashboard.sql` — sudah wujud dalam repo sebelum insiden ini,
   diaplikasikan ke remote pada 2026-07-15.
2. `0031b_temp_widen_anon_grant_hasil_bulanan_src.sql` — dijalankan terus ke remote via
   Supabase MCP semasa insiden; fail tempatan dicipta selepas fakta untuk selaraskan sejarah.
3. `0033_revoke_excess_anon_grants_dapatan.sql` — sama seperti di atas.

**Nota rekonsiliasi:** Migration 0031b dan 0033 dijalankan terus ke database remote semasa
insiden aktif (guna Supabase MCP `apply_migration`) sebelum fail tempatan dicipta. Fail
tempatan ini ditulis selepas fakta untuk memastikan sejarah migration repo dan remote
selaras, ikut prinsip yang sama seperti `docs/audit/reconcile-supabase-migration-2026-07-12.md`.
Sila jalankan `supabase migration list` untuk sahkan status `applied` kedua-dua migration
di remote sepadan dengan fail tempatan ini.
