-- Migration 0019: Betulkan infinite recursion dalam RLS policies untuk ciri kongsi awam
-- Punca: polisi "Akses laporan" dan "Akses audit" (TO public) buat subquery silang
-- yang menyebabkan gelang rekursi apabila peranan anon mengakses laporan/audit.
--
-- Penyelesaian: tambah auth.uid() IS NOT NULL sebagai syarat pertama supaya
-- anon short-circuit terus → FALSE tanpa execute subquery → tiada rekursi.
-- Pengguna log masuk tidak terjejas (auth.uid() IS NOT NULL sentiasa TRUE untuk mereka).

-- ============================================================
-- 1. BETULKAN POLISI "Akses laporan" PADA public.laporan
-- ============================================================

DROP POLICY IF EXISTS "Akses laporan" ON public.laporan;

CREATE POLICY "Akses laporan"
  ON public.laporan
  FOR SELECT
  TO public
  USING (
    auth.uid() IS NOT NULL
    AND (
      (rol_semasa() = ANY (ARRAY['admin'::rol_pengguna, 'lead_auditor'::rol_pengguna, 'auditor'::rol_pengguna]))
      OR (EXISTS (
        SELECT 1
        FROM (audit a JOIN pengguna p ON ((p.id = auth.uid())))
        WHERE ((a.id = laporan.audit_id) AND (p.pusat_operasi_id = a.pusat_operasi_id))
      ))
    )
  );

-- ============================================================
-- 2. BETULKAN POLISI "Akses audit" PADA public.audit
-- ============================================================

DROP POLICY IF EXISTS "Akses audit" ON public.audit;

CREATE POLICY "Akses audit"
  ON public.audit
  FOR SELECT
  TO public
  USING (
    auth.uid() IS NOT NULL
    AND (
      (rol_semasa() = ANY (ARRAY['admin'::rol_pengguna, 'lead_auditor'::rol_pengguna, 'auditor'::rol_pengguna]))
      OR (EXISTS (
        SELECT 1 FROM pengguna p
        WHERE p.id = auth.uid()
          AND p.pusat_operasi_id = audit.pusat_operasi_id
      ))
    )
  );
