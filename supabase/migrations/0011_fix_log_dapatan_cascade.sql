-- ============================================================
-- Migration 0011: Fix log_dapatan_aktiviti FK handling on cascade delete
-- ============================================================
-- Bug: Bila audit dipadam, CASCADE DELETE pada dapatan jalan SELEPAS
-- audit dah tiada. Trigger BEFORE DELETE pada dapatan cuba INSERT log
-- dengan OLD.audit_id yang dah tak wujud — FK violation.
--
-- Error:
--   ERROR: 23503: insert or update on table "aktiviti" violates
--   foreign key constraint "aktiviti_audit_id_fkey"
--   CONTEXT: SQL statement "INSERT INTO aktiviti..."
--   PL/pgSQL function log_dapatan_aktiviti() line 25
--
-- Fix: Wrap INSERT dalam EXCEPTION handler — kalau FK violation
-- (audit dah tiada sebab cascade), insert dengan audit_id = NULL.
-- FK aktiviti.audit_id ialah ON DELETE SET NULL, jadi NULL valid.
-- ============================================================

create or replace function public.log_dapatan_aktiviti()
returns trigger
language plpgsql
security definer
as $function$
declare
  v_jenis text;
  v_rangkuman text;
  v_audit_id uuid;
begin
  v_audit_id := case when tg_op = 'DELETE' then old.audit_id else new.audit_id end;

  if tg_op = 'INSERT' then
    v_jenis := 'cipta';
    v_rangkuman := 'Dapatan baru: Status ' || new.status;
  elsif tg_op = 'UPDATE' then
    if old.status <> new.status then
      v_jenis := 'kemaskini';
      v_rangkuman := 'Status dapatan ditukar: ' || old.status || ' → ' || new.status;
    else
      v_jenis := 'kemaskini';
      v_rangkuman := 'Dapatan dikemaskini (Status: ' || new.status || ')';
    end if;
  elsif tg_op = 'DELETE' then
    v_jenis := 'padam';
    v_rangkuman := 'Dapatan dipadam';
  end if;

  -- Cuba insert dengan audit_id sebenar; kalau FK fail (cascade delete
  -- dari audit), fallback insert dengan audit_id = NULL.
  begin
    insert into public.aktiviti (audit_id, jenis, entiti, rangkuman)
    values (v_audit_id, v_jenis, 'dapatan', v_rangkuman);
  exception
    when foreign_key_violation then
      insert into public.aktiviti (audit_id, jenis, entiti, rangkuman)
      values (null, v_jenis, 'dapatan', v_rangkuman || ' (audit dipadam)');
  end;

  return case when tg_op = 'DELETE' then old else new end;
end;
$function$;

-- Sama untuk log_audit_aktiviti — defensive walaupun BEFORE DELETE
-- pada audit table sepatutnya tak hit FK violation. Tambah safety net.

create or replace function public.log_audit_aktiviti()
returns trigger
language plpgsql
security definer
as $function$
declare
  v_jenis text;
  v_rangkuman text;
begin
  if tg_op = 'INSERT' then
    v_jenis := 'cipta';
    v_rangkuman := 'Audit ' || new.no_rujukan || ' dicipta (Status: ' || new.status || ')';
  elsif tg_op = 'UPDATE' then
    if old.status <> new.status then
      v_jenis := 'tukar_status';
      v_rangkuman := 'Status ' || new.no_rujukan || ' ditukar: ' || old.status || ' → ' || new.status;
    else
      v_jenis := 'kemaskini';
      v_rangkuman := 'Audit ' || new.no_rujukan || ' dikemaskini';
    end if;
  elsif tg_op = 'DELETE' then
    v_jenis := 'padam';
    v_rangkuman := 'Audit ' || old.no_rujukan || ' dipadam';
  end if;

  begin
    insert into public.aktiviti (audit_id, jenis, entiti, rangkuman)
    values (
      case when tg_op = 'DELETE' then old.id else new.id end,
      v_jenis,
      'audit',
      v_rangkuman
    );
  exception
    when foreign_key_violation then
      insert into public.aktiviti (audit_id, jenis, entiti, rangkuman)
      values (null, v_jenis, 'audit', v_rangkuman);
  end;

  return case when tg_op = 'DELETE' then old else new end;
end;
$function$;
