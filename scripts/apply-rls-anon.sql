-- Apply anonymous read access to hasil_bulanan
-- Execute this in Supabase SQL Editor

-- First, drop the existing "Public boleh baca" policy if it exists
DROP POLICY IF EXISTS "Public boleh baca" ON public.hasil_bulanan;

-- Create new policy allowing anonymous (unauthenticated) users to read
CREATE POLICY "Anon dapat baca" ON public.hasil_bulanan
  FOR SELECT
  USING (auth.role() = 'anon' OR true);
