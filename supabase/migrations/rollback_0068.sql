-- ------------------------------------------------------------------
-- rollback_0068.sql
--
-- Memulihkan keadaan sebelum 0068:
--   1. Buang polisi baca_dividen_authenticated.
--   2. Matikan RLS pada dividen_bulanan.
--   3. Tukar semula view hasil_bulanan kepada reloptions NULL (asal).
-- ------------------------------------------------------------------

-- Langkah 1: Buang polisi dividen
DROP POLICY IF EXISTS baca_dividen_authenticated ON public.dividen_bulanan;

-- Langkah 2: Matikan RLS
ALTER TABLE public.dividen_bulanan DISABLE ROW LEVEL SECURITY;

-- Langkah 3: Tukar semula view kepada reloptions NULL (asal)
ALTER VIEW public.hasil_bulanan RESET (security_invoker);
