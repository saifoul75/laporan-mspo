-- ============================================================
-- Migration 0019: Baiki "infinite recursion" RLS untuk kongsi awam
-- ============================================================
-- Punca: polisi RLS sedia ada (0001/0003) dicipta TANPA klausa "TO",
-- jadi terpakai untuk SEMUA peranan termasuk 'anon'. Polisi tersebut
-- merujuk silang antara laporan/audit/pengguna; bila digabung dengan
-- polisi kongsi awam (0018) yang juga merujuk silang, ia membentuk
-- kitaran tak terhingga -> ERROR 42P17 -> halaman /share pulangkan 404.
--
-- Penyelesaian:
--  1) Hadkan SEMUA polisi sedia ada pada jadual berkaitan kepada peranan
--     'authenticated' (guna ALTER POLICY supaya logik USING tidak berubah).
--     Hasilnya: peranan 'anon' HANYA guna polisi kongsi awam (0018) yang
--     membentuk graf tanpa kitaran (DAG).
--  2) Tambah polisi baca 'anon' untuk jadual rujukan (prinsip, kriteria,
--     item_semakan) supaya klausa/item dipaparkan pada laporan kongsi.
--
-- Tiada perubahan keizinan untuk pengguna yang sudah log masuk.
-- ============================================================

begin;

-- 1) Hadkan polisi sedia ada kepada 'authenticated' sahaja (kekalkan logik USING)
do $$
declare r record;
begin
  for r in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('laporan','audit','dapatan','pusat_operasi','pengguna')
      and not ('anon' = any (roles))           -- jangan sentuh polisi kongsi awam (anon)
      and not ('authenticated' = any (roles))  -- skip kalau sudah authenticated
  loop
    execute format('alter policy %I on public.%I to authenticated', r.policyname, r.tablename);
  end loop;
end $$;

-- 2) Benarkan 'anon' baca jadual rujukan (data piawai MSPO, bukan sensitif)
--    hanya apabila ada sekurang-kurangnya satu laporan kongsi aktif.
drop policy if exists "Baca prinsip kongsi awam" on public.prinsip;
create policy "Baca prinsip kongsi awam" on public.prinsip
  for select to anon
  using (exists (select 1 from public.laporan l where l.kongsi_aktif = true and l.token_kongsi is not null));

drop policy if exists "Baca kriteria kongsi awam" on public.kriteria;
create policy "Baca kriteria kongsi awam" on public.kriteria
  for select to anon
  using (exists (select 1 from public.laporan l where l.kongsi_aktif = true and l.token_kongsi is not null));

drop policy if exists "Baca item kongsi awam" on public.item_semakan;
create policy "Baca item kongsi awam" on public.item_semakan
  for select to anon
  using (exists (select 1 from public.laporan l where l.kongsi_aktif = true and l.token_kongsi is not null));

commit;
