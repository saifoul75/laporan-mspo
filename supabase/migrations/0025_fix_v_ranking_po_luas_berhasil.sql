-- ============================================================
-- Migration 0025: Betulkan v_ranking_po — luas_berhasil inflasi 12x
-- Punca: v_capai_matlamat ada 1 baris per projek PER BULAN (12 baris
--   setahun). v_ranking_po asal buat SUM(luas_berhasil) terus atas
--   baris tu, jadi keluasan (nilai konstan setiap bulan) dijumlah 12
--   kali ganda. Contoh: MELAKA SAWIT 2026 luas sepatutnya 1,070.13 ha
--   tapi terpapar 12,841.60 ha (x12), punca hasil_per_hek jatuh 12x
--   terlalu rendah (0.4072 bukan 4.8867 MT/hek).
-- Tidak sentuh: pct_capai (SUM(hasil)/SUM(matlamat_bulanan) memang
--   betul sebab hasil & matlamat_bulanan ialah kuantiti bulanan yang
--   sepatutnya dijumlah merentasi 12 baris, bukan seperti luas yang
--   nilai tetap/constant).
-- Fix: dedupe luas ikut projek dulu (MAX(luas_berhasil) per projek,
--   sebab nilai sama tiap bulan), pastu baru SUM ikut PO/wilayah.
-- Sumber: v_capai_matlamat (Migration 0024)
-- ============================================================

CREATE OR REPLACE VIEW public.v_ranking_po AS
WITH projek_level AS (
  SELECT
    v_capai_matlamat.tahun,
    v_capai_matlamat.wilayah,
    v_capai_matlamat.po,
    v_capai_matlamat.jenis,
    v_capai_matlamat.unit,
    v_capai_matlamat.projek,
    MAX(v_capai_matlamat.luas_berhasil) AS luas_berhasil_projek,
    SUM(v_capai_matlamat.hasil) AS hasil_projek,
    SUM(v_capai_matlamat.matlamat_bulanan) AS matlamat_projek
  FROM v_capai_matlamat
  WHERE v_capai_matlamat.po IS NOT NULL
  GROUP BY
    v_capai_matlamat.tahun,
    v_capai_matlamat.wilayah,
    v_capai_matlamat.po,
    v_capai_matlamat.jenis,
    v_capai_matlamat.unit,
    v_capai_matlamat.projek
)
SELECT
  tahun,
  wilayah,
  po,
  jenis,
  unit,
  COUNT(DISTINCT projek) AS bil_projek,
  ROUND(SUM(luas_berhasil_projek), 4) AS jumlah_luas_berhasil,
  SUM(hasil_projek) AS jumlah_hasil,
  SUM(matlamat_projek) AS jumlah_matlamat,
  CASE
    WHEN SUM(matlamat_projek) IS NOT NULL AND SUM(matlamat_projek) > 0::numeric
      THEN ROUND(SUM(hasil_projek) / SUM(matlamat_projek) * 100::numeric, 2)
    ELSE NULL::numeric
  END AS pct_capai,
  CASE
    WHEN SUM(luas_berhasil_projek) IS NOT NULL AND SUM(luas_berhasil_projek) > 0::numeric
      THEN ROUND(SUM(hasil_projek) / SUM(luas_berhasil_projek), 4)
    ELSE NULL::numeric
  END AS hasil_per_hek
FROM projek_level
GROUP BY tahun, wilayah, po, jenis, unit;

-- Sahkan lepas jalankan migration ni:
-- select * from v_ranking_po where po='MELAKA' and jenis='SAWIT' and tahun=2026;
-- Jangka: jumlah_luas_berhasil ~1070.1331, hasil_per_hek ~4.8867, pct_capai kekal 33.88
