-- Migration 0034: Tutup P0 widening 0031b — kembalikan ke column-scoped 0031 trick
-- Sebab 0031b wujud: front-end prod lama masih select(*) sebelum whitelist fix e9ed76c
-- Sekarang front-end whitelist sudah live di production target=production (commit 9b2b6f3 di dashboard-hasil master)
-- Jadi boleh tutup balik widening — REVOKE penuh table + GRANT column-scoped seperti 0031 asal
-- Dijalankan selepas sahkan dashboard-hasil-nolr.vercel.app deployment production sudah guna commit 9b2b6f3 / e9ed76c

-- 1. hasil_bulanan VIEW — tutup widening, kembalikan column-scoped tanpa id
DO $$ BEGIN REVOKE SELECT ON public.hasil_bulanan FROM anon; EXCEPTION WHEN OTHERS THEN NULL; END $$;
GRANT SELECT (
  tahun, bulan, jenis, pol_pn, nama, peserta,
  luas_hek, luas_operasi, unit, kod_bulan, nama_bulan, wilayah, hasil
) ON public.hasil_bulanan TO anon;
GRANT SELECT ON public.hasil_bulanan TO authenticated;

-- 2. hasil_bulanan_src TABLE — tutup widening, kembalikan column-scoped 12 kolum
DO $$ BEGIN REVOKE SELECT ON public.hasil_bulanan_src FROM anon; EXCEPTION WHEN OTHERS THEN NULL; END $$;
GRANT SELECT (
  tahun, bulan, jenis, pusat_operasi_final, wilayah,
  nama_projek, luas_kawasan_hek, luas_produktif_hek,
  unit, hasil, kod_bulan, bulan_nama
) ON public.hasil_bulanan_src TO anon;
GRANT SELECT ON public.hasil_bulanan_src TO authenticated;

-- 3. Verification — mesti denied untuk 8 kolum Dalaman, berjaya untuk whitelist
-- SET ROLE anon; SELECT id FROM hasil_bulanan_src LIMIT 1; -- MESTI denied
-- SELECT kategori FROM hasil_bulanan_src LIMIT 1; -- MESTI denied
-- SELECT bilangan_peserta FROM hasil_bulanan_src LIMIT 1; -- MESTI denied
-- SELECT pusat_operasi FROM hasil_bulanan_src LIMIT 1; -- MESTI denied
-- SELECT pusat_operasi_master FROM hasil_bulanan_src LIMIT 1; -- MESTI denied
-- SELECT kategori_master FROM hasil_bulanan_src LIMIT 1; -- MESTI denied
-- SELECT in_master_2026 FROM hasil_bulanan_src LIMIT 1; -- MESTI denied
-- SELECT negeri FROM hasil_bulanan_src LIMIT 1; -- MESTI denied
-- SELECT tahun, hasil FROM hasil_bulanan_src LIMIT 1; -- MESTI berjaya
-- SELECT id FROM hasil_bulanan LIMIT 1; -- MESTI denied
-- SELECT tahun, hasil, wilayah FROM hasil_bulanan LIMIT 1; -- MESTI berjaya
-- RESET ROLE;

DO $$ BEGIN RAISE NOTICE 'Migration 0034: 0031b widening ditutup, kembali ke column-scoped 0031. Siap sedia untuk 0032 RPC-only.'; END $$;
