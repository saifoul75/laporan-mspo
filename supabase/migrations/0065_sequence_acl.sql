-- ------------------------------------------------------------------
-- 0065_sequence_acl.sql (COMMIT 0065 - VERSI DIPENDEKKAN)
--
-- Kandungan: HANYA langkah 3, 4, 5 daripada versi asal.
-- Langkah 1 dan 2 (REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC/anon)
-- SENGAJA dikecualikan dan diserahkan kepada 0066 selepas diagnosis
-- sebab sebenar PUBLIC EXECUTE pada fungsi baharu masih berlaku.
-- ------------------------------------------------------------------

BEGIN;

-- 3. Sequence baharu tidak lagi dilahirkan dengan grant anon.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon;

-- 4. Bersih 27 grant sequence yang sedia ada.
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- 5. Rekod rasmi pembetulan manual TUGAS M1 (sudah berkuat kuasa;
--    baris ini idempotent, menjadikan fail migrasi sumber kebenaran).
REVOKE EXECUTE ON FUNCTION public.dapatkan_audit_qc(timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.tulis_qc_log(integer, integer, integer, jsonb) FROM anon;

COMMIT;
