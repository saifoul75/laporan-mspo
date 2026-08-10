-- ============================================================
-- 0055_revoke_anon_select_4_rpc_dan_hasil_audit.sql
-- REVOKE anon SELECT pada 4 jadual yang telah dimigrasikan ke RPC
-- (projek_ref, projek_pembangunan_ref, matlamat_projek, qc_log)
-- + hasil_audit (tiada laluan anon; hanya service role qc-nightly)
-- + DROP polisi anon yang menjadi yatim selepas REVOKE
-- Corak: dry-run BEGIN...ROLLBACK dahulu, kemudian tukar COMMIT
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. REVOKE anon SELECT pada 5 jadual
-- ------------------------------------------------------------
REVOKE SELECT ON public.projek_ref FROM anon;
REVOKE SELECT ON public.projek_pembangunan_ref FROM anon;
REVOKE SELECT ON public.matlamat_projek FROM anon;
REVOKE SELECT ON public.qc_log FROM anon;
REVOKE SELECT ON public.hasil_audit FROM anon;

-- ------------------------------------------------------------
-- 2. DROP polisi anon (qual=true, tanpa syarat) pada 5 jadual
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Anon baca projek_ref public" ON public.projek_ref;
DROP POLICY IF EXISTS "anon read projek_ref" ON public.projek_ref;
DROP POLICY IF EXISTS "Anon baca projek_pembangunan_ref" ON public.projek_pembangunan_ref;
DROP POLICY IF EXISTS "anon read matlamat_projek" ON public.matlamat_projek;
DROP POLICY IF EXISTS "qc_log anon read" ON public.qc_log;
DROP POLICY IF EXISTS "anon read hasil_audit" ON public.hasil_audit;

-- ------------------------------------------------------------
-- 3. Checksum DALAM transaksi (bukan bukti persistence)
-- ------------------------------------------------------------
DO $$
DECLARE
  grant_count int;
  policy_count int;
BEGIN
  SELECT COUNT(*) INTO grant_count
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public'
    AND grantee = 'anon'
    AND privilege_type = 'SELECT'
    AND table_name IN ('projek_ref','projek_pembangunan_ref','matlamat_projek','qc_log','hasil_audit');

  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('projek_ref','projek_pembangunan_ref','matlamat_projek','qc_log','hasil_audit')
    AND 'anon' = ANY(roles);

  RAISE NOTICE 'Dalam transaksi: grant_anon_select=%, polisi_anon=%', grant_count, policy_count;
END $$;

-- COMMIT selepas dry-run disahkan (ROLLBACK berjaya, tiada ralat)
COMMIT;
