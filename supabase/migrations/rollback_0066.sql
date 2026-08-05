-- ------------------------------------------------------------------
-- rollback_0066.sql
--
-- Memulihkan keadaan sebelum 0066_default_acl_fungsi_global.sql:
-- kembalikan PUBLIC EXECUTE sebagai default untuk fungsi baharu
-- pada peringkat GLOBAL.
--
-- Ini hanya memulihkan entri GLOBAL defaclnamespace=0 jenis 'f'
-- yang dicipta oleh 0066. Ia TIDAK menyentuh entri per-skema.
-- ------------------------------------------------------------------

BEGIN;

ALTER DEFAULT PRIVILEGES GRANT EXECUTE ON FUNCTIONS TO PUBLIC;

COMMIT;
