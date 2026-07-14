-- Migration 0028: Hardening against IDOR — tighten RLS for audit operations
-- Masalah: 0003 membenarkan semua auditor (role auditor) SELECT/ALL pada audit/dapatan
-- bermakna Auditor A boleh tulis Audit B.
-- Penyelesaian: Tambah fungsi helper untuk semakan keahlian audit, dan
-- perketat polisi ALL → lebih granular (SELECT permissive, INSERT/UPDATE/DELETE ketat)

-- ============================================================
-- 1. Helper: adakah pengguna adalah ahli audit?
-- ============================================================

CREATE OR REPLACE FUNCTION public.adalah_ahli_audit(p_audit_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- admin sentiasa boleh
  IF public.rol_semasa() = 'admin' THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.audit a
    WHERE a.id = p_audit_id
      AND (
        a.lead_auditor_id = auth.uid()
        OR auth.uid() = ANY(a.auditor_ids)
        OR public.rol_semasa() IN ('lead_auditor', 'auditor')
      )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.adalah_ahli_audit(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.adalah_lead_atau_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.rol_semasa() IN ('admin', 'lead_auditor');
$$;

GRANT EXECUTE ON FUNCTION public.adalah_lead_atau_admin() TO authenticated;

-- ============================================================
-- 2. Audit: KETATKAN UPDATE/DELETE/INSERT
--    SELECT boleh semua auditor (untuk dashboard) — tapi WRITE hanya lead/admin atau ahli
-- ============================================================

DROP POLICY IF EXISTS "Auditor urus audit" ON public.audit;

-- SELECT: semua authenticated dengan role auditor/lead/admin + po_user untuk PO mereka
CREATE POLICY "Baca audit - semua auditor"
  ON public.audit
  FOR SELECT
  TO authenticated
  USING (
    public.rol_semasa() IN ('admin', 'lead_auditor', 'auditor')
    OR EXISTS (
      SELECT 1 FROM public.pengguna p
      WHERE p.id = auth.uid() AND p.pusat_operasi_id = audit.pusat_operasi_id
    )
  );

-- INSERT: hanya admin/lead_auditor
CREATE POLICY "Cipta audit - admin lead"
  ON public.audit
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.rol_semasa() IN ('admin', 'lead_auditor')
  );

-- UPDATE: admin, lead_auditor, atau lead_auditor_id sendiri
CREATE POLICY "Kemaskini audit - lead admin atau lead assigned"
  ON public.audit
  FOR UPDATE
  TO authenticated
  USING (
    public.rol_semasa() IN ('admin', 'lead_auditor')
    OR lead_auditor_id = auth.uid()
    OR auth.uid() = ANY(auditor_ids)
  )
  WITH CHECK (
    public.rol_semasa() IN ('admin', 'lead_auditor')
    OR lead_auditor_id = auth.uid()
    OR auth.uid() = ANY(auditor_ids)
  );

-- DELETE: admin/lead sahaja
CREATE POLICY "Padam audit - admin lead"
  ON public.audit
  FOR DELETE
  TO authenticated
  USING (
    public.rol_semasa() IN ('admin', 'lead_auditor')
  );

-- ============================================================
-- 3. Dapatan: KETATKAN WRITE — hanya ahli audit
-- ============================================================

DROP POLICY IF EXISTS "Auditor tulis dapatan" ON public.dapatan;

-- SELECT sudah ada dari 0003 (permissive) — kekalkan
-- Drop dan recreate dengan lebih jelas
DROP POLICY IF EXISTS "Akses dapatan" ON public.dapatan;

CREATE POLICY "Baca dapatan - auditor dan po"
  ON public.dapatan
  FOR SELECT
  TO authenticated
  USING (
    public.rol_semasa() IN ('admin', 'lead_auditor', 'auditor')
    OR EXISTS (
      SELECT 1 FROM public.audit a
      JOIN public.pengguna p ON p.id = auth.uid()
      WHERE a.id = dapatan.audit_id AND p.pusat_operasi_id = a.pusat_operasi_id
    )
  );

CREATE POLICY "Tulis dapatan - ahli audit sahaja"
  ON public.dapatan
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.adalah_ahli_audit(audit_id)
  );

CREATE POLICY "Kemaskini dapatan - ahli audit sahaja"
  ON public.dapatan
  FOR UPDATE
  TO authenticated
  USING (
    public.adalah_ahli_audit(audit_id)
  )
  WITH CHECK (
    public.adalah_ahli_audit(audit_id)
  );

CREATE POLICY "Padam dapatan - admin lead"
  ON public.dapatan
  FOR DELETE
  TO authenticated
  USING (
    public.rol_semasa() IN ('admin', 'lead_auditor')
    OR lead_auditor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.audit a
      WHERE a.id = dapatan.audit_id AND a.lead_auditor_id = auth.uid()
    )
  );

-- ============================================================
-- 4. NC / OFI: Hanya lead/admin boleh tulis, semua auditor boleh baca
-- ============================================================

DROP POLICY IF EXISTS "Lead urus NC" ON public.nc;
DROP POLICY IF EXISTS "Akses NC" ON public.nc;

CREATE POLICY "Baca NC - auditor dan po"
  ON public.nc
  FOR SELECT
  TO authenticated
  USING (
    public.rol_semasa() IN ('admin', 'lead_auditor', 'auditor')
    OR EXISTS (
      SELECT 1 FROM public.audit a
      JOIN public.pengguna p ON p.id = auth.uid()
      WHERE a.id = nc.audit_id AND p.pusat_operasi_id = a.pusat_operasi_id
    )
  );

CREATE POLICY "Cipta NC - trigger atau lead"
  ON public.nc
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.rol_semasa() IN ('admin', 'lead_auditor')
    OR public.adalah_ahli_audit(audit_id)
  );

CREATE POLICY "Kemaskini NC - lead admin"
  ON public.nc
  FOR UPDATE
  TO authenticated
  USING (
    public.rol_semasa() IN ('admin', 'lead_auditor')
    OR public.adalah_ahli_audit(audit_id)
  )
  WITH CHECK (
    public.rol_semasa() IN ('admin', 'lead_auditor')
    OR public.adalah_ahli_audit(audit_id)
  );

CREATE POLICY "Padam NC - admin lead"
  ON public.nc
  FOR DELETE
  TO authenticated
  USING (
    public.rol_semasa() IN ('admin', 'lead_auditor')
  );

-- OFI sama

DROP POLICY IF EXISTS "Lead urus OFI" ON public.ofi;
DROP POLICY IF EXISTS "Akses OFI" ON public.ofi;

CREATE POLICY "Baca OFI - auditor dan po"
  ON public.ofi
  FOR SELECT
  TO authenticated
  USING (
    public.rol_semasa() IN ('admin', 'lead_auditor', 'auditor')
    OR EXISTS (
      SELECT 1 FROM public.audit a
      JOIN public.pengguna p ON p.id = auth.uid()
      WHERE a.id = ofi.audit_id AND p.pusat_operasi_id = a.pusat_operasi_id
    )
  );

CREATE POLICY "Cipta OFI - trigger atau lead"
  ON public.ofi
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.rol_semasa() IN ('admin', 'lead_auditor')
    OR public.adalah_ahli_audit(audit_id)
  );

CREATE POLICY "Kemaskini OFI - lead admin atau ahli"
  ON public.ofi
  FOR UPDATE
  TO authenticated
  USING (
    public.rol_semasa() IN ('admin', 'lead_auditor')
    OR public.adalah_ahli_audit(audit_id)
  )
  WITH CHECK (
    public.rol_semasa() IN ('admin', 'lead_auditor')
    OR public.adalah_ahli_audit(audit_id)
  );

CREATE POLICY "Padam OFI - admin lead"
  ON public.ofi
  FOR DELETE
  TO authenticated
  USING (
    public.rol_semasa() IN ('admin', 'lead_auditor')
  );

-- ============================================================
-- 5. Kehadiran opening meeting: ahli audit sahaja
-- ============================================================

DROP POLICY IF EXISTS "Akses kehadiran" ON public.kehadiran_opening_meeting;
DROP POLICY IF EXISTS "Tulis kehadiran" ON public.kehadiran_opening_meeting;
DROP POLICY IF EXISTS "Admin urus kehadiran" ON public.kehadiran_opening_meeting;

ALTER TABLE public.kehadiran_opening_meeting ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Baca kehadiran - ahli audit"
  ON public.kehadiran_opening_meeting
  FOR SELECT
  TO authenticated
  USING (
    public.adalah_ahli_audit(audit_id)
    OR EXISTS (
      SELECT 1 FROM public.pengguna p
      JOIN public.audit a ON a.pusat_operasi_id = p.pusat_operasi_id
      WHERE p.id = auth.uid() AND a.id = kehadiran_opening_meeting.audit_id
    )
  );

CREATE POLICY "Tulis kehadiran - ahli audit"
  ON public.kehadiran_opening_meeting
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.adalah_ahli_audit(audit_id)
  );

CREATE POLICY "Padam kehadiran - admin lead"
  ON public.kehadiran_opening_meeting
  FOR DELETE
  TO authenticated
  USING (
    public.rol_semasa() IN ('admin', 'lead_auditor')
    OR public.adalah_ahli_audit(audit_id)
  );

-- ============================================================
-- 6. Bukti: ahli audit sahaja
-- ============================================================

DROP POLICY IF EXISTS "Auditor tulis bukti" ON public.bukti;
DROP POLICY IF EXISTS "Akses bukti" ON public.bukti;

CREATE POLICY "Baca bukti - ahli audit"
  ON public.bukti
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dapatan d
      WHERE d.id = bukti.dapatan_id
        AND public.adalah_ahli_audit(d.audit_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.dapatan d
      JOIN public.audit a ON a.id = d.audit_id
      JOIN public.pengguna p ON p.id = auth.uid()
      WHERE d.id = bukti.dapatan_id AND p.pusat_operasi_id = a.pusat_operasi_id
    )
  );

CREATE POLICY "Tulis bukti - ahli audit"
  ON public.bukti
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dapatan d
      WHERE d.id = bukti.dapatan_id
        AND public.adalah_ahli_audit(d.audit_id)
    )
  );

CREATE POLICY "Padam bukti - admin lead atau pemilik bukti"
  ON public.bukti
  FOR DELETE
  TO authenticated
  USING (
    public.rol_semasa() IN ('admin', 'lead_auditor')
    OR dimuat_naik_oleh = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.dapatan d
      JOIN public.audit a ON a.id = d.audit_id
      WHERE d.id = bukti.dapatan_id AND a.lead_auditor_id = auth.uid()
    )
  );

-- ============================================================
-- 7. Laporan: hanya lead/admin boleh tulis
-- ============================================================

DROP POLICY IF EXISTS "Akses laporan" ON public.laporan;
DROP POLICY IF EXISTS "Lead urus laporan" ON public.laporan;

CREATE POLICY "Baca laporan - auditor dan po"
  ON public.laporan
  FOR SELECT
  TO authenticated
  USING (
    public.rol_semasa() IN ('admin', 'lead_auditor', 'auditor')
    OR EXISTS (
      SELECT 1 FROM public.audit a
      JOIN public.pengguna p ON p.id = auth.uid()
      WHERE a.id = laporan.audit_id AND p.pusat_operasi_id = a.pusat_operasi_id
    )
  );

CREATE POLICY "Tulis laporan - lead admin"
  ON public.laporan
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.rol_semasa() IN ('admin', 'lead_auditor')
  );

CREATE POLICY "Kemaskini laporan - lead admin"
  ON public.laporan
  FOR UPDATE
  TO authenticated
  USING (
    public.rol_semasa() IN ('admin', 'lead_auditor')
  )
  WITH CHECK (
    public.rol_semasa() IN ('admin', 'lead_auditor')
  );

CREATE POLICY "Padam laporan - admin"
  ON public.laporan
  FOR DELETE
  TO authenticated
  USING (
    public.rol_semasa() = 'admin'
  );
