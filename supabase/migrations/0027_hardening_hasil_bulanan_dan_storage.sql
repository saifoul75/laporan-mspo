-- Migration 0027: Hardening hasil_bulanan + storage bukti-audit
-- Nota: hasil_bulanan kini VIEW (bukan TABLE) selepas 0023 — tidak boleh CREATE POLICY pada VIEW
-- Jadi untuk hasil_bulanan VIEW, kita REVOKE GRANT anon sahaja
-- Untuk hasil_bulanan_src (BASE TABLE), kita DROP/CREATE POLICY seperti biasa

-- ============================================================
-- 1. HARDENING hasil_bulanan (VIEW) — REVOKE anon GRANT sahaja
-- ============================================================

DO $$
BEGIN
  -- Jika hasil_bulanan adalah TABLE (old schema), baru DROP POLICY
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='hasil_bulanan' AND table_type='BASE TABLE'
  ) THEN
    DROP POLICY IF EXISTS "Anon dapat baca" ON public.hasil_bulanan;
    DROP POLICY IF EXISTS "Public boleh baca" ON public.hasil_bulanan;
    DROP POLICY IF EXISTS "baca_awam_hasil" ON public.hasil_bulanan;
    DROP POLICY IF EXISTS "Admin boleh semua" ON public.hasil_bulanan;
    DROP POLICY IF EXISTS "Pengguna boleh baca" ON public.hasil_bulanan;

    -- Buat semula authenticated only jika table
    BEGIN
      CREATE POLICY "Pengguna boleh baca hasil bulanan"
        ON public.hasil_bulanan FOR SELECT TO authenticated USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      CREATE POLICY "Admin boleh semua hasil bulanan"
        ON public.hasil_bulanan FOR ALL TO authenticated USING (public.rol_semasa() = 'admin');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;

  -- Untuk VIEW atau TABLE, revoke anon grant
  BEGIN
    REVOKE SELECT ON public.hasil_bulanan FROM anon;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- Pastikan anon tidak ada SELECT pada view hasil_bulanan — authenticated sahaja
GRANT SELECT ON public.hasil_bulanan TO authenticated;

-- View agregat masih boleh anon: v_wilayah, v_hq, v_ringkasan_po sudah GRANT SELECT TO anon di migration 0023/0024
-- Jangan revoke mereka

-- ============================================================
-- 2. HARDENING hasil_bulanan_src (BASE TABLE)
-- ============================================================

DROP POLICY IF EXISTS "baca_awam_hasil" ON public.hasil_bulanan_src;
DROP POLICY IF EXISTS "Anon dapat baca" ON public.hasil_bulanan_src;

DO $$
BEGIN
  -- Buat policies hanya jika belum ada — idempotent
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='hasil_bulanan_src' AND policyname='baca_hasil_src_authenticated'
  ) THEN
    CREATE POLICY "baca_hasil_src_authenticated"
      ON public.hasil_bulanan_src FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DROP POLICY IF EXISTS "Tulis hasil_src admin" ON public.hasil_bulanan_src;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='hasil_bulanan_src' AND policyname='Tulis hasil_src admin'
  ) THEN
    CREATE POLICY "Tulis hasil_src admin"
      ON public.hasil_bulanan_src FOR ALL TO authenticated
      USING (public.rol_semasa() = ANY (ARRAY['admin'::rol_pengguna, 'lead_auditor'::rol_pengguna]))
      WITH CHECK (public.rol_semasa() = ANY (ARRAY['admin'::rol_pengguna, 'lead_auditor'::rol_pengguna]));
  END IF;
END $$;

DO $$
BEGIN
  REVOKE SELECT ON public.hasil_bulanan_src FROM anon;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- 3. STORAGE: bukti-audit bucket hardening
-- ============================================================

DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('bukti-audit', 'bukti-audit', false)
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DROP POLICY IF EXISTS "Auditor muat naik bukti" ON storage.objects;
DROP POLICY IF EXISTS "Auditor baca bukti" ON storage.objects;
DROP POLICY IF EXISTS "Auth boleh baca bukti" ON storage.objects;
DROP POLICY IF EXISTS "Auth boleh muat naik bukti" ON storage.objects;
DROP POLICY IF EXISTS "Bukti audit - baca" ON storage.objects;
DROP POLICY IF EXISTS "Bukti audit - muat naik" ON storage.objects;
DROP POLICY IF EXISTS "Bukti audit - padam" ON storage.objects;
DROP POLICY IF EXISTS "Bukti audit - kemaskini" ON storage.objects;
DROP POLICY IF EXISTS "Bukti audit - baca dengan akses audit" ON storage.objects;
DROP POLICY IF EXISTS "Bukti audit - muat naik dengan akses audit" ON storage.objects;
DROP POLICY IF EXISTS "Bukti audit - padam dengan akses admin/lead" ON storage.objects;
DROP POLICY IF EXISTS "Bukti audit - kemaskini dengan akses admin/lead" ON storage.objects;

CREATE OR REPLACE FUNCTION public.boleh_akses_bukti(p_dapatan_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_audit_id uuid;
BEGIN
  SELECT audit_id INTO v_audit_id FROM public.dapatan WHERE id = p_dapatan_id;
  IF v_audit_id IS NULL THEN
    RETURN false;
  END IF;
  IF public.rol_semasa() IN ('admin', 'lead_auditor', 'auditor') THEN
    RETURN true;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.audit a JOIN public.pengguna p ON p.id = auth.uid()
    WHERE a.id = v_audit_id AND p.pusat_operasi_id = a.pusat_operasi_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.boleh_akses_bukti(uuid) TO authenticated;

CREATE POLICY "Bukti audit - baca dengan akses audit"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'bukti-audit'
    AND (
      public.rol_semasa() IN ('admin', 'lead_auditor', 'auditor')
      OR EXISTS (
        SELECT 1 FROM public.pengguna p
        JOIN public.audit a ON a.pusat_operasi_id = p.pusat_operasi_id
        JOIN public.dapatan d ON d.audit_id = a.id
        WHERE p.id = auth.uid()
          AND (storage.objects.name LIKE d.id::text || '/%' OR storage.objects.name LIKE '%/' || d.id::text || '/%' OR storage.objects.name = d.id::text)
      )
    )
  );

CREATE POLICY "Bukti audit - muat naik dengan akses audit"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'bukti-audit'
    AND (
      public.rol_semasa() IN ('admin', 'lead_auditor', 'auditor')
      OR EXISTS (
        SELECT 1 FROM public.pengguna p
        JOIN public.audit a ON a.pusat_operasi_id = p.pusat_operasi_id
        JOIN public.dapatan d ON d.audit_id = a.id
        WHERE p.id = auth.uid()
          AND (storage.objects.name LIKE d.id::text || '/%' OR storage.objects.name LIKE '%/' || d.id::text || '/%')
      )
    )
  );

CREATE POLICY "Bukti audit - padam dengan akses admin/lead"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'bukti-audit' AND public.rol_semasa() IN ('admin', 'lead_auditor'));

CREATE POLICY "Bukti audit - kemaskini dengan akses admin/lead"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'bukti-audit' AND public.rol_semasa() IN ('admin', 'lead_auditor'));

CREATE INDEX IF NOT EXISTS idx_dapatan_audit_id ON public.dapatan(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_po_id ON public.audit(pusat_operasi_id);
CREATE INDEX IF NOT EXISTS idx_pengguna_po_id ON public.pengguna(pusat_operasi_id);
