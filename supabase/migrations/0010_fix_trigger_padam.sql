-- ============================================================
-- Migration 0010: Fix trigger AFTER DELETE -> BEFORE DELETE
-- ============================================================
-- Bug: trg_audit_aktiviti dan trg_dapatan_aktiviti fire AFTER DELETE.
-- Trigger function INSERT row baru ke 'aktiviti' dengan audit_id
-- yang baru sahaja dipadam — FK aktiviti_audit_id_fkey tolak sebab
-- audit row dah tiada lagi.
--
-- Error message:
--   ERROR: 23503: insert or update on table "aktiviti" violates
--   foreign key constraint "aktiviti_audit_id_fkey"
--
-- Fix: split trigger jadi dua:
--   1. AFTER INSERT OR UPDATE — log cipta/kemaskini (current behavior)
--   2. BEFORE DELETE — log padam SEBELUM row hilang
--
-- Note: FK aktiviti.audit_id ON DELETE SET NULL akan null-kan
-- aktiviti.audit_id selepas audit dipadam — log tetap kekal dengan
-- rangkuman text yang ada no_rujukan untuk audit trail.
-- ============================================================

begin;

-- ============================================================
-- 1. Drop existing AFTER triggers
-- ============================================================

drop trigger if exists trg_audit_aktiviti on public.audit;
drop trigger if exists trg_dapatan_aktiviti on public.dapatan;

-- ============================================================
-- 2. Recreate AFTER trigger untuk INSERT + UPDATE sahaja
-- ============================================================

create trigger trg_audit_aktiviti
  after insert or update on public.audit
  for each row
  execute function public.log_audit_aktiviti();

create trigger trg_dapatan_aktiviti
  after insert or update on public.dapatan
  for each row
  execute function public.log_dapatan_aktiviti();

-- ============================================================
-- 3. Tambah BEFORE DELETE trigger berasingan
-- ============================================================
-- Logging berlaku SEBELUM row dipadam supaya FK insert ke aktiviti
-- masih valid. Selepas row hilang, cascade ON DELETE SET NULL akan
-- null-kan aktiviti.audit_id (rangkuman text kekal kekalkan no_rujukan).

create trigger trg_audit_aktiviti_padam
  before delete on public.audit
  for each row
  execute function public.log_audit_aktiviti();

create trigger trg_dapatan_aktiviti_padam
  before delete on public.dapatan
  for each row
  execute function public.log_dapatan_aktiviti();

commit;
