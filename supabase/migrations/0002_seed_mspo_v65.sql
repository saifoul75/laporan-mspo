-- Seed data MSPO Audit (MS2530-2-2:2022)
-- Auto-generated dari Master Checklist v6.5
-- 5 Prinsip, 28 Kriteria, 74 Item Semakan, 13 Fail

-- =====================================================
-- PRINSIP
-- =====================================================

insert into public.prinsip (nombor, kod, tajuk, fokus_utama, bil_klausa) values
  (1, 'P1', 'Komitmen Pengurusan dan Tanggungjawab', 'Komitmen pengurusan, SOP, latihan, audit, MRM', 10),
  (2, 'P2', 'Ketelusan', 'Ketelusan, stakeholder, traceability, etika', 4),
  (3, 'P3', 'Pematuhan Undang-Undang dan Hak Tanah', 'Pematuhan undang-undang, hak guna tanah, NCR', 3),
  (4, 'P4', 'Tanggungjawab Sosial, Keselamatan dan Kesihatan Pekerjaan', 'SIA, OSH, syarat pekerjaan, perumahan', 4),
  (5, 'P5', 'Alam Sekitar, Sumber Asli, Biodiversiti dan Perkhidmatan Ekosistem', 'Alam sekitar, tenaga, sisa, GHG, air, HCV, zero burning', 7)
on conflict (kod) do nothing;

-- =====================================================
-- FAIL KULIT KERAS
-- =====================================================

insert into public.fail_kulit_keras (nombor, nama, ringkasan) values
  (1, 'MANUAL DAN SOP LESTARI', 'Manual Lestari dan Prosedur Lestari'),
  (2, 'PENGURUSAN MSPO', 'MRM, Audit Dalaman, Penambahbaikan, Kawalan Dokumen'),
  (3, 'KETELUSAN', 'Ketelusan, Peserta, Aduan, Kebolehjejakan'),
  (4, 'PELAN PENGURUSAN', 'KKP/Sosial, Alam Sekitar, Perniagaan'),
  (5, 'PENGURUSAN PERUNDANGAN', 'Pengawasan Undang-Undang, Tanah'),
  (6, 'PENGURUSAN SOSIAL', 'Pihak Berkepentingan, Aduan, CSR'),
  (7, 'PENGURUSAN KKP', 'Risiko KKP, Kecemasan, Bahan Kimia'),
  (8, 'ALAM SEKITAR, SUMBER ASLI, BIODIVERSITI', 'EAI, GHG, Sisa, Air, Biodiversiti'),
  (9, 'PENTADBIRAN', 'Pengurusan Harga, Kontraktor'),
  (10, 'PENGURUSAN PEKERJA', 'Senarai pekerja, kontrak, gaji, EPF/SOCSO'),
  (11, 'LATIHAN PEKERJA', 'Perancangan latihan, rekod, laporan'),
  (12, 'INTEGRITI', 'OACP, Pegawai Integriti, anti-rasuah'),
  (13, 'TANAM SEMULA & PEMBANGUNAN TANAMAN BARU', 'Blueprint, program, mesyuarat')
on conflict (nombor) do nothing;

-- =====================================================
-- KRITERIA
-- =====================================================

insert into public.kriteria (prinsip_id, kod, tajuk, susunan)
select p.id, k.kod, k.tajuk, k.susunan from public.prinsip p
join (values
  ('P1', '4.1.1', 'Polisi & Paparan', 1),
  ('P1', '4.1.3', 'SOP & Kawalan Operasi', 2),
  ('P1', '4.1.10', 'MRM / Semakan Pengurusan', 3),
  ('P2', '4.2.1', 'Stakeholder / Komunikasi', 4),
  ('P4', '4.4.2', 'OSH & Kesihatan Pekerjaan', 5),
  ('P5', '4.5.1', 'Alam Sekitar', 6),
  ('P1', '4.1.9', 'Audit Dalaman', 7),
  ('P1', '4.1.8', 'Aduan & Rungutan', 8),
  ('P2', '4.2.2', 'Kebolehjejakan', 9),
  ('P1', '4.1.6', 'Pelan Perniagaan', 10),
  ('P3', '4.3.1', 'Perundangan', 11),
  ('P3', '4.3.2', 'Hak Guna Tanah', 12),
  ('P3', '4.3.3', 'NCR / Hak Adat', 13),
  ('P1', '4.1.7', 'CSR / Komuniti', 14),
  ('P4', '4.4.1', 'SIA', 15),
  ('P5', '4.5.3', 'Sisa / Bahan Kimia', 16),
  ('P5', '4.5.7', 'Zero Burning / Kebakaran', 17),
  ('P5', '4.5.2', 'Tenaga / GHG', 18),
  ('P5', '4.5.4', 'Tenaga / GHG', 19),
  ('P5', '4.5.5', 'Pengurusan Air', 20),
  ('P5', '4.5.6', 'HCV / Biodiversiti', 21),
  ('P2', '4.2.3', 'Harga & Rantaian Bekalan', 22),
  ('P4', '4.4.3', 'Pengurusan Pekerja', 23),
  ('P4', '4.4.4', 'Perumahan Pekerja', 24),
  ('P1', '4.1.5', 'Latihan & Kompetensi', 25),
  ('P2', '4.2.4', 'Polisi & Paparan', 26),
  ('P1', '4.1.2', 'Tanam Baharu / Replanting', 27),
  ('P1', '4.1.4', 'Tanam Baharu / Replanting', 28)
) as k(kod_p, kod, tajuk, susunan) on p.kod = k.kod_p
on conflict (prinsip_id, kod) do nothing;

-- =====================================================
-- ITEM SEMAKAN (74 item dari Master Checklist v6.5)
-- =====================================================

insert into public.item_semakan (kriteria_id, kod, tajuk, bukti_wajib, fail_rujukan, jenis_klausa, susunan)
select k.id, i.kod, i.tajuk, i.bukti_wajib, i.fail_rujukan, i.jenis_klausa::jenis_klausa, i.susunan
from public.kriteria k
join (values
  ('4.1.1', '4.1.1.1', 'Polisi MSPO diluluskan pengurusan atasan (bertarikh) & tersedia awam', 'Fail 1: Polisi MSPO, Polisi KKP, Polisi Alam Sekitar, Polisi Sosial, Anti Rasuah, Whistleblower', 1, 'minor', 1),
  ('4.1.1', '4.1.1.2', 'Polisi selaras etika, OSH, hak manusia, alam sekitar & klausa penambahbaikan berterusan', 'Fail 1: Manual Lestari, Polisi MSPO, SOP Prosedur', 1, 'minor', 2),
  ('4.1.3', '4.1.3.1', 'SOP operasi lengkap dengan rekod pelaksanaan & pernyataan tanggungjawab', 'Fail 1: Semua prosedur lestari (PPE, HIRARC, ERP, Latihan, Sisa, Bahan Kimia dll)', 1, 'minor', 1),
  ('4.1.3', '4.1.3.2', 'Strategi pengurusan cerun curam untuk cegah hakisan', 'Fail 1: Polisi Perlindungan Cerun & Sungai; Fail 8: EAI', 1, 'minor', 2),
  ('4.1.3', '4.1.3.5', 'Penggunaan Pengurusan Perosak Bersepadu (IPM)', 'Fail 4: Pelan Pengurusan; Fail 8: Rekod Penggunaan Racun Perosak', 4, 'minor', 3),
  ('4.1.3', '4.1.3.3', 'Patuh garis panduan MPOB untuk tanah gambut (pengurusan air & api)', 'Fail 5: Daftar Undang-Undang; Fail 8: EAI, Pelan Pengurusan Air', 5, 'minor', 4),
  ('4.1.3', '4.1.3.4', 'Papan tanda visual dipasang (blok, luas, tarikh tanam, klon/varieti)', 'Fail 5: Peta Blok/Division Ladang', 5, 'minor', 5),
  ('4.1.10', '4.1.10.1', 'Semakan pengurusan tertinggi secara berkala (isu luaran, kemajuan pelan, sumber)', 'Fail 2: Minit MRM, Memo Mesyuarat, Slide Pembentangan', 1, 'minor', 1),
  ('4.2.1', '4.2.1.1', 'Prosedur komunikasi mudah diakses menggunakan bahasa yang sesuai', 'Fail 1: Prosedur Komunikasi Pihak Berkepentingan; Fail 6: Senarai Stakeholder', 1, 'minor', 1),
  ('4.2.1', '4.2.1.2', 'Senarai pemegang taruh (stakeholder) disediakan', 'Fail 6: Senarai Pihak Berkepentingan; Fail 3: Laporan Prestasi', 3, 'minor', 2),
  ('4.2.1', '4.2.1.3', 'Individu bertanggungjawab bagi komunikasi dilantik', 'Fail 3: Surat Lantikan Pegawai Komunikasi', 3, 'minor', 3),
  ('4.2.1', '4.2.1.4', 'Maklumat tersedia secara awam atau atas permintaan', 'Fail 3: Laporan Prestasi (VA/Progress Report), Laporan Bayaran Hasil', 3, 'minor', 4),
  ('4.4.2', '4.4.2.1', 'Polisi Keselamatan dan Kesihatan Pekerjaan (OSH) tersedia', 'Fail 1: Polisi KKP; Fail 7: HIRARC, JKKP', 1, 'minor', 1),
  ('4.4.2', '4.4.2.2', 'Penilaian risiko (HIRARC) & hierarki kawalan keselamatan', 'Fail 7: HIRARC & Senarai HIRARC, Minit JKKP, Carta Org JKKP, Takwim KKP', 7, 'minor', 2),
  ('4.4.2', '4.4.2.3', 'Rekod OSH disenggarakan (kemalangan, PPE, first aid, ERT)', 'Fail 7: Borang JKKP 6/7/8, Rekod Kemalangan, PPE, First Aid, ERT, CHRA', 7, 'minor', 3),
  ('4.5.1', '4.5.1.1', 'Polisi alam sekitar diluluskan pengurusan & dikomunikasikan', 'Fail 1: Polisi Alam Sekitar dan Biodiversiti; Fail 8: EAI', 1, 'minor', 1),
  ('4.5.1', '4.5.1.2', 'Penilaian Aspek & Impak Alam Sekitar (EAI/EIA) dijalankan', 'Fail 8: Daftar EAI, Surat Lantikan Penyelaras AS, Carta Org AS', 8, 'minor', 2),
  ('4.5.1', '4.5.1.3', 'Pelan pengurusan alam sekitar digubal berdasarkan keputusan EAI', 'Fail 4: Pelan Pengurusan AS & Sisa; Fail 8: Program Tahunan AS', 8, 'minor', 3),
  ('4.5.1', '4.5.1.4', 'Latihan alam sekitar dikenalpasti & dilaksanakan untuk kakitangan', 'Fail 11: Rekod Latihan; Fail 8: Program Tahunan Alam Sekitar', 11, 'minor', 4),
  ('4.1.9', '4.1.9.1', 'Program audit dalaman dilaksana oleh juruaudit kompeten', 'Fail 2: Rancangan Tahunan Audit, Jadual/Pelan Audit, Senarai Semak, Laporan Audit', 2, 'minor', 1),
  ('4.1.9', '4.1.9.2', 'Analisis punca akar (5 Whys / Fishbone) dijalankan', 'Fail 2: Laporan Audit, Borang Tindakan Pembetulan (BTP), Laporan Pemerhatian', 2, 'minor', 2),
  ('4.1.8', '4.1.8.1', 'Mekanisme aduan telus dan mesra (termasuk perlindungan pemberi maklumat)', 'Fail 3: Rekod Aduan; Fail 6: Buku/Borang Aduan, Rekod Daftar Aduan', 3, 'minor', 1),
  ('4.1.8', '4.1.8.2', 'Rekod aduan, tindakan dan resolusi bersama disimpan', 'Fail 3: Rekod Daftar Aduan; Fail 6: Rekod CSR', 3, 'minor', 2),
  ('4.1.8', '4.1.8.3', 'Simpanan rekod minimum 24 bulan (kes bukan undang-undang)', 'Fail 3: Rekod Daftar Aduan', 3, 'minor', 3),
  ('4.2.2', '4.2.2.1', 'SOP kebolehjejakan (traceability) disediakan', 'Fail 3: Borang Pemantauan Kebolehjejakan; Fail 1: Prosedur Kebolehjejakan', 3, 'minor', 1),
  ('4.2.2', '4.2.2.2', 'Upaya jejak satu peringkat ke atas dan ke bawah', 'Fail 3: Chit Jualan BTS, Nota Hantaran, Resit Timbang, Batu Sempadan', 3, 'minor', 2),
  ('4.2.2', '4.2.2.3', 'Pengurus Kumpulan dilantik sebagai PIC kebolehjejakan', 'Fail 3: Surat Lantikan Pegawai Kebolehjejakan', 3, 'minor', 3),
  ('4.1.6', '4.1.6.1', 'Pelan perniagaan merangkumi perbelanjaan sosial dan alam sekitar', 'Fail 4: Pelan Pengurusan Perniagaan, Bajet Tahunan Ladang; Fail 9: Buku Belanjawan', 4, 'minor', 1),
  ('4.1.6', '4.1.6.2', 'Program penanaman semula jangka panjang dengan semakan berkala', 'Fail 4: Bajet Tanaman Semula (3-5 Tahunan); Fail 9: Panduan Kos Standard', 4, 'minor', 2),
  ('4.1.6', '4.1.6.3', 'Program penanaman semula jangka panjang hendaklah diwujudkan dan dikaji semula setiap tahun', 'Fail 4: Bajet Tanaman Semula (3-5 Tahunan); Fail 9: Panduan Kos Standard', 4, 'minor', 3),
  ('4.3.1', '4.3.1.1', 'Senarai undang-undang terkini yang berkaitan disediakan', 'Fail 5: Surat Lantikan Pegawai Undang-Undang, Daftar Undang-Undang', 5, 'minor', 1),
  ('4.3.1', '4.3.1.2', 'Pemantauan pematuhan melalui audit atau pemeriksaan tapak', 'Fail 5: Borang Pengawasan Pematuhan Undang-Undang, Lesen/Permit/Kelulusan', 5, 'minor', 2),
  ('4.3.2', '4.3.2.1', 'Bukti sah hak guna tanah', 'Fail 5: Peta Blok, Peta Topografi, Peta Kontur; Fail 3: Geran/MMK', 5, 'minor', 1),
  ('4.3.2', '4.3.2.2', 'Perjanjian pengalihan tanah & pemberian pampasan yang adil', 'Fail 5: Peta Blok; Fail 3: Perjanjian Peserta/Shareholder', 5, 'minor', 2),
  ('4.3.2', '4.3.2.3', 'Pematuhan FPIC & mekanisme aduan tersedia', 'Fail 5: Daftar Undang-Undang; Fail 6: Borang Aduan; Fail 3: Rekod Aduan', 5, 'minor', 3),
  ('4.3.2', '4.3.2.4', 'Operasi dijalankan dalam kawasan yang ditetapkan undang-undang', 'Fail 5: Peta Blok, Senarai Lesen/MPOB/Permit', 5, 'minor', 4),
  ('4.3.3', '4.3.3.1', 'Pematuhan terhadap Hak Adat Tempatan (NCR)', 'Fail 5: Daftar Undang-Undang; Fail 3: Perjanjian; Fail 6: Minit Stakeholder', 5, 'minor', 1),
  ('4.3.3', '4.3.3.2', 'Peta dengan skala yang sesuai menunjukkan tahap hak adat hendaklah disediakan kepada pihak berkepentingan yang berkaitan', 'Fail 5: Peta Blok; Fail 3: Perjanjian Peserta', 5, 'minor', 2),
  ('4.3.3', '4.3.3.3', 'Pelaksanaan FPIC direkodkan dan salinan perjanjian yang dirundingkan disediakan kepada pihak berkepentingan yang berkaitan atas permintaan', 'Fail 5: Daftar Undang-Undang; Fail 3: Perjanjian; Fail 6: Minit Stakeholder', 5, 'minor', 3),
  ('4.1.7', '4.1.7.1', 'Konsultasi komuniti & sumbangan pembangunan lestari (bukan pekerja sahaja)', 'Fail 6: Senarai Pihak Berkepentingan, Rekod CSR, Minit Mesyuarat Stakeholder', 6, 'minor', 1),
  ('4.4.1', '4.4.1.1', 'Penilaian Impak Sosial (SIA) dilaksana mengikut Garis Panduan SIA', 'Fail 6: Laporan SIA, Senarai Pihak Berkepentingan, Minit Mesyuarat Stakeholder', 6, 'minor', 1),
  ('4.5.3', '4.5.3.2', 'Pengurusan bahan kimia & bekas racun kosong (MSDS/SDS, stor racun, pelupusan bertauliah)', 'Fail 7: CHRA, MSDS/SDS, Senarai Bahan Kimia; Fail 8: Rekod Penggunaan Racun, Rekod Pelupusan Sisa', 7, 'minor', 1),
  ('4.5.3', '4.5.3.1', 'Pengurusan sisa ladang - senarai sisa, rekod kitar semula & pelupusan', 'Fail 8: Senarai Bahan Buangan, Rekod Kitar Semula, Rekod Pelupusan Sisa', 8, 'minor', 2),
  ('4.5.3', '4.5.3.3', 'Pengurusan sisa domestik pekerja - pelupusan yang betul & rekod disimpan', 'Fail 8: Rekod Pelupusan Sisa Domestik; Fail 10: Rekod Penghuni Rumah Pekerja', 8, 'minor', 3),
  ('4.5.7', '4.5.7.3', 'Prosedur tindak balas kecemasan kebakaran (ERP/ERT) tersedia dan dilatih', 'Fail 7: ERP/ERT, Senarai Pemadam Api; Fail 1: Polisi Larangan Pembakaran', 7, 'minor', 1),
  ('4.5.7', '4.5.7.1', 'Polisi larangan pembakaran terbuka (zero burning) dilaksana & dipamerkan', 'Fail 1: Polisi Larangan Pembakaran; Fail 8: EAI; Fail 7: ERP', 8, 'minor', 2),
  ('4.5.7', '4.5.7.2', 'Rekod pemantauan pematuhan polisi zero burning disimpan', 'Fail 8: Rekod Pemantauan Zero Burning, EAI; Fail 7: Rekod Insiden Kebakaran', 8, 'minor', 3),
  ('4.5.2', '4.5.2.1', 'Rekod penggunaan tenaga (diesel, petrol, elektrik) dipantau dan disediakan', 'Fail 8: Laporan & Pembelian Diesel/Petrol, Laporan Penggunaan Elektrik', 8, 'minor', 1),
  ('4.5.2', '4.5.2.2', 'Pelan penggunaan tenaga boleh diperbaharui atau pengurangan tenaga dibangunkan', 'Fail 8: Pelan Pengurusan Tenaga; Fail 4: Pelan Pengurusan', 8, 'minor', 2),
  ('4.5.4', '4.5.4.1', 'Laporan analisa GHG disediakan & pelan pengurangan GHG dibangunkan', 'Fail 8: Laporan Analisa GHG, Rekod Penggunaan Racun/Baja/Diesel; Fail 4: Pelan Pengurusan GHG', 8, 'minor', 1),
  ('4.5.5', '4.5.5.1', 'Pelan pengurusan air & rekod kualiti/penggunaan air domestik', 'Fail 8: Laporan Penggunaan Air, Kualiti Air, Pemeriksaan/Penyelenggaraan Air', 8, 'minor', 1),
  ('4.5.5', '4.5.5.2', 'Zon penampan (buffer zone) sungai & kawasan perlindungan air dijaga', 'Fail 8: EAI; Fail 4: Pelan Pengurusan Air & Tanah', 8, 'minor', 2),
  ('4.5.6', '4.5.6.1', 'Laporan biodiversiti & penilaian Kawasan Konservasi Tinggi (HCV)', 'Fail 8: Laporan Biodiversiti/HCV, Data Asas Biodiversiti, Flora/Fauna Terancam', 8, 'minor', 1),
  ('4.5.6', '4.5.6.2', 'Data asas biodiversiti (flora, fauna terancam) direkodkan dan dikemas kini', 'Fail 8: Data Asas Biodiversiti, Senarai Flora/Fauna Terancam, Laporan Pemantauan', 8, 'minor', 2),
  ('4.5.6', '4.5.6.3', 'Kawasan cerun, sungai, gambut & kawasan sensitif dikenal pasti dan dipantau', 'Fail 8: EAI, Pelan Pengurusan AS; Fail 5: Peta Topografi/Kontur', 8, 'minor', 3),
  ('4.5.6', '4.5.6.4', 'Latihan HCV/biodiversiti untuk kakitangan dijalankan', 'Fail 8: Program Tahunan AS; Fail 11: Rekod Latihan', 8, 'minor', 4),
  ('4.2.3', '4.2.3.1', 'Amalan harga yang telus dan adil dalam rantaian bekalan', 'Fail 9: Kontrak & Perjanjian Jualan BTS, SST; Fail 3: Chit Jualan', 9, 'minor', 1),
  ('4.4.3', '4.4.3.2', 'Rekod pekerja lengkap (TKA, tempatan, sementara, kontraktor)', 'Fail 10: Senarai Pekerja TKA/Tempatan/Sementara/Kontraktor, Buku Checkroll', 10, 'minor', 1),
  ('4.4.3', '4.4.3.1', 'Polisi pekerjaan & hak pekerja dilaksanakan (gaji minimum, waktu kerja, cuti)', 'Fail 10: Kontrak Pekerjaan/Letter Offer; Fail 1: Polisi Sosial', 10, 'minor', 2),
  ('4.4.3', '4.4.3.6', 'Caruman EPF/SOCSO disempurnakan (pekerja & kontraktor)', 'Fail 10: Slip Gaji, Caruman EPF/SOCSO, Rekod Bayaran Gaji Kontraktor', 10, 'minor', 3),
  ('4.4.4', '4.4.4.1', 'Pemeriksaan rumah pekerja dilaksana & rekod disimpan', 'Fail 10: Pemeriksaan Rumah Pekerja', 10, 'minor', 1),
  ('4.1.5', '4.1.5.1', 'Keperluan latihan dikenal pasti berdasarkan huraian kerja (MSPO, OSH, hak kanak-kanak)', 'Fail 11: Training Matrix, Perancangan Latihan Tahunan; Fail 1: SOP Latihan', 11, 'minor', 1),
  ('4.1.5', '4.1.5.2', 'Program latihan tahunan & penilaian keberkesanan dijalankan', 'Fail 11: Rekod Latihan Pekerja, Borang Penilaian Latihan, Laporan Latihan Dalaman', 11, 'minor', 2),
  ('4.1.5', '4.1.5.3', 'Latihan untuk kontraktor (dalam syarat kontrak atau berasingan)', 'Fail 11: Rekod Latihan Kontraktor; Fail 9: Kontrak Kontraktor', 11, 'minor', 3),
  ('4.2.4', '4.2.4.1', 'Polisi etika (anti-rasuah) diluluskan pengurusan atasan', 'Fail 12: Garis Panduan Tatacara Mencukupi, Surat Lantikan Pegawai Integriti, OACP', 12, 'minor', 1),
  ('4.2.4', '4.2.4.2', 'Sistem pemantauan & latihan etika dilaksanakan', 'Fail 12: Rekod Latihan, Penilaian Risiko, OACP, Lain-Lain Laporan', 12, 'minor', 2),
  ('4.1.2', '4.1.2.1', 'New planting: patuh dasar negara/negeri (tiada hutan, gambut, cerun curam)', 'Fail 13: Blueprint, Program, Minit Mesyuarat, Laporan', 13, 'minor', 1),
  ('4.1.2', '4.1.2.2', 'New planting: SIA, EIA, HCV, soil survey dijalankan', 'Fail 13: Laporan SIA/EIA/HCV; Fail 6: Stakeholder', 13, 'minor', 2),
  ('4.1.2', '4.1.2.3', 'New planting: SIA merujuk Garis Panduan SIA', 'Fail 13: Laporan SIA', 13, 'minor', 3),
  ('4.1.2', '4.1.2.4', 'New planting: HCV merujuk Garis Panduan HCV', 'Fail 13: Laporan HCV', 13, 'minor', 4),
  ('4.1.2', '4.1.2.5', 'New planting: FPIC diperolehi', 'Fail 13: Dokumen FPIC', 13, 'minor', 5),
  ('4.1.4', '4.1.4.1', 'Replanting: analisis hasil, semak EIA/SIA/HCV & perjanjian tanah', 'Fail 13: Blueprint, Program Tanam Semula', 13, 'minor', 1),
  ('4.1.4', '4.1.4.2', 'Replanting: SIA, EIA, HCV dijalankan atau disemak semula', 'Fail 13: Laporan SIA/EIA/HCV', 13, 'minor', 2),
  ('4.1.4', '4.1.4.3', 'Replanting: pematuhan garis panduan MPOB bagi tanah gambut', 'Fail 13: Program Tanaman Semula, Minit Mesyuarat', 13, 'minor', 3)
) as i(kod_kriteria, kod, tajuk, bukti_wajib, fail_rujukan, jenis_klausa, susunan) on k.kod = i.kod_kriteria
on conflict (kriteria_id, kod) do nothing;

-- =====================================================
-- STORAGE BUCKET untuk bukti audit
-- =====================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bukti-audit', 'bukti-audit', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

drop policy if exists "Auditor muat naik bukti" on storage.objects;
create policy "Auditor muat naik bukti" on storage.objects for insert
  with check (bucket_id = 'bukti-audit' and auth.uid() is not null);

drop policy if exists "Auditor baca bukti" on storage.objects;
create policy "Auditor baca bukti" on storage.objects for select
  using (bucket_id = 'bukti-audit' and auth.uid() is not null);
