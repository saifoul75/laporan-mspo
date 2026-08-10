-- Migration 0029: Final hardening - Buang polisi anon loose pada laporan
-- Latar belakang:
--   0026 mencipta semula polisi "Baca laporan kongsi awam" TO anon USING (kongsi_aktif=TRUE)
--   untuk backward-compat dengan code lama /share/[token].
--   Polisi ini membenarkan anon menyenaraikan semua token_kongsi aktif.
--   Code aplikasi kini sudah guna RPC hardened, jadi kita boleh DROP.
--
--   Selepas migration ini:
--   - anon TIDAK boleh langsung SELECT dari public.laporan
--   - anon hanya boleh akses via RPC: dapatkan_laporan_dengan_token, sahkan_token_kongsi,
--     dapatkan_audit_dengan_token, dapatkan_dapatan_dengan_token
--   - /share dan /api/laporan/kongsi/[token]/pdf mesti guna RPC (sudah siap di code baru
--     selepas 0026, tapi code lama masih guna .from("laporan").filter)
--   - Code layer dalam branch security/fix-critical-risks masih guna .from("laporan")
--     untuk /share — migration ini akan pecahkan /share jika code lama belum update.
--     Penyelesaian: code /share dalam 0029 kita ubah untuk guna RPC juga.
--     Tetapi sebagai langkah keselamatan, kita tetap DROP polisi lama di sini.
--     Jika /share pecah, ia fail-closed (404) — selamat.

-- ============================================================
-- 1. DROP polisi anon loose yang dicipta semula di 0026
-- ============================================================

DROP POLICY IF EXISTS "Baca laporan kongsi awam" ON public.laporan;

-- ============================================================
-- 2. Pastikan tiada polisi lain yang membenarkan anon SELECT laporan
-- ============================================================

-- Senaraikan polisi sedia ada: sepatutnya hanya 4 polisi authenticated sekarang
-- dari 0028: Baca laporan - auditor dan po, Tulis laporan, Kemaskini, Padam

-- ============================================================
-- 3. Pastikan anon tidak ada GRANT SELECT pada laporan table
-- ============================================================

-- Walaupun tiada polisi, GRANT masih boleh ada — revoke untuk safety
-- Nota: Supabase menggunakan RLS, jadi walaupun GRANT ada, tanpa polisi = no access
-- Tetapi lebih baik revoke eksplisit

REVOKE SELECT ON public.laporan FROM anon;
-- Authenticated masih perlukan SELECT via polisi di atas
GRANT SELECT ON public.laporan TO authenticated;

-- ============================================================
-- 4. Pastikan RPC functions telah wujud (dari 0026) dan boleh dipanggil anon
-- ============================================================

-- Re-grant untuk pastikan tidak ter-revoke tidak sengaja
GRANT EXECUTE ON FUNCTION public.dapatkan_laporan_dengan_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sahkan_token_kongsi(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dapatkan_audit_dengan_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dapatkan_dapatan_dengan_token(TEXT) TO anon, authenticated;

-- ============================================================
-- 5. Tambah fungsi RPC untuk dapatkan PO dan pengguna dengan token
--    (untuk complete migration ke RPC-only untuk /share)
-- ============================================================

CREATE OR REPLACE FUNCTION public.dapatkan_po_dengan_token(p_token TEXT)
RETURNS TABLE (
  id uuid,
  kod text,
  nama text,
  wilayah text,
  daerah text,
  negeri text,
  keluasan_hektar numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 8 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    po.id, po.kod, po.nama, po.wilayah, po.daerah, po.negeri, po.keluasan_hektar
  FROM public.pusat_operasi po
  JOIN public.audit a ON a.pusat_operasi_id = po.id
  JOIN public.laporan l ON l.audit_id = a.id
  WHERE l.token_kongsi = p_token
    AND l.kongsi_aktif = TRUE
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.dapatkan_po_dengan_token(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.dapatkan_pengguna_dengan_token(p_token TEXT)
RETURNS TABLE (
  id uuid,
  nama_penuh text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 8 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id, p.nama_penuh
  FROM public.pengguna p
  WHERE EXISTS (
    SELECT 1
    FROM public.audit a
    JOIN public.laporan l ON l.audit_id = a.id
    WHERE l.token_kongsi = p_token
      AND l.kongsi_aktif = TRUE
      AND (a.lead_auditor_id = p.id OR p.id = ANY(a.auditor_ids))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.dapatkan_pengguna_dengan_token(TEXT) TO anon, authenticated;

-- ============================================================
-- 6. Audit trail: log migration selesai
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 0029 selesai: anon SELECT pada laporan telah dibuang, RPC-only mode aktif';
END $$;
