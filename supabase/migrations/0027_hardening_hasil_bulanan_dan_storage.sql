-- Migration 0027: Hardening hasil_bulanan + storage bukti-audit
-- 1. hasil_bulanan: kekalkan anon read tapi documented — data hasil agregat
--    dianggap semipublic untuk dashboard internal (sama pattern dengan v_wilayah)
--    Namun tambah komen bahawa ia disengajakan dan hadkan kepada authenticated sahaja
--    jika tidak perlu anon. Untuk MSPO: hasil_bulanan memang perlu public untuk /share?
--    Semak: /share tidak guna hasil_bulanan. Jadi kita boleh hadkan untuk authenticated
--    sahaja sebagai hardening. Jika benar-benar perlu anon untuk dashboard hasil,
--    gunakan view terhad.
--
--    Keputusan: TUKAR polisi anon USING(true) → authenticated USING(true) sahaja
--    untuk hasil_bulanan. Anon masih boleh akses via v_wilayah / v_hq yang agregat sahaja.
--
-- 2. Storage bucket bukti-audit: perketat RLS dengan check auth.uid() dan path prefix
--    berdasarkan dapatan → audit membership, bukan sekadar auth.uid() IS NOT NULL

-- ============================================================
-- 1. HARDENING hasil_bulanan
-- ============================================================

-- Drop anon policies yang longgar
DROP POLICY IF EXISTS "Anon dapat baca" ON public.hasil_bulanan;
DROP POLICY IF EXISTS "Public boleh baca" ON public.hasil_bulanan;
DROP POLICY IF EXISTS "baca_awam_hasil" ON public.hasil_bulanan;
DROP POLICY IF EXISTS "Admin boleh semua" ON public.hasil_bulanan;
DROP POLICY IF EXISTS "Pengguna boleh baca" ON public.hasil_bulanan;

-- Cipta semula dengan hardened logic:
-- - authenticated sahaja boleh baca (semua role)
-- - admin boleh semua (all)
-- - anon TIDAK boleh (kecuali via view agregat v_wilayah/v_hq yang sudah GRANT SELECT)

CREATE POLICY "Pengguna boleh baca hasil bulanan"
  ON public.hasil_bulanan
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin boleh semua hasil bulanan"
  ON public.hasil_bulanan
  FOR ALL
  TO authenticated
  USING (
    public.rol_semasa() = 'admin'
  );

-- Jika benar-benar perlu anon untuk dashboard umum, gunakan view sahaja
-- v_wilayah, v_hq, v_ringkasan_po sudah ada GRANT SELECT TO anon, authenticated

-- ============================================================
-- 2. HARDENING hasil_bulanan_src (long format)
--    Table ini juga ada polisi baca_awam_hasil longgar
-- ============================================================

DROP POLICY IF EXISTS "baca_awam_hasil" ON public.hasil_bulanan_src;

-- Harden: authenticated sahaja, bukan anon
CREATE POLICY "baca_hasil_src_authenticated"
  ON public.hasil_bulanan_src
  FOR SELECT
  TO authenticated
  USING (true);

-- Admin all
DROP POLICY IF EXISTS "Tulis hasil_src admin" ON public.hasil_bulanan_src;
CREATE POLICY "Tulis hasil_src admin"
  ON public.hasil_bulanan_src
  FOR ALL
  TO authenticated
  USING (public.rol_semasa() = ANY (ARRAY['admin'::rol_pengguna, 'lead_auditor'::rol_pengguna]))
  WITH CHECK (public.rol_semasa() = ANY (ARRAY['admin'::rol_pengguna, 'lead_auditor'::rol_pengguna]));

-- ============================================================
-- 3. STORAGE: bukti-audit bucket hardening
--    Bucket storage.objects RLS perlukan kebijakan yang ketat
-- ============================================================

-- Pastikan bucket wujud (idempotent jika migration rerun)
INSERT INTO storage.buckets (id, name, public)
VALUES ('bukti-audit', 'bukti-audit', false)
ON CONFLICT (id) DO NOTHING;

-- Drop polisi lama yang longgar (auth.uid() IS NOT NULL)
DROP POLICY IF EXISTS "Auditor muat naik bukti" ON storage.objects;
DROP POLICY IF EXISTS "Auditor baca bukti" ON storage.objects;
DROP POLICY IF EXISTS "Auth boleh baca bukti" ON storage.objects;
DROP POLICY IF EXISTS "Auth boleh muat naik bukti" ON storage.objects;
DROP POLICY IF EXISTS "Bukti audit - baca" ON storage.objects;
DROP POLICY IF EXISTS "Bukti audit - muat naik" ON storage.objects;
DROP POLICY IF EXISTS "Bukti audit - padam" ON storage.objects;
DROP POLICY IF EXISTS "Bukti audit - kemaskini" ON storage.objects;

-- Helper function: check sama ada pengguna mempunyai akses kepada audit melalui dapatan
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

  -- admin / lead_auditor / auditor boleh akses semua
  IF public.rol_semasa() IN ('admin', 'lead_auditor', 'auditor') THEN
    RETURN true;
  END IF;

  -- po_user hanya kalau audit adalah milik PO dia
  RETURN EXISTS (
    SELECT 1
    FROM public.audit a
    JOIN public.pengguna p ON p.id = auth.uid()
    WHERE a.id = v_audit_id
      AND p.pusat_operasi_id = a.pusat_operasi_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.boleh_akses_bukti(uuid) TO authenticated;

-- Storage RLS: baca bukti — hanya kalau boleh akses audit berkaitan
-- Konvensyen path: bukti/{dapatan_id}/{filename} atau {dapatan_id}/{filename}
-- Kita check dengan extract dapatan_id dari path

CREATE POLICY "Bukti audit - baca dengan akses audit"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'bukti-audit'
    AND (
      public.rol_semasa() IN ('admin', 'lead_auditor', 'auditor')
      OR EXISTS (
        SELECT 1
        FROM public.pengguna p
        JOIN public.audit a ON a.pusat_operasi_id = p.pusat_operasi_id
        JOIN public.dapatan d ON d.audit_id = a.id
        WHERE p.id = auth.uid()
          AND (
            storage.objects.name LIKE d.id::text || '/%'
            OR storage.objects.name LIKE '%/' || d.id::text || '/%'
            OR storage.objects.name = d.id::text
          )
      )
    )
  );

CREATE POLICY "Bukti audit - muat naik dengan akses audit"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'bukti-audit'
    AND (
      public.rol_semasa() IN ('admin', 'lead_auditor', 'auditor')
      OR EXISTS (
        SELECT 1
        FROM public.pengguna p
        JOIN public.audit a ON a.pusat_operasi_id = p.pusat_operasi_id
        JOIN public.dapatan d ON d.audit_id = a.id
        WHERE p.id = auth.uid()
          AND (
            storage.objects.name LIKE d.id::text || '/%'
            OR storage.objects.name LIKE '%/' || d.id::text || '/%'
          )
      )
    )
  );

CREATE POLICY "Bukti audit - padam dengan akses admin/lead"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'bukti-audit'
    AND public.rol_semasa() IN ('admin', 'lead_auditor')
  );

CREATE POLICY "Bukti audit - kemaskini dengan akses admin/lead"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'bukti-audit'
    AND public.rol_semasa() IN ('admin', 'lead_auditor')
  );

-- ============================================================
-- 4. Tambah index untuk prestasi RLS fungsi
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_dapatan_audit_id ON public.dapatan(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_po_id ON public.audit(pusat_operasi_id);
CREATE INDEX IF NOT EXISTS idx_pengguna_po_id ON public.pengguna(pusat_operasi_id);
