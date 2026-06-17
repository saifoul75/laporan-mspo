-- =====================================================
-- schema.sql
-- Skema untuk data hasil sawit & getah 2020-2026
-- Idempotent: selamat di-run berulang kali
-- =====================================================

-- ── 1. Trigger function untuk dikemaskini_pada ──
create or replace function public.set_dikemaskini_pada()
returns trigger as $$
begin
  new.dikemaskini_pada = now();
  return new;
end;
$$ language plpgsql;

-- ── 2. Jadual utama: hasil_bulanan ──
create table if not exists public.hasil_bulanan (
  id uuid primary key default gen_random_uuid(),
  kod_bulan text not null,           -- '2026-01', '2020-12'
  nama_bulan text not null,          -- 'Januari 2026'
  jenis text not null check (jenis in ('sawit', 'getah')),
  pol_pn text not null,
  bil integer,
  nama text not null,
  peserta integer default 0,
  luas_hek numeric(12, 4) default 0,
  luas_operasi numeric(12, 4) default 0,     -- luas_dituai (sawit) / luas_ditoreh (getah)
  hasil numeric(12, 4) default 0,            -- hasil_mt (sawit) / hasil_kg (getah)
  hasil_per_hek numeric(12, 4) default 0,    -- mtan_hek / kg_hek
  matlamat_setahun numeric(14, 4) default 0,
  pct_setahun numeric(8, 4) default 0,
  pendapatan numeric(14, 2) default 0,
  kos numeric(14, 2) default 0,
  untung_rugi numeric(14, 2) default 0,
  dicipta_pada timestamptz not null default now(),
  dikemaskini_pada timestamptz not null default now(),
  unique(kod_bulan, jenis, nama)
);

-- ── 3. Indexes untuk prestasi query ──
create index if not exists idx_hasil_kod_bulan on public.hasil_bulanan (kod_bulan);
create index if not exists idx_hasil_jenis on public.hasil_bulanan (jenis);
create index if not exists idx_hasil_pol_pn on public.hasil_bulanan (pol_pn);
create index if not exists idx_hasil_tahun on public.hasil_bulanan (substring(kod_bulan, 1, 4));
create index if not exists idx_hasil_jenis_pol on public.hasil_bulanan (jenis, pol_pn);

-- ── 4. Trigger auto-update timestamp ──
drop trigger if exists trg_hasil_bulanan_kemaskini on public.hasil_bulanan;
create trigger trg_hasil_bulanan_kemaskini
  before update on public.hasil_bulanan
  for each row execute function public.set_dikemaskini_pada();

-- ── 5. RLS (Row Level Security) ──
alter table public.hasil_bulanan enable row level security;

drop policy if exists "Admin boleh semua" on public.hasil_bulanan;
create policy "Admin boleh semua" on public.hasil_bulanan
  for all using (
    auth.jwt() ->> 'role' = 'admin'
    or exists (select 1 from public.pengguna pg where pg.id = auth.uid() and pg.rol = 'admin')
  );

drop policy if exists "Pengguna boleh baca" on public.hasil_bulanan;
create policy "Pengguna boleh baca" on public.hasil_bulanan
  for select using (auth.role() = 'authenticated');

drop policy if exists "Anon boleh baca hasil" on public.hasil_bulanan;
create policy "Anon boleh baca hasil" on public.hasil_bulanan
  for select using (auth.role() = 'anon');

-- =====================================================
-- VIEWS untuk laporan & dashboard
-- =====================================================

-- ── 6. View: hasil bulanan (passthrough dengan derived fields) ──
create or replace view public.v_hasil_bulanan as
select
  id,
  kod_bulan,
  nama_bulan,
  substring(kod_bulan, 1, 4) as tahun,
  substring(kod_bulan, 6, 2) as bulan,
  jenis,
  pol_pn,
  bil,
  nama,
  peserta,
  luas_hek,
  luas_operasi,
  hasil,
  hasil_per_hek,
  matlamat_setahun,
  case
    when matlamat_setahun > 0
    then round((hasil / matlamat_setahun) * 100, 2)
    else 0
  end as pct_setahun,
  pendapatan,
  kos,
  untung_rugi
from public.hasil_bulanan;

-- ── 7. View: agregat tahunan per POL/PN ──
create or replace view public.v_hasil_tahunan as
select
  substring(kod_bulan, 1, 4) as tahun,
  jenis,
  pol_pn,
  count(distinct nama)         as bil_projek,
  sum(peserta)                 as jumlah_peserta,
  sum(luas_hek)                as jumlah_luas_hek,
  sum(luas_operasi)            as jumlah_luas_operasi,
  sum(hasil)                   as jumlah_hasil,
  case
    when sum(luas_hek) > 0
    then round(sum(hasil) / sum(luas_hek), 2)
    else 0
  end as purata_hasil_per_hek,
  sum(matlamat_setahun)        as jumlah_matlamat,
  case
    when sum(matlamat_setahun) > 0
    then round((sum(hasil) / sum(matlamat_setahun)) * 100, 2)
    else 0
  end as pct_setahun,
  sum(pendapatan)              as jumlah_pendapatan,
  sum(kos)                     as jumlah_kos,
  sum(untung_rugi)             as jumlah_untung_rugi
from public.hasil_bulanan
group by substring(kod_bulan, 1, 4), jenis, pol_pn
order by tahun, jenis, pol_pn;

-- ── 8. View: agregat tahunan per projek ──
create or replace view public.v_hasil_tahunan_projek as
select
  substring(kod_bulan, 1, 4) as tahun,
  jenis,
  pol_pn,
  nama,
  sum(peserta)                 as jumlah_peserta,
  sum(luas_hek)                as jumlah_luas_hek,
  sum(luas_operasi)            as jumlah_luas_operasi,
  sum(hasil)                   as jumlah_hasil,
  case
    when sum(luas_hek) > 0
    then round(sum(hasil) / sum(luas_hek), 2)
    else 0
  end as purata_hasil_per_hek,
  sum(matlamat_setahun)        as jumlah_matlamat,
  case
    when sum(matlamat_setahun) > 0
    then round((sum(hasil) / sum(matlamat_setahun)) * 100, 2)
    else 0
  end as pct_setahun,
  sum(pendapatan)              as jumlah_pendapatan,
  sum(kos)                     as jumlah_kos,
  sum(untung_rugi)             as jumlah_untung_rugi
from public.hasil_bulanan
group by substring(kod_bulan, 1, 4), jenis, pol_pn, nama
order by tahun, jenis, pol_pn, nama;

-- ── 9. View: trend tahunan (banding 2020-2026) ──
create or replace view public.v_trend_tahunan as
select
  substring(kod_bulan, 1, 4) as tahun,
  jenis,
  count(distinct nama)         as bil_projek,
  count(distinct pol_pn)       as bil_pol,
  sum(luas_hek)                as jumlah_luas_hek,
  sum(hasil)                   as jumlah_hasil,
  case
    when sum(luas_hek) > 0
    then round(sum(hasil) / sum(luas_hek), 2)
    else 0
  end as purata_hasil_per_hek,
  sum(pendapatan)              as jumlah_pendapatan,
  sum(kos)                     as jumlah_kos,
  sum(untung_rugi)             as jumlah_untung_rugi
from public.hasil_bulanan
group by substring(kod_bulan, 1, 4), jenis
order by tahun, jenis;

-- ── 10. View: senarai bulan tersedia ──
create or replace view public.v_bulan_tersedia as
select distinct
  kod_bulan,
  nama_bulan,
  substring(kod_bulan, 1, 4) as tahun,
  case substring(kod_bulan, 6, 2)
    when '01' then 'Januari'
    when '02' then 'Februari'
    when '03' then 'Mac'
    when '04' then 'April'
    when '05' then 'Mei'
    when '06' then 'Jun'
    when '07' then 'Julai'
    when '08' then 'Ogos'
    when '09' then 'September'
    when '10' then 'Oktober'
    when '11' then 'November'
    when '12' then 'Disember'
  end as nama_bulan_ms,
  count(*) as jumlah_baris
from public.hasil_bulanan
group by kod_bulan, nama_bulan
order by kod_bulan;

-- =====================================================
-- GRANT akses untuk views
-- =====================================================
grant select on public.v_hasil_bulanan      to anon, authenticated;
grant select on public.v_hasil_tahunan      to anon, authenticated;
grant select on public.v_hasil_tahunan_projek to anon, authenticated;
grant select on public.v_trend_tahunan      to anon, authenticated;
grant select on public.v_bulan_tersedia     to anon, authenticated;

-- =====================================================
-- SELESAI
-- =====================================================
