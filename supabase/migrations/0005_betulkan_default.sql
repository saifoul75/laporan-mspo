-- Migration 0005: Betulkan default status mengikut SKILL v2.4 RPSB
--
-- Masalah dengan 0004: aku set 4.5.4.% dan 4.5.6.% jadi OFI default,
-- sedangkan SKILL hanya nyatakan klausa `.1` sahaja:
--   - 4.5.4.1 (GHG)
--   - 4.5.6.1 (HCV)
--   - 4.1.3.5 (IPM / tanaman bermanfaat)
--
-- N/A default (8 item, semua Fail 13):
--   - 4.1.2.1, 4.1.2.2, 4.1.2.3, 4.1.2.4, 4.1.2.5 (new planting)
--   - 4.1.4.1, 4.1.4.2, 4.1.4.3 (replanting)
--
-- 4.5.6.2, 4.5.6.3, 4.5.6.4 = keperluan biasa (default Pending)

-- =====================================================
-- Reset semua status_default dahulu
-- =====================================================

update public.item_semakan
set status_default = null,
    catatan_default = null,
    ofi_default = false;

-- =====================================================
-- Set OFI default - hanya 3 klausa khusus
-- =====================================================

update public.item_semakan
set status_default = 'OFI',
    catatan_default = 'Default OFI RPSB: Laporan analisa GHG belum lengkap. Menunggu pengesahan auditor luar / lesen.',
    ofi_default = true
where kod = '4.5.4.1';

update public.item_semakan
set status_default = 'OFI',
    catatan_default = 'Default OFI RPSB: Laporan biodiversiti & penilaian HCV belum mantap.',
    ofi_default = true
where kod = '4.5.6.1';

update public.item_semakan
set status_default = 'OFI',
    catatan_default = 'Default OFI RPSB: Pelaksanaan IPM dan rekod pemantauan tanaman bermanfaat tidak konsisten.',
    ofi_default = true
where kod = '4.1.3.5';

-- =====================================================
-- Set N/A default - 8 item Fail 13 (new planting + replanting)
-- =====================================================

update public.item_semakan
set status_default = 'NA',
    catatan_default = 'Tiada aktiviti new planting di Pusat Operasi.'
where kod in ('4.1.2.1', '4.1.2.2', '4.1.2.3', '4.1.2.4', '4.1.2.5');

update public.item_semakan
set status_default = 'NA',
    catatan_default = 'Tiada aktiviti replanting di Pusat Operasi bagi tempoh audit.'
where kod in ('4.1.4.1', '4.1.4.2', '4.1.4.3');

-- =====================================================
-- Bersihkan dapatan tersilap dalam audit yang dah dicipta
-- (hanya yang masih cocok dengan default lama, belum diubah auditor)
-- =====================================================

-- Padam dapatan untuk klausa 4.5.6.2-4 yang silap di-prefill jadi OFI
delete from public.dapatan d
using public.item_semakan i
where d.item_semakan_id = i.id
  and i.kod in ('4.5.6.2', '4.5.6.3', '4.5.6.4')
  and d.status = 'OFI'
  and d.catatan = 'Laporan HCV & data asas biodiversiti belum mantap.';
