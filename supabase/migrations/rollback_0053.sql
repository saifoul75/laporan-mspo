-- ============================================================
-- rollback_0053.sql
-- Rollback untuk 0053_revoke_anon_select_p3_batch.sql
-- ============================================================

-- Restore anon SELECT pada semua 17 table
GRANT SELECT ON TABLE public._archive_crosswalk_daerah_po TO anon;
GRANT SELECT ON TABLE public._archive_projek_master_2026 TO anon;
GRANT SELECT ON TABLE public.arkib_hasil_pra2023 TO anon;
GRANT SELECT ON TABLE public.aktiviti TO anon;
GRANT SELECT ON TABLE public.bank_jawapan TO anon;
GRANT SELECT ON TABLE public.bukti TO anon;
GRANT SELECT ON TABLE public.fail_kulit_keras TO anon;
GRANT SELECT ON TABLE public.item_semakan TO anon;
GRANT SELECT ON TABLE public.kehadiran_opening_meeting TO anon;
GRANT SELECT ON TABLE public.kriteria TO anon;
GRANT SELECT ON TABLE public.nc TO anon;
GRANT SELECT ON TABLE public.ofi TO anon;
GRANT SELECT ON TABLE public.po_wilayah TO anon;
GRANT SELECT ON TABLE public.prinsip TO anon;
GRANT SELECT ON TABLE public.projek_penyelia TO anon;
GRANT SELECT ON TABLE public.seksyen_fail TO anon;
GRANT SELECT ON TABLE public.sesi_audit TO anon;

-- Cipta semula 3 polisi orphan "kongsi awam"
CREATE POLICY "Baca item kongsi awam" ON public.item_semakan
  FOR SELECT TO anon
  USING (EXISTS ( SELECT 1 FROM laporan l WHERE ((l.kongsi_aktif = true) AND (l.token_kongsi IS NOT NULL))));

CREATE POLICY "Baca kriteria kongsi awam" ON public.kriteria
  FOR SELECT TO anon
  USING (EXISTS ( SELECT 1 FROM laporan l WHERE ((l.kongsi_aktif = true) AND (l.token_kongsi IS NOT NULL))));

CREATE POLICY "Baca prinsip kongsi awam" ON public.prinsip
  FOR SELECT TO anon
  USING (EXISTS ( SELECT 1 FROM laporan l WHERE ((l.kongsi_aktif = true) AND (l.token_kongsi IS NOT NULL))));
