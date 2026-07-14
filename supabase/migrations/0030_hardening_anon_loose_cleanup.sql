-- Migration 0030: Cleanup semua anon loose policies yang masih tinggal selepas 0026-0029
-- Ditemui di staging selepas 0029: masih ada "Anon baca laporan kongsi" dll dari apply-rls-anon.sql
-- Ini perlu dibuang untuk capai RPC-only mode penuh

-- ============================================================
-- 1. Laporan — buang semua anon SELECT policies (RPC-only)
-- ============================================================

DROP POLICY IF EXISTS "Anon baca laporan kongsi" ON public.laporan;
DROP POLICY IF EXISTS "Baca laporan kongsi awam" ON public.laporan;
DROP POLICY IF EXISTS "Anon baca laporan kongsi awam" ON public.laporan;

-- Revoke anon grant
DO $$
BEGIN
  REVOKE SELECT ON public.laporan FROM anon;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

GRANT SELECT ON public.laporan TO authenticated;

-- ============================================================
-- 2. Audit / Dapatan / PO / Pengguna — anon policies untuk kongsi
--    WAJIB kekal untuk /share RPC fallback, tapi buat lebih ketat
--    Jika RPC-only penuh, boleh drop juga nanti.
--    Untuk sekarang: kekalkan, kerana /share masih perlukan mereka untuk
--    kes queries lama. Namun pastikan mereka guna SECURITY DEFINER functions
-- ============================================================

-- Dapatan: Anon baca dapatan kongsi — cek sama ada loose USING(true)
DROP POLICY IF EXISTS "Anon baca dapatan kongsi" ON public.dapatan;

-- Audit: Anon baca audit kongsi loose?
DROP POLICY IF EXISTS "Anon baca audit kongsi" ON public.audit;

-- Untuk projek_pembangunan_ref: ini untuk senarai-projek public, OK kekal?
-- Tetapi kita drop anon jika tidak perlu
-- DROP POLICY IF EXISTS "Anon baca projek_pembangunan_ref" ON public.projek_pembangunan_ref;

-- ============================================================
-- 3. hasil_bulanan_src — buang anon policies loose
-- ============================================================

DROP POLICY IF EXISTS "anon read hasil_bulanan_src" ON public.hasil_bulanan_src;
DROP POLICY IF EXISTS "Anon dapat baca hasil_bulanan_src" ON public.hasil_bulanan_src;
DROP POLICY IF EXISTS "deny_anon_hasil_bulanan_src" ON public.hasil_bulanan_src;

DO $$
BEGIN
  REVOKE SELECT ON public.hasil_bulanan_src FROM anon;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

GRANT SELECT ON public.hasil_bulanan_src TO authenticated;

-- Pastikan policies yang tinggal hanya authenticated
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='hasil_bulanan_src' AND policyname='baca_hasil_src_authenticated') THEN
    CREATE POLICY "baca_hasil_src_authenticated" ON public.hasil_bulanan_src FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- ============================================================
-- 4. Final check notice
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 0030 selesai: anon loose policies dibersihkan, laporan RPC-only';
END $$;
