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

## 9. Rekod Putaran Kunci Staging — 15 Julai 2026

* **Tarikh:** 15 Julai 2026 15:57 MYT (live audit)
* **Sebab:** Backup `D:\BACKUP MSPO\backup-2026-05-28_16-52` mengandungi `.env.local` + `pooler-url`
* **Skop:** Staging sahaja — production HOLD
* **Kunci diputar (zero-downtime):**
  * `SUPABASE_SERVICE_ROLE_KEY` — Supabase Dashboard Reset JWT Secret
  * `NEXT_PUBLIC_SUPABASE_ANON_KEY` — reset bersama JWT
  * `SUPABASE_DB_URL` (Pooler) — password reset
  * `GMAIL_APP_PASSWORD` — Google App Passwords RISDA Staging
  * `CRON_SECRET` — `crypto.randomBytes(32)` hex
* **Vercel Staging Env:** Update Preview+Development, redeploy no-cache
* **Verify:** /dashboard 200, /audit baca OK, anon SELECT laporan =0, /share palsu 404 sah 200, Org A vs Audit B 403, `Bearer OLD /api/qc-nightly` 401 `Bearer NEW` 200
* **Pembersihan:** `backup-2026-05-28_16-52` Shift+Del kekal, `Test-Path` False verified 15 Julai 2026 16:02 MYT
* **Dokumen prosedur:** `docs/ROTATION_KUNCI_STAGING.md`

## 10. Pemantauan 24 Jam Staging

* **Jam 0-1:** Tiada OOM, tiada ECONNREFUSED KV, tiada log dedah token_kongsi/pooler-url/stack trace
* **Rate Limit:** Tanpa KV log AMARAN MemoryStore fallback expected, dengan KV warning hilang + 429 distributed verified
* **Status:** LULUS BERSYARAT staging, HOLD production

## 11. Risiko Baki

* Offline Dexie tidak encrypted — mitigasi CSP.
* Storage LIKE tidak 100% strict — enforce path konvensyen di apps-script upload.
* CSP masih unsafe-inline/unsafe-eval (Next.js perlukan).
