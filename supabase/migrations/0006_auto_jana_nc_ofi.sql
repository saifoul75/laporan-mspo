-- Migration 0006: Auto-jana NC dan OFI dari dapatan
--
-- Bila auditor pilih status NC pada satu item, sistem auto-cipta rekod NC.
-- Bila pilih OFI, sistem auto-cipta rekod OFI.
-- No rujukan dijana ikut tahun audit: NC-001-2026, OFI-001-2026, dll.

-- =====================================================
-- Function: jana no rujukan unik untuk NC/OFI per tahun
-- =====================================================

create or replace function public.jana_no_rujukan(p_jenis text, p_tahun int)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_prefix text;
begin
  if p_jenis = 'NC' then
    v_prefix := 'NC';
    select count(*) + 1 into v_count
    from public.nc
    where extract(year from dicipta_pada) = p_tahun;
  elsif p_jenis = 'OFI' then
    v_prefix := 'OFI';
    select count(*) + 1 into v_count
    from public.ofi
    where extract(year from dicipta_pada) = p_tahun;
  else
    raise exception 'Jenis tidak sah: %', p_jenis;
  end if;

  return v_prefix || '-' || lpad(v_count::text, 3, '0') || '-' || p_tahun;
end;
$$;

-- =====================================================
-- Function: handle perubahan dapatan
-- =====================================================

create or replace function public.handle_dapatan_perubahan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_prinsip_kod text;
  v_tahun int;
  v_no_baru text;
begin
  -- Skip kalau status sama dengan sebelumnya
  if tg_op = 'UPDATE' and old.status = new.status and coalesce(old.gred_nc, 'minor') = coalesce(new.gred_nc, 'minor') then
    return new;
  end if;

  -- Ambil maklumat klausa & prinsip
  select i.kod, i.fail_rujukan, p.kod as prinsip_kod
  into v_item
  from public.item_semakan i
  join public.kriteria k on k.id = i.kriteria_id
  join public.prinsip p on p.id = k.prinsip_id
  where i.id = new.item_semakan_id;

  v_prinsip_kod := v_item.prinsip_kod;
  v_tahun := extract(year from now());

  -- =====================================================
  -- KENDALI NC
  -- =====================================================
  if new.status = 'NC' then
    -- Update sedia ada atau cipta baru
    if exists (select 1 from public.nc where dapatan_id = new.id) then
      update public.nc
      set
        klausa_kod = v_item.kod,
        prinsip_kod = v_prinsip_kod,
        fail_rujukan = v_item.fail_rujukan,
        dapatan = coalesce(new.catatan, '(Catatan belum diisi)'),
        bukti = new.bukti_audit,
        punca_akar = new.punca_akar,
        tindakan_pembetulan = new.cadangan_tindakan,
        pic = new.pic,
        tarikh_siap = new.tarikh_siap_target,
        gred = coalesce(new.gred_nc, 'minor')
      where dapatan_id = new.id;
    else
      v_no_baru := public.jana_no_rujukan('NC', v_tahun);
      insert into public.nc (
        no_nc, audit_id, dapatan_id, klausa_kod, prinsip_kod, fail_rujukan,
        dapatan, bukti, punca_akar, tindakan_pembetulan,
        pic, tarikh_siap, gred, status
      ) values (
        v_no_baru, new.audit_id, new.id, v_item.kod, v_prinsip_kod, v_item.fail_rujukan,
        coalesce(new.catatan, '(Catatan belum diisi)'),
        new.bukti_audit, new.punca_akar, new.cadangan_tindakan,
        new.pic, new.tarikh_siap_target,
        coalesce(new.gred_nc, 'minor'), 'open'
      );
    end if;
  else
    -- Status bukan NC - padam rekod NC kalau ada (auditor tukar status)
    delete from public.nc where dapatan_id = new.id;
  end if;

  -- =====================================================
  -- KENDALI OFI
  -- =====================================================
  if new.status = 'OFI' then
    if exists (select 1 from public.ofi where dapatan_id = new.id) then
      update public.ofi
      set
        klausa_kod = v_item.kod,
        fail_rujukan = v_item.fail_rujukan,
        pemerhatian = coalesce(new.catatan, '(Pemerhatian belum diisi)'),
        cadangan = new.cadangan_tindakan,
        pic = new.pic
      where dapatan_id = new.id;
    else
      v_no_baru := public.jana_no_rujukan('OFI', v_tahun);
      insert into public.ofi (
        no_ofi, audit_id, dapatan_id, klausa_kod, fail_rujukan,
        pemerhatian, cadangan, pic, status
      ) values (
        v_no_baru, new.audit_id, new.id, v_item.kod, v_item.fail_rujukan,
        coalesce(new.catatan, '(Pemerhatian belum diisi)'),
        new.cadangan_tindakan, new.pic, 'kiv_kuning'
      );
    end if;
  else
    delete from public.ofi where dapatan_id = new.id;
  end if;

  return new;
end;
$$;

-- =====================================================
-- Trigger: pasang pada dapatan
-- =====================================================

drop trigger if exists trg_dapatan_jana_nc_ofi on public.dapatan;
create trigger trg_dapatan_jana_nc_ofi
  after insert or update on public.dapatan
  for each row execute function public.handle_dapatan_perubahan();

-- =====================================================
-- Backfill: jana NC/OFI untuk dapatan sedia ada
-- =====================================================

-- Padam dulu yang sedia ada (untuk elak duplicate kalau re-run)
-- Auditor manual entries akan dijana semula dari dapatan
delete from public.nc where dapatan_id is not null;
delete from public.ofi where dapatan_id is not null;

-- Trigger update untuk semua dapatan yang dah ada (force re-evaluate)
update public.dapatan
set dikemaskini_pada = now()
where status in ('NC', 'OFI');
