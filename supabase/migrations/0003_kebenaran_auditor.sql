-- Migration 0003: Longgarkan akses untuk auditor
-- Sebelum: auditor hanya nampak audit dia ditugaskan
-- Sekarang: lead_auditor dan auditor (semua) boleh nampak SEMUA audit
--          po_user masih dihadkan kepada PO mereka sahaja

-- =====================================================
-- AUDIT
-- =====================================================

drop policy if exists "Akses audit" on public.audit;
create policy "Akses audit" on public.audit for select
  using (
    public.rol_semasa() in ('admin', 'lead_auditor', 'auditor')
    or exists (
      select 1 from public.pengguna p
      where p.id = auth.uid() and p.pusat_operasi_id = audit.pusat_operasi_id
    )
  );

-- Auditor pun boleh kemaskini audit (untuk update status semasa audit jalan)
drop policy if exists "Lead/admin urus audit" on public.audit;
create policy "Auditor urus audit" on public.audit for all
  using (public.rol_semasa() in ('admin', 'lead_auditor', 'auditor'));

-- =====================================================
-- DAPATAN
-- =====================================================

drop policy if exists "Akses dapatan" on public.dapatan;
create policy "Akses dapatan" on public.dapatan for select
  using (
    public.rol_semasa() in ('admin', 'lead_auditor', 'auditor')
    or exists (
      select 1 from public.audit a
      join public.pengguna p on p.id = auth.uid()
      where a.id = dapatan.audit_id and p.pusat_operasi_id = a.pusat_operasi_id
    )
  );

-- =====================================================
-- NC
-- =====================================================

drop policy if exists "Akses NC" on public.nc;
create policy "Akses NC" on public.nc for select
  using (
    public.rol_semasa() in ('admin', 'lead_auditor', 'auditor')
    or exists (
      select 1 from public.audit a
      join public.pengguna p on p.id = auth.uid()
      where a.id = nc.audit_id and p.pusat_operasi_id = a.pusat_operasi_id
    )
  );

-- =====================================================
-- OFI
-- =====================================================

drop policy if exists "Akses OFI" on public.ofi;
create policy "Akses OFI" on public.ofi for select
  using (
    public.rol_semasa() in ('admin', 'lead_auditor', 'auditor')
    or exists (
      select 1 from public.audit a
      join public.pengguna p on p.id = auth.uid()
      where a.id = ofi.audit_id and p.pusat_operasi_id = a.pusat_operasi_id
    )
  );

-- =====================================================
-- BUKTI
-- =====================================================

drop policy if exists "Akses bukti" on public.bukti;
create policy "Akses bukti" on public.bukti for select
  using (
    public.rol_semasa() in ('admin', 'lead_auditor', 'auditor')
    or exists (
      select 1
      from public.dapatan d
      join public.audit a on a.id = d.audit_id
      join public.pengguna p on p.id = auth.uid()
      where d.id = bukti.dapatan_id and p.pusat_operasi_id = a.pusat_operasi_id
    )
  );

-- =====================================================
-- LAPORAN
-- =====================================================

drop policy if exists "Akses laporan" on public.laporan;
create policy "Akses laporan" on public.laporan for select
  using (
    public.rol_semasa() in ('admin', 'lead_auditor', 'auditor')
    or exists (
      select 1 from public.audit a
      join public.pengguna p on p.id = auth.uid()
      where a.id = laporan.audit_id and p.pusat_operasi_id = a.pusat_operasi_id
    )
  );

-- =====================================================
-- PUSAT OPERASI
-- =====================================================

drop policy if exists "Baca PO" on public.pusat_operasi;
create policy "Baca PO" on public.pusat_operasi for select
  using (
    public.rol_semasa() in ('admin', 'lead_auditor', 'auditor')
    or exists (
      select 1 from public.pengguna p
      where p.id = auth.uid() and p.pusat_operasi_id = pusat_operasi.id
    )
  );
