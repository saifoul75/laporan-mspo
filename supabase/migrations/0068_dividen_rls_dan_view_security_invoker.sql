-- ------------------------------------------------------------------
-- 0068_dividen_rls_dan_view_security_invoker.sql
--
-- Tujuan: Hardening susulan Z12 (pra-0068).
--
-- LANGKAH 1 — dividen_bulanan:
--   Satu-satunya jadual skema public dengan relrowsecurity = false
--   (A1 Z11). Grant kepada authenticated/postgres/service_role sahaja;
--   tiada anon/PUBLIC (C1 Z12). Akses awam berlaku melalui RPC
--   dapatkan_dividen_bulanan_awam (SECURITY DEFINER, owner postgres)
--   — RLS tidak menjejaskannya kerana postgres adalah pemilik jadual
--   (RLS tidak digunakan pada pemilik kecuali FORCE RLS).
--   Polisi baca_dividen_authenticated dicipta supaya authenticated
--   boleh membaca jadual terus (mematuhi prinsip keistimewaan minimum:
--   SELECT sahaja, tiada INSERT/UPDATE/DELETE).
--
-- LANGKAH 2 — hasil_bulanan (view):
--   Satu-satunya view dengan security_invoker=false (C2 Z12).
--   Ditukar kepada security_invoker=true supaya RLS jadual asas
--   (hasil_bulanan_src) digunakan terhadap PEMANGGIL, bukan pemilik
--   view. Tiada kod membaca view ini terus (D4 Z12) — akses awam
--   melalui RPC. ALTER VIEW mengekalkan grant sedia ada.
-- ------------------------------------------------------------------

-- LANGKAH 1: Hidupkan RLS pada dividen_bulanan
ALTER TABLE public.dividen_bulanan ENABLE ROW LEVEL SECURITY;

-- Polisi: authenticated boleh SELECT sahaja
CREATE POLICY baca_dividen_authenticated ON public.dividen_bulanan
  FOR SELECT TO authenticated USING (true);

-- LANGKAH 2: Tukar hasil_bulanan kepada security_invoker=true
ALTER VIEW public.hasil_bulanan SET (security_invoker = true);
