-- =====================================================
-- 0021: Tambah RLS policy untuk anonymous read access
-- Membenarkan anonymous users membaca hasil_bulanan
-- =====================================================

create policy "Public boleh baca" on public.hasil_bulanan
  for select using (true);
