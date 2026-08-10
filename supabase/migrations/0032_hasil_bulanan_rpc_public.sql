-- Migration 0032: Pilihan B — RPC SECURITY DEFINER untuk akses awam hasil_bulanan (penyelesaian kekal)
-- STATUS: DRAF sedia untuk review sebelum 2026-08-15, belum aktif di prod
-- Tujuan: Gantikan column-scoped GRANT 0031 dengan RPC whitelist tanpa GRANT SELECT table terus ke anon
-- Flow:
--   Phase 1 (0032 ini): Cipta 3 RPC SECURITY DEFINER + GRANT EXECUTE anon, kekalkan GRANT column-scoped 0031 buat sementara
--   Phase 2 (0033/0034): Front-end tukar .from("hasil_bulanan") -> .rpc("dapatkan_hasil_bulanan_awam") dan deploy
--   Phase 3 (0034/0035): REVOKE SELECT anon pada hasil_bulanan & hasil_bulanan_src sepenuhnya (RPC-only)
--
-- Nota sensitivity 0032: RPC 0032a masih return id & peserta — sama dengan whitelist 0031 column-scoped.
-- Untuk kekal sepenuhnya, id patut dibuang dalam 0032b final — rujuk komen di bawah.

-- ============================================================
-- 1a. RPC untuk hasil_bulanan VIEW — whitelist kolum awam + Dalaman-perlu (peserta/luas perlu business)
-- Kolum: id masih ada (untuk kompat) tapi boleh dibuang bila front-end siap tanpa id (id?: optional)
-- ============================================================
CREATE OR REPLACE FUNCTION public.dapatkan_hasil_bulanan_awam(
  p_tahun_min int DEFAULT 2023
)
RETURNS TABLE (
  id bigint,
  tahun int,
  bulan int,
  jenis text,
  pol_pn text,
  nama text,
  peserta int,
  luas_hek numeric,
  luas_operasi numeric,
  unit text,
  kod_bulan text,
  nama_bulan text,
  wilayah text,
  hasil numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    hb.id,
    hb.tahun,
    hb.bulan,
    hb.jenis,
    hb.pol_pn,
    hb.nama,
    hb.peserta,
    hb.luas_hek,
    hb.luas_operasi,
    hb.unit,
    hb.kod_bulan,
    hb.nama_bulan,
    hb.wilayah,
    hb.hasil
  FROM public.hasil_bulanan hb
  WHERE hb.tahun >= COALESCE(p_tahun_min, 2023)
    AND hb.tahun <= 2026
  ORDER BY hb.tahun, hb.bulan;
$$;

REVOKE ALL ON FUNCTION public.dapatkan_hasil_bulanan_awam(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dapatkan_hasil_bulanan_awam(int) TO anon, authenticated;

-- ============================================================
-- 1b. RPC untuk hasil_bulanan_src — hanya kolum minimum untuk Ranking & Report Projek
-- Kolum: tahun, bulan, jenis, pusat_operasi_final, nama_projek, hasil, unit, wilayah
-- (8 kolum, tanpa id/kategori/peserta/luas internal — paling ketat)
-- ============================================================
CREATE OR REPLACE FUNCTION public.dapatkan_hasil_bulanan_src_awam(
  p_tahun_min int DEFAULT 2023,
  p_jenis text DEFAULT NULL
)
RETURNS TABLE (
  tahun int,
  bulan int,
  jenis text,
  pusat_operasi_final text,
  nama_projek text,
  hasil numeric,
  unit text,
  wilayah text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_jenis IS NOT NULL AND upper(p_jenis) NOT IN ('SAWIT','GETAH') THEN
    RAISE EXCEPTION 'jenis tidak sah';
  END IF;

  RETURN QUERY
  SELECT
    s.tahun,
    s.bulan,
    s.jenis,
    s.pusat_operasi_final,
    s.nama_projek,
    s.hasil,
    s.unit,
    s.wilayah
  FROM public.hasil_bulanan_src s
  WHERE s.tahun >= COALESCE(p_tahun_min, 2023)
    AND s.tahun <= 2026
    AND (p_jenis IS NULL OR upper(s.jenis) = upper(p_jenis))
  ORDER BY s.tahun, s.bulan;
END;
$$;

REVOKE ALL ON FUNCTION public.dapatkan_hasil_bulanan_src_awam(int, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dapatkan_hasil_bulanan_src_awam(int, text) TO anon, authenticated;

-- ============================================================
-- 1c. RPC aggregate wilayah sahaja — paling selamat, tiada nama_projek langsung (untuk KPI executive)
-- ============================================================
CREATE OR REPLACE FUNCTION public.dapatkan_hasil_wilayah_agregat(
  p_tahun int DEFAULT 2026
)
RETURNS TABLE (
  tahun int,
  bulan int,
  wilayah text,
  jenis text,
  jumlah_hasil numeric,
  bil_projek bigint,
  unit text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    hb.tahun,
    hb.bulan,
    hb.wilayah,
    hb.jenis,
    SUM(hb.hasil) AS jumlah_hasil,
    COUNT(DISTINCT hb.nama) AS bil_projek,
    MIN(hb.unit) AS unit
  FROM public.hasil_bulanan hb
  WHERE hb.tahun = COALESCE(p_tahun, 2026)
  GROUP BY hb.tahun, hb.bulan, hb.wilayah, hb.jenis
  ORDER BY hb.wilayah, hb.jenis, hb.bulan;
$$;

REVOKE ALL ON FUNCTION public.dapatkan_hasil_wilayah_agregat(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dapatkan_hasil_wilayah_agregat(int) TO anon, authenticated;

-- ============================================================
-- 2. B2 penutup (JANGAN aktifkan lagi selagi front-end masih .from() — simpan untuk 0034)
-- ============================================================
-- REVOKE SELECT ON public.hasil_bulanan FROM anon;
-- REVOKE SELECT ON public.hasil_bulanan_src FROM anon;
-- DROP POLICY IF EXISTS "Anon baca hasil_bulanan public" ON public.hasil_bulanan;
-- DROP POLICY IF EXISTS "Anon baca hasil_src public" ON public.hasil_bulanan_src;
-- GRANT SELECT ON public.hasil_bulanan TO authenticated;
-- GRANT SELECT ON public.hasil_bulanan_src TO authenticated;

-- ============================================================
-- 3. Verification 0032 (sepatutnya berjaya untuk anon)
-- ============================================================
-- SET ROLE anon; SELECT * FROM public.dapatkan_hasil_bulanan_awam(2026) LIMIT 3; RESET ROLE;
-- SET ROLE anon; SELECT * FROM public.dapatkan_hasil_bulanan_src_awam(2026, 'SAWIT') LIMIT 3; RESET ROLE;
-- SET ROLE anon; SELECT * FROM public.dapatkan_hasil_wilayah_agregat(2026) LIMIT 3; RESET ROLE;

DO $$
BEGIN
  RAISE NOTICE 'Migration 0032 draf siap: 3 RPC awam (hasil_bulanan, src, wilayah agregat) untuk ganti column-scoped 0031. Aktifkan B2 hanya selepas front-end tukar ke .rpc()';
END $$;
