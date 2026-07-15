-- Migration 0033: Least-privilege cleanup — dapatan
-- Dijumpai semasa verifikasi migration 0031/0031b (2026-07-15): anon ada GRANT
-- penuh (INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER) pada public.dapatan
-- walaupun RLS sudah block operasi tersebut (tiada policy anon untuk
-- INSERT/UPDATE/DELETE). Bukan exploit aktif (RLS default-deny menghalang),
-- tapi over-grant tidak selari prinsip least-privilege.
--
-- Kekalkan SELECT sahaja untuk anon (diperlukan untuk fitur /share kongsi awam
-- via policy "Baca dapatan untuk laporan kongsi awam" USING (audit_ada_kongsi(audit_id))).
--
-- ISU BERKAITAN (belum ditangani dalam migration ini, rujuk log insiden):
-- audit_ada_kongsi(audit_id) semak "adakah audit ini ada kongsi aktif" sahaja,
-- tidak validate token eksplisit seperti dapatkan_laporan_dengan_token() untuk
-- table laporan (RPC-only, di-harden dalam 0026/0029). Ini bermakna raw query
-- terus (.from("dapatan").select()) boleh dapat data dari MANA-MANA audit yang
-- sedang dikongsi, tanpa perlu tahu token sebenar. Cadangan masa depan: pindah
-- SELECT anon pada dapatan ke RPC-gated pattern yang sama seperti laporan.

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.dapatan FROM anon;

DO $$
BEGIN
  RAISE NOTICE 'Migration 0033: anon GRANT pada dapatan dikurangkan ke SELECT sahaja (least-privilege). RLS SELECT policy audit_ada_kongsi() kekal tidak diubah.';
END $$;
