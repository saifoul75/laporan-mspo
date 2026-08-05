# Garis Dasar ACL — 2026-08-05

**Tarikh:** 2026-08-05
**Tujuan:** Rekod mentah keadaan ACL selepas migrasi 0060–0064 untuk audit kemudian. Tiada kredensial, tiada rentetan sambungan.

## Nota kaedah
Audit grant menggunakan `aclexplode` pada `pg_class`/`pg_proc`, BUKAN `information_schema` (information_schema buta pada privilege MAINTAIN — itu yang terlepas dalam audit 0049–0055).

---

## A1 — pg_default_acl selepas 0064 (dipecahkan baris)

Terdapat **3 role berbeza** memiliki entri: `postgres`, `supabase_admin`, `supabase_auth_admin`.

Entri skema public:

| oid | pemilik_entri | jenis | penerima | privilege_type |
|-----|---------------|-------|----------|----------------|
| 16492 | postgres | r | authenticated | MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT, INSERT |
| 16492 | postgres | r | postgres | INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN |
| 16492 | postgres | r | service_role | SELECT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, INSERT |
| 16493 | postgres | f | authenticated | EXECUTE |
| 16493 | postgres | f | postgres | EXECUTE |
| 16493 | postgres | f | service_role | EXECUTE |
| 16494 | postgres | S | authenticated | SELECT, USAGE, UPDATE |
| 16494 | postgres | S | postgres | USAGE, UPDATE, SELECT |
| 16494 | postgres | S | service_role | USAGE, UPDATE, SELECT |
| 16495 | supabase_admin | S | anon | SELECT, USAGE, UPDATE |
| 16495 | supabase_admin | S | authenticated | USAGE, UPDATE, SELECT |
| 16495 | supabase_admin | S | postgres | SELECT, UPDATE, USAGE |
| 16495 | supabase_admin | S | service_role | SELECT, UPDATE, USAGE |
| 16496 | supabase_admin | r | anon | INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN |
| 16496 | supabase_admin | r | authenticated | SELECT, INSERT, DELETE, UPDATE, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE |
| 16496 | supabase_admin | r | postgres | SELECT, INSERT, UPDATE, DELETE, TRUNCATE, MAINTAIN, TRIGGER, REFERENCES |
| 16496 | supabase_admin | r | service_role | INSERT, UPDATE, SELECT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE |
| 16497 | supabase_admin | f | anon | EXECUTE |
| 16497 | supabase_admin | f | authenticated | EXECUTE |
| 16497 | supabase_admin | f | postgres | EXECUTE |
| 16497 | supabase_admin | f | service_role | EXECUTE |

**Pemerhatian:** Entri `postgres` (16492/16493/16494) sudah bersih daripada `anon` (dibersihkan oleh 0064). Entri `supabase_admin` (16495/16496/16497) **masih memberi `anon`** — tetapi lihat A2: tiada objek projek dimiliki `supabase_admin`, jadi entri ini tidak terpakai untuk objek sedia ada.

---

## A2 — Pemilik objek dalam projek

Objek rel (jadual/view/sequence):
```
 pemilik  | relkind | count 
----------+---------+-------
 postgres | S       |     9
 postgres | r       |    30
 postgres | v       |     9
```

Fungsi:
```
 pemilik  | count 
----------+-------
 postgres |    38
```

**Semua objek dan fungsi dimiliki `postgres`.** Tiada satu pun milik `supabase_admin`. Entri default ACL `supabase_admin` tidak terpakai untuk objek sedia ada — risiko teori sahaja. Ia hanya menjadi nyata jika objek baharu dicipta oleh `supabase_admin` (contoh melalui Supabase Dashboard).

---

## A3 — Ujian fungsi baharu (keputusan muktamad)

```
BEGIN
CREATE FUNCTION
            proname             |                                       proacl                                       | anon | awam 
--------------------------------+------------------------------------------------------------------------------------+------+------
 ujian_default_acl_fungsi_buang | {=X/postgres,postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | t    | t
(1 row)
ROLLBACK
```
Fungsi tidak wujud selepas ROLLBACK: `bil = 0`.

**Kesimpulan A3:** Fungsi baharu yang dicipta oleh `postgres` MASIH mendapat `=X/postgres` (**PUBLIC EXECUTE**) — `anon = t`, `awam = t`. Ini ialah tingkah laku default PostgreSQL itu sendiri, BUKAN ketidakpadanan role. Anomali TUGAS U/V **tidak** sepenuhnya dijelaskan oleh entri per-role. **Tiket sokongan KEKAL diperlukan** untuk PUBLIC EXECUTE pada fungsi baharu.

---

## A4 — Cuba ubah entri supabase_admin

```
BEGIN;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ROLLBACK;
```
**Ralat PENUH:**
```
ERROR:  permission denied to change default privileges
```
`postgres` (bukan superuser) TIDAK boleh meminda entri `supabase_admin`. Lubang ini tidak boleh ditutup oleh kita tanpa kredensial `supabase_admin` atau tindakan di dashboard.

---

## B1a — Grant anon pada objek (garis dasar penuh)

```
            relname            | relkind | privilege_type 
-------------------------------+---------+----------------
 dividen_bulanan_id_seq        | S       | USAGE
 dividen_bulanan_id_seq        | S       | UPDATE
 dividen_bulanan_id_seq        | S       | SELECT
 hasil_audit_id_seq            | S       | SELECT
 hasil_audit_id_seq            | S       | UPDATE
 hasil_audit_id_seq            | S       | USAGE
 hasil_bulanan_id_seq          | S       | UPDATE
 hasil_bulanan_id_seq          | S       | USAGE
 hasil_bulanan_id_seq          | S       | SELECT
 hasil_harian_id_seq           | S       | USAGE
 hasil_harian_id_seq           | S       | SELECT
 hasil_harian_id_seq           | S       | UPDATE
 projek_pembangunan_ref_id_seq | S       | USAGE
 projek_pembangunan_ref_id_seq | S       | SELECT
 projek_pembangunan_ref_id_seq | S       | UPDATE
 projek_ref_id_seq             | S       | USAGE
 projek_ref_id_seq             | S       | UPDATE
 projek_ref_id_seq             | S       | SELECT
 qc_log_id_seq                 | S       | USAGE
 qc_log_id_seq                 | S       | UPDATE
 qc_log_id_seq                 | S       | SELECT
 seq_no_nc                     | S       | SELECT
 seq_no_nc                     | S       | UPDATE
 seq_no_nc                     | S       | USAGE
 seq_no_ofi                    | S       | USAGE
 seq_no_ofi                    | S       | UPDATE
 seq_no_ofi                    | S       | SELECT
(27 rows)
```

**Catatan:** 27 baris ini SEMUA pada **sequences** (jenis `S`), BUKAN jadual/view. Ini warisan default ACL sequence (`anon=rwU`) yang tidak dibersihkan oleh 0064 (yang menyasarkan `r` dan `f`). Risiko: anon boleh membaca/mengemas kini nilai sequence (risiko rendah, tetapi adalah sisa). Calon pembersihan 0065.

---

## B1b — Fungsi yang anon DIBENARKAN laksana (senarai rasmi)

```
             proname             |                                  args                                  
---------------------------------+------------------------------------------------------------------------
 audit_ada_kongsi                | p_audit_id uuid
 auditor_ada_kongsi              | p_pengguna_id uuid
 dapatkan_audit_dengan_token     | p_token text
 dapatkan_dapatan_dengan_token   | p_token text
 dapatkan_dividen_bulanan_awam   | p_tahun_min integer
 dapatkan_harian_awam            | p_tahun_min integer
 dapatkan_hasil_bulanan_awam     | p_tahun_min integer
 dapatkan_hasil_bulanan_src_awam | p_tahun_min integer, p_jenis text
 dapatkan_hasil_wilayah_agregat  | p_tahun integer
 dapatkan_laporan_dengan_token   | p_token text
 dapatkan_matlamat_projek        | p_jenis text, p_offset integer, p_limit integer
 dapatkan_pengguna_dengan_token  | p_token text
 dapatkan_penyelia_agregat_awam  | p_tahun_min integer
 dapatkan_po_dengan_token        | p_token text
 dapatkan_projek_pembangunan_ref | p_tahun_min integer, p_offset integer, p_limit integer
 dapatkan_projek_ref             | p_tahun_min integer, p_offset integer, p_limit integer, p_urutkan text
 dapatkan_qc_log                 | p_limit integer, p_offset integer
 fn_ada_laporan_kongsi           | p_audit_id uuid
 fn_kira_cap_due_date            | gred gred_nc, tarikh_asal date
 fn_kira_gred_basis              | p_audit_id uuid
 fn_lock_audit_muktamad          | 
 jana_no_rujukan                 | p_jenis text, p_tahun integer
 po_ada_kongsi                   | p_po_id uuid
 sahkan_token_kongsi             | p_token text
 trg_hasil_audit                 | 
(25 rows)
```

**Pengesahan setiap satu:**
- **5 RPC token** (`dapatkan_audit/po/pengguna/dapatan/laporan_dengan_token`) — disengajakan untuk laluan awam `/share`.
- **RPC awam dashboard** (`dapatkan_dividen_bulanan_awam`, `dapatkan_harian_awam`, `dapatkan_hasil_bulanan_awam`, `dapatkan_hasil_bulanan_src_awam`, `dapatkan_hasil_wilayah_agregat`, `dapatkan_matlamat_projek`, `dapatkan_penyelia_agregat_awam`, `dapatkan_projek_pembangunan_ref`, `dapatkan_projek_ref`, `dapatkan_qc_log`) — disengajakan untuk dashboard-hasil.
- **Helper perkongsian** (`sahkan_token_kongsi`, `audit_ada_kongsi`, `auditor_ada_kongsi`, `po_ada_kongsi`, `fn_ada_laporan_kongsi`) — disengajakan untuk ciri kongsi.
- **FUNGSI YANG PERLU DINILAI SEMULA (kemungkinan tidak disengajakan):**
  - `fn_kira_cap_due_date` — pembantu pengiraan CAP, sepatutnya dalaman
  - `fn_kira_gred_basis` — pembantu pengiraan gred, sepatutnya dalaman
  - `fn_lock_audit_muktamad` — pembantu kunci audit, sepatutnya dalaman
  - `jana_no_rujukan` — penjana nombor rujukan, sepatutnya dalaman
  - `trg_hasil_audit` — fungsi trigger, sepatutnya dalaman
  - `dapatkan_qc_log` — log QC, sepatutnya dalaman (telah disasarkan oleh 0056 untuk revoke anon)

Ini calon untuk dinilai dalam migrasi pembersihan fungsi akan datang.
