-- Migration 0031b: P0 EXCEPTION WIDENING SEMENTARA
-- Sebab: production frontend (deployment lama, master, sebelum whitelist-select fix)
-- masih guna select("*") / kolum penuh pada hasil_bulanan_src & hasil_bulanan.
-- Column-scoped grant (0031) menyebabkan dashboard-hasil-nolr.vercel.app terus error
-- kerana kod production belum update untuk guna whitelist kolum.
-- TINDAKAN INI: widen balik GRANT SELECT penuh table untuk anon SEMENTARA
-- supaya dashboard awam berfungsi semula segera.
-- WAJIB: Ketatkan balik ke column-scoped (0031) sebaik sahaja kod front-end
-- whitelist disahkan deploy di production (rujuk tiket hasil-nolr-401).
-- Tarikh widen: 2026-07-15. Owner: @saifoul. Review bersama tarikh 0032: 2026-08-15.
-- Dijalankan terus di remote (Supabase MCP apply_migration) pada 2026-07-15;
-- fail ini dicipta selepas fakta untuk selaraskan sejarah migration tempatan
-- dengan remote (rujuk docs/audit/hasil-nolr-401-incident-2026-07-15.md).

GRANT SELECT ON public.hasil_bulanan_src TO anon;
GRANT SELECT ON public.hasil_bulanan TO anon;

DO $$
BEGIN
  RAISE NOTICE 'Migration 0031b: anon GRANT SELECT penuh table hasil_bulanan_src & hasil_bulanan dipulihkan SEMENTARA untuk elak downtime dashboard. WAJIB ketatkan balik ke column-scoped selepas kod front-end whitelist disahkan live.';
END $$;
