-- ============================================================
-- 0054_rpc_4_tables.sql
-- Tambah 4 RPC SECURITY DEFINER untuk gantikan .from() terus
-- pada table: projek_ref, projek_pembangunan_ref, matlamat_projek, qc_log
-- ============================================================

-- ------------------------------------------------------------
-- RPC: dapatkan_projek_ref
-- Digunakan oleh: senaraiProjek.ts, hasil.ts (fetchProjekRef + fetchProjekRefFull)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dapatkan_projek_ref(
  p_tahun_min integer DEFAULT NULL,
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 1000,
  p_urutkan text DEFAULT 'po'
)
  RETURNS TABLE(
    id bigint,
    tahun integer,
    wilayah text,
    po text,
    projek text,
    jenis text,
    luas_kawasan numeric,
    luas_berhasil numeric,
    bil_peserta integer,
    sasaran_tahunan numeric
  )
  LANGUAGE plpgsql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT p.id, p.tahun, p.wilayah, p.po, p.projek, p.jenis,
         p.luas_kawasan, p.luas_berhasil, p.bil_peserta, p.sasaran_tahunan
  FROM public.projek_ref p
  WHERE p.tahun >= p_tahun_min OR p_tahun_min IS NULL
  ORDER BY
    CASE WHEN p_urutkan = 'tahun' THEN p.tahun END ASC NULLS LAST,
    CASE WHEN p_urutkan <> 'tahun' THEN p.po END ASC NULLS LAST,
    CASE WHEN p_urutkan <> 'tahun' THEN p.projek END ASC NULLS LAST;
END;
$function$;

REVOKE ALL ON FUNCTION public.dapatkan_projek_ref(p_tahun_min integer, p_offset integer, p_limit integer, p_urutkan text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dapatkan_projek_ref(p_tahun_min integer, p_offset integer, p_limit integer, p_urutkan text) TO anon, authenticated;

-- ------------------------------------------------------------
-- RPC: dapatkan_projek_pembangunan_ref
-- Digunakan oleh: senaraiProjek.ts
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dapatkan_projek_pembangunan_ref(
  p_tahun_min integer DEFAULT NULL,
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 1000
)
  RETURNS TABLE(
    id bigint,
    tahun integer,
    wilayah text,
    po text,
    projek text,
    jenis text,
    luas_kawasan numeric,
    bil_peserta integer,
    status_pembangunan text,
    created_at timestamp with time zone
  )
  LANGUAGE plpgsql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT p.id, p.tahun, p.wilayah, p.po, p.projek, p.jenis,
         p.luas_kawasan, p.bil_peserta, p.status_pembangunan, p.created_at
  FROM public.projek_pembangunan_ref p
  WHERE p.tahun >= p_tahun_min OR p_tahun_min IS NULL
  ORDER BY p.po ASC, p.projek ASC
  LIMIT p_limit OFFSET p_offset;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.dapatkan_projek_pembangunan_ref(p_tahun_min integer, p_offset integer, p_limit integer) TO anon;
GRANT EXECUTE ON FUNCTION public.dapatkan_projek_pembangunan_ref(p_tahun_min integer, p_offset integer, p_limit integer) TO authenticated;

-- ------------------------------------------------------------
-- RPC: dapatkan_matlamat_projek
-- Digunakan oleh: hasil.ts (fetchMatlamatProjek)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dapatkan_matlamat_projek(
  p_jenis text DEFAULT NULL,
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 1000
)
  RETURNS TABLE(
    jenis text,
    bulan integer,
    peratus_agihan numeric
  )
  LANGUAGE plpgsql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT m.jenis, m.bulan, m.peratus_agihan
  FROM public.matlamat_projek m
  WHERE m.jenis = p_jenis OR p_jenis IS NULL
  ORDER BY m.jenis ASC, m.bulan ASC
  LIMIT p_limit OFFSET p_offset;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.dapatkan_matlamat_projek(p_jenis text, p_offset integer, p_limit integer) TO anon;
GRANT EXECUTE ON FUNCTION public.dapatkan_matlamat_projek(p_jenis text, p_offset integer, p_limit integer) TO authenticated;

-- ------------------------------------------------------------
-- RPC: dapatkan_qc_log
-- Digunakan oleh: qc/page.tsx
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dapatkan_qc_log(
  p_limit integer DEFAULT 30,
  p_offset integer DEFAULT 0
)
  RETURNS TABLE(
    id integer,
    tarikh timestamp with time zone,
    bil_baru integer,
    bil_update integer,
    bil_delete integer,
    detail jsonb
  )
  LANGUAGE plpgsql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT q.id, q.tarikh, q.bil_baru, q.bil_update, q.bil_delete, q.detail
  FROM public.qc_log q
  ORDER BY q.tarikh DESC
  LIMIT p_limit OFFSET p_offset;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.dapatkan_qc_log(p_limit integer, p_offset integer) TO anon;
GRANT EXECUTE ON FUNCTION public.dapatkan_qc_log(p_limit integer, p_offset integer) TO authenticated;
