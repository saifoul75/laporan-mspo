-- ------------------------------------------------------------------
-- rollback_0065.sql
--
-- Memulihkan keadaan sebelum 0065_sequence_acl.sql.
-- Sengaja TIDAK memulihkan grant anon pada dapatkan_audit_qc/tulis_qc_log:
-- itu pembetulan keselamatan M1 dan tidak boleh dibatalkan.
-- ------------------------------------------------------------------

BEGIN;

-- Pulihkan default ACL supaya sequence baharu kembali diberi ALL kepada anon.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon;

-- Pulihkan grant ALL pada semua sequence sedia ada kepada anon.
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

COMMIT;
