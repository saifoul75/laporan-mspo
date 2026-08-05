BEGIN;

-- Pemulihan: pulihkan default ACL role postgres (beri ALL kepada anon)
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;

-- Pemulihan baki MAINTAIN anon pada objek (seperti keadaan asal)
GRANT MAINTAIN ON TABLE public._archive_crosswalk_daerah_po TO anon;
GRANT MAINTAIN ON TABLE public._archive_projek_master_2026 TO anon;
GRANT MAINTAIN ON TABLE public.aktiviti TO anon;
GRANT MAINTAIN ON TABLE public.arkib_hasil_pra2023 TO anon;
GRANT MAINTAIN ON TABLE public.audit TO anon;
GRANT MAINTAIN ON TABLE public.bank_jawapan TO anon;
GRANT MAINTAIN ON TABLE public.bukti TO anon;
GRANT MAINTAIN ON TABLE public.dapatan TO anon;
GRANT MAINTAIN ON TABLE public.fail_kulit_keras TO anon;
GRANT MAINTAIN ON TABLE public.hasil_audit TO anon;
GRANT MAINTAIN ON TABLE public.item_semakan TO anon;
GRANT MAINTAIN ON TABLE public.kehadiran_opening_meeting TO anon;
GRANT MAINTAIN ON TABLE public.kriteria TO anon;
GRANT MAINTAIN ON TABLE public.laporan TO anon;
GRANT MAINTAIN ON TABLE public.matlamat_projek TO anon;
GRANT MAINTAIN ON TABLE public.nc TO anon;
GRANT MAINTAIN ON TABLE public.ofi TO anon;
GRANT MAINTAIN ON TABLE public.po_wilayah TO anon;
GRANT MAINTAIN ON TABLE public.prinsip TO anon;
GRANT MAINTAIN ON TABLE public.projek_pembangunan_ref TO anon;
GRANT MAINTAIN ON TABLE public.qc_log TO anon;
GRANT MAINTAIN ON TABLE public.seksyen_fail TO anon;
GRANT MAINTAIN ON TABLE public.sesi_audit TO anon;
GRANT MAINTAIN ON public.v_bulanan TO anon;
GRANT MAINTAIN ON public.v_harian TO anon;
GRANT MAINTAIN ON public.v_wilayah TO anon;

COMMIT;
