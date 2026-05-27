-- MSPO Audit Schema (MS2530-2-2:2022)
-- Versi: 0001 - Skema asas (5 Prinsip, 28 Kriteria, 74 Item Semakan)
-- Berdasarkan struktur kerja audit dalaman RPSB (SKILL v2.4)

-- =====================================================
-- ENUM TYPES
-- =====================================================

create type rol_pengguna as enum ('admin', 'lead_auditor', 'auditor', 'po_user');

create type status_audit as enum (
  'draf', 'dijadual', 'sedang_dijalankan', 'menunggu_semakan', 'selesai', 'dibatalkan'
);

create type jenis_audit as enum (
  'audit_dalaman', 'audit_pensijilan', 'audit_pengawasan', 'audit_persijilan_semula'
);

create type status_dapatan as enum ('Y', 'N', 'NC', 'OFI', 'NA', 'Pending');

create type gred_nc as enum ('major', 'minor');

create type jenis_klausa as enum ('major', 'minor');

create type jenis_bukti as enum ('gambar', 'dokumen');

create type status_nc as enum ('open', 'in_progress', 'closed', 'verified');

create type status_ofi as enum ('kiv_kuning', 'open', 'tutup');

-- =====================================================
-- JADUAL: pusat_operasi (PO)
-- =====================================================

create table public.pusat_operasi (
  id uuid primary key default gen_random_uuid(),
  kod text unique not null,
  nama text not null,
  wilayah text not null,
  alamat text,
  daerah text,
  negeri text,
  keluasan_hektar numeric(10, 2),
  latitud double precision,
  longitud double precision,
  dicipta_pada timestamptz not null default now(),
  dikemaskini_pada timestamptz not null default now()
);

create index idx_po_wilayah on public.pusat_operasi (wilayah);

-- =====================================================
-- JADUAL: pengguna
-- =====================================================

create table public.pengguna (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  nama_penuh text not null,
  no_telefon text,
  rol rol_pengguna not null default 'auditor',
  pusat_operasi_id uuid references public.pusat_operasi (id) on delete set null,
  dicipta_pada timestamptz not null default now(),
  dikemaskini_pada timestamptz not null default now()
);

create index idx_pengguna_rol on public.pengguna (rol);

-- =====================================================
-- JADUAL: prinsip
-- =====================================================

create table public.prinsip (
  id uuid primary key default gen_random_uuid(),
  nombor int not null check (nombor between 1 and 5),
  kod text unique not null,
  tajuk text not null,
  fokus_utama text,
  bil_klausa int,
  dicipta_pada timestamptz not null default now()
);

-- =====================================================
-- JADUAL: kriteria (28 buah - klausa 4.1.1-4.5.7)
-- =====================================================

create table public.kriteria (
  id uuid primary key default gen_random_uuid(),
  prinsip_id uuid not null references public.prinsip (id) on delete cascade,
  kod text not null,
  tajuk text not null,
  penerangan text,
  susunan int not null default 0,
  dicipta_pada timestamptz not null default now(),
  unique (prinsip_id, kod)
);

create index idx_kriteria_prinsip on public.kriteria (prinsip_id);

-- =====================================================
-- JADUAL: fail_kulit_keras (Fail 1-13)
-- =====================================================

create table public.fail_kulit_keras (
  id uuid primary key default gen_random_uuid(),
  nombor int unique not null check (nombor between 1 and 13),
  nama text not null,
  ringkasan text,
  dicipta_pada timestamptz not null default now()
);

create table public.seksyen_fail (
  id uuid primary key default gen_random_uuid(),
  fail_id uuid not null references public.fail_kulit_keras (id) on delete cascade,
  kod text not null,
  nama text not null,
  susunan int not null default 0,
  unique (fail_id, kod)
);

-- =====================================================
-- JADUAL: item_semakan (74 item dalaman)
-- =====================================================

create table public.item_semakan (
  id uuid primary key default gen_random_uuid(),
  kriteria_id uuid not null references public.kriteria (id) on delete cascade,
  kod text not null,
  tajuk text not null,
  bukti_wajib text,
  fail_rujukan int check (fail_rujukan between 1 and 13),
  seksyen_fail text,
  jenis_klausa jenis_klausa not null default 'minor',
  ofi_default boolean default false,
  catatan_default text,
  susunan int not null default 0,
  dicipta_pada timestamptz not null default now(),
  unique (kriteria_id, kod)
);

create index idx_item_kriteria on public.item_semakan (kriteria_id);
create index idx_item_kod on public.item_semakan (kod);

-- =====================================================
-- JADUAL: audit
-- =====================================================

create table public.audit (
  id uuid primary key default gen_random_uuid(),
  no_rujukan text unique not null,
  pusat_operasi_id uuid not null references public.pusat_operasi (id) on delete restrict,
  lead_auditor_id uuid not null references public.pengguna (id) on delete restrict,
  auditor_ids uuid[] not null default '{}',
  tarikh_audit date not null,
  tarikh_tamat date,
  jenis_audit jenis_audit not null default 'audit_dalaman',
  status status_audit not null default 'draf',
  catatan text,
  dicipta_pada timestamptz not null default now(),
  dikemaskini_pada timestamptz not null default now()
);

create index idx_audit_po on public.audit (pusat_operasi_id);
create index idx_audit_lead on public.audit (lead_auditor_id);
create index idx_audit_status on public.audit (status);
create index idx_audit_tarikh on public.audit (tarikh_audit desc);

-- =====================================================
-- JADUAL: dapatan (per item_semakan)
-- =====================================================

create table public.dapatan (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audit (id) on delete cascade,
  item_semakan_id uuid not null references public.item_semakan (id) on delete restrict,
  status status_dapatan not null default 'Pending',
  gred_nc gred_nc,
  catatan text,
  bukti_audit text,
  punca_akar text,
  cadangan_tindakan text,
  tarikh_siap_target date,
  pic text,
  latitud double precision,
  longitud double precision,
  ketepatan_gps numeric(8, 2),
  diaudit_oleh uuid not null references public.pengguna (id) on delete restrict,
  dirakam_pada timestamptz not null default now(),
  dikemaskini_pada timestamptz not null default now(),
  unique (audit_id, item_semakan_id)
);

create index idx_dapatan_audit on public.dapatan (audit_id);
create index idx_dapatan_item on public.dapatan (item_semakan_id);
create index idx_dapatan_status on public.dapatan (status);

-- =====================================================
-- JADUAL: nc (Non-Conformity Report / CAR)
-- =====================================================

create table public.nc (
  id uuid primary key default gen_random_uuid(),
  no_nc text unique not null,
  audit_id uuid not null references public.audit (id) on delete cascade,
  dapatan_id uuid not null references public.dapatan (id) on delete cascade,
  klausa_kod text not null,
  prinsip_kod text not null,
  fail_rujukan int,
  rekod_terlibat text,
  dapatan text not null,
  bukti text,
  punca_akar text,
  tindakan_pembetulan text,
  pic text,
  tarikh_siap date,
  status status_nc not null default 'open',
  gred gred_nc not null,
  dicipta_pada timestamptz not null default now(),
  dikemaskini_pada timestamptz not null default now()
);

create index idx_nc_audit on public.nc (audit_id);
create index idx_nc_status on public.nc (status);

-- =====================================================
-- JADUAL: ofi (Opportunity for Improvement)
-- =====================================================

create table public.ofi (
  id uuid primary key default gen_random_uuid(),
  no_ofi text unique not null,
  audit_id uuid not null references public.audit (id) on delete cascade,
  dapatan_id uuid not null references public.dapatan (id) on delete cascade,
  klausa_kod text not null,
  fail_rujukan int,
  pemerhatian text not null,
  cadangan text,
  pic text,
  status status_ofi not null default 'kiv_kuning',
  dicipta_pada timestamptz not null default now(),
  dikemaskini_pada timestamptz not null default now()
);

create index idx_ofi_audit on public.ofi (audit_id);

-- =====================================================
-- JADUAL: bukti
-- =====================================================

create table public.bukti (
  id uuid primary key default gen_random_uuid(),
  dapatan_id uuid not null references public.dapatan (id) on delete cascade,
  jenis jenis_bukti not null default 'gambar',
  url_storan text not null,
  nama_fail text not null,
  saiz_bait bigint,
  latitud double precision,
  longitud double precision,
  dimuat_naik_oleh uuid references public.pengguna (id) on delete set null,
  dimuat_naik_pada timestamptz not null default now()
);

create index idx_bukti_dapatan on public.bukti (dapatan_id);

-- =====================================================
-- JADUAL: laporan
-- =====================================================

create table public.laporan (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid unique not null references public.audit (id) on delete cascade,
  url_pdf text,
  ringkasan_eksekutif text,
  jumlah_y int not null default 0,
  jumlah_n int not null default 0,
  jumlah_nc_major int not null default 0,
  jumlah_nc_minor int not null default 0,
  jumlah_ofi int not null default 0,
  jumlah_na int not null default 0,
  jumlah_pending int not null default 0,
  dijana_oleh uuid references public.pengguna (id) on delete set null,
  dijana_pada timestamptz not null default now()
);

-- =====================================================
-- TRIGGER: auto kemaskini
-- =====================================================

create or replace function public.set_dikemaskini_pada()
returns trigger language plpgsql as $$
begin new.dikemaskini_pada = now(); return new; end; $$;

create trigger trg_po_dikemaskini before update on public.pusat_operasi
  for each row execute function public.set_dikemaskini_pada();
create trigger trg_pengguna_dikemaskini before update on public.pengguna
  for each row execute function public.set_dikemaskini_pada();
create trigger trg_audit_dikemaskini before update on public.audit
  for each row execute function public.set_dikemaskini_pada();
create trigger trg_dapatan_dikemaskini before update on public.dapatan
  for each row execute function public.set_dikemaskini_pada();
create trigger trg_nc_dikemaskini before update on public.nc
  for each row execute function public.set_dikemaskini_pada();
create trigger trg_ofi_dikemaskini before update on public.ofi
  for each row execute function public.set_dikemaskini_pada();

-- Auto cipta profil pengguna selepas signup
create or replace function public.handle_pengguna_baru()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.pengguna (id, email, nama_penuh, rol)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'nama_penuh', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'rol')::rol_pengguna, 'auditor')
  );
  return new;
end; $$;

create trigger trg_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_pengguna_baru();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

alter table public.pusat_operasi enable row level security;
alter table public.pengguna enable row level security;
alter table public.prinsip enable row level security;
alter table public.kriteria enable row level security;
alter table public.fail_kulit_keras enable row level security;
alter table public.seksyen_fail enable row level security;
alter table public.item_semakan enable row level security;
alter table public.audit enable row level security;
alter table public.dapatan enable row level security;
alter table public.nc enable row level security;
alter table public.ofi enable row level security;
alter table public.bukti enable row level security;
alter table public.laporan enable row level security;

create or replace function public.rol_semasa()
returns rol_pengguna language sql stable security definer set search_path = public as $$
  select rol from public.pengguna where id = auth.uid();
$$;

-- pengguna
create policy "Baca profil sendiri" on public.pengguna for select
  using (id = auth.uid() or public.rol_semasa() in ('admin', 'lead_auditor'));
create policy "Kemaskini profil sendiri" on public.pengguna for update using (id = auth.uid());
create policy "Admin urus pengguna" on public.pengguna for all using (public.rol_semasa() = 'admin');

-- Reference data: read for all authenticated, write for admin
create policy "Auth boleh baca prinsip" on public.prinsip for select using (auth.uid() is not null);
create policy "Admin urus prinsip" on public.prinsip for all using (public.rol_semasa() = 'admin');
create policy "Auth boleh baca kriteria" on public.kriteria for select using (auth.uid() is not null);
create policy "Admin urus kriteria" on public.kriteria for all using (public.rol_semasa() = 'admin');
create policy "Auth boleh baca fail" on public.fail_kulit_keras for select using (auth.uid() is not null);
create policy "Admin urus fail" on public.fail_kulit_keras for all using (public.rol_semasa() = 'admin');
create policy "Auth boleh baca seksyen" on public.seksyen_fail for select using (auth.uid() is not null);
create policy "Admin urus seksyen" on public.seksyen_fail for all using (public.rol_semasa() = 'admin');
create policy "Auth boleh baca item" on public.item_semakan for select using (auth.uid() is not null);
create policy "Admin urus item" on public.item_semakan for all using (public.rol_semasa() = 'admin');

-- Pusat Operasi
create policy "Baca PO" on public.pusat_operasi for select
  using (
    public.rol_semasa() in ('admin', 'lead_auditor', 'auditor')
    or exists (select 1 from public.pengguna p where p.id = auth.uid() and p.pusat_operasi_id = pusat_operasi.id)
  );
create policy "Admin/Lead urus PO" on public.pusat_operasi for all
  using (public.rol_semasa() in ('admin', 'lead_auditor'));

-- Audit
create policy "Akses audit" on public.audit for select
  using (
    public.rol_semasa() in ('admin', 'lead_auditor')
    or auth.uid() = lead_auditor_id
    or auth.uid() = any (auditor_ids)
    or exists (select 1 from public.pengguna p where p.id = auth.uid() and p.pusat_operasi_id = audit.pusat_operasi_id)
  );
create policy "Lead/admin urus audit" on public.audit for all
  using (public.rol_semasa() in ('admin', 'lead_auditor'));

-- Dapatan
create policy "Akses dapatan" on public.dapatan for select
  using (
    exists (
      select 1 from public.audit a where a.id = dapatan.audit_id
      and (
        public.rol_semasa() in ('admin', 'lead_auditor')
        or auth.uid() = a.lead_auditor_id
        or auth.uid() = any (a.auditor_ids)
        or exists (select 1 from public.pengguna p where p.id = auth.uid() and p.pusat_operasi_id = a.pusat_operasi_id)
      )
    )
  );
create policy "Auditor tulis dapatan" on public.dapatan for all
  using (public.rol_semasa() in ('admin', 'lead_auditor', 'auditor'));

-- NC, OFI
create policy "Akses NC" on public.nc for select
  using (
    exists (select 1 from public.audit a where a.id = nc.audit_id
      and (public.rol_semasa() in ('admin', 'lead_auditor')
        or auth.uid() = a.lead_auditor_id
        or auth.uid() = any (a.auditor_ids)
        or exists (select 1 from public.pengguna p where p.id = auth.uid() and p.pusat_operasi_id = a.pusat_operasi_id)))
  );
create policy "Lead urus NC" on public.nc for all using (public.rol_semasa() in ('admin', 'lead_auditor'));

create policy "Akses OFI" on public.ofi for select
  using (
    exists (select 1 from public.audit a where a.id = ofi.audit_id
      and (public.rol_semasa() in ('admin', 'lead_auditor')
        or auth.uid() = a.lead_auditor_id
        or auth.uid() = any (a.auditor_ids)
        or exists (select 1 from public.pengguna p where p.id = auth.uid() and p.pusat_operasi_id = a.pusat_operasi_id)))
  );
create policy "Lead urus OFI" on public.ofi for all using (public.rol_semasa() in ('admin', 'lead_auditor'));

-- Bukti
create policy "Akses bukti" on public.bukti for select
  using (
    exists (
      select 1 from public.dapatan d join public.audit a on a.id = d.audit_id
      where d.id = bukti.dapatan_id
      and (public.rol_semasa() in ('admin', 'lead_auditor')
        or auth.uid() = a.lead_auditor_id or auth.uid() = any (a.auditor_ids))
    )
  );
create policy "Auditor tulis bukti" on public.bukti for all
  using (public.rol_semasa() in ('admin', 'lead_auditor', 'auditor'));

-- Laporan
create policy "Akses laporan" on public.laporan for select
  using (
    exists (select 1 from public.audit a where a.id = laporan.audit_id
      and (public.rol_semasa() in ('admin', 'lead_auditor')
        or auth.uid() = a.lead_auditor_id
        or auth.uid() = any (a.auditor_ids)
        or exists (select 1 from public.pengguna p where p.id = auth.uid() and p.pusat_operasi_id = a.pusat_operasi_id)))
  );
create policy "Lead urus laporan" on public.laporan for all using (public.rol_semasa() in ('admin', 'lead_auditor'));
