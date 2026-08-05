BEGIN;

REVOKE EXECUTE ON FUNCTION public.adalah_lead_atau_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.boleh_akses_bukti(p_dapatan_id uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_dikemaskini_pada() FROM anon;

-- checksum dry-run (BUKAN bukti persistence)
SELECT p.proname, p.proacl
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('adalah_lead_atau_admin','boleh_akses_bukti','set_dikemaskini_pada')
ORDER BY p.proname;

COMMIT;   -- dry-run disemak, anon hilang daripada ketiga-tiga fungsi
