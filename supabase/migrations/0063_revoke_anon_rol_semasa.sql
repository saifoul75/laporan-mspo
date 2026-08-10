BEGIN;

REVOKE EXECUTE ON FUNCTION public.rol_semasa() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rol_semasa() FROM PUBLIC;

-- checksum dry-run (BUKAN bukti persistence)
SELECT has_function_privilege('anon','public.rol_semasa()','EXECUTE') AS anon,
       has_function_privilege('authenticated','public.rol_semasa()','EXECUTE') AS auth,
       has_function_privilege('service_role','public.rol_semasa()','EXECUTE') AS svc;

COMMIT;
