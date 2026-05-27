-- Migration 0007: Backfill NC/OFI dari dapatan sedia ada
-- 
-- Migration 0006 ada bug: backfill yang `update dikemaskini_pada` tak trigger
-- logic auto-jana sebab guard `if old.status = new.status` skip dia.
-- Migration ni jalan backfill manual.

-- Bersihkan dulu (kalau dah ada partial data)
delete from public.nc where dapatan_id is not null;
delete from public.ofi where dapatan_id is not null;

-- Backfill NC dari dapatan sedia ada
do $$
declare
  d record;
  v_kod text;
  v_prinsip text;
  v_fail int;
  v_no text;
  v_count int := 0;
begin
  for d in
    select * from public.dapatan where status = 'NC' order by dirakam_pada
  loop
    select i.kod, i.fail_rujukan, p.kod
    into v_kod, v_fail, v_prinsip
    from public.item_semakan i
    join public.kriteria k on k.id = i.kriteria_id
    join public.prinsip p on p.id = k.prinsip_id
    where i.id = d.item_semakan_id;

    v_count := v_count + 1;
    v_no := 'NC-' || lpad(v_count::text, 3, '0') || '-' || extract(year from d.dirakam_pada);

    insert into public.nc (
      no_nc, audit_id, dapatan_id, klausa_kod, prinsip_kod, fail_rujukan,
      dapatan, bukti, punca_akar, tindakan_pembetulan,
      pic, tarikh_siap, gred, status
    ) values (
      v_no, d.audit_id, d.id, v_kod, v_prinsip, v_fail,
      coalesce(d.catatan, '(Catatan belum diisi)'),
      d.bukti_audit, d.punca_akar, d.cadangan_tindakan,
      d.pic, d.tarikh_siap_target,
      coalesce(d.gred_nc, 'minor'), 'open'
    );
  end loop;
end $$;

-- Backfill OFI dari dapatan sedia ada
do $$
declare
  d record;
  v_kod text;
  v_fail int;
  v_no text;
  v_count int := 0;
begin
  for d in
    select * from public.dapatan where status = 'OFI' order by dirakam_pada
  loop
    select i.kod, i.fail_rujukan
    into v_kod, v_fail
    from public.item_semakan i
    where i.id = d.item_semakan_id;

    v_count := v_count + 1;
    v_no := 'OFI-' || lpad(v_count::text, 3, '0') || '-' || extract(year from d.dirakam_pada);

    insert into public.ofi (
      no_ofi, audit_id, dapatan_id, klausa_kod, fail_rujukan,
      pemerhatian, cadangan, pic, status
    ) values (
      v_no, d.audit_id, d.id, v_kod, v_fail,
      coalesce(d.catatan, '(Pemerhatian belum diisi)'),
      d.cadangan_tindakan, d.pic, 'kiv_kuning'
    );
  end loop;
end $$;

-- Verifikasi (untuk SQL Editor display sahaja)
select 'NC' as jenis, count(*) as bil from public.nc
union all
select 'OFI', count(*) from public.ofi;
