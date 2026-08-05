-- ------------------------------------------------------------------
-- 0067_polisi_rls_pembetulan.sql
--
-- Tujuan: Betulkan polisi RLS berdasarkan audit Z11.
--         1. Buang polisi anon benarkan-semua yang tidak diperlukan.
--         2. Buang anon daripada 2 polisi, kekalkan authenticated sahaja.
--         3. Buang 6 polisi PERMISSIVE qual=false yang tidak menafikan.
--
-- PENTING: Fail ini JANGAN dijalankan dengan COMMIT sehingga diluluskan.
--          Dry-run Z11 mesti berakhir dengan ROLLBACK.
-- ------------------------------------------------------------------

BEGIN;

-- ------------------------------------------------------------------
-- LANGKAH 1: Buang polisi anon benarkan-semua pada hasil_bulanan_src
-- ------------------------------------------------------------------
-- Polisi ini memberikan anon akses SELECT tanpa syarat (qual=true).
-- Jadual ini sepatutnya dibaca melalui RPC SECURITY DEFINER sahaja.
DROP POLICY "Anon baca hasil_src public" ON public.hasil_bulanan_src;

-- ------------------------------------------------------------------
-- LANGKAH 2: Buang anon daripada 2 polisi, DROP + CREATE dalam transaksi
--            yang SAMA. Jangan pisahkan. Jangan tinggalkan tetingkap.
-- ------------------------------------------------------------------

-- 2a) projek_penyelia / allow_read_projek_penyelia
-- Definisi asal (pg_get_expr): qual = true, with_check = NULL
DROP POLICY "allow_read_projek_penyelia" ON public.projek_penyelia;
CREATE POLICY "allow_read_projek_penyelia" ON public.projek_penyelia
  FOR SELECT TO authenticated USING (true);

-- 2b) po_wilayah / baca_awam_powil
-- Definisi asal (pg_get_expr): qual = true, with_check = NULL
DROP POLICY "baca_awam_powil" ON public.po_wilayah;
CREATE POLICY "baca_awam_powil" ON public.po_wilayah
  FOR SELECT TO authenticated USING (true);

-- ------------------------------------------------------------------
-- LANGKAH 3: Buang 6 polisi PERMISSIVE qual=false yang tidak menafikan
-- ------------------------------------------------------------------
-- Polisi PERMISSIVE dengan USING (false) TIDAK menyekat apa-apa dengan
-- sendirinya. Ia hanya berkesan jika tiada polisi PERMISSIVE lain yang
-- benarkan, atau jika dipasangkan dengan RESTRICTIVE. Oleh sebab tiada
-- polisi RESTRICTIVE dalam skema public, keenam-enam polisi ini adalah
-- mati dan mengelirukan.

DROP POLICY "deny_anon_hasil_harian" ON public.hasil_harian;
DROP POLICY "deny_anon_pengguna" ON public.pengguna;
DROP POLICY "deny_anon_projek_penyelia" ON public.projek_penyelia;
DROP POLICY "projek_penyelia_delete_locked" ON public.projek_penyelia;
DROP POLICY "projek_penyelia_update_locked" ON public.projek_penyelia;
DROP POLICY "deny_anon_pusat_operasi" ON public.pusat_operasi;

-- Skop RESTRICTIVE dan ENABLE RLS dikendalikan dalam 0068.

COMMIT;
