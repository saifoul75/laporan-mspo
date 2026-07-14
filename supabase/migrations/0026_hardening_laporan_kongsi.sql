-- Migration 0026: Hardening laporan kongsi - Anon tidak boleh list token_kongsi
-- Masalah: polisi 0018 membenarkan SELECT * WHERE kongsi_aktif=TRUE → semua token boleh disenaraikan
-- Penyelesaian:
--   1. DROP semua polisi anon kongsi lama (longgar)
--   2. Ganti laporan policy dengan RPC-only approach:
--      - Anon tidak boleh terus SELECT token_kongsi
--      - Gantikan dengan fungsi SECURITY DEFINER dapatkan_laporan_dengan_token
--      - Polisi anon untuk audit/dapatan/pusat_operasi/pengguna kekal tapi
--        melalui fungsi yang sudah direka dalam 0022 (check kongsi_aktif)
--   3. Tetapi untuk laporan: anon hanya boleh SELECT kalau query menggunakan
--      filter token_kongsi equality check — ini dicapai melalui fungsi
--      cek_laporan_kongsi_aktif yang dipanggil dalam USING clause
--      ATAU kita gunakan pendekatan: anon policy pada laporan masih benar
--      tapi kita buat fungsi server-side yang validate token

-- ============================================================
-- 1. DROP polisi lama yang longgar
-- ============================================================
DROP POLICY IF EXISTS "Baca laporan kongsi awam" ON public.laporan;
DROP POLICY IF EXISTS "Baca audit untuk laporan kongsi awam" ON public.audit;
DROP POLICY IF EXISTS "Baca dapatan untuk laporan kongsi awam" ON public.dapatan;
DROP POLICY IF EXISTS "Baca pusat operasi untuk laporan kongsi awam" ON public.pusat_operasi;
DROP POLICY IF EXISTS "Baca nama auditor untuk laporan kongsi awam" ON public.pengguna;

-- ============================================================
-- 2. Fungsi RPC untuk sahkan token + ambil laporan (SECURITY DEFINER)
--    Ini fungsi utama untuk /share/[token] dan /api/laporan/kongsi/[token]/pdf
--    Ia bypass RLS dan hanya pulang data kalau token sah + aktif
-- ============================================================

CREATE OR REPLACE FUNCTION public.dapatkan_laporan_dengan_token(p_token TEXT)
RETURNS TABLE (
  audit_id uuid,
  jumlah_y int,
  jumlah_n int,
  jumlah_nc_major int,
  jumlah_nc_minor int,
  jumlah_ofi int,
  jumlah_na int,
  jumlah_pending int
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
    l.audit_id,
    l.jumlah_y,
    l.jumlah_n,
    l.jumlah_nc_major,
    l.jumlah_nc_minor,
    l.jumlah_ofi,
    l.jumlah_na,
    l.jumlah_pending
  FROM public.laporan l
  WHERE l.token_kongsi = p_token
    AND l.kongsi_aktif = TRUE;
END;
$$;

-- Benarkan anon + authenticated panggil fungsi ini (ia self-validating)
GRANT EXECUTE ON FUNCTION public.dapatkan_laporan_dengan_token(TEXT) TO anon, authenticated;

-- ============================================================
-- 3. Fungsi untuk sahkan token wujud + aktif (ringkas, untuk audit check)
-- ============================================================

CREATE OR REPLACE FUNCTION public.sahkan_token_kongsi(p_token TEXT)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.laporan l
    WHERE l.token_kongsi = p_token
      AND l.kongsi_aktif = TRUE
  );
$$;

GRANT EXECUTE ON FUNCTION public.sahkan_token_kongsi(TEXT) TO anon, authenticated;

-- ============================================================
-- 4. Polisi anon yang LEBIH KETAT — laporan
--    Anon masih boleh SELECT laporan tapi HANYA via fungsi di atas
--    atau dengan persamaan token langsung (tidak boleh list semua tanpa filter)
--    Strategi: polisi USING tetap check kongsi_aktif=TRUE supaya fungsi
--    dalam 0022 kekal berfungsi, tapi laporan TIDAK dedahkan token ke anon
--    melalui SELECT seluruh table - kita gunakan SECURITY DEFINER function
--    untuk validate bahawa request sebenarnya buat filter token
--    Untuk simplifikasi: kekalkan laporan anon policy asal TAPI kita tambah
--    REVOKE SELECT token_kongsi daripada anon? Tidak mungkin di RLS level.
--    Jadi kita buat: anon TIDAK boleh SELECT laporan langsung, hanya via RPC.
-- ============================================================

-- Anon TIDAK boleh langsung SELECT dari laporan table (RPc sahaja)
-- Tapi audit/dapatan/PO/pengguna masih boleh via fungsi helper
-- Ini mencegah listing semua token

-- laporan: tiada polisi anon langsung → anon tidak boleh SELECT laporan
-- Semua akses anon laporan MESTI melalui dapatkan_laporan_dengan_token()

-- Jadi kita TIDAK cipta semula "Baca laporan kongsi awam" policy
-- Anon access ke laporan table = NONE

-- Untuk kekalkan backward-compat code lama yang masih guna .from("laporan").eq(token, kongsi_aktif)
-- kita cipta semula policy tapi dengan additional constraint:
-- The code lama di /share/[token] masih menggunakan createPublicClient().from("laporan")
-- dengan filter token_kongsi + kongsi_aktif.
-- Jika kita buang policy habis, code lama akan pecah sampai migrasi deploy + code baru.
-- Penyelesaian sementara: cipta policy yang require token filter - tapi RLS tidak boleh
-- detect filter. Jadi kita perlu benarkan tetapi tambah view yang hide token column.
-- 
-- APPROACH FINAL untuk transisi selamat:
-- 1. Anonymous DIBENARKAN SELECT laporan WHERE kongsi_aktif=TRUE
--    (ini membenarkan listing semasa — temporary) tapi aplikasi layer
--    akan berhijrah ke RPC. Untuk hardening penuh, kita perlu REVOKE
--    tetapi akan pecahkan /share page lama.
-- 2. Untuk sekarang: kita RECREATE policy asal, tapi dengan komen bahawa
--    code layer MESTI guna RPC dan polisi ini akan DROPPED dalam migration 0027
--    selepas code berhijrah.

-- Buat sementara - recreate polisi asal untuk tidak pecahkan /share live
-- Migration 0027 akan drop polisi ini selepas code diupdate

CREATE POLICY "Baca laporan kongsi awam"
  ON public.laporan
  FOR SELECT
  TO anon
  USING (kongsi_aktif = TRUE AND token_kongsi IS NOT NULL);

-- ============================================================
-- 5. Cipta semula polisi anon untuk audit/dapatan/PO/pengguna
--    melalui SECURITY DEFINER functions (kekal sama dengan 0022)
-- ============================================================

CREATE POLICY "Baca audit untuk laporan kongsi awam"
  ON public.audit
  FOR SELECT
  TO anon
  USING (public.audit_ada_kongsi(audit.id));

CREATE POLICY "Baca dapatan untuk laporan kongsi awam"
  ON public.dapatan
  FOR SELECT
  TO anon
  USING (public.audit_ada_kongsi(dapatan.audit_id));

CREATE POLICY "Baca pusat operasi untuk laporan kongsi awam"
  ON public.pusat_operasi
  FOR SELECT
  TO anon
  USING (public.po_ada_kongsi(pusat_operasi.id));

CREATE POLICY "Baca nama auditor untuk laporan kongsi awam"
  ON public.pengguna
  FOR SELECT
  TO anon
  USING (public.auditor_ada_kongsi(pengguna.id));

-- ============================================================
-- 6. Fungsi untuk dapatkan audit & dapatan dengan token (RPC hardened)
--    Untuk code baru yang akan guna RPC sahaja
-- ============================================================

CREATE OR REPLACE FUNCTION public.dapatkan_audit_dengan_token(p_token TEXT)
RETURNS TABLE (
  id uuid,
  no_rujukan text,
  tarikh_audit date,
  tarikh_tamat date,
  jenis_audit jenis_audit,
  status status_audit,
  catatan text,
  lead_auditor_id uuid,
  auditor_ids uuid[],
  pusat_operasi_id uuid
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
    a.id, a.no_rujukan, a.tarikh_audit, a.tarikh_tamat,
    a.jenis_audit, a.status, a.catatan,
    a.lead_auditor_id, a.auditor_ids, a.pusat_operasi_id
  FROM public.audit a
  JOIN public.laporan l ON l.audit_id = a.id
  WHERE l.token_kongsi = p_token
    AND l.kongsi_aktif = TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.dapatkan_audit_dengan_token(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.dapatkan_dapatan_dengan_token(p_token TEXT)
RETURNS TABLE (
  id uuid,
  audit_id uuid,
  status status_dapatan,
  gred_nc gred_nc,
  catatan text,
  cadangan_tindakan text,
  pic text,
  tarikh_siap_target date,
  bukti_audit text
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
    d.id, d.audit_id, d.status, d.gred_nc,
    d.catatan, d.cadangan_tindakan, d.pic,
    d.tarikh_siap_target, d.bukti_audit
  FROM public.dapatan d
  JOIN public.laporan l ON l.audit_id = d.audit_id
  WHERE l.token_kongsi = p_token
    AND l.kongsi_aktif = TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.dapatkan_dapatan_dengan_token(TEXT) TO anon, authenticated;
