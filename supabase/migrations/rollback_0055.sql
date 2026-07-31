-- Rollback kecemasan 0055: pulangkan grant anon SELECT + polisi pada 5 jadual
-- FAIL INI TIDAK DIJALANKAN — simpan sebagai emergency rollback sahaja.

GRANT SELECT ON public.projek_ref TO anon;
GRANT SELECT ON public.projek_pembangunan_ref TO anon;
GRANT SELECT ON public.matlamat_projek TO anon;
GRANT SELECT ON public.qc_log TO anon;
GRANT SELECT ON public.hasil_audit TO anon;

CREATE POLICY "Anon baca projek_ref public" ON public.projek_ref
  FOR SELECT TO anon USING (true);
CREATE POLICY "anon read projek_ref" ON public.projek_ref
  FOR SELECT TO anon USING (true);
CREATE POLICY "Anon baca projek_pembangunan_ref" ON public.projek_pembangunan_ref
  FOR SELECT TO anon USING (true);
CREATE POLICY "anon read matlamat_projek" ON public.matlamat_projek
  FOR SELECT TO anon USING (true);
CREATE POLICY "qc_log anon read" ON public.qc_log
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon read hasil_audit" ON public.hasil_audit
  FOR SELECT TO anon USING (true);
