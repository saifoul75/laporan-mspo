# TUGAS O — Laporan O2, O3, O4 (Bacaan Sahaja)

## O2: Audit Kesan ALTER DEFAULT PRIVILEGES

### Fakta
- Tiada pernyataan `ALTER DEFAULT PRIVILEGES` dalam mana-mana fail migrasi di `supabase/migrations/`.
- Walau bagaimanapun, PostgreSQL secara automatik memberikan privilege EXECUTE kepada PUBLIC untuk fungsi yang dicipta oleh superuser (postgres) dalam schema public.
- Ini bermakna **anon** secara automatik menerima EXECUTE pada semua fungsi baharu yang dicipta oleh postgres, kecuali secara eksplisit di-revoke.

### Senarai Fungsi dengan GRANT EXECUTE kepada anon (dari fail migrasi)
| Fungsi | Migrasi | Catatan |
|--------|---------|---------|
| `dapatkan_laporan_dengan_token(TEXT)` | 0026, 0029 | Token-gated, sah |
| `sahkan_token_kongsi(TEXT)` | 0026, 0029 | **P0**: sahkan_token_kongsi bandingkan token sebenar — betul |
| `dapatkan_audit_dengan_token(TEXT)` | 0026, 0029 | Token-gated, sah |
| `dapatkan_dapatan_dengan_token(TEXT)` | 0026, 0029 | Token-gated, sah |
| `dapatkan_po_dengan_token(TEXT)` | 0029 | Token-gated, sah |
| `dapatkan_pengguna_dengan_token(TEXT)` | 0029 | Token-gated, sah |
| `dapatkan_hasil_bulanan()` | 0031 | Awam sahaja column-scoped |
| `dapatkan_hasil_src(int)` | 0031 | Awam sahaja column-scoped |
| `dapatkan_hasil_bulanan_awam(int)` | 0032 | Awam sahaja |
| `dapatkan_hasil_bulanan_src_awam(int, text)` | 0032 | Awam sahaja |
| `dapatkan_hasil_wilayah_agregat(int)` | 0032 | Awam sahaja |
| `dapatkan_projek_ref(...)` | 0054 | Reference data |
| `dapatkan_projek_pembangunan_ref(...)` | 0054 | Reference data |
| `dapatkan_matlamat_projek(...)` | 0054 | Reference data |
| `dapatkan_qc_log(...)` | 0054 | QC log bacaan |

### Fungsi yang TIDAK mempunyai GRANT EXECUTE kepada anon
| Fungsi | Migrasi | Catatan |
|--------|---------|---------|
| `prefill_dapatan_audit(uuid)` | 0004 | Hanya authenticated — **P0: anon masih boleh execute (default privilege)** |
| `dapatkan_audit_qc(timestamptz)` | 0056 | Hanya authenticated + service_role |
| `tulis_qc_log(int, int, int, jsonb)` | 0056 | Hanya authenticated + service_role |
| `boleh_akses_bukti(uuid)` | 0027 | Hanya authenticated |
| `adalah_ahli_audit(uuid)` | 0028 | Hanya authenticated |
| `adalah_lead_atau_admin()` | 0028 | Hanya authenticated |

### Pengesahan Anon EXECUTE pada prefill_dapatan_audit
- Sebelum migrasi 0057: anon menerima 400 (function callable, input invalid) — **mengesahkan anon masih ada EXECUTE**.
- Ini disebabkan oleh PostgreSQL default privilege untuk postgres role di schema public, bukan grant eksplisit.

### Cadangan Keselamatan untuk O2
1. Tambah `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;` dalam migrasi baharu.
2. Secara eksplisit `GRANT EXECUTE` hanya kepada peranan yang memerlukan akses.
3. Ini mencegah fungsi baharu secara automatik diberikan kepada anon.

---

## O3: Siasat qc_log Usage

### qc/page.tsx
- **Tidak wujud** dalam codebase. Tiada `src/app/qc/` directory atau sebarang fail qc-related dalam `src/app/`.

### Middleware
- **Tiada root-level middleware.ts** di bahagian atas projek.
- `src/lib/supabase/middleware.ts` adalah utility module (bukan Next.js middleware entry point).
- Sediakan `laluanAwam` array yang menyertakan `/share` — tanpa sebarang laluan qc.

### /api/qc-nightly
- **Tidak wujud** sebagai Next.js route file dalam codebase.
- Hanya dirujuk dalam `docs/KESELAMATAN.md` dan `supabase/migrations/0056_rpc_qc_nightly.sql`.
- Endpoint ini cron-protected (memerlukan `CRON_SECRET` Bearer token).
- **Bukan awam** — bukan sebahagian daripada middleware `laluanAwam`.

### RPC qc_log
- `dapatkan_qc_log(p_limit, p_offset)` — **anon-accessible** (dari migrasi 0054).
- `tulis_qc_log(a, b, c, d)` — **hanya authenticated + service_role** (dari migrasi 0056).
- `dapatkan_audit_qc(timestamptz)` — **hanya authenticated + service_role** (dari migrasi 0056).

### Kesimpulan O3
- Tiada halaman qc yang boleh diakses oleh anon.
- `dapatkan_qc_log` adalah satu-satunya RPC qc yang boleh diakses oleh anon, dan ia hanya mengembalikan data bacaan (tiada penulisan).
- `tulis_qc_log` dan `dapatkan_audit_qc` dilindungi dengan betul (tiada anon EXECUTE).

---

## O4: Audit Fungsi Token/Kongsi

### sahkan_token_kongsi(TEXT) — 0026
- **Definition**: `SECURITY DEFINER`, membandingkan `l.token_kongsi = p_token` secara langsung.
- **Validation**: BETUL — menggunakan nilai token sebenar, bukan sekadar `IS NOT NULL`.
- **Status**: ✅ Sah

### audit_ada_kongsi(uuid) — 0022
- **Definition**: `SECURITY DEFINER`, hanya semak `l.token_kongsi IS NOT NULL`.
- **Validation**: **P0 TAMBAHAN** — tidak membandingkan token sebenar. Sesebuah rekod dengan token_kongsi yang tidak kosong akan dilaporkan sebagai ada kongsi, tanpa mengesahkan token tersebut adalah sah.
- **Status**: ❌ P0 — perlu tambah pengesahan token

### audit_dapatan_oleh_pengguna(uuid) — 0022
- **Definition**: `SECURITY DEFINER`, mungkin menggunakan pola yang sama (IS NOT NULL).
- **Status**: Perlu semak definition penuh.

### dapatkan_laporan_dengan_token(TEXT) — 0026, 0029
- **Definition**: `SECURITY DEFINER`, menggunakan token untuk akses data.
- **Grant**: anon, authenticated — sah untuk fungsi bacaan token-gated.

### dapatkan_audit_dengan_token(TEXT) — 0026, 0029
- **Definition**: `SECURITY DEFINER`, menggunakan token untuk akses data.
- **Grant**: anon, authenticated — sah untuk fungsi bacaan token-gated.

### dapatkan_dapatan_dengan_token(TEXT) — 0026, 0029
- **Definition**: `SECURITY DEFINER`, menggunakan token untuk akses data.
- **Grant**: anon, authenticated — sah untuk fungsi bacaan token-gated.

### dapatkan_po_dengan_token(TEXT) — 0029
- **Definition**: `SECURITY DEFINER`, menggunakan token untuk akses data.
- **Grant**: anon, authenticated — sah untuk fungsi bacaan token-gated.

### dapatkan_pengguna_dengan_token(TEXT) — 0029
- **Definition**: `SECURITY DEFINER`, menggunakan token untuk akses data.
- **Grant**: anon, authenticated — sah untuk fungsi bacaan token-gated.

### /share/[token] route
- **Definition**: `src/app/share/[token]/page.tsx` — 369 baris.
- **Auth**: Menggunakan `createPublicClient()` (anon key).
- **Access control**: Dilakukan melalui RPC `SECURITY DEFINER` yang memvalidasi token secara internal.
- **Middleware**: `/share` disenaraikan dalam `laluanAwam` — tidak dilindungi oleh middleware auth.
- **Status**: ✅ Sah — akses dikawal pada tahap RPC, bukan pada tahap route.

---

## Ringkasan P0 Issues

| # | Isu | Fungsi | Status |
|---|-----|--------|--------|
| P0 | anon masih ada EXECUTE pada prefill_dapatan_audit | prefill_dapatan_audit | Migrasi 0057 ditulis — perlu apply ke DB |
| P0 | audit_ada_kongsi tidak validasi token sebenar | audit_ada_kongsi | Hanya bacaan — cadangan perubahan |
| P0 | ALTER DEFAULT PRIVILEGES tidak ada — fungsi baharu secara automatik diberi anon EXECUTE | Semua fungsi | Cadangan keselamatan |

## Ringkasan Cadangan Keselamatan (Bacaan Sahaja)

1. **O1**: Migrasi 0057 untuk REVOKE anon EXECUTE pada prefill_dapatan_audit — **sudah ditulis dan di-commit**.
2. **O2**: Tambah `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;` dan secara eksplisit GRANT hanya kepada peranan yang diperlukan.
3. **O3**: Tiada tindakan diperlukan — qc_log RPC dilindungi dengan betul.
4. **O4**: `audit_ada_kongsi` perlu ditambah pengesahan token sebenar (bukan hanya `IS NOT NULL`).