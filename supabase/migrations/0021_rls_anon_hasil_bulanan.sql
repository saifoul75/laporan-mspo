-- =====================================================
-- 0021: Tambah RLS policy untuk anonymous read access
-- Membenarkan anonymous users membaca hasil_bulanan
-- =====================================================

-- Drop existing policies (idempotent)
DROP POLICY IF EXISTS "Public boleh baca" ON public.hasil_bulanan;
DROP POLICY IF EXISTS "Anon dapat baca" ON public.hasil_bulanan;

-- Benarkan anon baca hasil_bulanan — guna TO anon USING (true)
-- JANGAN guna auth.role() = 'anon' — deprecated dan tidak berfungsi dalam Supabase baru
CREATE POLICY "Anon dapat baca" ON public.hasil_bulanan
  FOR SELECT
  TO anon
  USING (true);

