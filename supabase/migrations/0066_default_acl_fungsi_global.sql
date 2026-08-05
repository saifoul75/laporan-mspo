-- ------------------------------------------------------------------
-- 0066_default_acl_fungsi_global.sql
--
-- Tujuan: Menghentikan lahirnya fungsi baharu dengan PUBLIC EXECUTE.
--
-- SATU pernyataan sahaja, TANPA "IN SCHEMA":
--
--   ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
--
-- =====================================================================
-- AMARAN PENTING: JANGAN tambah "IN SCHEMA public" pada baris ini.
-- =====================================================================
-- Diagnosis Z8 (2026-08-05) membuktikan secara empirikal bahawa
-- `... IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC` ialah
-- NO-OP SENYAP dalam pangkalan data ini:
--   * Entri per-skema `public` (defaclnamespace=2200) jenis 'f' pada
--     keadaan asal TIDAK mengandungi '=X/' (PUBLIC EXECUTE) langsung.
--     Ia hanya menyenaraikan postgres/authenticated/service_role.
--   * Akibatnya, REVOKE yang menyasarkan IN SCHEMA public tidak
--     mengubah entri tersebut dan TIDAK menghalang PUBLIC EXECUTE pada
--     fungsi baharu, kerana garis dasar terbina-dalam PostgreSQL
--     (PUBLIC EXECUTE pada semua fungsi baharu) hanya boleh diganti
--     oleh entri GLOBAL (defaclnamespace=0), bukan oleh entri per-skema.
--
-- Mekanisme yang berkesan ialah REVOKE pada peringkat GLOBAL:
--   * `ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC`
--     (tanpa IN SCHEMA) mencipta entri GLOBAL defaclnamespace=0 jenis 'f'
--     dengan acl `{postgres=X/postgres}`.
--   * Entri GLOBAL inilah yang MENGGANTIKAN garis dasar terbina-dalam,
--     supaya fungsi baharu di mana-mana skema tidak lagi menerima
--     PUBLIC EXECUTE secara automatik.
--
-- Jangan tambah "FROM anon" -- anon ialah ahli PUBLIC; REVOKE daripada
-- PUBLIC sudah memadahkan warisan, dan menambah FROM anon hanya
-- mengaburkan niat serta berlebihan.
--
-- Jangan sentuh entri skema `storage`. Bawaan Supabase pada skema
-- storage (defaclnamespace=16546) tidak diubah oleh pernyataan ini;
-- jika pengkhususan diperlukan kemudian, uruskannya dalam migrasi
-- berasingan dengan IN SCHEMA storage.
-- ------------------------------------------------------------------

BEGIN;

ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

COMMIT;
