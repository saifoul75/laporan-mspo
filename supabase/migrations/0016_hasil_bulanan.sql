-- =====================================================
-- JADUAL: hasil_bulanan
-- Data hasil sawit & getah mengikut bulan
-- =====================================================
create table if not exists public.hasil_bulanan (
  id uuid primary key default gen_random_uuid(),
  kod_bulan text not null,           -- '2026-01'
  nama_bulan text not null,           -- 'Januari 2026'
  jenis text not null check (jenis in ('sawit', 'getah')),
  pol_pn text not null,
  bil integer,
  nama text not null,
  peserta integer default 0,
  luas_hek numeric(12, 4) default 0,
  luas_operasi numeric(12, 4) default 0,  -- luas_dituai (sawit) / luas_ditoreh (getah)
  hasil numeric(12, 4) default 0,        -- hasil_mt (sawit) / hasil_kg (getah)
  hasil_per_hek numeric(12, 4) default 0, -- mtan_hek / kg_hek
  matlamat_setahun numeric(14, 4) default 0,
  pct_setahun numeric(8, 4) default 0,
  pendapatan numeric(14, 2) default 0,
  kos numeric(14, 2) default 0,
  untung_rugi numeric(14, 2) default 0,
  dicipta_pada timestamptz not null default now(),
  dikemaskini_pada timestamptz not null default now(),
  unique(kod_bulan, jenis, nama)
);

create index idx_hasil_kod_bulan on public.hasil_bulanan (kod_bulan);
create index idx_hasil_jenis on public.hasil_bulanan (jenis);
create index idx_hasil_pol_pn on public.hasil_bulanan (pol_pn);

-- RLS
alter table public.hasil_bulanan enable row level security;

create policy "Admin boleh semua" on public.hasil_bulanan
  for all using (
    auth.jwt() ->> 'role' = 'admin'
    or exists (select 1 from public.pengguna pg where pg.id = auth.uid() and pg.rol = 'admin')
  );

create policy "Pengguna boleh baca" on public.hasil_bulanan
  for select using (auth.role() = 'authenticated');

-- Trigger auto-update timestamp
create trigger trg_hasil_bulanan_kemaskini before update on public.hasil_bulanan
  for each row execute function public.set_dikemaskini_pada();
