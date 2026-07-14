# Panduan Keselamatan — mspo-audit

## 1. RLS dan Token Kongsi

* `laporan` table: anon TIADA SELECT langsung. Hanya via RPC:
  * `dapatkan_laporan_dengan_token(p_token)`
  * `dapatkan_audit_dengan_token(p_token)`
  * `dapatkan_dapatan_dengan_token(p_token)`
  * `dapatkan_po_dengan_token(p_token)`
  * `dapatkan_pengguna_dengan_token(p_token)`
  * `sahkan_token_kongsi(p_token)`
* `/share/[token]` dan `/api/laporan/kongsi/[token]/pdf` guna RPC-only, tidak `.from("laporan").eq(token)`.

## 2. Hasil Bulanan

* `hasil_bulanan` dan `hasil_bulanan_src`: `authenticated` sahaja. Anon hanya agregat `v_wilayah`, `v_hq`.

## 3. IDOR

* Semua server action wajib `semakAksesAudit(auditId, userId)`:
  * admin / lead_auditor / auditor role global, atau
  * lead assigned (`lead_auditor_id`), atau
  * po_user dalam PO sama.
* `sahCap` / `verifyCap`: validate `nc.audit_id === auditId`
* `diaudit_oleh`: dari `auth.uid()` di sync, bukan payload client.

## 4. Storage bukti-audit

* Policy ketat: LIKE `dapatan_id/%` + membership check.
* Konvensyen path: `{dapatan_id}/{filename}`.

## 5. Proxy / Middleware

* `/hasil` dilindungi, tiada bypass.
* Middleware fail-closed 500 di production jika env missing.

## 6. Backup

* `backup.ps1` exclude `.env*`, `supabase/.temp`, `.vercel`, `.kilo`, `*.key/pem/p12`.
* Generate `MANIFEST.txt` SHA256.
* Semak backup lama: `.\scripts\check-backup-secrets.ps1 -Path "D:\BACKUP MSPO\"`

## 7. Token Kongsi

* Generate: `crypto.randomUUID()` — 122-bit entropy.
* Revokable: `janaSemulaTautan()` dan `nyahaktifkanKongsi()`.
* Regex public: `^[a-zA-Z0-9_-]{8,}$`
* Tidak log.

## 8. Langkah Deploy

1. `supabase db push` ke staging, verify `pg_policies`:
```sql
SELECT policyname, roles, cmd FROM pg_policies WHERE tablename='laporan';
-- mesti TIADA roles {anon} untuk SELECT selepas 0029
SELECT routine_name FROM information_schema.routines
WHERE routine_name LIKE '%dengan_token%';
```
2. Test anon:
```sql
-- sebagai anon via JS: supabase.rpc('dapatkan_laporan_dengan_token', {p_token:'fake'})
-- mesti return []
-- supabase.from('laporan').select('*') mesti 0 rows
```
3. Putar rahsia jika backup lama bocor.

## 9. Risiko Baki

* Offline Dexie tidak encrypted — mitigasi CSP.
* Storage LIKE tidak 100% strict — enforce path konvensyen di apps-script upload.
