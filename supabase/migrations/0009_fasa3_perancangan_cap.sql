-- ============================================================
-- Migration 0009: Fasa 3 - Perancangan Audit & CAP Due Date
-- ============================================================
-- Skop:
--   1. Table sesi_audit (master schedule 2026)
--   2. Tambah column perancangan + CAP pada audit (additive sahaja)
--   3. Backfill planned_start_date / planned_end_date dari data lama
--   4. Function fn_kira_cap_due_date() — kira tarikh ikut gred
--   5. Function fn_kira_gred_basis() — auto-detect gred tertinggi dari dapatan
--   6. Trigger lock status + CAP semasa "Muktamadkan Keputusan"
--   7. View audit_status_live (security_invoker untuk patuh RLS)
--
-- TIDAK termasuk:
--   - bukti_foto / GPS / EXIF (Task C berasingan)
--   - email cron actual (Task D berasingan)
--   - DOCX spec generator
--
-- Strategi: Additive sahaja. Tiada DROP, tiada ALTER TYPE, tiada RENAME.
--
-- PRA-SYARAT:
--   PostgreSQL 15+ untuk klausa `with (security_invoker = true)` pada view.
--   Supabase Cloud sejak Mac 2023 default PG15. Sahkan dengan:
--     SELECT current_setting('server_version_num')::int >= 150000;
--   Kalau false, ganti baris `with (security_invoker = true) as` dengan `as`
--   sahaja, dan lock view ke role tertentu via GRANT.
-- ============================================================

begin;

-- =====================================================
-- 1. JADUAL: sesi_audit (master schedule rujukan)
-- =====================================================

create table if not exists public.sesi_audit (
  id uuid primary key default gen_random_uuid(),
  nama_sesi text not null,                    -- cth: 'Timur 1'
  wilayah text not null,                      -- 'Timur' | 'Tengah' | 'Selatan' | 'Utara'
  tarikh_mula date not null,
  tarikh_tamat date not null,
  catatan text,
  dicipta_pada timestamptz not null default now(),
  dikemaskini_pada timestamptz not null default now(),
  unique (nama_sesi, tarikh_mula),
  check (tarikh_tamat >= tarikh_mula)
);

create index if not exists idx_sesi_wilayah on public.sesi_audit (wilayah);
create index if not exists idx_sesi_tarikh on public.sesi_audit (tarikh_mula);

create trigger trg_sesi_dikemaskini before update on public.sesi_audit
  for each row execute function public.set_dikemaskini_pada();

-- RLS
alter table public.sesi_audit enable row level security;

create policy "Auth boleh baca sesi" on public.sesi_audit for select
  using (auth.uid() is not null);
create policy "Admin/Lead urus sesi" on public.sesi_audit for all
  using (public.rol_semasa() in ('admin', 'lead_auditor'));

-- =====================================================
-- 2. SEED 6 SESI RASMI 2026 (Jabatan Perladangan)
-- =====================================================

insert into public.sesi_audit (nama_sesi, wilayah, tarikh_mula, tarikh_tamat) values
  ('Timur 1',   'Timur',   '2026-06-22', '2026-06-25'),
  ('Timur 2',   'Timur',   '2026-07-13', '2026-07-16'),
  ('Tengah 1',  'Tengah',  '2026-08-10', '2026-08-13'),
  ('Tengah 2',  'Tengah',  '2026-08-17', '2026-08-20'),
  ('Selatan 1', 'Selatan', '2026-09-21', '2026-09-24'),
  ('Selatan 2', 'Selatan', '2026-10-12', '2026-10-15')
on conflict (nama_sesi, tarikh_mula) do nothing;

-- =====================================================
-- 3. ENUM untuk source CAP grade (audit trail)
-- =====================================================

do $$ begin
  if not exists (select 1 from pg_type where typname = 'cap_grade_source') then
    create type public.cap_grade_source as enum (
      'auto_highest_finding',     -- dari fn_kira_gred_basis()
      'manual_lead_auditor'       -- override oleh Lead Auditor
    );
  end if;
end $$;

-- =====================================================
-- 4. TAMBAH COLUMN PADA audit (additive sahaja)
-- =====================================================

alter table public.audit
  add column if not exists sesi_id uuid references public.sesi_audit (id) on delete set null,
  add column if not exists planned_start_date date,
  add column if not exists planned_end_date date,
  add column if not exists tarikh_muktamad timestamptz,

  -- CAP fields
  add column if not exists cap_due_date date,
  add column if not exists cap_due_days int,
  add column if not exists cap_grade_basis gred_nc,                    -- NULL = no CAP needed (OFI sahaja / no NC)
  add column if not exists cap_grade_source public.cap_grade_source,
  add column if not exists cap_grade_override_reason text,
  add column if not exists cap_grade_overridden_by uuid references public.pengguna (id) on delete set null,
  add column if not exists cap_grade_overridden_at timestamptz,

  -- Notification stubs (Task D nanti)
  add column if not exists notif_cap_15_pada timestamptz,
  add column if not exists notif_cap_25_pada timestamptz,
  add column if not exists notif_cap_30_pada timestamptz,
  add column if not exists notif_cap_bulanan_terakhir_pada timestamptz;

-- Constraint: kalau source = manual, mesti ada reason + overridden_by + overridden_at
alter table public.audit
  drop constraint if exists chk_cap_manual_override_lengkap;

alter table public.audit
  add constraint chk_cap_manual_override_lengkap check (
    cap_grade_source is null
    or cap_grade_source = 'auto_highest_finding'
    or (
      cap_grade_source = 'manual_lead_auditor'
      and cap_grade_override_reason is not null
      and cap_grade_overridden_by is not null
      and cap_grade_overridden_at is not null
    )
  );

create index if not exists idx_audit_sesi on public.audit (sesi_id);
create index if not exists idx_audit_planned on public.audit (planned_start_date, planned_end_date);
create index if not exists idx_audit_cap_due on public.audit (cap_due_date)
  where cap_due_date is not null;

-- =====================================================
-- 5. BACKFILL planned_* dari data lama
-- =====================================================

update public.audit
   set planned_start_date = coalesce(planned_start_date, tarikh_audit),
       planned_end_date   = coalesce(planned_end_date,  tarikh_tamat, tarikh_audit)
 where planned_start_date is null
    or planned_end_date is null;

-- =====================================================
-- 6. FUNCTION: kira CAP due date (+30 / +90 / NULL)
-- =====================================================

create or replace function public.fn_kira_cap_due_date(
  gred gred_nc,
  tarikh_asal date
) returns date
language sql
immutable
as $$
  select case
    when gred = 'major' then (tarikh_asal + interval '30 days')::date
    when gred = 'minor' then (tarikh_asal + interval '90 days')::date
    else null
  end;
$$;

comment on function public.fn_kira_cap_due_date(gred_nc, date) is
  'Kira tarikh akhir CAP ikut MSPO: Major +30 hari, Minor +90 hari kalendar.';

-- =====================================================
-- 7. FUNCTION: auto-detect gred tertinggi dari dapatan
-- =====================================================

create or replace function public.fn_kira_gred_basis(p_audit_id uuid)
returns gred_nc
language sql
stable
as $$
  -- Major mengatasi Minor. Kalau tiada NC, pulang NULL (no CAP needed).
  select case
    when exists (
      select 1 from public.dapatan
       where audit_id = p_audit_id
         and status = 'NC'
         and gred_nc = 'major'
    ) then 'major'::gred_nc
    when exists (
      select 1 from public.dapatan
       where audit_id = p_audit_id
         and status = 'NC'
         and gred_nc = 'minor'
    ) then 'minor'::gred_nc
    else null
  end;
$$;

comment on function public.fn_kira_gred_basis(uuid) is
  'Pulang gred tertinggi (major > minor > null) berdasarkan dapatan NC audit.';

-- =====================================================
-- 8. TRIGGER FUNCTION: lock status + auto-kira CAP
-- =====================================================
-- Auto-set cap_grade_basis (kalau source bukan manual) + cap_due_date
-- bila tarikh_muktamad transition NULL → not NULL.
-- Auto-shift status ke 'menunggu_semakan' kecuali sudah selesai/batal.

create or replace function public.fn_lock_audit_muktamad()
returns trigger
language plpgsql
as $$
declare
  v_gred gred_nc;
begin
  -- Hanya proses bila tarikh_muktamad baru diisi (transition null -> not null)
  if new.tarikh_muktamad is not null
     and (old.tarikh_muktamad is null or old.tarikh_muktamad <> new.tarikh_muktamad)
  then
    -- (a) Tetapkan source default = auto kalau belum diset
    if new.cap_grade_source is null then
      new.cap_grade_source := 'auto_highest_finding';
    end if;

    -- (b) Kalau source = auto, kira gred dari dapatan
    if new.cap_grade_source = 'auto_highest_finding' then
      v_gred := public.fn_kira_gred_basis(new.id);
      new.cap_grade_basis := v_gred;
    end if;

    -- (c) Kira cap_due_date berdasarkan basis (NULL kalau no NC)
    if new.cap_grade_basis is not null then
      new.cap_due_date := public.fn_kira_cap_due_date(
        new.cap_grade_basis,
        (new.tarikh_muktamad)::date
      );
      new.cap_due_days := case new.cap_grade_basis
        when 'major' then 30
        when 'minor' then 90
      end;
    else
      new.cap_due_date := null;
      new.cap_due_days := null;
    end if;

    -- (d) Auto-transition status (kecuali sudah selesai/batal)
    if new.status not in ('selesai', 'dibatalkan') then
      new.status := 'menunggu_semakan';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_audit_muktamad on public.audit;
create trigger trg_audit_muktamad
  before update on public.audit
  for each row
  execute function public.fn_lock_audit_muktamad();

-- =====================================================
-- 9. VIEW: audit_status_live (paparan status English)
-- =====================================================

drop view if exists public.audit_status_live;

create view public.audit_status_live
  with (security_invoker = true) as
select
  a.id as audit_id,
  a.no_rujukan,
  a.status as status_db,
  coalesce(a.planned_start_date, s.tarikh_mula, a.tarikh_audit) as start_date_live,
  coalesce(a.planned_end_date,   s.tarikh_tamat, a.tarikh_tamat, a.tarikh_audit) as end_date_live,
  a.tarikh_muktamad,
  a.cap_due_date,
  a.cap_due_days,
  a.cap_grade_basis,
  a.cap_grade_source,
  case
    when a.status = 'selesai'         then 'Completed'
    when a.status = 'dibatalkan'      then 'Cancelled'
    when a.status = 'menunggu_semakan' then 'Pending CAP'
    when a.status = 'draf'            then 'Draft'
    when current_date < coalesce(a.planned_start_date, s.tarikh_mula, a.tarikh_audit)
                                       then 'Scheduled'
    when current_date between coalesce(a.planned_start_date, s.tarikh_mula, a.tarikh_audit)
                          and coalesce(a.planned_end_date,   s.tarikh_tamat, a.tarikh_tamat, a.tarikh_audit)
                                       then 'On-Site Evaluation'
    else 'Awaiting Closing'
  end as status_display_en,
  case
    when a.cap_due_date is not null and a.status = 'menunggu_semakan' then
      (a.cap_due_date - current_date)
  end as cap_baki_hari
from public.audit a
left join public.sesi_audit s on s.id = a.sesi_id;

comment on view public.audit_status_live is
  'Paparan status audit live (English) + baki hari CAP. Patuh RLS pemanggil (security_invoker).';

commit;
