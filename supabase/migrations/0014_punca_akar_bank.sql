-- ============================================================
-- Migration 0014: Bank Jawapan — Tambah Punca Akar
-- ============================================================

begin;

alter table public.bank_jawapan
  add column if not exists punca_akar text;

commit;
