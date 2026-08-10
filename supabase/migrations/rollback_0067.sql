-- ------------------------------------------------------------------
-- rollback_0067.sql
--
-- Memulihkan keadaan sebelum 0067_polisi_rls_pembetulan.sql:
--   1. Cipta semula polisi anon benarkan-semua pada hasil_bulanan_src.
--   2. Pulihkan 2 polisi langkah 2 kepada senarai peranan asal.
--   3. Cipta semula 6 polisi PERMISSIVE qual=false.
-- ------------------------------------------------------------------

BEGIN;

-- ------------------------------------------------------------------
-- Langkah 1: Cipta semula polisi anon benarkan-semua
-- ------------------------------------------------------------------
CREATE POLICY "Anon baca hasil_src public" ON public.hasil_bulanan_src
  FOR SELECT TO anon USING (true);

-- ------------------------------------------------------------------
-- Langkah 2: Pulihkan 2 polisi kepada senarai peranan asal
-- ------------------------------------------------------------------

-- 2a) projek_penyelia / allow_read_projek_penyelia
DROP POLICY "allow_read_projek_penyelia" ON public.projek_penyelia;
CREATE POLICY "allow_read_projek_penyelia" ON public.projek_penyelia
  FOR SELECT TO anon, authenticated USING (true);

-- 2b) po_wilayah / baca_awam_powil
DROP POLICY "baca_awam_powil" ON public.po_wilayah;
CREATE POLICY "baca_awam_powil" ON public.po_wilayah
  FOR SELECT TO anon, authenticated USING (true);

-- ------------------------------------------------------------------
-- Langkah 3: Cipta semula 6 polisi PERMISSIVE qual=false
-- ------------------------------------------------------------------

CREATE POLICY "deny_anon_hasil_harian" ON public.hasil_harian
  FOR ALL TO anon USING (false);

CREATE POLICY "deny_anon_pengguna" ON public.pengguna
  FOR ALL TO anon USING (false);

CREATE POLICY "deny_anon_projek_penyelia" ON public.projek_penyelia
  FOR ALL TO anon USING (false);

CREATE POLICY "projek_penyelia_delete_locked" ON public.projek_penyelia
  FOR DELETE TO anon USING (false);

CREATE POLICY "projek_penyelia_update_locked" ON public.projek_penyelia
  FOR UPDATE TO anon USING (false);

CREATE POLICY "deny_anon_pusat_operasi" ON public.pusat_operasi
  FOR ALL TO anon USING (false);

COMMIT;
