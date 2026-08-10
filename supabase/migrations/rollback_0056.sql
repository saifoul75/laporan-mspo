-- Emergency rollback for 0056_rpc_qc_nightly.sql
-- Drop RPCs created by 0056

BEGIN;

DROP FUNCTION IF EXISTS public.dapatkan_audit_qc(timestamptz);
DROP FUNCTION IF EXISTS public.tulis_qc_log(integer, integer, integer, jsonb);

COMMIT;
