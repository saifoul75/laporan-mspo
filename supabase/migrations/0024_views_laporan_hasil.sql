-- ============================================================
-- Migration 0024: UNIQUE constraint + Views Laporan Hasil
-- Sumber: hasil_bulanan_src + projek_ref + matlamat_projek
-- Skop: Fasa 3 — Views untuk Dashboard PO / Wilayah / HQ
-- ============================================================

-- 1) UNIQUE constraint untuk upsert (Apps Script walk-folder)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.hasil_bulanan_src'::regclass
      AND contype = 'u'
      AND conname = 'hasil_bulanan_src_unique'
  ) THEN
    ALTER TABLE public.hasil_bulanan_src
      ADD CONSTRAINT hasil_bulanan_src_unique
      UNIQUE (tahun, bulan, pusat_operasi_final, nama_projek, jenis);
  END IF;
END $$;

-- 2) View: hasil bulanan per projek/PO + luas + sasaran tahunan
--    Sumber kebenaran: hasil_bulanan_src (long format)
--    LEFT JOIN projek_ref (hanya wujud untuk tahun 2026 ke atas)
DROP VIEW IF EXISTS public.v_bulanan CASCADE;
CREATE VIEW public.v_bulanan AS
SELECT
  s.id,
  s.tahun,
  s.bulan,
  s.bulan_nama,
  s.kod_bulan,
  s.jenis,
  s.unit,
  s.wilayah,
  s.pusat_operasi_final                          AS po,
  s.nama_projek                                  AS projek,
  s.luas_kawasan_hek                             AS luas_kawasan,
  s.luas_produktif_hek                           AS luas_berhasil,
  s.bilangan_peserta                             AS bil_peserta,
  s.hasil,
  s.in_master_2026,
  p.sasaran_tahunan                              AS sasaran_tahunan,
  p.id                                           AS projek_ref_id
FROM public.hasil_bulanan_src s
LEFT JOIN public.projek_ref p
       ON p.tahun  = s.tahun
      AND p.po     = s.pusat_operasi_final
      AND p.projek = s.nama_projek
      AND p.jenis  = s.jenis;

-- 3) View: capai vs matlamat (per projek/PO/bulan)
--    matlamat_bulanan = projek_ref.sasaran_tahunan * matlamat_projek.peratus_agihan
--    pct_capai        = hasil / matlamat_bulanan * 100
--    hasil_per_hek    = hasil / luas_produktif_hek
DROP VIEW IF EXISTS public.v_capai_matlamat CASCADE;
CREATE VIEW public.v_capai_matlamat AS
SELECT
  b.tahun,
  b.bulan,
  b.bulan_nama,
  b.kod_bulan,
  b.jenis,
  b.unit,
  b.wilayah,
  b.po,
  b.projek,
  b.luas_kawasan,
  b.luas_berhasil,
  b.bil_peserta,
  b.hasil,
  b.in_master_2026,
  b.sasaran_tahunan,
  m.peratus_agihan,
  CASE
    WHEN b.sasaran_tahunan IS NOT NULL
     AND m.peratus_agihan   IS NOT NULL
    THEN b.sasaran_tahunan * m.peratus_agihan
    ELSE NULL
  END AS matlamat_bulanan,
  CASE
    WHEN b.sasaran_tahunan IS NOT NULL
     AND m.peratus_agihan   IS NOT NULL
     AND (b.sasaran_tahunan * m.peratus_agihan) > 0
    THEN round((b.hasil / (b.sasaran_tahunan * m.peratus_agihan)) * 100, 2)
    ELSE NULL
  END AS pct_capai,
  CASE
    WHEN b.luas_berhasil IS NOT NULL AND b.luas_berhasil > 0
    THEN round(b.hasil / b.luas_berhasil, 4)
    ELSE NULL
  END AS hasil_per_hek,
  b.projek_ref_id
FROM public.v_bulanan b
LEFT JOIN public.matlamat_projek m
       ON m.jenis = b.jenis
      AND m.bulan = b.bulan;

-- 4) View: roll-up Wilayah (semua PO dalam satu wilayah)
DROP VIEW IF EXISTS public.v_wilayah CASCADE;
CREATE VIEW public.v_wilayah AS
SELECT
  c.tahun,
  c.bulan,
  c.bulan_nama,
  c.kod_bulan,
  c.wilayah,
  c.jenis,
  c.unit,
  COUNT(DISTINCT c.po)                                              AS bil_po,
  COUNT(DISTINCT c.projek)                                          AS bil_projek,
  round(SUM(c.luas_berhasil)::numeric, 4)                           AS jumlah_luas_berhasil,
  SUM(c.hasil)                                                      AS jumlah_hasil,
  SUM(c.matlamat_bulanan)                                           AS jumlah_matlamat,
  CASE
    WHEN SUM(c.matlamat_bulanan) IS NOT NULL
     AND SUM(c.matlamat_bulanan) > 0
    THEN round((SUM(c.hasil) / SUM(c.matlamat_bulanan)) * 100, 2)
    ELSE NULL
  END                                                                AS pct_capai,
  CASE
    WHEN SUM(c.luas_berhasil) IS NOT NULL AND SUM(c.luas_berhasil) > 0
    THEN round(SUM(c.hasil) / SUM(c.luas_berhasil), 4)
    ELSE NULL
  END                                                                AS hasil_per_hek
FROM public.v_capai_matlamat c
WHERE c.wilayah IS NOT NULL
GROUP BY c.tahun, c.bulan, c.bulan_nama, c.kod_bulan, c.wilayah, c.jenis, c.unit;

-- 5) View: roll-up HQ (konsolidasi semua wilayah + ranking PO)
DROP VIEW IF EXISTS public.v_hq CASCADE;
CREATE VIEW public.v_hq AS
SELECT
  w.tahun,
  w.bulan,
  w.bulan_nama,
  w.kod_bulan,
  w.jenis,
  w.unit,
  'KESELURUHAN'::text                                               AS wilayah,
  SUM(w.bil_po)                                                     AS bil_po,
  SUM(w.bil_projek)                                                 AS bil_projek,
  SUM(w.jumlah_luas_berhasil)                                       AS jumlah_luas_berhasil,
  SUM(w.jumlah_hasil)                                               AS jumlah_hasil,
  SUM(w.jumlah_matlamat)                                            AS jumlah_matlamat,
  CASE
    WHEN SUM(w.jumlah_matlamat) IS NOT NULL
     AND SUM(w.jumlah_matlamat) > 0
    THEN round((SUM(w.jumlah_hasil) / SUM(w.jumlah_matlamat)) * 100, 2)
    ELSE NULL
  END                                                                AS pct_capai,
  CASE
    WHEN SUM(w.jumlah_luas_berhasil) IS NOT NULL
     AND SUM(w.jumlah_luas_berhasil) > 0
    THEN round(SUM(w.jumlah_hasil) / SUM(w.jumlah_luas_berhasil), 4)
    ELSE NULL
  END                                                                AS hasil_per_hek
FROM public.v_wilayah w
GROUP BY w.tahun, w.bulan, w.bulan_nama, w.kod_bulan, w.jenis, w.unit;

-- 6) View: ranking PO per tahun/jenis (untuk Tab HQ)
DROP VIEW IF EXISTS public.v_ranking_po CASCADE;
CREATE VIEW public.v_ranking_po AS
SELECT
  c.tahun,
  c.wilayah,
  c.po,
  c.jenis,
  c.unit,
  COUNT(DISTINCT c.projek)                                          AS bil_projek,
  round(SUM(c.luas_berhasil)::numeric, 4)                           AS jumlah_luas_berhasil,
  SUM(c.hasil)                                                      AS jumlah_hasil,
  SUM(c.matlamat_bulanan)                                           AS jumlah_matlamat,
  CASE
    WHEN SUM(c.matlamat_bulanan) IS NOT NULL
     AND SUM(c.matlamat_bulanan) > 0
    THEN round((SUM(c.hasil) / SUM(c.matlamat_bulanan)) * 100, 2)
    ELSE NULL
  END                                                                AS pct_capai,
  CASE
    WHEN SUM(c.luas_berhasil) IS NOT NULL AND SUM(c.luas_berhasil) > 0
    THEN round(SUM(c.hasil) / SUM(c.luas_berhasil), 4)
    ELSE NULL
  END                                                                AS hasil_per_hek
FROM public.v_capai_matlamat c
WHERE c.po IS NOT NULL
GROUP BY c.tahun, c.wilayah, c.po, c.jenis, c.unit;

-- 7) Benarkan baca awam (authenticated + anon)
DROP POLICY IF EXISTS "baca_awam_v_bulanan"        ON public.hasil_bulanan_src;
DROP POLICY IF EXISTS "baca_awam_v_projek_ref"      ON public.projek_ref;
DROP POLICY IF EXISTS "baca_awam_v_matlamat_projek" ON public.matlamat_projek;
DROP POLICY IF EXISTS "baca_awam_v_hasil_bulanan"   ON public.hasil_bulanan;

-- (hasil_bulanan_src + projek_ref + matlamat_projek sudah ada polisi baca_awam_*
--  dari migration 0023. Views mewarisi GRANT di bawah.)

GRANT SELECT ON public.v_bulanan        TO anon, authenticated;
GRANT SELECT ON public.v_capai_matlamat TO anon, authenticated;
GRANT SELECT ON public.v_wilayah        TO anon, authenticated;
GRANT SELECT ON public.v_hq             TO anon, authenticated;
GRANT SELECT ON public.v_ranking_po     TO anon, authenticated;

-- 8) Index cadangan (tidak wajib; cipta hanya jika belum ada)
CREATE INDEX IF NOT EXISTS idx_hb_src_po_jenis_tahun
  ON public.hasil_bulanan_src (pusat_operasi_final, jenis, tahun, bulan);
CREATE INDEX IF NOT EXISTS idx_hb_src_tahun_master
  ON public.hasil_bulanan_src (tahun) WHERE in_master_2026 = true;
CREATE INDEX IF NOT EXISTS idx_projek_ref_tahun_po
  ON public.projek_ref (tahun, po);

-- SELESAI