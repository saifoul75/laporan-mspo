-- ============================================================
-- 0056_rpc_qc_nightly.sql
-- Cipta RPC untuk gantikan .from() terus pada hasil_audit dan qc_log
-- dalam laluan cron /api/qc-nightly.
--
-- Kedua-dua RPC SECURITY DEFINER, search_path=public.
-- GRANT EXECUTE hanya kepada authenticated + service_role (TIADA anon).
-- Laluan ini kekal cron-protected (CRON_SECRET), bukan awam.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- RPC 1: dapatkan_audit_qc — baca hasil_audit 24 jam terakhir
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dapatkan_audit_qc(
  p_sejak timestamptz DEFAULT (now() - interval '24 hours')
)
RETURNS TABLE (
  id bigint,
  op text,
  changed_at timestamptz,
  tahun integer,
  bulan integer,
  nama_projek text,
  jenis text,
  pusat_operasi_final text,
  hasil_lama numeric,
  hasil_baru numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.op,
    a.changed_at,
    a.tahun,
    a.bulan,
    a.nama_projek,
    a.jenis,
    a.pusat_operasi_final,
    a.hasil_lama,
    a.hasil_baru
  FROM public.hasil_audit a
  WHERE a.changed_at >= p_sejak
  ORDER BY a.changed_at ASC;
$$;

REVOKE ALL ON FUNCTION public.dapatkan_audit_qc(timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dapatkan_audit_qc(timestamptz) TO authenticated, service_role;

-- ------------------------------------------------------------
-- RPC 2: tulis_qc_log — tulis ringkasan QC ke qc_log
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tulis_qc_log(
  p_bil_baru integer,
  p_bil_update integer,
  p_bil_delete integer,
  p_detail jsonb DEFAULT '[]'::jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id integer;
BEGIN
  INSERT INTO public.qc_log (bil_baru, bil_update, bil_delete, detail)
  VALUES (p_bil_baru, p_bil_update, p_bil_delete, p_detail)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.tulis_qc_log(integer, integer, integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tulis_qc_log(integer, integer, integer, jsonb) TO authenticated, service_role;

COMMIT;
