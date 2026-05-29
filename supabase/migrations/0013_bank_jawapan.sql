-- ============================================================
-- Migration 0013: Bank Jawapan Klausa (Modul 3.2 Reference Data)
-- ============================================================
-- Skop:
--   1. Table bank_jawapan (klausa kod + status + pre-written audit text)
--   2. RLS policies
--
-- Digunakan oleh checklist-audit untuk auto-fill Catatan Bukti Audit
-- dan Tindakan Pembetulan berdasarkan status yang dipilih auditor.
-- ============================================================

begin;

create table if not exists public.bank_jawapan (
  id uuid primary key default gen_random_uuid(),
  klausa_kod text not null,
  status text not null,                          -- C | OFI | NC | Pending | N/A
  catatan_bukti text,                            -- Catatan Bukti Audit (auto-fill)
  tindakan_pembetulan text,                      -- Tindakan Pembetulan (auto-fill)
  dokumen_bukti_wajib text,                      -- Dokumen / Bukti Wajib
  semakan_tapak text,                            -- Panduan Semakan Tapak
  panduan_na text,                               -- Panduan untuk N/A
  unique (klausa_kod, status)
);

create index if not exists idx_bank_jawapan_klausa on public.bank_jawapan (klausa_kod);

alter table public.bank_jawapan enable row level security;

create policy "Auth boleh baca bank jawapan" on public.bank_jawapan for select
  using (auth.uid() is not null);

create policy "Admin urus bank jawapan" on public.bank_jawapan for all
  using (public.rol_semasa() = 'admin');

commit;
