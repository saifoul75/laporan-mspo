BEGIN;
GRANT EXECUTE ON FUNCTION public.adalah_lead_atau_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.boleh_akses_bukti(p_dapatan_id uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.set_dikemaskini_pada() TO anon;
COMMIT;
