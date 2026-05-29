# PROGRESS — MSPO Audit System

> Log progress untuk kerja Fasa 3 (Modul 3.1 - 3.4) sistem audit MSPO.
> Tarikh kemaskini terakhir: 29 Mei 2026
>
> **Update 29/5:** Crosscheck Guidance MS2530-2-2:2022 → jumpa 12 indicator missing (4.4.3 +9, 4.4.1 +2, 4.2.3 +1). Migration `0015` ditambah — 74 → 86 item_semakan. PPTX route.ts refactor guna slide-queue pattern.
>
> **Cara guna:** Bila buka sesi Kilo baru, taip _"Baca PROGRESS.md dan sambung kerja dari task yang belum siap"_.

---

## Stack & Konteks

- **Repo:** `C:\Projects\mspo-audit`
- **Stack:** Next.js 14 App Router · Supabase SSR (PG17) · @react-pdf/renderer · Dexie · Tailwind + shadcn/ui
- **Supabase project:** `lbklwflwiujdnuricxbt`
- **Dev server:** `npm run dev` → http://localhost:3000
- **Briefing folder:** `D:\JANET COWORKER\` (spec + SQL reference untuk Janet)

### Tools yang dah install di mesin ini
- Scoop package manager (`%USERPROFILE%\scoop\`)
- Supabase CLI v2.101.0 (logged in + linked)

---

## 🚀 PANDUAN PENGGUNA RINGKAS

### Cara cipta audit baru + assign Lead/Auditor
1. Login → klik **Audit** di sidebar → klik **+ Audit Baru**
2. Pilih **Pusat Operasi** dari dropdown
3. Pilih **Lead Auditor** (default = anda sendiri kalau anda admin/lead_auditor)
4. Tick **Auditor Pembantu** lain dari senarai checkbox
5. Isi tarikh mula + jenis audit
6. Klik **Cipta & Mula Checklist**

### Cara muktamadkan audit (Closing Modul 3.4)
1. Login sebagai **Lead Auditor** atau **Admin** untuk audit tersebut
2. Buka audit dari senarai → page detail
3. Pastikan status audit **bukan** `draf` (kena Mula Audit dulu kalau masih draf)
4. Pastikan **tiada dapatan Pending** (semua item checklist mesti dijawab)
5. Panel kuning **"Mulakan Closing"** akan muncul di atas page (selepas badge status)
6. Klik **Mulakan Closing** → preview gred (Auto-detect Major/Minor) + tarikh akhir CAP
7. Pilih mode:
   - **Auto** → sistem ambil gred tertinggi dari dapatan
   - **Manual Override (Lead Auditor)** → boleh turun gred dengan reason wajib (min 10 aksara)
8. Klik **Muktamadkan Sekarang**
9. Page refresh — badge countdown muncul di atas

### Bila panel Closing tidak muncul?
| Sebab | Penyelesaian |
|-------|--------------|
| Anda bukan Admin / Lead Auditor untuk audit ini | Login sebagai Lead Auditor yang betul |
| Audit status `draf` | Klik Buka Checklist, mula isi dapatan supaya status auto-tukar ke `sedang_dijalankan` |
| Audit status `selesai` / `dibatalkan` | Audit dah closed — buat audit baru kalau perlu |
| Audit dah dimuktamadkan sebelum ini | Badge countdown akan tunjuk; tak boleh ulang |
| Ada dapatan masih Pending | Buka checklist, jawab semua item (Y/N/NC/OFI/NA) |

### Cara reset audit untuk re-test (developer only)
```sql
-- Run di Supabase SQL Editor
update public.audit
   set status                    = 'sedang_dijalankan',
       tarikh_muktamad           = null,
       cap_due_date              = null,
       cap_due_days              = null,
       cap_grade_basis           = null,
       cap_grade_source          = null,
       cap_grade_override_reason = null,
       cap_grade_overridden_by   = null,
       cap_grade_overridden_at   = null
 where id = '<audit_id>';
```

---

## ✅ KERJA SIAP

### Sesi 28 Mei 2026 (Sesi Petang — Kilo)

#### 5. Modul 3.5 — CAP Submission UI
- `src/app/(dashboard)/audit/[id]/cap/page.tsx` — page CAP untuk auditee submit tindakan pembetulan
- `src/components/audit/borang-cap.tsx` — component form CAP (tindakan pembetulan + upload bukti)
- `src/components/audit/butang-verify-cap.tsx` — component butang Verify CAP untuk Lead Auditor
- `src/app/(dashboard)/audit/actions.ts` — server actions:
  - `hantarCap()` — auditee hantar CAP (open → in_progress)
  - `sahCap()` — Lead sahkan CAP (in_progress → closed)
  - `verifyCap()` — Lead verify CAP final (closed → verified)
  - Auto-tutup audit (status → selesai) bila semua NC verified
- Link CAP di `[id]/page.tsx` — tunjuk bila dah muktamadkan + ada NC

#### 6. Modul 3.1 — Opening Meeting Attendance
- `supabase/migrations/0012_kehadiran_opening_meeting.sql` — table `kehadiran_opening_meeting`
  - Columns: `audit_id`, `nama`, `jawatan`, `ditandatangan_pada` (server timestamp)
  - RLS: auth-users boleh baca + tulis
  - Applied ke remote DB ✅
- `src/components/audit/borang-kehadiran-opening.tsx` — component sign-in auditee
  - Daftar hadir (nama + jawatan, server time for timestamp)
  - Jadual senarai hadir
  - Butang "Mula Audit" untuk Lead Auditor (shift `dijadual` → `sedang_dijalankan`)
- Server actions: `sahkanKehadiran()` + `mulakanAuditDaripadaOpening()`
- Integrated ke `[id]/page.tsx` — paparan bawah ringkasan dapatan

#### 7. Code Cleanup — PPTX Route Corruption Fix
- `src/app/api/laporan/[id]/pptx/route.ts` — remove ~140 lines orphan/duplicate code (Claude corruption)
  - Original was 1243 lines, now 944 lines (clean)
  - Duplicate closing + extra CAP/PENUTUP slide removed
- **Verified:** TypeScript ✅, Next.js build ✅

### Sesi 28 Mei 2026 (Sesi Pagi — Claude)

#### 1. PDF Laporan — Format Word (4 halaman)
- `src/app/api/laporan/[id]/pdf/route.tsx` — fetch nama lead auditor dari `pengguna`
- `src/lib/pdf/laporan-pdf.tsx` — rewrite penuh:
  - Page 1: Cover (RISDA org, info table, Contents, dual signature)
  - Page 2: Summary (4 perenggan introduction + count NCR Major/Minor + OFI)
  - Page 3: NCR/OFI Table (No, Status, Juruaudit, Kenyataan, Klausa, Bukti)
  - Page 4: Side Notes (2 reminder MSPO 4.1.10.1 dan 4.1.5.1)

#### 2. Migration 0009 — Schema Fasa 3
- `supabase/migrations/0009_fasa3_perancangan_cap.sql` — applied ke remote DB ✅
- `supabase/rollbacks/0009_fasa3_perancangan_cap_DOWN.sql` — rollback manual
- `D:\JANET COWORKER\Spesifikasi_Sistem_Audit_MSPO_Fasa3.md` — spec lengkap

**Yang ditambah ke DB:**
- Table `sesi_audit` (6 sesi 2026 di-seed: Timur 1-2, Tengah 1-2, Selatan 1-2)
- 15 column baru pada `audit`:
  - `sesi_id`, `planned_start_date`, `planned_end_date`, `tarikh_muktamad`
  - `cap_due_date`, `cap_due_days`, `cap_grade_basis`
  - `cap_grade_source`, `cap_grade_override_reason`, `cap_grade_overridden_by`, `cap_grade_overridden_at`
  - `notif_cap_15_pada`, `notif_cap_25_pada`, `notif_cap_30_pada`, `notif_cap_bulanan_terakhir_pada`
- Type `cap_grade_source` enum (`auto_highest_finding`, `manual_lead_auditor`)
- Function `fn_kira_cap_due_date(gred_nc, date) → date`
- Function `fn_kira_gred_basis(audit_id) → gred_nc` (auto-detect Major > Minor > NULL)
- Function `fn_lock_audit_muktamad()` (trigger function)
- Trigger `trg_audit_muktamad BEFORE UPDATE ON audit`
- View `audit_status_live` (security_invoker = true)
- Backfill `planned_start_date`/`planned_end_date` dari `tarikh_audit`/`tarikh_tamat`

#### 3. Task B — UI Modul 3.4 (Closing Lock Logic)
- `src/components/audit/borang-muktamadkan-audit.tsx` — borang Closing dengan:
  - Preview live ringkasan dapatan (NC Major/Minor/OFI/Pending)
  - Auto-detect gred (Major > Minor > Tiada CAP)
  - Manual override panel (gred + reason min 10 aksara)
  - Preview tarikh akhir CAP sebelum submit
  - Validasi block kalau ada Pending
- `src/components/audit/badge-cap-countdown.tsx` — badge countdown dengan tier warna:
  - Hijau (>15 hari) · Kuning (≤15 hari) · Merah kritikal (≤5 hari) · Merah lewat (<0)
- `src/app/(dashboard)/audit/actions.ts` — server actions:
  - `previewGredCap(auditId)` — auto-detect untuk UI sneak-peek
  - `muktamadkanAudit({auditId, override?})` — write to DB, trigger handle rest
- `src/app/(dashboard)/audit/[id]/page.tsx` — integrate borang + badge + paparan English status

**Verified:** TypeScript ✅, Next.js build ✅, DB trigger end-to-end ✅

#### 4. Setup Auditor (data testing)
3 user dicipta + assigned ikut spec Janet:

| Audit | PO | Status semasa | Lead Auditor | Auditor lain |
|-------|-----|---------------|--------------|--------------|
| MSPO-202604-UT1-01 | KK (PO1) | sedang_dijalankan | Anuar (anuar@risdaplantation.com.my) | Saifoul |
| MSPO-202605-UT2-MNJ | Manjung (PO2) | selesai | Saifoul (saifoul@risdaplantation.com.my) | Ikhwan |
| MSPO-202605-6861 | Tapah (PO3) | selesai | Saifoul | Ikhwan (ikhwan@risdaplantation.com.my) |

**KK ready untuk testing flow Closing — login sebagai Anuar.**

### Kerja sebelum ni (commit lama, sebagai reference)
- `9455fbb` Tambah butang Padam Draf + kemaskini wilayah RPSB
- `6e598d9` Fix 3 isu PDF laporan
- `4a56553` Fix sync queue index, listing filter, dan UI feedback amaran sync
- `f3558aa` Fix 4 isu dari semakan kod
- `86aa957` Kemas kini sistem laporan Ringkasan Penemuan dan amaran sync

---

## ⏳ TASK BELUM SIAP (untuk sesi seterusnya)

### Task C — Modul 3.2 GPS/EXIF Bukti Foto (BESAR)
**Skop:** Capture foto bukti dengan timestamp + GPS coordinates dari hardware.

- [ ] Schema baru `bukti_foto_meta`:
  - `audit_id`, `dapatan_id`, `fail_path`, `latitude`, `longitude`
  - `exif_taken_at`, `created_at_server`, `exif_camera_model`
- [ ] EXIF parser (cadangan: `exifr` library) — server-side parse selepas upload
- [ ] Component `MuatNaikBuktiFoto` dengan GPS prompt
- [ ] Storage bucket policy untuk `bukti-foto/`
- [ ] Validation: timestamp foto mesti dalam julat tarikh audit

**Reference dalam briefing:**
- Sistem ekstrak EXIF + GPS terus dari peranti
- Untuk buktikan auditor di ladang pada tarikh tersebut

### Task D — Email Cron Notifikasi CAP
**Skop:** Hantar amaran auto kepada auditee bila CAP belum dihantar.

- [ ] Pilih library: Resend + Supabase Edge Function (recommended)
- [ ] Edge function harian — query `audit_status_live` untuk audit Pending CAP
- [ ] Logik notifikasi:
  - **Major NC (30 hari):** day-15 warning, day-25 final warning
  - **Minor NC (90 hari):** monthly reminder
- [ ] Update column `notif_cap_15_pada`, `notif_cap_25_pada`, `notif_cap_30_pada`, `notif_cap_bulanan_terakhir_pada`
- [ ] Email template (BM) dengan link CAP submission
- [ ] pg_cron schedule (1x daily, 8am MYT)

### UI Assign Lead + Auditor untuk Audit Baru ✅ SIAP (28 Mei 2026)
- `src/components/audit/borang-audit-baru.tsx` — tambah:
  - Select dropdown Lead Auditor (rol = `lead_auditor` atau `admin`), default = pengguna semasa
  - Multi-select checkbox Auditor Pembantu (rol = `auditor` / `lead_auditor`)
  - Auto-exclude lead dari senarai pembantu (badge "Sudah jadi Lead")
- Update server action `ciptaAudit` untuk handle field baru
- Validasi: minimum 1 lead via zod schema

### Modul 3.1 — Opening Meeting Attendance ✅ SIAP (28 Mei 2026)
### CAP Submission UI (Modul 3.5 — selepas Closing) ✅ SIAP (28 Mei 2026)

---

## NOTA TEKNIKAL

- `item_semakan` table ada non-unique `kod` — query MESTI pakai `LIMIT 1`
- Git lock fix: `del .git\index.lock` dari Windows terminal (bukan sandbox)
- PowerShell path dengan `(dashboard)` — guna single quotes atau `git add -A`
- PostgreSQL version: PG17.0.6 (support `security_invoker` view ✅)
- Aktiviti table logging via PostgreSQL trigger (migration 0008)
- `pengguna` table (bukan `profiles`) — `nama_penuh`, `rol`, `email`
- `gred_nc` enum: lowercase (`major`, `minor`) — bukan uppercase
- `status_audit` enum BM kekal — mapping ke English buat di view `audit_status_live`

## SQL Snippet Berguna

```sql
-- Reset audit untuk re-test Closing flow
update public.audit
   set status                    = 'sedang_dijalankan',
       tarikh_muktamad           = null,
       cap_due_date              = null,
       cap_due_days              = null,
       cap_grade_basis           = null,
       cap_grade_source          = null,
       cap_grade_override_reason = null,
       cap_grade_overridden_by   = null,
       cap_grade_overridden_at   = null
 where id = '<audit_id>';

-- Cek state audit live
select audit_id, no_rujukan, status_db, status_display_en,
       cap_due_date, cap_baki_hari, cap_grade_basis, cap_grade_source
  from public.audit_status_live
 order by start_date_live desc;

-- Run query via CLI
-- supabase db query --linked --output json "<SQL>"
```

---

*Generated: 28 Mei 2026 02:30 MYT*
