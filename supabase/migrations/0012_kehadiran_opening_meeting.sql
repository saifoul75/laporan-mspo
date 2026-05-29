-- ============================================================
-- Migration 0012: Kehadiran Opening Meeting (Modul 3.1)
-- ============================================================
-- Skop:
--   1. Table kehadiran_opening_meeting (audit_id, nama, jawatan, timestamp)
--   2. RLS policies
-- ============================================================

begin;

create table if not exists public.kehadiran_opening_meeting (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audit (id) on delete cascade,
  nama text not null,
  jawatan text not null,
  ditandatangan_pada timestamptz not null default now()
);

create index if not exists idx_kehadiran_audit on public.kehadiran_opening_meeting (audit_id);

alter table public.kehadiran_opening_meeting enable row level security;

create policy "Auth boleh baca kehadiran" on public.kehadiran_opening_meeting for select
  using (auth.uid() is not null);

create policy "Auth boleh tulis kehadiran" on public.kehadiran_opening_meeting for insert
  with check (auth.uid() is not null);

commit;
