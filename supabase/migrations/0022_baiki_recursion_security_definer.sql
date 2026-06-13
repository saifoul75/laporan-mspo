-- Migration 0022: Baiki infinite recursion (42P17) dalam RLS polisi kongsi awam
-- Punca: polisi anon "Baca ... untuk laporan kongsi awam" pada audit/dapatan/
-- pusat_operasi/pengguna membuat subquery silang ke jadual lain yang turut
-- mempunyai RLS, menyebabkan gelung penilaian polisi (recursion) pada "audit".
-- 0019 cuba menampung dengan auth.uid() IS NOT NULL tetapi tidak menghapuskan
-- gelung untuk peranan anon.
--
-- Penyelesaian: pindahkan logik EXISTS ke dalam fungsi SECURITY DEFINER.
-- Fungsi ini berjalan sebagai pemilik (bypass RLS) dengan search_path tetap,
-- jadi subquery tidak lagi mencetuskan penilaian polisi RLS -> tiada recursion.

-- ============================================================
-- 1. FUNGSI PEMBANTU (SECURITY DEFINER)
-- ============================================================

CREATE OR REPLACE FUNCTION public.audit_ada_kongsi(p_audit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.laporan l
    WHERE l.audit_id = p_audit_id
      AND l.kongsi_aktif = TRUE
      AND l.token_kongsi IS NOT NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.po_ada_kongsi(p_po_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.audit a
    JOIN public.laporan l ON l.audit_id = a.id
    WHERE a.pusat_operasi_id = p_po_id
      AND l.kongsi_aktif = TRUE
      AND l.token_kongsi IS NOT NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.auditor_ada_kongsi(p_pengguna_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.audit a
    JOIN public.laporan l ON l.audit_id = a.id
    WHERE (a.lead_auditor_id = p_pengguna_id OR p_pengguna_id = ANY(a.auditor_ids))
      AND l.kongsi_aktif = TRUE
      AND l.token_kongsi IS NOT NULL
  );
$$;

-- ============================================================
-- 2. GANTI POLISI ANON SUPAYA GUNA FUNGSI DI ATAS
-- ============================================================

DROP POLICY IF EXISTS "Baca audit untuk laporan kongsi awam" ON public.audit;
CREATE POLICY "Baca audit untuk laporan kongsi awam"
  ON public.audit
  FOR SELECT
  TO anon
  USING (public.audit_ada_kongsi(audit.id));

DROP POLICY IF EXISTS "Baca dapatan untuk laporan kongsi awam" ON public.dapatan;
CREATE POLICY "Baca dapatan untuk laporan kongsi awam"
  ON public.dapatan
  FOR SELECT
  TO anon
  USING (public.audit_ada_kongsi(dapatan.audit_id));

DROP POLICY IF EXISTS "Baca pusat operasi untuk laporan kongsi awam" ON public.pusat_operasi;
CREATE POLICY "Baca pusat operasi untuk laporan kongsi awam"
  ON public.pusat_operasi
  FOR SELECT
  TO anon
  USING (public.po_ada_kongsi(pusat_operasi.id));

DROP POLICY IF EXISTS "Baca nama auditor untuk laporan kongsi awam" ON public.pengguna;
CREATE POLICY "Baca nama auditor untuk laporan kongsi awam"
  ON public.pengguna
  FOR SELECT
  TO anon
  USING (public.auditor_ada_kongsi(pengguna.id));

-- ============================================================
-- 3. GRANT EXECUTE KEPADA ANON (dan authenticated)
-- ============================================================

GRANT EXECUTE ON FUNCTION public.audit_ada_kongsi(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.po_ada_kongsi(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auditor_ada_kongsi(uuid) TO anon, authenticated;
