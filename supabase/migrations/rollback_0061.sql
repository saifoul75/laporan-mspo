BEGIN;
GRANT EXECUTE ON FUNCTION public.adalah_ahli_audit(p_audit_id uuid) TO anon;
COMMIT;
