# TUGAS P — Laporan P1, P2, P3, P4 (3 Ogos 2026)

---

## P1: Siasat Pemanggil `dapatkan_qc_log` Merentas Kedua-Dua Repo

### Lingkup Penyelidikan
- Repo 1: `C:\Projects\mspo-audit` (migrasi + kod sumber)
- Repo 2: `C:\Projects\dashboard-hasil` (aplikasi dashboard)
- Dijarilah: `dapatkan_qc_log`, `qc_log`, `tulis_qc_log`, `dapatkan_audit_qc`

### Keputusan P1 — Pemanggil Produksi `dapatkan_qc_log`

**2 pemanggil produksi dijumpai (kedu-dua di dashboard-hasil):**

| # | Fail | Baris | Pemanggil | Peranan | Akses |
|---|------|-------|-----------|---------|-------|
| 1 | `app/qc/page.tsx` | 26 | `sb.rpc("dapatkan_qc_log", { p_limit: 30 })` | Dashboard QC awam | anon (via `getSupabase()` dengan anon key) |
| 2 | `app/api/qc-nightly/route.ts` | 81 | `admin.rpc("tulis_qc_log", {...})` | Cron malam tulis qc_log | service_role (cron-protected dengan `CRON_SECRET`) |

**0 pemanggil dijumpai di mspo-audit** — hanya definisi migrasi dan fail laporan.

### Pemanggil `tulis_qc_log`
- Hanya 1 pemanggil produksi: `app/api/qc-nightly/route.ts` (dashboard-hasil, baris 81)
- Menggunakan service_role key, dilindungi dengan `CRON_SECRET` bearer token
- Tiada pemanggil anon — selamat

### Pemanggil `dapatkan_audit_qc`
- Tiada pemanggil kod produksi dijumpai di kedua-dua repo
- Hanya ada dalam migrasi 0056 (definisi RPC) dan rollback

### Rujukan Tambahan di mspo-audit
| Fail | Baris | Peranan |
|------|-------|---------|
| `supabase/migrations/0054_rpc_4_tables.sql` | 120-149 | Definisi RPC + GRANT anon/authenticated |
| `supabase/migrations/0056_rpc_qc_nightly.sql` | 55-84 | Definisi `dapatkan_audit_qc` + `tulis_qc_log` |
| `supabase/migrations/0055_revoke_anon_select_4_rpc_dan_hasil_audit.sql` | 18 | REVOKE anon SELECT pada jadual qc_log |
| `scripts/lib-db.ps1` | 65 | Senarai jadual (rujukan bukan pemanggil) |
| `O2_O3_O4_REPORT.md` | 27,67,73 | Laporan audit terdahulu |

### Kesimpulan P1 + Cadangan
- `dapatkan_qc_log` mempunyai **1 pemanggil produksi yang bergantung pada anon EXECUTE**: halaman `/qc` di dashboard-hasil.
- **Cadangan: JANGAN revoke anon EXECUTE pada `dapatkan_qc_log`** — ia akan memecahkan dashboard QC awam.
- `tulis_qc_log` dan `dapatkan_audit_qc` tidak mempunyai pemanggil anon — selamat untuk di-revoke anon (sudah dilakukan dalam 0056).
- Akses log Supabase/PostgREST tidak dapat disahkan (tiada akses ke log akses API).

---

## P2: Peta Seni Bina Penuh /share

### Aliran Penuh (Langkah demi Langkah)

#### Langkah 1: Pengguna buka /share/[token]
- URL: `https://<domain>/share/<token>`
- Route file: `src/app/share/[token]/page.tsx` (369 baris)
- Tiada middleware yang melindungi laluan ini (tiada root-level `middleware.ts`)
- `/share` disenaraikan dalam `laluanAwam` di `src/lib/supabase/middleware.ts` (baris 41)

#### Langkah 2: Frontend menggunakan createPublicClient() (anon key)
- `src/lib/supabase/public.ts` — `createPublicClient()` menggunakan `createSupabaseClient` dengan **anon key**
- `auth.persistSession: false`, `autoRefreshToken: false`, `detectSessionInUrl: false`
- Tiada sesi pengguna — semua panggilan RPC dilaksanakan sebagai peranan `anon`

#### Langkah 3: Frontend memanggil 5 RPC secara bersamaan
Semua RPC dipanggil melalui `supabase.rpc()` dengan token sebagai parameter:

| RPC | Parameter | Tujuan |
|-----|-----------|--------|
| `dapatkan_laporan_dengan_token` | `{p_token: token}` | Ringkasan laporan (jumlah Y/N/NC/OFI/NA/Pending) |
| `dapatkan_audit_dengan_token` | `{p_token: token}` | Metadata audit |
| `dapatkan_po_dengan_token` | `{p_token: token}` | Maklumat pusat operasi |
| `dapatkan_pengguna_dengan_token` | `{p_token: token}` | Nama auditor |
| `dapatkan_dapatan_dengan_token` | `{p_token: token}` | Data dapatan (temuan) |

#### Langkah 4: RPC SECURITY DEFINER berjalan sebagai owner (postgres)
- Semua 5 RPC adalah `SECURITY DEFINER` — berjalan sebagai pemilik fungsi (postgres), bukan sebagai anon
- **RLS dilewati sepenuhnya** oleh RPC SECURITY DEFINER
- Setiap RPC memvalidasi token secara internal:
  - `sahkan_token_kongsi(TEXT)` — semak `l.token_kongsi = p_token` (bandingkan nilai sebenar)
  - `dapatkan_dapatan_dengan_token(TEXT)` — semak `l.token_kongsi = p_token AND l.kongsi_aktif = TRUE`
  - `dapatkan_audit_dengan_token(TEXT)` — semak token dalam laporan kongsi
  - `dapatkan_laporan_dengan_token(TEXT)` — semak token dalam laporan kongsi
  - `dapatkan_po_dengan_token(TEXT)` — semak token dalam laporan kongsi
  - `dapatkan_pengguna_dengan_token(TEXT)` — semak token dalam laporan kongsi

#### Langkah 5: Data dikembalikan ke frontend
- Hanya data yang berkaitan dengan token yang sah dikembalikan
- Jika token tidak sah, RPC mengembalikan array kosong `[]` (bukan error)

#### Langkah 6: PDF API Route
- `src/app/api/laporan/kongsi/[token]/pdf/route.tsx` — juga menggunakan `createPublicClient()` (anon key)
- Panggil 5 RPC yang sama untuk menjana PDF
- Cache-Control: `private, no-store`

### RLS pada Jadual `dapatan` (Sejarah Lengkap)

| Migrasi | Tindakan | Keterangan |
|---------|----------|------------|
| 0001 | CREATE POLICY "Akses dapatan" | Hanya authenticated (admin/lead_auditor/auditor) |
| 0018 | CREATE POLICY "Baca dapatan untuk laporan kongsi awam" TO anon | anon boleh baca jika audit ada kongsi aktif (IS NOT NULL) — **tiada validasi token** |
| 0022 | Gantikan dengan `audit_ada_kongsi(audit_id)` | SECURITY DEFINER mengelakkan recursion, tetapi masih tiada validasi token |
| 0026 | Kebalikan policy, tambah RPC `dapatkan_dapatan_dengan_token` | RPC validate token; policy kekal tanpa validasi token |
| 0033 | REVOKE INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER ON dapatan FROM anon | Hanya SELECT yang kekal untuk anon |
| 0030 | Catatan: "WAJIB kekal untuk /share RPC fallback" | Policy anon dikekalkan |

### Ujian Eksploitasi P2 (Bacaan Sahaja)

| Ujian | Endpoint | Hasil |
|-------|----------|-------|
| anon `.from('laporan').select()` | GET /rest/v1/laporan | **401** — permission denied |
| anon `.from('dapatan').select()` | GET /rest/v1/dapatan | **401** — permission denied |
| anon RPC `dapatkan_dapatan_dengan_token` dengan token tidak sah | POST /rest/v1/rpc/dapatkan_dapatan_dengan_token | **200** — mengembalikan `[]` |

### Kesimpulan P2
- **Aliran /share sepenuhnya bergantung pada RPC SECURITY DEFINER** — RLS bukan get utama.
- **RLS pada jadual dapatan adalah lapisan pertahanan kedua** — ia tidak pernah dipanggil oleh laluan /share (kerana RPC SECURITY DEFINER melewati RLS).
- **CWE-862 (audit_ada_kongsi hanya IS NOT NULL) tidak boleh dieksploitasi secara langsung** melalui REST API kerana anon tidak mempunyai SELECT pada jadual dapatan (401).
- **Namun**, jika ada lapisan lain yang membenarkan anon mengakses jadual dapatan terus (cth melalui RLS policy yang berbeza atau perubahan masa depan), kelemahan audit_ada_kongsi akan dieksploitasi.
- **Keselamatan semasa**: RPC `dapatkan_dapatan_dengan_token` memvalidasi token dengan betul. RLS policy pada dapatan tidak memvalidasi token tetapi juga tidak boleh diakses oleh anon melalui REST API.

---

## P3: Semak Definisi `audit_dapatan_oleh_pengguna`

### Keputusan: Fungsi TIDAK WUJUD

- `audit_dapatan_oleh_pengguna` **tidak wujud** dalam codebase.
- Ia dirujuk dalam `O2_O3_O4_REPORT.md` (baris 90) sebagai fungsi dari migrasi 0022, tetapi migrasi 0022 sebenarnya mendefinisikan:
  - `public.audit_ada_kongsi(uuid)` — semak jika audit ada kongsi aktif
  - `public.po_ada_kongsi(uuid)` — semak jika PO ada kongsi aktif
  - `public.auditor_ada_kongsi(uuid)` — semak jika auditor ada kongsi aktif
- Tiada `GRANT EXECUTE` untuk `audit_dapatan_oleh_pengguna` di mana-mana dalam codebase.
- Tiada rujukan dalam fail `.sql`, `.ts`, `.tsx`, `.md`, atau `.ps1` selain laporan O2-O3-O4 yang salah nama.

### Kemungkinan
- Nama fungsi mungkin tertukar dalam laporan terdahulu.
- Fungsi yang dimaksudkan mungkin `audit_ada_kongsi` (yang wujud dalam 0022).
- Atau fungsi ini pernah dirancang tetapi tidak pernah diimplementasikan.

### Cadangan
- Semak semula `O2_O3_O4_REPORT.md` baris 90 dan ganti nama kepada `audit_ada_kongsi` jika itu adalah fungsi yang dirujuk.

---

## P4: Senarai Penuh Kesan Default Privilege

### 4a. Fungsi dengan anon EXECUTE via GRANT EKSPLISIT (SELAMAT — 18 fungsi)

Fungsi-fungsi ini mempunyai `GRANT EXECUTE ON FUNCTION ... TO anon` yang jelas dalam fail migrasi. Mereka tidak bergantung pada default privilege.

| # | Nama Fungsi (tepat) | Migrasi | Baris | Grantee |
|---|---------------------|---------|-------|---------|
| 1 | `public.audit_ada_kongsi(uuid)` | 0022 | 101 | anon, authenticated |
| 2 | `public.po_ada_kongsi(uuid)` | 0022 | 102 | anon, authenticated |
| 3 | `public.auditor_ada_kongsi(uuid)` | 0022 | 103 | anon, authenticated |
| 4 | `public.dapatkan_laporan_dengan_token(TEXT)` | 0026 | 69 | anon, authenticated |
| 5 | `public.sahkan_token_kongsi(TEXT)` | 0026 | 89 | anon, authenticated |
| 6 | `public.dapatkan_audit_dengan_token(TEXT)` | 0026 | 209 | anon, authenticated |
| 7 | `public.dapatkan_dapatan_dengan_token(TEXT)` | 0026 | 245 | anon, authenticated |
| 8 | `public.dapatkan_hasil_bulanan()` | 0031 | 194 | anon, authenticated |
| 9 | `public.dapatkan_hasil_src(int)` | 0031 | 215 | anon, authenticated |
| 10 | `public.dapatkan_hasil_bulanan_awam(int)` | 0032 | 62 | anon, authenticated |
| 11 | `public.dapatkan_hasil_bulanan_src_awam(int, text)` | 0032 | 112 | anon, authenticated |
| 12 | `public.dapatkan_hasil_wilayah_agregat(int)` | 0032 | 149 | anon, authenticated |
| 13 | `public.dapatkan_projek_ref(int, int, int, text)` | 0054 | 47 | anon, authenticated |
| 14 | `public.dapatkan_po_dengan_token(TEXT)` | 0029 | 92 | anon, authenticated |
| 15 | `public.dapatkan_pengguna_dengan_token(TEXT)` | 0029 | 124 | anon, authenticated |
| 16 | `public.dapatkan_projek_pembangunan_ref(int, int, int)` | 0054 | 85 | anon (terpisah) |
| 17 | `public.dapatkan_matlamat_projek(text, int, int)` | 0054 | 116 | anon (terpisah) |
| 18 | `public.dapatkan_qc_log(int, int)` | 0054 | 148 | anon (terpisah) |

### 4b. Fungsi dengan anon EXECUTE hanya via DEFAULT PRIVILEGE (TIDAK SELAMAT — 6 fungsi)

Fungsi-fungsi ini TIDAK mempunyai `GRANT EXECUTE TO anon` dalam mana-mana migrasi. Mereka menerima anon EXECUTE secara automatik daripada PostgreSQL default privilege untuk peranan postgres di schema public.

| # | Nama Fungsi (tepat) | Migrasi | Hanya GRANT ke authenticated? | Nota |
|---|---------------------|---------|-------------------------------|------|
| 1 | `public.set_dikemaskini_pada()` | 0001 | Ya (trigger function) | Tiada grant eksplisit — anon EXECUTE via default |
| 2 | `public.handle_pengguna_baru()` | 0001 | Ya (trigger function) | Tiada grant eksplisit — anon EXECUTE via default |
| 3 | `public.rol_semasa()` | 0001 | Ya (RLS helper) | Tiada grant eksplisit — anon EXECUTE via default |
| 4 | `public.boleh_akses_bukti(uuid)` | 0027 | Ya — `GRANT EXECUTE TO authenticated` sahaja | anon EXECUTE via default |
| 5 | `public.adalah_ahli_audit(uuid)` | 0028 | Ya — `GRANT EXECUTE TO authenticated` sahaja | anon EXECUTE via default |
| 6 | `public.adalah_lead_atau_admin()` | 0028 | Ya — `GRANT EXECUTE TO authenticated` sahaja | anon EXECUTE via default |

### 4c. Fungsi dengan anon EXECUTE Secara Eksplisit Di-revoke (2 fungsi)

| # | Nama Fungsi (tepat) | Migrasi | Baris | Tindakan |
|---|---------------------|---------|-------|----------|
| 1 | `public.dapatkan_audit_qc(timestamptz)` | 0056 | 53-54 | REVOKE FROM PUBLIC + FROM anon |
| 2 | `public.tulis_qc_log(int, int, int, jsonb)` | 0056 | 82-83 | REVOKE FROM PUBLIC + FROM anon |

### 4d. Fungsi dalam Rollback Saja (1 fungsi)

| # | Nama Fungsi (tepat) | Fail | Nota |
|---|---------------------|------|------|
| 1 | `public.prefill_dapatan_audit(uuid)` | rollback_0057.sql | Emergency rollback — forward migration 0057 telah REVOKE anon |

### 4e. Jaring Keselamatan yang Dicadangkan (SEBELUM Buang Default Privilege)

Jika `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC` akan dijalankan, 6 fungsi di atas akan kehilangan anon EXECUTE. Untuk mengelakkan gangguan, tambah jaring keselamatan berikut dalam migrasi baharu:

```sql
-- Jaring keselamatan: kekalkan anon EXECUTE untuk fungsi yang bergantung pada default privilege
-- FUNGSI YANG PERLU DIPELIHARA (jika masih diperlukan oleh anon):
GRANT EXECUTE ON FUNCTION public.boleh_akses_bukti(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.adalah_ahli_audit(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.adalah_lead_atau_admin() TO anon;
-- FUNGSI YANG TIDAK PERLU anon EXECUTE (biasanya trigger/helper):
-- set_dikemaskini_pada(), handle_pengguna_baru(), rol_semasa() — tidak perlu grant anon
```

### 4f. Ringkasan P4

| Kategori | Bilangan | Selamat? |
|----------|----------|----------|
| Fungsi dengan anon EXECUTE via GRANT EKSPLISIT | 18 | ✅ Ya |
| Fungsi dengan anon EXECUTE hanya via DEFAULT PRIVILEGE | 6 | ❌ Tidak — akan hilang jika default privilege diubah |
| Fungsi dengan anon EXECUTE secara eksplisit di-revoke | 2 | N/A — sengaja dibuang |
| Fungsi dalam rollback sahaja | 1 | N/A — emergency only |

---

## Ringkasan Keseluruhan TUGAS P

| Tugas | Status | Keputusan Utama |
|-------|--------|-----------------|
| P1 | ✅ Selesai | `dapatkan_qc_log` ada 1 pemanggil produksi anon (dashboard QC). JANGAN revoke. |
| P2 | ✅ Selesai | /share RPC-only, anon tidak boleh akses dapatan terus (401). CWE-862 teori sahaja. |
| P3 | ✅ Selesai | `audit_dapatan_oleh_pengguna` tidak wujud — rujukan dalam laporan O2-O4 adalah salah nama. |
| P4 | ✅ Selesai | 18 fungsi selamat (explicit grant), 6 fungsi tidak selamat (default privilege only). |