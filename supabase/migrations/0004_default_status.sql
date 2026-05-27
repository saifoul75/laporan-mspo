-- Migration 0004: Default status untuk klausa khas RPSB
-- Berdasarkan keperluan operasi:
--   - Planting baru & replanting: N/A (tiada aktiviti di PO)
--   - GHG: OFI (lesen/auditor luar belum siap)
--   - HCV & Biodiversiti: OFI (laporan belum mantap)
--   - IPM / Tanaman bermanfaat: OFI (rekod tidak konsisten)
-- Auditor masih boleh override status ini di lapangan.

-- =====================================================
-- Tambah column status_default
-- =====================================================

alter table public.item_semakan
  add column if not exists status_default status_dapatan;

-- =====================================================
-- Set default N/A untuk planting baru (4.1.2.x)
-- =====================================================

update public.item_semakan
set status_default = 'NA',
    catatan_default = 'Tiada aktiviti new planting di Pusat Operasi.'
where kod like '4.1.2.%';

-- =====================================================
-- Set default N/A untuk replanting (4.1.4.x)
-- =====================================================

update public.item_semakan
set status_default = 'NA',
    catatan_default = 'Tiada aktiviti replanting di Pusat Operasi bagi tempoh audit.'
where kod like '4.1.4.%';

-- =====================================================
-- Set default OFI untuk GHG (4.5.4.x)
-- =====================================================

update public.item_semakan
set status_default = 'OFI',
    catatan_default = 'Laporan analisa GHG belum lengkap. Menunggu pengesahan auditor luar / lesen.',
    ofi_default = true
where kod like '4.5.4.%';

-- =====================================================
-- Set default OFI untuk HCV & Biodiversiti (4.5.6.x)
-- =====================================================

update public.item_semakan
set status_default = 'OFI',
    catatan_default = 'Laporan HCV & data asas biodiversiti belum mantap.',
    ofi_default = true
where kod like '4.5.6.%';

-- =====================================================
-- Set default OFI untuk IPM / Tanaman bermanfaat (4.1.3.5)
-- =====================================================

update public.item_semakan
set status_default = 'OFI',
    catatan_default = 'Pelaksanaan IPM dan rekod pemantauan tanaman bermanfaat masih tidak konsisten.',
    ofi_default = true
where kod = '4.1.3.5';

-- =====================================================
-- Function: pre-fill dapatan untuk audit baru
-- Hanya isi item yang ada status_default; selain tu kekal Pending
-- =====================================================

create or replace function public.prefill_dapatan_audit(p_audit_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_diaudit_oleh uuid;
  v_count int;
begin
  -- Ambil lead_auditor sebagai 'diaudit_oleh' default
  select lead_auditor_id into v_diaudit_oleh from public.audit where id = p_audit_id;
  if v_diaudit_oleh is null then
    raise exception 'Audit % tidak dijumpai', p_audit_id;
  end if;

  insert into public.dapatan (
    audit_id, item_semakan_id, status, catatan, diaudit_oleh
  )
  select
    p_audit_id,
    i.id,
    i.status_default,
    i.catatan_default,
    v_diaudit_oleh
  from public.item_semakan i
  where i.status_default is not null
  on conflict (audit_id, item_semakan_id) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Boleh dipanggil oleh user yang authenticated
grant execute on function public.prefill_dapatan_audit(uuid) to authenticated;

-- =====================================================
-- Trigger: auto pre-fill bila audit baru dicipta
-- =====================================================

create or replace function public.handle_audit_baru()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.prefill_dapatan_audit(new.id);
  return new;
end;
$$;

drop trigger if exists trg_audit_prefill on public.audit;
create trigger trg_audit_prefill
  after insert on public.audit
  for each row execute function public.handle_audit_baru();
