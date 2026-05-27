-- Reset MSPO Audit Schema
-- Gunakan SEKALI kalau migration 0001 / 0002 dah partial run.
-- HATI: Akan padam SEMUA data dalam table-table MSPO.
--
-- NOTA: Storage bucket dan storage policies TIDAK diuruskan di sini.
-- Kalau perlu padam bucket 'bukti-audit', buang manual dari Supabase Dashboard:
--   Storage -> Buckets -> bukti-audit -> ... -> Delete bucket
-- Storage policies pun boleh dipadam manual di Storage -> Policies.

-- Drop tables (cascade akan drop dependents)
drop table if exists public.laporan cascade;
drop table if exists public.bukti cascade;
drop table if exists public.ofi cascade;
drop table if exists public.nc cascade;
drop table if exists public.dapatan cascade;
drop table if exists public.audit cascade;
drop table if exists public.item_semakan cascade;
drop table if exists public.seksyen_fail cascade;
drop table if exists public.fail_kulit_keras cascade;
drop table if exists public.kriteria cascade;
drop table if exists public.prinsip cascade;
drop table if exists public.pengguna cascade;
drop table if exists public.pusat_operasi cascade;

-- Drop functions
drop function if exists public.set_dikemaskini_pada cascade;
drop function if exists public.handle_pengguna_baru cascade;
drop function if exists public.rol_semasa cascade;

-- Drop trigger pada auth.users (perlu kalau migration 0001 dah cipta)
-- Jika error "must be owner", abaikan baris ni dan padam trigger via Dashboard
drop trigger if exists trg_auth_user_created on auth.users;

-- Drop enum types
drop type if exists status_ofi cascade;
drop type if exists status_nc cascade;
drop type if exists jenis_bukti cascade;
drop type if exists jenis_klausa cascade;
drop type if exists gred_nc cascade;
drop type if exists status_dapatan cascade;
drop type if exists jenis_audit cascade;
drop type if exists status_audit cascade;
drop type if exists rol_pengguna cascade;
