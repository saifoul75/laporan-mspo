BEGIN;
REVOKE EXECUTE ON FUNCTION public.adalah_ahli_audit(p_audit_id uuid) FROM anon;
SELECT p.proname, p.proacl
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'adalah_ahli_audit';
COMMIT;   -- dry-run disemak, anon hilang daripada adalah_ahli_audit
