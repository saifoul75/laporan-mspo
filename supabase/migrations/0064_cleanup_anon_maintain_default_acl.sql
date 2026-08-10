BEGIN;

-- ------------------------------------------------------------------
-- 0064: (1) baiki default ACL untuk role postgres (buang anon), (2) bersih
--       baki MAINTAIN anon pada objek sedia ada.
-- Nota: default ACL milik supabase_admin (oid 16496/16495/16497) TIDAK boleh
--       diubah oleh postgres (bukan superuser, tidak boleh SET ROLE
--       supabase_admin). Ia dilaporkan sebagai had berasingan.
-- ------------------------------------------------------------------

-- (1) Baiki default privileges role postgres pada skema public
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;

-- (2) Bersih baki MAINTAIN anon pada objek sedia ada (23 jadual + 3 view)
REVOKE ALL ON TABLE public._archive_crosswalk_daerah_po FROM anon;
REVOKE ALL ON TABLE public._archive_projek_master_2026 FROM anon;
REVOKE ALL ON TABLE public.aktiviti FROM anon;
REVOKE ALL ON TABLE public.arkib_hasil_pra2023 FROM anon;
REVOKE ALL ON TABLE public.audit FROM anon;
REVOKE ALL ON TABLE public.bank_jawapan FROM anon;
REVOKE ALL ON TABLE public.bukti FROM anon;
REVOKE ALL ON TABLE public.dapatan FROM anon;
REVOKE ALL ON TABLE public.fail_kulit_keras FROM anon;
REVOKE ALL ON TABLE public.hasil_audit FROM anon;
REVOKE ALL ON TABLE public.item_semakan FROM anon;
REVOKE ALL ON TABLE public.kehadiran_opening_meeting FROM anon;
REVOKE ALL ON TABLE public.kriteria FROM anon;
REVOKE ALL ON TABLE public.laporan FROM anon;
REVOKE ALL ON TABLE public.matlamat_projek FROM anon;
REVOKE ALL ON TABLE public.nc FROM anon;
REVOKE ALL ON TABLE public.ofi FROM anon;
REVOKE ALL ON TABLE public.po_wilayah FROM anon;
REVOKE ALL ON TABLE public.prinsip FROM anon;
REVOKE ALL ON TABLE public.projek_pembangunan_ref FROM anon;
REVOKE ALL ON TABLE public.qc_log FROM anon;
REVOKE ALL ON TABLE public.seksyen_fail FROM anon;
REVOKE ALL ON TABLE public.sesi_audit FROM anon;
REVOKE ALL ON public.v_bulanan FROM anon;
REVOKE ALL ON public.v_harian FROM anon;
REVOKE ALL ON public.v_wilayah FROM anon;

-- checksum dry-run (BUKAN bukti persistence)
SELECT c.relkind, c.relname,
       EXISTS (SELECT 1 FROM aclexplode(c.relacl) a
               JOIN pg_roles r ON r.oid = a.grantee
               WHERE r.rolname = 'anon') AS masih_ada_anon
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('r','v','m','p','f')
  AND c.relname IN ('_archive_crosswalk_daerah_po','_archive_projek_master_2026','aktiviti',
                    'arkib_hasil_pra2023','audit','bank_jawapan','bukti','dapatan',
                    'fail_kulit_keras','hasil_audit','item_semakan','kehadiran_opening_meeting',
                    'kriteria','laporan','matlamat_projek','nc','ofi','po_wilayah','prinsip',
                    'projek_pembangunan_ref','qc_log','seksyen_fail','sesi_audit',
                    'v_bulanan','v_harian','v_wilayah')
ORDER BY c.relkind, c.relname;

-- ujian ramalan: objek baharu TIDAK boleh lahir dengan anon
CREATE TEMP TABLE ujian_default_acl_0064 (id int) ON COMMIT DROP;
SELECT (NOT EXISTS (SELECT 1 FROM aclexplode((SELECT relacl FROM pg_class WHERE relname='ujian_default_acl_0064')) a
                    JOIN pg_roles r ON r.oid = a.grantee
                    WHERE r.rolname = 'anon')) AS objek_baharu_tanpa_anon;

COMMIT;
