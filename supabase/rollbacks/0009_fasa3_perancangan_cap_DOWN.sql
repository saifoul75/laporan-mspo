-- ============================================================
-- ROLLBACK: 0009_fasa3_perancangan_cap.sql
-- ============================================================
-- Jalankan secara MANUAL kalau perlu rollback migration 0009.
-- Tidak akan jalan automatik dalam supabase migrate up.
--
-- PRA-CHECKLIST (WAJIB sebelum rollback):
--   1. Backup nilai cap_due_date, tarikh_muktamad, cap_grade_*
--      bagi audit yang sudah muktamadkan keputusan:
--        copy (
--          select id, no_rujukan, tarikh_muktamad, cap_due_date,
--                 cap_due_days, cap_grade_basis, cap_grade_source,
--                 cap_grade_override_reason, cap_grade_overridden_by,
--                 cap_grade_overridden_at
--            from public.audit
--           where tarikh_muktamad is not null
--        ) to '/tmp/backup_cap_pre_rollback.csv' csv header;
--
--   2. Pastikan tiada UI / route yang merujuk:
--        - view audit_status_live
--        - column cap_*, planned_*, sesi_id
--      Cari guna: grep -r "audit_status_live\|cap_due_date\|planned_start_date" src/
--
--   3. Snapshot DB via Supabase dashboard (Project > Database > Backups)
--
--   4. Komunikasi dengan team — rollback akan hilangkan data CAP
--      yang sudah dikira. Auditor perlu muktamadkan semula nanti.
-- ============================================================

begin;

-- 1. Drop view (paling luar dulu)
drop view if exists public.audit_status_live;

-- 2. Drop trigger pada audit
drop trigger if exists trg_audit_muktamad on public.audit;

-- 3. Drop functions
drop function if exists public.fn_lock_audit_muktamad();
drop function if exists public.fn_kira_gred_basis(uuid);
drop function if exists public.fn_kira_cap_due_date(gred_nc, date);

-- 4. Drop check constraint
alter table public.audit
  drop constraint if exists chk_cap_manual_override_lengkap;

-- 5. Drop index (sebelum drop column)
drop index if exists public.idx_audit_cap_due;
drop index if exists public.idx_audit_planned;
drop index if exists public.idx_audit_sesi;

-- 6. Drop columns dari audit (additive jadi selamat drop)
alter table public.audit
  drop column if exists notif_cap_bulanan_terakhir_pada,
  drop column if exists notif_cap_30_pada,
  drop column if exists notif_cap_25_pada,
  drop column if exists notif_cap_15_pada,
  drop column if exists cap_grade_overridden_at,
  drop column if exists cap_grade_overridden_by,
  drop column if exists cap_grade_override_reason,
  drop column if exists cap_grade_source,
  drop column if exists cap_grade_basis,
  drop column if exists cap_due_days,
  drop column if exists cap_due_date,
  drop column if exists tarikh_muktamad,
  drop column if exists planned_end_date,
  drop column if exists planned_start_date,
  drop column if exists sesi_id;

-- 7. Drop type cap_grade_source (selepas column dah hilang)
drop type if exists public.cap_grade_source;

-- 8. Drop trigger + table sesi_audit (akan cascade drop policies + indexes)
drop trigger if exists trg_sesi_dikemaskini on public.sesi_audit;
drop table if exists public.sesi_audit cascade;

commit;

-- ============================================================
-- VERIFIKASI POST-ROLLBACK
-- ============================================================
-- Run query ini selepas rollback untuk pastikan bersih:
--
-- select column_name from information_schema.columns
--  where table_schema = 'public' and table_name = 'audit'
--    and column_name in ('sesi_id', 'planned_start_date', 'cap_due_date');
-- -- (sepatutnya 0 row)
--
-- select tablename from pg_tables
--  where schemaname = 'public' and tablename = 'sesi_audit';
-- -- (sepatutnya 0 row)
--
-- select viewname from pg_views
--  where schemaname = 'public' and viewname = 'audit_status_live';
-- -- (sepatutnya 0 row)
--
-- select typname from pg_type where typname = 'cap_grade_source';
-- -- (sepatutnya 0 row)
-- ============================================================
