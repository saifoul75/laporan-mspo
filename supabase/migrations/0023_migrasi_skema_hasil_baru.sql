-- ============================================================
-- Migration 0023: Migrasi ke Skema Baru hasil_bulanan
-- Sumber: Unt Cawangan 2020-2026, sheet SAWIT & GETAH
-- Master projek: 2026 | Crosswalk daerah->PO | Wilayah ditambah
-- ============================================================

-- 1) DROP struktur lama
DROP VIEW IF EXISTS public.v_hasil_bulanan CASCADE;
DROP VIEW IF EXISTS public.v_hasil_tahunan CASCADE;
DROP VIEW IF EXISTS public.v_hasil_tahunan_projek CASCADE;
DROP VIEW IF EXISTS public.v_trend_tahunan CASCADE;
DROP VIEW IF EXISTS public.v_bulan_tersedia CASCADE;
DROP VIEW IF EXISTS public.v_ringkasan_po CASCADE;
DROP VIEW IF EXISTS public.v_ringkasan_wilayah CASCADE;
DROP TABLE IF EXISTS public.hasil_bulanan CASCADE;
DROP TABLE IF EXISTS public.projek_master_2026 CASCADE;
DROP TABLE IF EXISTS public.crosswalk_daerah_po CASCADE;
DROP TABLE IF EXISTS public.po_wilayah CASCADE;

-- 2) JADUAL UTAMA (fact, long-format)
create table if not exists public.hasil_bulanan (
  id                    bigint generated always as identity primary key,
  tahun                 int     not null,
  jenis                 text    not null check (jenis in ('SAWIT','GETAH')),
  kategori              text,
  pusat_operasi         text    not null,
  pusat_operasi_master  text,
  pusat_operasi_final   text,
  wilayah               text,
  kategori_master       text,
  nama_projek           text    not null,
  luas_kawasan_hek      numeric,
  luas_produktif_hek    numeric,
  bilangan_peserta      int,
  bulan                 int     not null check (bulan between 1 and 12),
  bulan_nama            text,
  hasil                 numeric not null,
  unit                  text    not null,
  in_master_2026        boolean default false
);

create index if not exists idx_hb_tahun  on public.hasil_bulanan(tahun);
create index if not exists idx_hb_jenis  on public.hasil_bulanan(jenis);
create index if not exists idx_hb_pofin  on public.hasil_bulanan(pusat_operasi_final);
create index if not exists idx_hb_wil    on public.hasil_bulanan(wilayah);
create index if not exists idx_hb_projek on public.hasil_bulanan(nama_projek);

-- 3) JADUAL MASTER PROJEK 2026
create table if not exists public.projek_master_2026 (
  jenis text not null check (jenis in ('SAWIT','GETAH')),
  kategori text, pusat_operasi text not null, nama_projek text not null,
  luas_kawasan_hek numeric, luas_produktif_hek numeric, bilangan_peserta int,
  primary key (jenis, nama_projek)
);

-- 4) RUJUKAN crosswalk & wilayah
create table if not exists public.crosswalk_daerah_po (
  daerah_asal text primary key, pusat_operasi text, wilayah text
);
create table if not exists public.po_wilayah (
  pusat_operasi text primary key, wilayah text
);

-- 5) VIEW RINGKASAN
create or replace view public.v_ringkasan_po as
with luas_projek as (
  select distinct tahun, wilayah, pusat_operasi_final as po, jenis, nama_projek, luas_produktif_hek
  from public.hasil_bulanan where pusat_operasi_final <> ''
),
luas_agg as (
  select tahun, wilayah, po, jenis, sum(luas_produktif_hek) as luas from luas_projek group by 1,2,3,4
),
hasil_agg as (
  select tahun, wilayah, pusat_operasi_final as po, jenis, sum(hasil) as jumlah_hasil
  from public.hasil_bulanan where pusat_operasi_final <> '' group by 1,2,3,4
)
select h.tahun, h.wilayah, h.po as pusat_operasi, h.jenis, h.jumlah_hasil,
       l.luas as luas_produktif_hek,
       round(h.jumlah_hasil/nullif(l.luas,0),3) as hasil_per_hek
from hasil_agg h left join luas_agg l using (tahun,wilayah,po,jenis);

create or replace view public.v_ringkasan_wilayah as
with lp as (
  select distinct tahun, wilayah, jenis, pusat_operasi_final, nama_projek, luas_produktif_hek
  from public.hasil_bulanan where pusat_operasi_final <> ''
)
select h.tahun, h.wilayah, h.jenis, sum(h.hasil) as jumlah_hasil,
       (select sum(luas_produktif_hek) from lp where lp.tahun=h.tahun and lp.wilayah=h.wilayah and lp.jenis=h.jenis) as luas
from public.hasil_bulanan h where h.pusat_operasi_final <> ''
group by h.tahun, h.wilayah, h.jenis;

-- 6) RLS + POLISI BACA-AWAM
alter table public.hasil_bulanan       enable row level security;
alter table public.projek_master_2026  enable row level security;
alter table public.crosswalk_daerah_po enable row level security;
alter table public.po_wilayah          enable row level security;

DROP POLICY IF EXISTS "baca_awam_hasil"     ON public.hasil_bulanan;
DROP POLICY IF EXISTS "baca_awam_master"    ON public.projek_master_2026;
DROP POLICY IF EXISTS "baca_awam_crosswalk" ON public.crosswalk_daerah_po;
DROP POLICY IF EXISTS "baca_awam_powil"     ON public.po_wilayah;

create policy "baca_awam_hasil"     on public.hasil_bulanan       for select to anon, authenticated using (true);
create policy "baca_awam_master"    on public.projek_master_2026  for select to anon, authenticated using (true);
create policy "baca_awam_crosswalk" on public.crosswalk_daerah_po for select to anon, authenticated using (true);
create policy "baca_awam_powil"     on public.po_wilayah          for select to anon, authenticated using (true);

grant usage on schema public to anon, authenticated;
grant select on public.hasil_bulanan, public.projek_master_2026, public.crosswalk_daerah_po, public.po_wilayah to anon, authenticated;
grant select on public.v_ringkasan_po, public.v_ringkasan_wilayah to anon, authenticated;

-- 7) INSERT po_wilayah (31 PO)
insert into public.po_wilayah (pusat_operasi, wilayah) values
  ('GERIK', 'UTARA'),
  ('KEDAH', 'UTARA'),
  ('KG.GAJAH', 'UTARA'),
  ('KUALA KANGSAR', 'UTARA'),
  ('LENGGONG', 'UTARA'),
  ('MANJUNG', 'UTARA'),
  ('SELANGOR', 'UTARA'),
  ('SIK', 'UTARA'),
  ('TAPAH', 'UTARA'),
  ('BENTONG', 'TENGAH'),
  ('JERANTUT', 'TENGAH'),
  ('KUANTAN', 'TENGAH'),
  ('LIPIS', 'TENGAH'),
  ('PEKAN', 'TENGAH'),
  ('RAUB', 'TENGAH'),
  ('ROMPIN', 'TENGAH'),
  ('TEMERLOH', 'TENGAH'),
  ('BESUT', 'TIMUR'),
  ('DUNGUN', 'TIMUR'),
  ('KUALA BERANG', 'TIMUR'),
  ('MACHANG', 'TIMUR'),
  ('ALOR GAJAH', 'SELATAN'),
  ('BUKIT KEPONG', 'SELATAN'),
  ('GEMENCEH', 'SELATAN'),
  ('JASIN', 'SELATAN'),
  ('JOHOR', 'SELATAN'),
  ('MASJID TANAH', 'SELATAN'),
  ('MELAKA', 'SELATAN'),
  ('MUAR', 'SELATAN'),
  ('N.SEMBILAN', 'SELATAN'),
  ('REMBAU', 'SELATAN')
on conflict (pusat_operasi) do update set wilayah = excluded.wilayah;

-- 8) INSERT crosswalk_daerah_po (identity mapping: daerah_asal = pusat_operasi)
insert into public.crosswalk_daerah_po (daerah_asal, pusat_operasi, wilayah) values
  ('GERIK', 'GERIK', 'UTARA'),
  ('KEDAH', 'KEDAH', 'UTARA'),
  ('KG.GAJAH', 'KG.GAJAH', 'UTARA'),
  ('KUALA KANGSAR', 'KUALA KANGSAR', 'UTARA'),
  ('LENGGONG', 'LENGGONG', 'UTARA'),
  ('MANJUNG', 'MANJUNG', 'UTARA'),
  ('SELANGOR', 'SELANGOR', 'UTARA'),
  ('SIK', 'SIK', 'UTARA'),
  ('TAPAH', 'TAPAH', 'UTARA'),
  ('BENTONG', 'BENTONG', 'TENGAH'),
  ('JERANTUT', 'JERANTUT', 'TENGAH'),
  ('KUANTAN', 'KUANTAN', 'TENGAH'),
  ('LIPIS', 'LIPIS', 'TENGAH'),
  ('PEKAN', 'PEKAN', 'TENGAH'),
  ('RAUB', 'RAUB', 'TENGAH'),
  ('ROMPIN', 'ROMPIN', 'TENGAH'),
  ('TEMERLOH', 'TEMERLOH', 'TENGAH'),
  ('BESUT', 'BESUT', 'TIMUR'),
  ('DUNGUN', 'DUNGUN', 'TIMUR'),
  ('KUALA BERANG', 'KUALA BERANG', 'TIMUR'),
  ('MACHANG', 'MACHANG', 'TIMUR'),
  ('ALOR GAJAH', 'ALOR GAJAH', 'SELATAN'),
  ('BUKIT KEPONG', 'BUKIT KEPONG', 'SELATAN'),
  ('GEMENCEH', 'GEMENCEH', 'SELATAN'),
  ('JASIN', 'JASIN', 'SELATAN'),
  ('JOHOR', 'JOHOR', 'SELATAN'),
  ('MASJID TANAH', 'MASJID TANAH', 'SELATAN'),
  ('MELAKA', 'MELAKA', 'SELATAN'),
  ('MUAR', 'MUAR', 'SELATAN'),
  ('N.SEMBILAN', 'N.SEMBILAN', 'SELATAN'),
  ('REMBAU', 'REMBAU', 'SELATAN')
on conflict (daerah_asal) do update set pusat_operasi = excluded.pusat_operasi, wilayah = excluded.wilayah;

-- 9) INSERT projek_master_2026 (149 projek)
insert into public.projek_master_2026 (jenis, kategori, pusat_operasi, nama_projek, luas_kawasan_hek, luas_produktif_hek, bilangan_peserta) values
  ('SAWIT', NULL, 'JOHOR', 'TSK MAOKIL', 58.6644, 53.9712, 34),
  ('SAWIT', NULL, 'JOHOR', 'TSK OA KG. LANJUT', 42.3, 38.916, 21),
  ('SAWIT', NULL, 'JOHOR', 'TSK FELDA CHEMPLAK 25 FASA 2', 23.1736, 18.3811, 29),
  ('SAWIT', NULL, 'KUALA BERANG', 'TSK ME TELAGA', 98.6792, 66.33, 73),
  ('SAWIT', NULL, 'KUALA BERANG', 'TSK TOK DAMAT', 18.2146, 16, 8),
  ('SAWIT', NULL, 'KUALA BERANG', 'TSK SEMAYOR', 69.6209, 50, 36),
  ('SAWIT', NULL, 'KUALA BERANG', 'TSK ALOR LIMBAT 1', 4.8937, 4.1, 3),
  ('SAWIT', NULL, 'KUALA BERANG', 'TSK BUKIT NANGKA 1', 17.6841, 15.28, 2),
  ('SAWIT', NULL, 'KUALA BERANG', 'TSK BATU HAMPAR', 12.4035, 10.31, 2),
  ('SAWIT', NULL, 'KUALA BERANG', 'TSK PASIR GAJAH 1', 12.1675, 10.39, 7),
  ('SAWIT', NULL, 'KUALA BERANG', 'TSK BUKIT NANGKA 2', 16.3682, 13.17, 3),
  ('SAWIT', NULL, 'KUALA BERANG', 'TSK ME TANGGOL', 25.8488, 22, 18),
  ('SAWIT', NULL, 'KUALA BERANG', 'TSK KAMPONG WA', 30.5691, 27.51, 18),
  ('SAWIT', NULL, 'KUALA BERANG', 'TSK ME LATA TOK GAJAH', 44.8863, 40, 20),
  ('SAWIT', NULL, 'KUALA BERANG', 'TSK ME BUKIT BONGOR', 64.4456, 58, 28),
  ('SAWIT', NULL, 'KUALA BERANG', 'TSK KEMANG', 18.899799999999995, 17, 15),
  ('SAWIT', NULL, 'KUALA BERANG', 'TSK SERDANG KELIYU', 14.8083, 10.4, 8),
  ('SAWIT', NULL, 'KUALA BERANG', 'TSK LUBUK BEBAKA', 19.1076, 15.66, 13),
  ('SAWIT', NULL, 'KUALA BERANG', 'TSK BKT NYAMOK', 38.9206, 22, 18),
  ('SAWIT', NULL, 'KUALA BERANG', 'TSK LENTANG', 23.5504, 21, 9),
  ('SAWIT', NULL, 'KUALA BERANG', 'TSK PENAGA', 12.5264, 10.02, 11),
  ('SAWIT', NULL, 'KUALA KANGSAR', 'TSK ME CHKT SEMANTUN', 66.07, 59.04, 86),
  ('SAWIT', NULL, 'KUALA KANGSAR', 'TSK LEREK 1', 23.3242, 20.2136, 23),
  ('SAWIT', NULL, 'KUALA KANGSAR', 'TSK LEREK 2', 52.4109, 44.215, 34),
  ('SAWIT', NULL, 'KUALA KANGSAR', 'TSK ILR PADANG RENGAS', 28.17, 24.76, 8),
  ('SAWIT', NULL, 'KUALA KANGSAR', 'TSK LEMPOR HULU', 26.1199, 23.2356, 35),
  ('SAWIT', NULL, 'KUALA KANGSAR', 'TSK LEMPOR', 62.32, 51.79, 74),
  ('SAWIT', NULL, 'KUANTAN', 'TSK PULAU RUMPUT', 42.44, 32.13, 37),
  ('SAWIT', NULL, 'KUANTAN', 'TSK TANJUNG PERAWAN', 50.2393, 46.65, 39),
  ('SAWIT', NULL, 'KUANTAN', 'TSK KASING', 109.29, 109.29, 44),
  ('SAWIT', NULL, 'KUANTAN', 'TSK LAMIR 2', 92.94, 76.49, 91),
  ('SAWIT', NULL, 'KUANTAN', 'TSK NADAK SEBERANG', 80.5997, 64.28, 38),
  ('SAWIT', NULL, 'LIPIS', 'TSK TG GAHAI', 52.809, 42.73, 87),
  ('SAWIT', NULL, 'LIPIS', 'TSK LENGKUAI', 20.6186, 18.26, 13),
  ('SAWIT', NULL, 'MACHANG', 'TSK ALOR SERDANG', 7.89, 7, 4),
  ('SAWIT', NULL, 'MACHANG', 'TSK JABI 1', 18.43, 13.8, 12),
  ('SAWIT', NULL, 'MACHANG', 'TSK PANGGONG 2', 6.15, 5.69, 10),
  ('SAWIT', NULL, 'MACHANG', 'TSK DURIAN KUNYIT', 2.14, 1.81, 1),
  ('SAWIT', NULL, 'MACHANG', 'TSK PANGGONG 3', 10.28, 9.25, 11),
  ('SAWIT', NULL, 'MACHANG', 'TSK GONG CHENERAI', 20.21, 19.68, 23),
  ('SAWIT', NULL, 'MACHANG', 'TSK GUAL MESA', 13.46, 12.11, 10),
  ('SAWIT', NULL, 'MACHANG', 'TSK PANGGONG 1', 11.58, 10.55, 13),
  ('SAWIT', NULL, 'MACHANG', 'TSK POHON SETOL', 19.37, 18.13, 13),
  ('SAWIT', NULL, 'MACHANG', 'TSK ME BANGGOL TASEK 2', 92.13, 59.79, 38),
  ('SAWIT', NULL, 'MACHANG', 'TSK ME PELAGAT 1', 87.33, 82.72, 76),
  ('SAWIT', NULL, 'MACHANG', 'TSK AIR RA 1', 22.206, 19.98, 14),
  ('SAWIT', NULL, 'MACHANG', 'TSK DALAM BUAYA', 8.52, 8.09, 11),
  ('SAWIT', NULL, 'MACHANG', 'TSK JABI 2', 19.28, 17.18, 17),
  ('SAWIT', NULL, 'MACHANG', 'TSK ME BELIKU', 162.36, 153.03, 73),
  ('SAWIT', NULL, 'MACHANG', 'TSK PANCHOR', 12.7, 10.14, 7),
  ('SAWIT', NULL, 'MANJUNG', 'TSK OA TEMBUH HANGAT', 2.63, 2.37, 6),
  ('SAWIT', NULL, 'MANJUNG', 'TSK CHKT. CERMIN 4', 7.2435, 7.2435, 7),
  ('SAWIT', NULL, 'MANJUNG', 'TSK OA SG. PERAH', 27.92, 26.53, 32),
  ('SAWIT', NULL, 'MANJUNG', 'TSK CHERMIN 3 TAMBAHAN', 15.24, 13.72, 13),
  ('SAWIT', NULL, 'MANJUNG', 'TSK CHKT. CERMIN 3', 21.78, 19.51, 34),
  ('SAWIT', NULL, 'MANJUNG', 'TSK TELUK SAREH', 45.86, 43.56, 47),
  ('SAWIT', NULL, 'MANJUNG', 'TSK BELUKAR NANGKA', 43.25, 41.09, 57),
  ('SAWIT', NULL, 'MANJUNG', 'TSK MERUA 3', 62.55, 53.15, 114),
  ('SAWIT', NULL, 'MANJUNG', 'TSK KOLAM AYER', 36.24, 34.38, 64),
  ('SAWIT', NULL, 'MANJUNG', 'TSK GELUNG PEPUYU', 40.5, 36.46, 42),
  ('SAWIT', NULL, 'MANJUNG', 'TSK OA GEDUNG BATU', 23.2, 21.43, 28),
  ('SAWIT', NULL, 'MANJUNG', 'TSK BUDIMAN', 37.8, 34.01, 29),
  ('SAWIT', NULL, 'MANJUNG', 'TSK TALANG KOTA PAGAR', 12.09, 10.81, 18),
  ('SAWIT', NULL, 'MANJUNG', 'TSK PASIR KUBU 2', 7, 7, 15),
  ('SAWIT', NULL, 'MANJUNG', 'TSK PAYA JELUTONG', 38.81, 36.49, 68),
  ('SAWIT', NULL, 'MANJUNG', 'TSK BURUK BAKUL 2', 9.93, 8.84, 17),
  ('SAWIT', NULL, 'MANJUNG', 'TSK SG. RIAM', 18.46, 17.24, 9),
  ('SAWIT', NULL, 'MANJUNG', 'TSK CHKT. MANGGIS', 24.63, 18.77, 33),
  ('SAWIT', NULL, 'MANJUNG', 'TSK OA SUAK PADI', 16.79, 14.25, 17),
  ('SAWIT', NULL, 'MANJUNG', 'TSK TALANG BLANJA', 11.98, 10.33, 16),
  ('SAWIT', NULL, 'MANJUNG', 'TSK CHKT. CHERMIN 2', 48.29, 45.87, 52),
  ('SAWIT', NULL, 'MANJUNG', 'TSK TALANG BLANJA (T)', 20.67, 19.23, 21),
  ('SAWIT', NULL, 'MANJUNG', 'TSK MEENACHI ESTET', 54.13, 45.97, 54),
  ('SAWIT', NULL, 'MANJUNG', 'TSK GEDUNG BATU (M)', 15.71, 14.21, 21),
  ('SAWIT', NULL, 'MANJUNG', 'TSK MERUA 2', 37.22, 22.68, 62),
  ('SAWIT', NULL, 'MANJUNG', 'TSK INDERA SAKTI 3', 12.69, 11.42, 12),
  ('SAWIT', NULL, 'MELAKA', 'TSK (ME) PADANG SEBANG', 73.5738, 67.5943, 139),
  ('SAWIT', NULL, 'MELAKA', 'TSK TG RIMAU DALAM', 190.1111, 172.796, 385),
  ('SAWIT', NULL, 'MELAKA', 'TSK PAYA LEBAR', 16.7123, 15.8232, 26),
  ('SAWIT', NULL, 'MELAKA', 'TSK AIR MOLEK', 23.7204, 22.5343, 49),
  ('SAWIT', NULL, 'MELAKA', 'TSK TEBING TINGGI', 21.0609, 20.6397, 35),
  ('SAWIT', NULL, 'MELAKA', 'TSK (ME) LUBOK KEPONG', 97.6956, 92.8108, 186),
  ('SAWIT', NULL, 'MELAKA', 'TSK SOLOK MINCHING', 70.798, 61.5943, 162),
  ('SAWIT', NULL, 'MELAKA', 'TSK MELEKEK DALAM', 53.1986, 45.2188, 103),
  ('SAWIT', NULL, 'MELAKA', 'TSK GAUNG TINGGI 1', 46.01459999999997, 43.97039999999997, 91),
  ('SAWIT', NULL, 'MELAKA', 'TSK AIR LIMAU (S)', 6.7101, 6.2665, 14),
  ('SAWIT', NULL, 'MELAKA', 'TSK PADANG KAMBING', 16.0568, 15.254, 32),
  ('SAWIT', NULL, 'MELAKA', 'TSK GAUNG TINGGI 2', 104.82169999999998, 98.49849999999998, 175),
  ('SAWIT', NULL, 'MELAKA', 'TSK KESANG 1', 19.5858, 19.4449, 22),
  ('SAWIT', NULL, 'MELAKA', 'TSK PAYA BELANTAI', 28.0647, 26.5027, 33),
  ('SAWIT', NULL, 'MELAKA', 'TSK TAMBAK PAYA', 51.0555, 46.3458, 89),
  ('SAWIT', NULL, 'MELAKA', 'TSK KUALA LINGGI', 20.904199999999992, 20.194499999999994, 44),
  ('SAWIT', NULL, 'MELAKA', 'TSK SOLOK PEKAT', 91.75308462962964, 82.61068462962963, 168),
  ('SAWIT', NULL, 'MELAKA', 'TSK PADANG BESAR', 42.1837, 40.0745, 78),
  ('SAWIT', NULL, 'MELAKA', 'TSK DELIMA 3', 154.38181000000006, 124.61, 240),
  ('SAWIT', NULL, 'MELAKA', 'TSK TULANG DAING', 20.311899999999994, 19.169999999999998, 24),
  ('SAWIT', NULL, 'MELAKA', 'TSK BUKIT PAYONG', 29.6624, 28.17925, 19),
  ('SAWIT', NULL, 'N.SEMBILAN', 'TSK RTP A.A SEBEROK', 29.1877, 27.728, 27),
  ('SAWIT', NULL, 'N.SEMBILAN', 'TSK PILIN 2', 31.3987, 30.5827, 26),
  ('SAWIT', NULL, 'N.SEMBILAN', 'TSK KG.PAYA', 14.1813, 14, 11),
  ('SAWIT', NULL, 'N.SEMBILAN', 'TSK REMBANG PANAS', 24.8448, 23.6025, 49),
  ('SAWIT', NULL, 'N.SEMBILAN', 'TSK ME BUKIT PERAH 1', 41.9453, 29.3616, 55),
  ('SAWIT', NULL, 'N.SEMBILAN', 'TSK SOLOK', 13.4243, 13, 32),
  ('SAWIT', NULL, 'N.SEMBILAN', 'TSK OA RANGGOI', 73.6678, 69.99, 46),
  ('SAWIT', NULL, 'N.SEMBILAN', 'PKS LUBUK KEMPAS 2', 110.1588, 106.76, 148),
  ('SAWIT', NULL, 'N.SEMBILAN', 'TSK ME KANCHONG', 147.5511, 133.46, 291),
  ('SAWIT', NULL, 'N.SEMBILAN', 'TSK ME PANGLANG 2', 44.0372, 26.4223, 41),
  ('SAWIT', NULL, 'N.SEMBILAN', 'TSK RTP P.DURIAN 3', 41.949, 39.22, 34),
  ('SAWIT', NULL, 'N.SEMBILAN', 'TSK BATU BERDINDING', 55.7351, 52.9483, 85),
  ('SAWIT', NULL, 'N.SEMBILAN', 'PKS TG AGAS', 38.7526, 34.68, 32),
  ('SAWIT', NULL, 'N.SEMBILAN', 'TSK LUBUK KEMPAS 1', 75.4759, 71.7021, 78),
  ('SAWIT', NULL, 'N.SEMBILAN', 'TSK ME KUNDOR', 61.2376, 58.41, 97),
  ('SAWIT', NULL, 'N.SEMBILAN', 'TSK KANCHONG', 142.621, 132.64, 260),
  ('SAWIT', NULL, 'RAUB', 'TSK OA ULU RENGGOL', 80.95, 72.24, 31),
  ('SAWIT', NULL, 'RAUB', 'TSK LECHAR', 31.28, 28.78, 16),
  ('SAWIT', NULL, 'RAUB', 'TSK ME ULU RENGGOL', 221.28, 192.86, 1),
  ('SAWIT', NULL, 'RAUB', 'TSK KUALA ATOK', 28.777, 27.947, 28),
  ('SAWIT', NULL, 'RAUB', 'TSK SENGKELA', 15.0088, 14.88, 13),
  ('SAWIT', NULL, 'RAUB', 'TSK SEGA LAMA', 54.973, 51.243, 37),
  ('SAWIT', NULL, 'RAUB', 'TSK ME ULU JELU', 175.96, 153, 84),
  ('SAWIT', NULL, 'RAUB', 'TSK OA SG SEMALIN', 83.93, 70.14, 35),
  ('SAWIT', NULL, 'ROMPIN', 'TSK AUR', 86.86, 80, 39),
  ('SAWIT', NULL, 'ROMPIN', 'TSK GADING', 72.16, 72.16, 29),
  ('SAWIT', NULL, 'TAPAH', 'TSK OA ULU KUANG', 37.196, 25.96, 43),
  ('SAWIT', NULL, 'TAPAH', 'TSK GESIR 1', 64.3691, 58.206, 44),
  ('SAWIT', NULL, 'TAPAH', 'TSK KALUMPANG', 99.45, 90, 44),
  ('SAWIT', NULL, 'TAPAH', 'TSK OA CHAWANG', 29.7, 29.7, 16),
  ('SAWIT', NULL, 'TAPAH', 'TSK ME KG RASAU', 88.95, 80, 132),
  ('SAWIT', NULL, 'TEMERLOH', 'TSK ME BUKIT ROK', 61.2612, 57.1579, 39),
  ('SAWIT', NULL, 'TEMERLOH', 'TSK OA EMBUS', 60.95, 48.41, 23),
  ('SAWIT', NULL, 'TEMERLOH', 'TSK ME BUKIT PENAK', 139.0164, 131.9983, 65),
  ('SAWIT', NULL, 'TEMERLOH', 'TSK MACHANG GELAP', 62.3357, 60.867, 63),
  ('SAWIT', NULL, 'TEMERLOH', 'TSK BUKIT KELEDAN', 31.2745, 27.8, 16),
  ('SAWIT', NULL, 'TEMERLOH', 'TSK OA PASU', 146, 146, 110),
  ('SAWIT', NULL, 'TEMERLOH', 'TSK PAYA JEJAWI', 66.5362, 55.64, 74),
  ('SAWIT', NULL, 'TEMERLOH', 'TSK BUKIT KERTAU', 63.0724, 55.1478, 50),
  ('SAWIT', NULL, 'TEMERLOH', 'TSK ME DARAT LENTANG', 135.9274, 121.77019999999999, 63),
  ('SAWIT', NULL, 'TEMERLOH', 'TSK BONGSU', 49.6137, 40, 20),
  ('SAWIT', NULL, 'TEMERLOH', 'TSK KUALA WAU', 91.92, 74.8676, 86),
  ('SAWIT', NULL, 'TEMERLOH', 'TSK ME BERHALA GANTANG', 117.4288, 102.6375, 86),
  ('GETAH', NULL, 'GERIK', 'LADANG RISDA WILAYAH GANDA BLOK 6', 219, 187.12, 1),
  ('GETAH', NULL, 'JOHOR', 'TSK TEKAM', 22.5132, 15.32, 11),
  ('GETAH', NULL, 'KEDAH', 'TSK LYTAR', 118, 95.14, 1),
  ('GETAH', NULL, 'KEDAH', 'TSK ME KUBANG KENYENG', 33.4964, 28.82, 9),
  ('GETAH', NULL, 'KEDAH', 'TSK TBKG BUKIT PERANGIN', 142.7864, 83.488, 35),
  ('GETAH', NULL, 'KEDAH', 'TSK ME CHANGHAI', 109.482, 79, 45),
  ('GETAH', NULL, 'LIPIS', 'TSK TBKG BUKIT RIBU', 53.9, 37.37, 66),
  ('GETAH', NULL, 'LIPIS', 'AGROPOLITAN GAHAI 1', 202.34, 159.35, 80),
  ('GETAH', NULL, 'LIPIS', 'TSK ME KG TERAP', 229.42, 111, 102)
on conflict (jenis, nama_projek) do update set kategori = excluded.kategori, pusat_operasi = excluded.pusat_operasi, luas_kawasan_hek = excluded.luas_kawasan_hek, luas_produktif_hek = excluded.luas_produktif_hek, bilangan_peserta = excluded.bilangan_peserta;
