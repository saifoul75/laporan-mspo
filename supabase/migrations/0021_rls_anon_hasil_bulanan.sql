-- =====================================================
-- 0021: Tambah RLS policy untuk anonymous read access
-- Membenarkan anonymous users membaca hasil_bulanan
-- =====================================================

-- Drop existing restrictive policies if needed
DROP POLICY IF EXISTS "Public boleh baca" ON public.hasil_bulanan;

-- Create policy allowing anonymous (role = 'anon') to read
CREATE POLICY "Anon dapat baca" ON public.hasil_bulanan
  FOR SELECT
  USING (auth.role() = 'anon');

