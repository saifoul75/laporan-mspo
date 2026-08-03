-- Emergency rollback for 0057_revoke_anon_prefill_dapatan_audit.sql
-- Restore anon EXECUTE on prefill_dapatan_audit (EMERGENCY ONLY)

BEGIN;

GRANT EXECUTE ON FUNCTION public.prefill_dapatan_audit(uuid) TO anon;

COMMIT;