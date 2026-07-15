-- Migration 0031: Fix dashboard-hasil-nolr anon access untuk hasil_bulanan & hasil_bulanan_src
-- STATUS: P0 EXCEPTION SEMENTARA — dibenarkan atas sebab kekangan masa (prod down "Data sementara tidak tersedia")
-- TARIKH REVIEW WAJIB: 2026-08-15 (30 hari) — migrate ke Pilihan B (RPC SECURITY DEFINER) dalam 0032
-- Pemilik: @saifoul / Jabatan Perladangan
-- Tiket: hasil-nolr-401
-- Pindaan: column-scoped GRANT SELECT (whitelist kolum Awam + Dalaman-perlu-bisnes sahaja)
-- RLS USING(true) kawal baris, column GRANT kawal lajur — elak pendedahan id/kategori/peserta Dalaman
--
-- Latar belakang:
--   0027 REVOKE SELECT ON hasil_bulanan FROM anon + REVOKE pada hasil_bulanan_src + DROP anon policies
--   0030 cleanup lagi anon loose policies termasuk "anon read hasil_bulanan_src"
--   Akibat: Papan Pemuka Eksekutif (Vercel, public tanpa login) guna anon key gagal:
--   "permission denied for view hasil_bulanan" dan "permission denied for table hasil_bulanan_src"
--   Projek_ref, matlamat_projek, v_penyelia masih 200 OK kerana masih ada anon GRANT/policies
--
-- Reka bentuk asal dashboard-hasil: papan pemuka awam tanpa login (anon key sahaja)
--   README: "Dashboard ni guna anon key — pastikan RLS benarkan SELECT untuk anon"
--   Jadi hardness 0027 terlalu agresif untuk use-case ini. Data hasil sawit/getah adalah data produksi awam, bukan PII sensitif.
--
-- Skop fix: Hanya pulihkan anon SELECT untuk dua sumber yang error di atas.
-- JANGAN sentuh hardening laporan/dapatan/audit/nc/ofi yang memang sengaja RPC-only.
--
-- Pilihan A (P0 ini, column-scoped): GRANT SELECT whitelist kolum sahaja + POLICY USING(true) untuk anon
-- Pilihan B (kekal, dalam 0032): RPC SECURITY DEFINER pulangkan hanya column Awam disahkan, GRANT EXECUTE anon sahaja.
-- Migration ini laksanakan Pilihan A column-scoped sebagai exception sementara.

-- ============================================================
-- 1. hasil_bulanan VIEW — benarkan anon baca column terhad sahaja (public dashboard)
-- Nota: hasil_bulanan kini VIEW (bukan TABLE) selepas 0023.
-- VIEW tidak boleh ada RLS POLICY, hanya GRANT + security_invoker flag.
-- Output VIEW sebenar (dari schema dump 2026-07-02):
--   id, tahun, bulan, jenis, pol_pn, nama, peserta, luas_hek, luas_operasi,
--   unit, kod_bulan, nama_bulan, wilayah, hasil  (14 kolum, id MEMANG wujud)
-- Front-end awam tidak perlu id (internal PK) — buang dari grant anon.
-- ============================================================

-- Pastikan VIEW run sebagai owner (postgres) supaya bypass RLS pada base table hasil_bulanan_src
-- Ini pattern sama seperti rls_remedy_anon.sql Path A: Security Definer Views
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema='public' AND table_name='hasil_bulanan'
  ) THEN
    EXECUTE 'ALTER VIEW public.hasil_bulanan SET (security_invoker = false)';
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Jika hasil_bulanan masih TABLE di sesetengah env lama, pastikan policy anon ada
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='hasil_bulanan' AND table_type='BASE TABLE'
  ) THEN
    DROP POLICY IF EXISTS "Anon dapat baca" ON public.hasil_bulanan;
    DROP POLICY IF EXISTS "Public boleh baca" ON public.hasil_bulanan;
    DROP POLICY IF EXISTS "baca_awam_hasil" ON public.hasil_bulanan;
    DROP POLICY IF EXISTS "Pengguna boleh baca hasil bulanan" ON public.hasil_bulanan;

    BEGIN
      CREATE POLICY "Anon baca hasil_bulanan public"
        ON public.hasil_bulanan FOR SELECT TO anon USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename='hasil_bulanan' AND policyname='baca_hasil_bulanan_authenticated'
    ) THEN
      CREATE POLICY "baca_hasil_bulanan_authenticated"
        ON public.hasil_bulanan FOR SELECT TO authenticated USING (true);
    END IF;
  END IF;
END $$;

-- VIEW GRANT — column-scoped untuk anon (whitelist, tanpa id Dalaman)
-- PENTING: Buang table-wide grant dahulu, kemudian grant kolum spesifik
DO $$
BEGIN
  REVOKE SELECT ON public.hasil_bulanan FROM anon;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

GRANT SELECT (
  tahun, bulan, jenis, pol_pn, nama, peserta,
  luas_hek, luas_operasi, unit, kod_bulan, nama_bulan, wilayah, hasil
) ON public.hasil_bulanan TO anon;

-- authenticated kekal full access (internal tooling)
GRANT SELECT ON public.hasil_bulanan TO authenticated;

-- ============================================================
-- 2. hasil_bulanan_src TABLE — benarkan anon SELECT kolum terhad sahaja
-- Ini digunakan oleh Ranking Projek & Report Projek via /api/report-hasil
-- Base TABLE 19 kolum: id, tahun, jenis, kategori, pusat_operasi, pusat_operasi_master,
--   pusat_operasi_final, wilayah, kategori_master, nama_projek, luas_kawasan_hek,
--   luas_produktif_hek, bilangan_peserta, bulan, bulan_nama, hasil, unit, in_master_2026, kod_bulan, negeri
-- Whitelist anon: hanya Awam + Dalaman-perlu-bisnes yang diperlukan dashboard
-- ============================================================

ALTER TABLE public.hasil_bulanan_src ENABLE ROW LEVEL SECURITY;

-- Buang polisi DENY yang menghalang anon (dari rls_remedy_anon.sql dan 0030)
DROP POLICY IF EXISTS "deny_anon_hasil_bulanan_src" ON public.hasil_bulanan_src;
DROP POLICY IF EXISTS "baca_awam_hasil" ON public.hasil_bulanan_src;
DROP POLICY IF EXISTS "Anon dapat baca" ON public.hasil_bulanan_src;
DROP POLICY IF EXISTS "Anon dapat baca hasil_bulanan_src" ON public.hasil_bulanan_src;
DROP POLICY IF EXISTS "anon read hasil_bulanan_src" ON public.hasil_bulanan_src;

-- Buat semula policy anon row-level true (kawal baris sahaja, lajur dikawal GRANT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='hasil_bulanan_src' AND policyname='Anon baca hasil_src public'
  ) THEN
    CREATE POLICY "Anon baca hasil_src public"
      ON public.hasil_bulanan_src FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- Pastikan authenticated policy masih ada (dari 0027/0030)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='hasil_bulanan_src' AND policyname='baca_hasil_src_authenticated'
  ) THEN
    CREATE POLICY "baca_hasil_src_authenticated"
      ON public.hasil_bulanan_src FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- GRANT column-scoped untuk anon — GANTI table-wide grant sepenuhnya
-- Buang table-wide grant anon dahulu, kemudian grant whitelist kolum
DO $$
BEGIN
  REVOKE SELECT ON public.hasil_bulanan_src FROM anon;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

GRANT SELECT (
  tahun, bulan, jenis, pusat_operasi_final, wilayah,
  nama_projek, luas_kawasan_hek, luas_produktif_hek,
  unit, hasil, kod_bulan, bulan_nama
) ON public.hasil_bulanan_src TO anon;

-- authenticated kekal full access
GRANT SELECT ON public.hasil_bulanan_src TO authenticated;

-- ============================================================
-- 3. Pastikan projek_ref & matlamat_projek masih anon (sudah OK, tapi safety check)
-- ============================================================

GRANT SELECT ON public.projek_ref TO anon, authenticated;
GRANT SELECT ON public.matlamat_projek TO anon, authenticated;

DROP POLICY IF EXISTS "deny_anon_projek_ref" ON public.projek_ref;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='projek_ref' AND policyname='Anon baca projek_ref public'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='projek_ref' AND policyname='baca_awam_projek_ref'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='projek_ref' AND policyname='baca_awam_v_projek_ref'
  ) THEN
    BEGIN
      CREATE POLICY "Anon baca projek_ref public"
        ON public.projek_ref FOR SELECT TO anon USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- ============================================================
-- 4. (OPTIONAL, komen) Alternatif secure kekal: RPC SECURITY DEFINER
-- Jika mahu kekal authenticated-only pada base table, guna fungsi di bawah
-- dan ubah front-end fetchAllHasil / fetchHasilIndividu guna rpc() bukannya from().
-- Pattern sama seperti dapatkan_laporan_dengan_token di 0026.
-- Aktif dalam 0032 — di sini hanya contoh, TIDAK aktif.
-- ============================================================
/*
CREATE OR REPLACE FUNCTION public.dapatkan_hasil_bulanan()
RETURNS SETOF public.hasil_bulanan
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.hasil_bulanan;
$$;
GRANT EXECUTE ON FUNCTION public.dapatkan_hasil_bulanan() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.dapatkan_hasil_src(
  p_tahun_min int DEFAULT 2023
)
RETURNS TABLE (
  tahun int, bulan int, jenis text,
  pusat_operasi_final text, nama_projek text, hasil numeric, unit text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT s.tahun, s.bulan, s.jenis, s.pusat_operasi_final, s.nama_projek, s.hasil, s.unit
  FROM public.hasil_bulanan_src s
  WHERE s.tahun >= COALESCE(p_tahun_min, 2023);
END;
$$;
GRANT EXECUTE ON FUNCTION public.dapatkan_hasil_src(int) TO anon, authenticated;
*/

-- ============================================================
-- 5. Verification — WAJIB jalankan manual di SQL Editor prod selepas migrate
--    Satu blok lengkap copy-paste: 8 kolum Dalaman MESTI denied + kolum Awam berjaya + regression laporan locked
-- ============================================================
-- -- ========= BLOK 1: hasil_bulanan_src — 8 kolum Dalaman MESTI permission denied =========
-- SET ROLE anon;
-- SELECT id FROM public.hasil_bulanan_src LIMIT 1;                      -- MESTI denied: id (Dalaman PK)
-- SELECT kategori FROM public.hasil_bulanan_src LIMIT 1;                 -- MESTI denied
-- SELECT bilangan_peserta FROM public.hasil_bulanan_src LIMIT 1;        -- MESTI denied
-- SELECT pusat_operasi FROM public.hasil_bulanan_src LIMIT 1;           -- MESTI denied (QC)
-- SELECT pusat_operasi_master FROM public.hasil_bulanan_src LIMIT 1;    -- MESTI denied (QC tambahan)
-- SELECT kategori_master FROM public.hasil_bulanan_src LIMIT 1;         -- MESTI denied (QC tambahan)
-- SELECT in_master_2026 FROM public.hasil_bulanan_src LIMIT 1;          -- MESTI denied (QC tambahan)
-- SELECT negeri FROM public.hasil_bulanan_src LIMIT 1;                  -- MESTI denied (QC tambahan)
-- RESET ROLE;
-- -- ========= BLOK 2: hasil_bulanan_src — kolum Awam + Dalaman-perlu-bisnes MESTI berjaya =========
-- SET ROLE anon;
-- SELECT tahun, hasil FROM public.hasil_bulanan_src LIMIT 1;                                                                    -- MESTI berjaya
-- SELECT tahun, bulan, jenis, pusat_operasi_final, nama_projek, hasil FROM public.hasil_bulanan_src LIMIT 1;                   -- MESTI berjaya
-- SELECT tahun, bulan, jenis, pusat_operasi_final, wilayah, nama_projek, luas_kawasan_hek, luas_produktif_hek, unit, hasil, kod_bulan, bulan_nama FROM public.hasil_bulanan_src LIMIT 1; -- MESTI berjaya (12 kolum whitelist)
-- RESET ROLE;
-- -- ========= BLOK 3: hasil_bulanan VIEW — id MESTI denied, whitelist berjaya =========
-- SET ROLE anon;
-- SELECT id FROM public.hasil_bulanan LIMIT 1;                           -- MESTI denied: column id
-- SELECT tahun, bulan, hasil, wilayah FROM public.hasil_bulanan LIMIT 1; -- MESTI berjaya
-- SELECT tahun, bulan, jenis, pol_pn, nama, peserta, luas_hek, luas_operasi, unit, kod_bulan, nama_bulan, wilayah, hasil FROM public.hasil_bulanan LIMIT 1; -- MESTI berjaya (13 kolum whitelist tanpa id)
-- RESET ROLE;
-- -- ========= BLOK 4: projek_ref & matlamat_projek masih anon =========
-- SET ROLE anon; SELECT * FROM public.projek_ref LIMIT 1; RESET ROLE;        -- MESTI berjaya
-- SET ROLE anon; SELECT * FROM public.matlamat_projek LIMIT 1; RESET ROLE;   -- MESTI berjaya
-- -- ========= BLOK 5: regression — laporan/audit/dapatan/nc/ofi kekal locked untuk anon =========
-- SET ROLE anon; SELECT * FROM public.laporan LIMIT 1; RESET ROLE;  -- MESTI denied / 0 row (RPC-only)
-- SET ROLE anon; SELECT * FROM public.audit LIMIT 1; RESET ROLE;    -- MESTI denied / 0 row (atau cek via fungsi kongsi sahaja)
-- SET ROLE anon; SELECT * FROM public.dapatan LIMIT 1; RESET ROLE;  -- MESTI denied / 0
-- SET ROLE anon; SELECT * FROM public.nc LIMIT 1; RESET ROLE;        -- MESTI denied / 0
-- SET ROLE anon; SELECT * FROM public.ofi LIMIT 1; RESET ROLE;       -- MESTI denied / 0

DO $$
BEGIN
  RAISE NOTICE 'Migration 0031 selesai (column-scoped): anon SELECT whitelist kolum Awam+perlu sahaja untuk hasil_bulanan (tanpa id) dan hasil_bulanan_src (12 kolum). P0 exception review 2026-08-15 -> 0032 RPC';
END $$;
