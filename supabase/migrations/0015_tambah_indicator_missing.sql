-- Migration 0015: Tambah 12 missing indicators dari MS2530-2-2:2022
-- Crosscheck antara Guidance Document vs sistem mendapati:
--   4.4.3 Employment:     sistem ada 3, sepatutnya 12  (+9)
--   4.4.1 SIA:            sistem ada 1, sepatutnya 3   (+2)
--   4.2.3 Fair Price:     sistem ada 1, sepatutnya 2   (+1)
-- Selepas migration: 74 → 86 item_semakan

-- =====================================================
-- 4.4.3 — PENGURUSAN PEKERJA (Employment)  +9 items
-- =====================================================

insert into public.item_semakan (kriteria_id, kod, tajuk, bukti_wajib, fail_rujukan, jenis_klausa, susunan)
select k.id, i.kod, i.tajuk, i.bukti_wajib, i.fail_rujukan, i.jenis_klausa::jenis_klausa, i.susunan
from public.kriteria k
join (values
  ('4.4.3', '4.4.3.3', 'Kontrak pekerjaan bertulis mengikut keperluan undang-undang untuk semua pekerja', 'Fail 10: Kontrak Pekerjaan/Perjanjian, Surat Tawaran Pekerjaan', 10, 'minor', 4),
  ('4.4.3', '4.4.3.4', 'Tiada ganti rugi deposit atau penalti penamatan kerja dikenakan kepada pekerja', 'Fail 10: Kontrak Pekerjaan, Polisi Pekerjaan; Fail 1: Polisi Sosial', 10, 'minor', 5),
  ('4.4.3', '4.4.3.5', 'Slip gaji mengandungi maklumat minimum (hari bekerja, kadar, OT, potongan) dan diberikan kepada pekerja', 'Fail 10: Slip Gaji Pekerja, Rekod Pembayaran Gaji Bulanan', 10, 'minor', 6),
  ('4.4.3', '4.4.3.7', 'Tiada amalan diskriminasi dalam pengambilan, kenaikan pangkat dan layanan pekerja', 'Fail 10: Polisi Pekerjaan, Rekod Pengambilan; Fail 1: Polisi Sosial', 10, 'minor', 7),
  ('4.4.3', '4.4.3.8', 'Hak berserikat dan kebebasan berpersatuan dihormati tanpa halangan', 'Fail 10: Polisi Pekerjaan, Daftar Kesatuan Sekerja (jika ada)', 10, 'minor', 8),
  ('4.4.3', '4.4.3.9', 'Tiada buruh kanak-kanak — verifikasi umur semasa pengambilan pekerja', 'Fail 10: Rekod Pengambilan Pekerja, Salinan IC/Passport', 10, 'minor', 9),
  ('4.4.3', '4.4.3.10', 'Kanak-kanak membantu keluarga tidak dianggap pekerja (patuh definisi Child/Young Person MSPO Part 1)', 'Fail 10: Polisi Pekerjaan; Fail 1: Polisi Sosial', 10, 'minor', 10),
  ('4.4.3', '4.4.3.11', 'Gaji dibayar tepat pada masa seperti dinyatakan dalam kontrak pekerjaan', 'Fail 10: Slip Gaji, Rekod Pembayaran Gaji, Penyata Bank', 10, 'minor', 11),
  ('4.4.3', '4.4.3.12', 'Perbezaan jelas kontrak pekerjaan: Contract for Service vs Contract of Service (kerja tetap perlu pekerja tetap)', 'Fail 10: Kontrak Pekerjaan, Perjanjian Kontraktor, Polisi Pekerjaan', 10, 'minor', 12)
) as i(kod_kriteria, kod, tajuk, bukti_wajib, fail_rujukan, jenis_klausa, susunan) on k.kod = i.kod_kriteria
on conflict (kriteria_id, kod) do nothing;

-- =====================================================
-- 4.4.1 — SIA (Social Impact Assessment)  +2 items
-- =====================================================

insert into public.item_semakan (kriteria_id, kod, tajuk, bukti_wajib, fail_rujukan, jenis_klausa, susunan)
select k.id, i.kod, i.tajuk, i.bukti_wajib, i.fail_rujukan, i.jenis_klausa::jenis_klausa, i.susunan
from public.kriteria k
join (values
  ('4.4.1', '4.4.1.2', 'Pelan pengurusan Impak Sosial (SIA) digubal dan dilaksana berdasarkan penemuan SIA', 'Fail 6: Pelan Pengurusan SIA, Laporan SIA, Rekod Pelaksanaan', 6, 'minor', 2),
  ('4.4.1', '4.4.1.3', 'Semakan berkala SIA dilaksana untuk menilai keberkesanan pelan pengurusan', 'Fail 6: Laporan Semakan SIA, Minit Mesyuarat Semakan Berkala', 6, 'minor', 3)
) as i(kod_kriteria, kod, tajuk, bukti_wajib, fail_rujukan, jenis_klausa, susunan) on k.kod = i.kod_kriteria
on conflict (kriteria_id, kod) do nothing;

-- =====================================================
-- 4.2.3 — HARGA & RANTAIAN BEKALAN (Fair Price)  +1 item
-- =====================================================

insert into public.item_semakan (kriteria_id, kod, tajuk, bukti_wajib, fail_rujukan, jenis_klausa, susunan)
select k.id, i.kod, i.tajuk, i.bukti_wajib, i.fail_rujukan, i.jenis_klausa::jenis_klausa, i.susunan
from public.kriteria k
join (values
  ('4.2.3', '4.2.3.2', 'Pemeriksaan fizikal di premis kontraktor dijalankan untuk verifikasi jika diperlukan', 'Fail 9: Rekod Pemeriksaan Kontraktor; Fail 10: Kontrak Perkhidmatan', 9, 'minor', 2)
) as i(kod_kriteria, kod, tajuk, bukti_wajib, fail_rujukan, jenis_klausa, susunan) on k.kod = i.kod_kriteria
on conflict (kriteria_id, kod) do nothing;
