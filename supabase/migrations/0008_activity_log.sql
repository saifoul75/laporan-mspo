-- Migration 0008: Activity Log (audit trail penuh)
--
-- Rekod semua perubahan kritikal: cipta/update/padam pada audit, dapatan,
-- NC, OFI, pengguna, pusat operasi. Auto via Postgres trigger.

-- =====================================================
-- ENUM jenis aktiviti
-- =====================================================

create type jenis_aktiviti as enum (
  'cipta', 'kemaskini', 'padam', 'tukar_status',
  'pindaan_gred', 'soft_close', 'full_close', 'buka_semula',
  'log_masuk', 'log_keluar'
);

-- =====================================================
-- JADUAL: aktiviti
-- =====================================================

create table public.aktiviti (
  id uuid primary key default gen_random_uuid(),
  pengguna_id uuid references public.pengguna (id) on delete set null,
  pengguna_nama text,
  pengguna_rol text,
  jenis jenis_aktiviti not null,
  -- entiti yang dikenakan tindakan
  entiti text not null,            -- 'audit', 'dapatan', 'nc', 'ofi', dll
  entiti_id uuid,                   -- id rekod yang diubah
  -- konteks
  audit_id uuid references public.audit (id) on delete set null,
  rangkuman text,                   -- penerangan ringkas: "Tukar status klausa 4.1.1.1 dari Pending ke Y"
  data_lama jsonb,
  data_baru jsonb,
  -- metadata
  ip_address text,
  user_agent text,
  dicipta_pada timestamptz not null default now()
);

create index idx_aktiviti_audit on public.aktiviti (audit_id);
create index idx_aktiviti_pengguna on public.aktiviti (pengguna_id);
create index idx_aktiviti_entiti on public.aktiviti (entiti, entiti_id);
create index idx_aktiviti_dicipta on public.aktiviti (dicipta_pada desc);

alter table public.aktiviti enable row level security;

-- Auditor & admin boleh baca semua
create policy "Auth boleh baca aktiviti" on public.aktiviti for select
  using (public.rol_semasa() in ('admin', 'lead_auditor', 'auditor'));

-- Tiada update/delete - log adalah immutable
-- Insert dilakukan oleh trigger (security definer)

-- =====================================================
-- Helper: dapatkan info pengguna semasa
-- =====================================================

create or replace function public.info_pengguna_semasa()
returns table(id uuid, nama text, rol text)
language sql
stable
security definer
set search_path = public
as $$
  select id, nama_penuh, rol::text from public.pengguna where id = auth.uid();
$$;

-- =====================================================
-- Trigger handler: untuk dapatan
-- =====================================================

create or replace function public.log_aktiviti_dapatan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
  v_klausa text;
  v_jenis jenis_aktiviti;
  v_rangkuman text;
begin
  select * into v_user from public.info_pengguna_semasa();

  -- Ambil kod klausa untuk konteks
  if tg_op != 'DELETE' then
    select i.kod into v_klausa
    from public.item_semakan i
    where i.id = new.item_semakan_id;
  else
    select i.kod into v_klausa
    from public.item_semakan i
    where i.id = old.item_semakan_id;
  end if;

  if tg_op = 'INSERT' then
    v_jenis := 'cipta';
    v_rangkuman := 'Cipta dapatan klausa ' || v_klausa || ' dengan status ' || new.status;
    insert into public.aktiviti (
      pengguna_id, pengguna_nama, pengguna_rol, jenis,
      entiti, entiti_id, audit_id, rangkuman, data_baru
    ) values (
      v_user.id, v_user.nama, v_user.rol, v_jenis,
      'dapatan', new.id, new.audit_id, v_rangkuman,
      to_jsonb(new)
    );
  elsif tg_op = 'UPDATE' then
    -- Hanya log kalau ada perubahan bermakna
    if old.status != new.status then
      v_jenis := 'tukar_status';
      v_rangkuman := 'Tukar status klausa ' || v_klausa
        || ' dari ' || old.status || ' ke ' || new.status;
      if new.status = 'NC' and new.gred_nc is not null then
        v_rangkuman := v_rangkuman || ' (' || new.gred_nc || ')';
      end if;
      insert into public.aktiviti (
        pengguna_id, pengguna_nama, pengguna_rol, jenis,
        entiti, entiti_id, audit_id, rangkuman, data_lama, data_baru
      ) values (
        v_user.id, v_user.nama, v_user.rol, v_jenis,
        'dapatan', new.id, new.audit_id, v_rangkuman,
        jsonb_build_object('status', old.status, 'gred_nc', old.gred_nc),
        jsonb_build_object('status', new.status, 'gred_nc', new.gred_nc)
      );
    elsif old.gred_nc is distinct from new.gred_nc then
      v_jenis := 'pindaan_gred';
      v_rangkuman := 'Tukar gred NC klausa ' || v_klausa
        || ' dari ' || coalesce(old.gred_nc::text, '-') || ' ke ' || coalesce(new.gred_nc::text, '-');
      insert into public.aktiviti (
        pengguna_id, pengguna_nama, pengguna_rol, jenis,
        entiti, entiti_id, audit_id, rangkuman, data_lama, data_baru
      ) values (
        v_user.id, v_user.nama, v_user.rol, v_jenis,
        'dapatan', new.id, new.audit_id, v_rangkuman,
        jsonb_build_object('gred_nc', old.gred_nc),
        jsonb_build_object('gred_nc', new.gred_nc)
      );
    elsif coalesce(old.catatan, '') != coalesce(new.catatan, '') 
       or coalesce(old.cadangan_tindakan, '') != coalesce(new.cadangan_tindakan, '')
       or coalesce(old.pic, '') != coalesce(new.pic, '')
       or coalesce(old.tarikh_siap_target::text, '') != coalesce(new.tarikh_siap_target::text, '') then
      v_jenis := 'kemaskini';
      v_rangkuman := 'Kemaskini maklumat dapatan klausa ' || v_klausa;
      insert into public.aktiviti (
        pengguna_id, pengguna_nama, pengguna_rol, jenis,
        entiti, entiti_id, audit_id, rangkuman, data_lama, data_baru
      ) values (
        v_user.id, v_user.nama, v_user.rol, v_jenis,
        'dapatan', new.id, new.audit_id, v_rangkuman,
        jsonb_build_object('catatan', old.catatan, 'pic', old.pic, 'tarikh_siap', old.tarikh_siap_target),
        jsonb_build_object('catatan', new.catatan, 'pic', new.pic, 'tarikh_siap', new.tarikh_siap_target)
      );
    end if;
  elsif tg_op = 'DELETE' then
    insert into public.aktiviti (
      pengguna_id, pengguna_nama, pengguna_rol, jenis,
      entiti, entiti_id, audit_id, rangkuman, data_lama
    ) values (
      v_user.id, v_user.nama, v_user.rol, 'padam',
      'dapatan', old.id, old.audit_id,
      'Padam dapatan klausa ' || v_klausa,
      to_jsonb(old)
    );
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_aktiviti_dapatan on public.dapatan;
create trigger trg_aktiviti_dapatan
  after insert or update or delete on public.dapatan
  for each row execute function public.log_aktiviti_dapatan();

-- =====================================================
-- Trigger: untuk audit
-- =====================================================

create or replace function public.log_aktiviti_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
  v_jenis jenis_aktiviti;
  v_rangkuman text;
begin
  select * into v_user from public.info_pengguna_semasa();

  if tg_op = 'INSERT' then
    insert into public.aktiviti (
      pengguna_id, pengguna_nama, pengguna_rol, jenis,
      entiti, entiti_id, audit_id, rangkuman, data_baru
    ) values (
      v_user.id, v_user.nama, v_user.rol, 'cipta',
      'audit', new.id, new.id,
      'Cipta audit baru: ' || new.no_rujukan,
      to_jsonb(new)
    );
  elsif tg_op = 'UPDATE' and old.status != new.status then
    v_jenis := case
      when new.status = 'menunggu_semakan' then 'soft_close'::jenis_aktiviti
      when new.status = 'selesai' then 'full_close'::jenis_aktiviti
      when old.status in ('selesai', 'menunggu_semakan') and new.status = 'sedang_dijalankan' then 'buka_semula'::jenis_aktiviti
      else 'tukar_status'::jenis_aktiviti
    end;
    v_rangkuman := 'Tukar status audit ' || new.no_rujukan
      || ' dari ' || old.status || ' ke ' || new.status;
    insert into public.aktiviti (
      pengguna_id, pengguna_nama, pengguna_rol, jenis,
      entiti, entiti_id, audit_id, rangkuman, data_lama, data_baru
    ) values (
      v_user.id, v_user.nama, v_user.rol, v_jenis,
      'audit', new.id, new.id, v_rangkuman,
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status)
    );
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_aktiviti_audit on public.audit;
create trigger trg_aktiviti_audit
  after insert or update on public.audit
  for each row execute function public.log_aktiviti_audit();

-- =====================================================
-- Trigger: untuk NC dan OFI
-- =====================================================

create or replace function public.log_aktiviti_nc()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
begin
  select * into v_user from public.info_pengguna_semasa();
  if tg_op = 'INSERT' then
    insert into public.aktiviti (
      pengguna_id, pengguna_nama, pengguna_rol, jenis,
      entiti, entiti_id, audit_id, rangkuman, data_baru
    ) values (
      v_user.id, v_user.nama, v_user.rol, 'cipta',
      'nc', new.id, new.audit_id,
      'Cipta NC ' || new.no_nc || ' (' || new.gred || ') klausa ' || new.klausa_kod,
      jsonb_build_object('no_nc', new.no_nc, 'gred', new.gred, 'klausa', new.klausa_kod)
    );
  elsif tg_op = 'UPDATE' and old.status != new.status then
    insert into public.aktiviti (
      pengguna_id, pengguna_nama, pengguna_rol, jenis,
      entiti, entiti_id, audit_id, rangkuman, data_lama, data_baru
    ) values (
      v_user.id, v_user.nama, v_user.rol, 'tukar_status',
      'nc', new.id, new.audit_id,
      'Tukar status ' || new.no_nc || ' dari ' || old.status || ' ke ' || new.status,
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status)
    );
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_aktiviti_nc on public.nc;
create trigger trg_aktiviti_nc
  after insert or update on public.nc
  for each row execute function public.log_aktiviti_nc();

create or replace function public.log_aktiviti_ofi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
begin
  select * into v_user from public.info_pengguna_semasa();
  if tg_op = 'INSERT' then
    insert into public.aktiviti (
      pengguna_id, pengguna_nama, pengguna_rol, jenis,
      entiti, entiti_id, audit_id, rangkuman, data_baru
    ) values (
      v_user.id, v_user.nama, v_user.rol, 'cipta',
      'ofi', new.id, new.audit_id,
      'Cipta OFI ' || new.no_ofi || ' klausa ' || new.klausa_kod,
      jsonb_build_object('no_ofi', new.no_ofi, 'klausa', new.klausa_kod)
    );
  elsif tg_op = 'UPDATE' and old.status != new.status then
    insert into public.aktiviti (
      pengguna_id, pengguna_nama, pengguna_rol, jenis,
      entiti, entiti_id, audit_id, rangkuman, data_lama, data_baru
    ) values (
      v_user.id, v_user.nama, v_user.rol, 'tukar_status',
      'ofi', new.id, new.audit_id,
      'Tukar status ' || new.no_ofi || ' dari ' || old.status || ' ke ' || new.status,
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status)
    );
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_aktiviti_ofi on public.ofi;
create trigger trg_aktiviti_ofi
  after insert or update on public.ofi
  for each row execute function public.log_aktiviti_ofi();

-- =====================================================
-- Trigger: untuk perubahan rol pengguna
-- =====================================================

create or replace function public.log_aktiviti_pengguna()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
begin
  select * into v_user from public.info_pengguna_semasa();
  if tg_op = 'UPDATE' and old.rol != new.rol then
    insert into public.aktiviti (
      pengguna_id, pengguna_nama, pengguna_rol, jenis,
      entiti, entiti_id, rangkuman, data_lama, data_baru
    ) values (
      v_user.id, v_user.nama, v_user.rol, 'kemaskini',
      'pengguna', new.id,
      'Tukar rol ' || new.email || ' dari ' || old.rol || ' ke ' || new.rol,
      jsonb_build_object('rol', old.rol),
      jsonb_build_object('rol', new.rol)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_aktiviti_pengguna on public.pengguna;
create trigger trg_aktiviti_pengguna
  after update on public.pengguna
  for each row execute function public.log_aktiviti_pengguna();
