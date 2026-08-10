-- ============================================================
-- 0057_revoke_anon_prefill_dapatan_audit.sql
-- REVOKE anon EXECUTE pada prefill_dapatan_audit (P0).
-- Fungsi ini SECURITY DEFINER dan menulis ke jadual dapatan.
-- Tiada laluan kod produksi yang memanggilnya sebagai anon;
-- ia dipanggil secara automatik melalui trigger AFTER INSERT
-- pada jadual audit (migrasi 0004).
-- ============================================================

BEGIN;

REVOKE ALL ON FUNCTION public.prefill_dapatan_audit(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prefill_dapatan_audit(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prefill_dapatan_audit(uuid) FROM anon;

COMMIT;