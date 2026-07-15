-- Migration 0032: Pilihan B — RPC SECURITY DEFINER untuk akses awam hasil_bulanan
-- STATUS: DRAF untuk review 2026-08-15 (menggantikan P0 exception 0031)
-- Tujuan: Hadkan pendedahan anon kepada column whitelist sahaja, tanpa GRANT SELECT table terus
-- Selepas migration ini aktif, front-end mesti tukar .from("hasil_bulanan") -> .rpc("dapatkan_hasil_bulanan_awam")
-- dan .from("hasil_bulanan_src") -> .rpc("dapatkan_hasil_bulanan_src_awam")
-- Jika front-end belum ready, JANGAN jalankan REVOKE bahagian akhir (tanda Potongan B2).

-- ============================================================
-- 1. Definisikan senarai column sensitivity (rujuk docs)
-- hasil_bulanan_src: id(Dalaman), tahun(Awam), bulan(Awam), jenis(Awam), kategori(Dalaman),
--   pusat_operasi(Dalaman), pusat_operasi_master(Dalaman), pusat_operasi_final(Dalaman-perlu-bisnes),
--   wilayah(Awam), kategori_master(Dalaman), nama_projek(Dalaman-perlu-bisnes), luas_kawasan_hek(Dalaman-perlu-bisnes),
--   luas_produktif_hek(Dalaman-perlu-bisnes), bilangan_peserta(Dalaman-perlu-bisnes), bulan_nama(Awam),
--   hasil(Awam), unit(Awam), in_master_2026(Dalaman), kod_bulan(Awam), negeri(Dalaman)
-- hasil_bulanan view: id, tahun, bulan, jenis, pol_pn, nama, peserta, luas_hek, luas_operasi, unit, kod_bulan, nama_bulan, wilayah, hasil
-- ============================================================

-- 1a. RPC untuk hasil_bulanan (view) — whitelist kolum awam + Dalaman-perlu-bisnes yang diperlukan dashboard
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
    AND hb.tahun <= 2026   -- lock max tahun, elak data test 2027 bocor
  ORDER BY hb.tahun, hb.bulan;
$$;

REVOKE ALL ON FUNCTION public.dapatkan_hasil_bulanan_awam(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dapatkan_hasil_bulanan_awam(int) TO anon, authenticated;

-- 1b. RPC untuk hasil_bulanan_src — hanya kolum minimum untuk Ranking & Report Projek
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

-- 1c. RPC untuk aggregate wilayah sahaja — paling selamat, tiada nama_projek langsung
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
-- 2. (OPTIONAL, aktifkan selepas front-end siap guna RPC)
-- Potongan B2: Tarik balik GRANT SELECT anon terus pada table/view
-- JANGAN aktifkan selagi dashboard-hasil masih guna .from()
-- ============================================================
-- REVOKE SELECT ON public.hasil_bulanan FROM anon;
-- REVOKE SELECT ON public.hasil_bulanan_src FROM anon;
-- DROP POLICY IF EXISTS "Anon baca hasil_bulanan public" ON public.hasil_bulanan;
-- DROP POLICY IF EXISTS "Anon baca hasil_src public" ON public.hasil_bulanan_src;
-- DROP POLICY IF EXISTS "deny_anon_hasil_bulanan_src" ON public.hasil_bulanan_src; -- pastikan tiada deny yang block owner
-- -- Kekalkan authenticated policies
-- GRANT SELECT ON public.hasil_bulanan TO authenticated;
-- GRANT SELECT ON public.hasil_bulanan_src TO authenticated;

-- ============================================================
-- 3. Verification
-- ============================================================
-- SET ROLE anon; SELECT * FROM public.dapatkan_hasil_bulanan_awam(2026) LIMIT 3; RESET ROLE;
-- SET ROLE anon; SELECT * FROM public.dapatkan_hasil_bulanan_src_awam(2026, 'SAWIT') LIMIT 3; RESET ROLE;
-- SET ROLE anon; SELECT * FROM public.dapatkan_hasil_wilayah_agregat(2026) LIMIT 3; RESET ROLE;
-- -- Selepas B2 aktif, ini mesti FAIL:
-- SET ROLE anon; SELECT * FROM public.hasil_bulanan LIMIT 1; -- harus permission denied
-- SET ROLE anon; SELECT * FROM public.hasil_bulanan_src LIMIT 1; -- harus permission denied
-- RESET ROLE;

DO $$
BEGIN
  RAISE NOTICE 'Migration 0032 draf siap: RPC awam untuk hasil_bulanan (B). Aktifkan B2 hanya selepas front-end tukar ke .rpc()';
END $$;
