-- =====================================================
-- 0020: Tambah lajur negeri & wilayah pada hasil_bulanan
-- Wilayah = kumpulan negeri (RISDA): Utara/Timur/Tengah/Selatan
-- =====================================================

alter table public.hasil_bulanan add column if not exists negeri text;
alter table public.hasil_bulanan add column if not exists wilayah text;

-- Negeri mengikut Pusat Operasi (pol_pn)
update public.hasil_bulanan set negeri = 'Terengganu'      where pol_pn in ('BESUT','DUNGUN','KUALA BERANG');
update public.hasil_bulanan set negeri = 'Perak'           where pol_pn in ('GERIK','KG GAJAH','KUALA KANGSAR','MANJUNG','SELAMA');
update public.hasil_bulanan set negeri = 'Pahang'          where pol_pn in ('KUANTAN','LIPIS','PEKAN','RAUB','ROMPIN');
update public.hasil_bulanan set negeri = 'Kelantan'        where pol_pn in ('MACHANG');
update public.hasil_bulanan set negeri = 'Kedah'           where pol_pn in ('KEDAH');
update public.hasil_bulanan set negeri = 'Johor'           where pol_pn in ('JOHOR');
update public.hasil_bulanan set negeri = 'Melaka'          where pol_pn in ('MELAKA');
update public.hasil_bulanan set negeri = 'Negeri Sembilan' where pol_pn in ('N SEMBILAN');
update public.hasil_bulanan set negeri = 'Selangor'        where pol_pn in ('SELANGOR');

-- Wilayah mengikut Negeri
update public.hasil_bulanan set wilayah = 'Utara'   where negeri in ('Perak','Kedah','Selangor');
update public.hasil_bulanan set wilayah = 'Timur'   where negeri in ('Terengganu','Kelantan');
update public.hasil_bulanan set wilayah = 'Tengah'  where negeri in ('Pahang');
update public.hasil_bulanan set wilayah = 'Selatan' where negeri in ('Negeri Sembilan','Melaka','Johor');

create index if not exists idx_hasil_negeri on public.hasil_bulanan (negeri);
create index if not exists idx_hasil_wilayah on public.hasil_bulanan (wilayah);
