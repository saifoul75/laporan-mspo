-- ============================================================
-- 0053_revoke_anon_select_p3_batch.sql
-- P3 batch: REVOKE anon SELECT dari 17 table + DROP 3 polisi
-- orphan "kongsi awam" pada item_semakan, kriteria, prinsip.
-- Disediakan ikut audit P3 (read-only).
-- ============================================================

BEGIN;

-- 17 table: revoke anon SELECT
REVOKE SELECT ON TABLE public._archive_crosswalk_daerah_po FROM anon;
REVOKE SELECT ON TABLE public._archive_projek_master_2026 FROM anon;
REVOKE SELECT ON TABLE public.arkib_hasil_pra2023 FROM anon;
REVOKE SELECT ON TABLE public.aktiviti FROM anon;
REVOKE SELECT ON TABLE public.bank_jawapan FROM anon;
REVOKE SELECT ON TABLE public.bukti FROM anon;
REVOKE SELECT ON TABLE public.fail_kulit_keras FROM anon;
REVOKE SELECT ON TABLE public.item_semakan FROM anon;
REVOKE SELECT ON TABLE public.kehadiran_opening_meeting FROM anon;
REVOKE SELECT ON TABLE public.kriteria FROM anon;
REVOKE SELECT ON TABLE public.nc FROM anon;
REVOKE SELECT ON TABLE public.ofi FROM anon;
REVOKE SELECT ON TABLE public.po_wilayah FROM anon;
REVOKE SELECT ON TABLE public.prinsip FROM anon;
REVOKE SELECT ON TABLE public.projek_penyelia FROM anon;
REVOKE SELECT ON TABLE public.seksyen_fail FROM anon;
REVOKE SELECT ON TABLE public.sesi_audit FROM anon;

-- 3 polisi orphan "kongsi awam" — qual tidak validate token (CWE-862)
DROP POLICY IF EXISTS "Baca item kongsi awam" ON public.item_semakan;
DROP POLICY IF EXISTS "Baca kriteria kongsi awam" ON public.kriteria;
DROP POLICY IF EXISTS "Baca prinsip kongsi awam" ON public.prinsip;

-- Verification A: grant anon SELECT selepas REVOKE (jangka 0)
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'anon' AND table_schema = 'public'
  AND table_name IN (
    '_archive_crosswalk_daerah_po','_archive_projek_master_2026','arkib_hasil_pra2023',
    'aktiviti','bank_jawapan','bukti','fail_kulit_keras','kehadiran_opening_meeting',
    'nc','ofi','seksyen_fail','sesi_audit','po_wilayah','projek_penyelia',
    'item_semakan','kriteria','prinsip'
  );

-- Verification B: polisi anon pada item_semakan/kriteria/prinsip selepas DROP (jangka 0)
SELECT schemaname, tablename, policyname, roles, qual
FROM pg_policies
WHERE tablename IN ('item_semakan','kriteria','prinsip')
  AND 'anon' = ANY(roles);

COMMIT;
