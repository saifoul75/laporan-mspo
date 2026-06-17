UPDATE public.bank_jawapan SET punca_akar = '1. Polisi tidak ditandatangani pengurusan atasan - tiada tarikh kuat kuasa.
2. Polisi wujud tapi tidak dipamerkan di pejabat/stor/pondok rehat.
3. Polisi tidak disemak tahunan - kandungan lapuk.
4. Versi polisi tidak dikawal - ada berbilang versi bercanggah.
5. Pekerja tidak tahu kewujudan atau kandungan polisi MSPO.' WHERE klausa_kod = '4.1.1.1' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Polisi tidak merangkumi semua elemen wajib: etika, OSH, hak manusia, alam sekitar.
2. Tiada klausa penambahbaikan berterusan dalam polisi.
3. Polisi tidak mencerminkan operasi harian - copy-paste dari template.
4. Wakil pekerja tidak dirujuk semasa penggubalan polisi.
5. Polisi tidak diterjemah ke bahasa yang pekerja faham.' WHERE klausa_kod = '4.1.1.2' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Tiada mesyuarat MRM diadakan dalam tempoh 12 bulan terakhir.
2. MRM ada tapi tidak bincang isu luaran/dalaman MSPO.
3. Minit MRM tidak merekodkan keputusan atau tindakan susulan.
4. Kehadiran pengurusan atasan tidak direkodkan - tiada kuorum.
5. Pelan tindakan dari MRM lepas tidak dipantau atau ditutup.' WHERE klausa_kod = '4.1.10.1' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Penilaian tapak tidak dibuat sebelum tanam baru - hutan dikesan selepas tanam.
2. Tiada rujukan garis panduan MPOB untuk tanah gambut/cerun curam.
3. Kelulusan pihak berkuasa negeri/persekutuan tidak diperolehi.
4. Peta topografi dan soil map tidak dirujuk semasa perancangan.
5. Tanam baru dibuat di kawasan tanpa Survey Demarcation.' WHERE klausa_kod = '4.1.2.1' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. SIA tidak dijalankan - komuniti terjejas tidak dikenal pasti.
2. EIA tidak disediakan untuk kawasan melebihi ambang keluasan.
3. Penilaian HCV tidak dibuat - kawasan HCV tidak dikenal pasti.
4. Soil survey tidak lengkap - kesesuaian tanah tidak dinilai.
5. Perunding yang dilantik tidak bertauliah MPOB/MSPO.' WHERE klausa_kod = '4.1.2.2' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. SIA dijalankan tapi tidak ikut Garis Panduan SIA MSPO terkini.
2. Data asas sosial tidak dikumpul sebelum projek mula.
3. Konsultasi dengan komuniti terjejas tidak dibuat.
4. Tiada penilaian impak ke atas tanah adat/NCR.
5. Laporan SIA tidak disemak oleh jabatan perladangan sebelum kelulusan.' WHERE klausa_kod = '4.1.2.3' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Penilaian HCV tidak merujuk Garis Panduan HCV MSPO.
2. Penilai HCV tidak berdaftar dengan MPOB/MSPO.
3. Kawasan HCV tidak dipetakan dengan GPS/koordinat.
4. Spesies flora/fauna terancam tidak direkodkan.
5. Pelan pengurusan HCV tidak disediakan selepas penilaian.' WHERE klausa_kod = '4.1.2.4' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Proses FPIC tidak dijalankan sebelum projek bermula.
2. Komuniti terjejas tidak diberi notis atau maklumat projek.
3. Tiada rekod bertulis persetujuan atau persetujuan bersyarat.
4. FPIC dijalankan tapi guna bahasa/format yang komuniti tak faham.
5. Tiada pihak ketiga bebas sebagai saksi proses FPIC.' WHERE klausa_kod = '4.1.2.5' AND status = 'NC';
UPDATE public.bank_jawapan SET punca_akar = ''' + "1. SOP operasi tiada langsung - pekerja ikut arahan lisan sahaja.\n2. SOP wujud tapi tidak merangkumi semua aktiviti ladang.\n3. SOP tidak dikemaskini - masih guna prosedur lama.\n4. Rekod pelaksanaan SOP tidak disimpan atau tidak lengkap.\n5. Pernyataan tanggungjawab tidak dinyatakan dalam setiap SOP." + @"' WHERE klausa_kod = '4.1.3.1' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Cerun curam >25 darjah tidak dikenal pasti dalam peta ladang.
2. Tiada penilaian risiko hakisan/landslide dijalankan.
3. Papan tanda amaran kawasan cerun tidak dipasang.
4. Tiada pelan mitigasi hakisan - parit/silt trap tiada.
5. Pemantauan berkala cerun tidak dijadualkan atau direkodkan.' WHERE klausa_kod = '4.1.3.2' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Tanah gambut tidak dikenal pasti - tiada peta jenis tanah.
2. Paras air tidak dipantau - tiada water level gauge dipasang.
3. Tiada pelan pengurusan api untuk kawasan gambut.
4. Tiada rekod bacaan paras air mingguan/bulanan.
5. Pekerja tidak dilatih tentang risiko kebakaran tanah gambut.' WHERE klausa_kod = '4.1.3.3' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Papan tanda blok tidak dipasang di lapangan.
2. Maklumat papan tanda tidak lengkap - tiada luas/tarikh tanam/klon.
3. Papan tanda lama/rosak tidak diganti.
4. Format papan tanda tidak seragam antara blok.
5. Tiada PIC bertanggungjawab untuk penyelenggaraan papan tanda.' WHERE klausa_kod = '4.1.3.4' AND status = 'NC';
UPDATE public.bank_jawapan SET punca_akar = '1. Konsep IPM tidak difahami oleh pekerja ladang.
2. Racun digunakan tanpa semak ambang ekonomi perosak.
3. Tiada rekod pemantauan populasi perosak (pest census).
4. Agen biologi (beneficial insects) tidak digunakan.
5. Jadual semburan racun tetap tanpa analisis keperluan.' WHERE klausa_kod = '4.1.3.5' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Analisis hasil dan umur pokok tidak dibuat sebelum replanting.
2. EIA/SIA tidak disemak semula untuk kawasan replant.
3. Penilaian HCV tidak dikemas kini untuk fasa replant.
4. Perjanjian tanah tidak disahkan masih sah.
5. Bajet replanting tidak mengambil kira kos sosial/alam sekitar.' WHERE klausa_kod = '4.1.4.1' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. SIA tidak dijalankan untuk projek replanting.
2. EIA tidak dikemas kini walaupun skop berubah.
3. Penilaian HCV tidak disemak selepas kitaran tanam sebelumnya.
4. Kajian impak tidak mengambil kira perubahan landskap.
5. Pihak berkuasa tidak dimaklumkan tentang aktiviti replant.' WHERE klausa_kod = '4.1.4.2' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Tanah gambut dikenal pasti tapi pelan pengurusan tiada.
2. Replanting di tanah gambut tanpa patuh garis panduan MPOB.
3. Sistem saliran/paras air tanah gambut tidak diurus.
4. Tiada pemantauan penenggelaman tanah (subsidence).
5. Risiko kebakaran gambut tidak dinilai semasa replanting.' WHERE klausa_kod = '4.1.4.3' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Huraian kerja tiada - pekerja tidak tahu skop tugas mereka.
2. Analisis Keperluan Latihan (TNA) tidak dijalankan.
3. Latihan MSPO tidak dikenal pasti sebagai keperluan wajib.
4. Latihan OSH dan hak kanak-kanak tiada dalam TNA.
5. Keperluan latihan tidak dikaitkan dengan penilaian prestasi.' WHERE klausa_kod = '4.1.5.1' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Pelan latihan tahunan tidak diwujudkan.
2. Latihan dijalankan tapi tiada penilaian keberkesanan (pre/post-test).
3. Kekerapan latihan tidak mencukupi - cuma sekali setahun.
4. Topik latihan tidak meliputi semua prinsip MSPO.
5. Rekod kehadiran latihan tidak disimpan.' WHERE klausa_kod = '4.1.5.2' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Kontrak kontraktor tidak mensyaratkan latihan MSPO/OSH.
2. Kontraktor tidak dijemput ke sesi latihan dalaman.
3. Tiada latihan berasingan untuk pekerja kontraktor.
4. Rekod latihan kontraktor tidak disimpan di ladang.
5. Kontraktor tidak sedar keperluan MSPO yang terpakai.' WHERE klausa_kod = '4.1.5.3' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Pelan perniagaan tidak mempunyai peruntukan bajet sosial/alam sekitar.
2. Dokumen pelan perniagaan lapuk - tidak disemak tahunan.
3. Pelan hanya fokus pengeluaran BTS - abaikan aspek lestari.
4. Input dari jabatan bukan pengeluaran tidak diambil kira.
5. Tiada mekanisme semak pencapaian pelan perniagaan.' WHERE klausa_kod = '4.1.6.1' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Program tanam semula tidak dirancang - dibuat secara ad-hoc.
2. Tiada unjuran hasil dan analisis umur pokok.
3. Jadual tanam semula tidak disemak secara berkala.
4. Pemilihan klon/varieti baru tidak berdasarkan data prestasi.
5. Tiada pelan kontingensi untuk kegagalan tanam semula.' WHERE klausa_kod = '4.1.6.2' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Kajian tahunan program tanam semula tidak dijadualkan.
2. Data prestasi tanam semula tidak dikumpul atau dianalisis.
3. Faktor pasaran (harga BTS, kos input) tidak diambil kira.
4. Laporan prestasi tanam semula tidak dibentang ke pengurusan.
5. Tiada pelan penambahbaikan dari semakan tahun lepas.' WHERE klausa_kod = '4.1.6.3' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Senarai komuniti sekitar ladang tidak dikenal pasti.
2. Tiada jadual konsultasi/mesyuarat dengan komuniti.
3. Program CSR/sumbangan komuniti tidak direkodkan.
4. Aduan atau permintaan komuniti tidak disusuli.
5. Tiada PIC dilantik untuk urusan komuniti.' WHERE klausa_kod = '4.1.7.1' AND status = 'NC';
UPDATE public.bank_jawapan SET punca_akar = '1. Peti aduan fizikal tidak disediakan di lokasi strategik.
2. Prosedur aduan tidak diwujudkan atau tidak dimaklumkan.
3. Identiti pemberi maklumat tidak dilindungi.
4. Tiada jaminan tiada tindakan balas (whistleblower protection).
5. Pekerja/komuniti tidak tahu cara dan saluran aduan.' WHERE klausa_kod = '4.1.8.1' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Tiada borang standard untuk merekod aduan.
2. Aduan direkod tapi tindakan susulan tidak diambil.
3. Status aduan tidak dikemaskini - tiada sistem tracking.
4. Tempoh penyelesaian aduan melebihi SLA yang ditetapkan.
5. Resolusi aduan tidak dimaklumkan semula kepada pengadu.' WHERE klausa_kod = '4.1.8.2' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Rekod aduan hanya disimpan kurang dari 24 bulan - dibuang awal.
2. Tiada sistem fail untuk simpanan rekod aduan.
3. Rekod aduan lama tidak dikategorikan atau diindeks.
4. Tempoh minima 24 bulan tidak dimaklumkan kepada PIC.
5. Rekod aduan bercampur dengan dokumen lain - sukar dikesan.' WHERE klausa_kod = '4.1.8.3' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Tiada juruaudit dalaman dilantik atau dilatih.
2. Jadual audit dalaman tahunan tidak disediakan.
3. Juruaudit dalaman tiada sijil kursus MSPO.
4. Skop audit tidak meliputi semua prinsip MSPO.
5. Laporan audit dalaman tidak dibentang ke pengurusan.' WHERE klausa_kod = '4.1.9.1' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Juruaudit tidak dilatih teknik Root Cause Analysis.
2. BTP (Borang Tindakan Pembetulan) tidak digunakan.
3. Analisis dibuat secara cetek - hanya guna human error sebagai punca.
4. Tiada penggunaan alat RCA seperti 5 Whys, Fishbone, Pareto.
5. Tindakan pencegahan tidak berbeza dari tindakan pembetulan.' WHERE klausa_kod = '4.1.9.2' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Tiada prosedur komunikasi bertulis untuk pihak berkepentingan.
2. Prosedur hanya dalam BM - pekerja asing tidak faham.
3. Prosedur tidak dipamerkan di lokasi umum.
4. Saluran komunikasi tidak mengambil kira pekerja buta huruf.
5. Tiada semakan keberkesanan komunikasi dijalankan.' WHERE klausa_kod = '4.2.1.1' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Senarai pemegang taruh tidak disediakan langsung.
2. Stakeholder baru tidak dikemaskini dalam senarai.
3. Kategori stakeholder tidak dikelaskan (dalaman/luaran).
4. Kepentingan dan pengaruh stakeholder tidak dinilai.
5. Tiada rekod interaksi dengan setiap stakeholder.' WHERE klausa_kod = '4.2.1.2' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Tiada surat lantikan rasmi untuk PIC Komunikasi.
2. PIC Komunikasi tidak tahu tanggungjawab mereka.
3. PIC tiada latihan dalam komunikasi atau pengurusan aduan.
4. PIC tidak dikenal pasti dalam carta organisasi ladang.
5. Tiada pelaporan berkala dari PIC Komunikasi ke pengurusan.' WHERE klausa_kod = '4.2.1.3' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Maklumat awam (laporan prestasi) tidak dihasilkan.
2. Tiada mekanisme permintaan maklumat oleh pihak luar.
3. Maklumat dipegang oleh HQ - tidak tersedia di ladang.
4. Format maklumat tidak mesra pengguna.
5. Tempoh respons permintaan maklumat tidak ditetapkan.' WHERE klausa_kod = '4.2.1.4' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Prosedur kebolehjejakan tidak diwujudkan.
2. Borang pemantauan traceability tidak digunakan.
3. Pekerja tidak dilatih cara isi borang traceability.
4. Rekod aliran BTS dari blok ke pembeli tidak lengkap.
5. Tiada sistem digital/kertas untuk jejak TBS.' WHERE klausa_kod = '4.2.2.1' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Chit jualan BTS tidak disimpan atau hilang.
2. Resit timbang jualan tidak direkodkan.
3. Nombor chit tidak berurutan - rekod tidak lengkap.
4. Pembeli tidak dikenali pasti dalam rekod jualan.
5. Tiada pemetaan blok ke pembeli untuk traceback.' WHERE klausa_kod = '4.2.2.2' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Pengurus Kumpulan tidak dilantik secara rasmi.
2. Tiada surat lantikan atau terma rujukan PIC.
3. PIC tidak tahu tugas kebolehjejakan mereka.
4. Tiada mekanisme pelaporan dari PIC ke pengurusan.
5. PIC tidak dilatih tentang keperluan MSPO traceability.' WHERE klausa_kod = '4.2.2.3' AND status = 'NC';
UPDATE public.bank_jawapan SET punca_akar = '1. Mekanisme penetapan harga tidak didokumenkan.
2. Harga BTS tidak dikaitkan dengan harga pasaran MPOB.
3. Pembekal input tidak ada kontrak bertulis.
4. Rekod bayaran kepada pembekal tidak disimpan.
5. Tiada semakan ketelusan harga secara berkala.' WHERE klausa_kod = '4.2.3.1' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Polisi anti-rasuah tidak diwujudkan.
2. Polisi wujud tapi tidak ditandatangani pengurusan atasan.
3. Polisi tidak dikomunikasikan kepada semua pekerja.
4. Tiada mekanisme pelaporan salah laku.
5. Polisi tidak merujuk Akta SPRM atau undang-undang anti-rasuah.' WHERE klausa_kod = '4.2.4.1' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Tiada program latihan etika/anti-rasuah untuk kakitangan.
2. Pemantauan pematuhan etika tidak dijalankan.
3. Pelanggaran etika tidak disiasat atau direkodkan.
4. Rekod latihan etika tidak disimpan.
5. Tiada pelaporan tahunan pematuhan etika ke pengurusan.' WHERE klausa_kod = '4.2.4.2' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Senarai undang-undang/akta berkaitan tidak disediakan.
2. Undang-undang baru/pindaan tidak dipantau.
3. Senarai hanya ada akta buruh - tiada akta alam sekitar.
4. Tiada langganan pangkalan data perundangan.
5. PIC undang-undang tidak dikenal pasti.' WHERE klausa_kod = '4.3.1.1' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Tiada jadual pemantauan pematuhan undang-undang.
2. Audit pematuhan tidak dijalankan secara berkala.
3. Hasil pemantauan tidak direkodkan atau dilaporkan.
4. Ketidakpatuhan dikenal pasti tapi tiada tindakan.
5. PIC pemantauan tidak dilatih keperluan undang-undang.' WHERE klausa_kod = '4.3.1.2' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Geran/pajakan tanah tidak ada dalam simpanan.
2. Dokumen hak guna tanah tamat tempoh.
3. Nama pemilik dalam geran tidak sepadan dengan operasi.
4. Tiada salinan disahkan - hanya salinan fotostat.
5. Pertikaian tanah masih belum selesai.' WHERE klausa_kod = '4.3.2.1' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Pampasan tidak dirunding - jumlah ditetapkan sebelah pihak.
2. Tiada perjanjian bertulis antara pihak.
3. Penilaian pampasan tidak guna penilai bebas.
4. Pembayaran pampasan tidak direkodkan.
5. Penerima pampasan tidak dikenal pasti dengan betul.' WHERE klausa_kod = '4.3.2.2' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Proses FPIC tidak dijalankan - keputusan dibuat tanpa komuniti.
2. Maklumat projek tidak dikongsi sebelum FPIC.
3. Tiada rekod persetujuan bertulis atau bersyarat.
4. Bahasa/format FPIC tidak difahami komuniti.
5. Mekanisme aduan semasa FPIC tidak disediakan.' WHERE klausa_kod = '4.3.2.3' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Sempadan ladang tidak ditanda dengan jelas.
2. Pencerobohan dari luar dikesan tapi tidak dilapor.
3. Peta sempadan tidak dikemaskini selepas perubahan.
4. Batu sempadan hilang atau rosak.
5. Tiada rondaan sempadan dijadualkan.' WHERE klausa_kod = '4.3.2.4' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Kawasan Hak Adat Tempatan (NCR) tidak dikenal pasti.
2. Tiada konsultasi dengan pemilik adat sebelum aktiviti.
3. Tiada rekod persetujuan bertulis dengan komuniti NCR.
4. Tanah NCR dimasuki tanpa kebenaran.
5. Tiada PIC hal ehwal NCR di peringkat ladang.' WHERE klausa_kod = '4.3.3.1' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Peta kawasan hak adat tidak dihasilkan.
2. Peta wujud tapi skala tidak sesuai untuk kegunaan lapangan.
3. Peta tidak diedarkan kepada pihak berkepentingan.
4. Koordinat GPS sempadan NCR tidak direkodkan.
5. Peta tidak dikemaskini selepas perubahan sempadan.' WHERE klausa_kod = '4.3.3.2' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Pelaksanaan FPIC tidak direkodkan langsung.
2. Perjanjian tidak ditandatangani oleh kedua-dua pihak.
3. Salinan perjanjian tidak diberi kepada komuniti.
4. Tiada saksi bebas semasa tandatangan perjanjian.
5. Rekod perjanjian tidak disimpan di tempat selamat.' WHERE klausa_kod = '4.3.3.3' AND status = 'NC';
UPDATE public.bank_jawapan SET punca_akar = '1. SIA tidak dijalankan sebelum operasi dimulakan.
2. SIA dijalankan tapi tidak ikut Garis Panduan SIA MSPO.
3. Data asas sosial (demografi, ekonomi) tidak dikumpul.
4. Tiada konsultasi dengan komuniti terjejas.
5. Laporan SIA tidak mengandungi pelan mitigasi impak.' WHERE klausa_kod = '4.4.1.1' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Polisi KKP tidak diwujudkan - tiada dokumen bertulis.
2. Polisi KKP wujud tapi tidak diluluskan pengurusan.
3. Polisi tidak dipamerkan di tempat kerja.
4. Kandungan polisi tidak merujuk Akta KKP 1994.
5. Pekerja tidak dapat menyatakan kandungan polisi KKP.' WHERE klausa_kod = '4.4.2.1' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. HIRARC tidak dijalankan untuk setiap aktiviti.
2. Pekerja tidak terlibat dalam penyediaan HIRARC.
3. Kawalan risiko tidak ikut hierarki (hapus > ganti > kawal > PPE).
4. HIRARC tidak dikemaskini bila ada aktiviti baru.
5. Penilaian risiko tidak mengambil kira kontraktor.' WHERE klausa_kod = '4.4.2.2' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Tiada rekod kemalangan di tempat kerja.
2. PPE diedar tapi rekod pengedaran tidak disimpan.
3. Peti first aid tidak diselenggara atau isi tamat tempoh.
4. Latihan ERT dijalankan tanpa rekod bertulis.
5. Statistik kemalangan tidak dianalisis untuk penambahbaikan.' WHERE klausa_kod = '4.4.2.3' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Tiada kontrak pekerjaan bertulis untuk pekerja.
2. Gaji dibayar bawah kadar minima yang ditetapkan.
3. Waktu kerja melebihi had Akta Kerja 1955.
4. Cuti tahunan/sakit tidak diberikan.
5. Polisi pekerjaan tidak merangkumi pekerja asing.' WHERE klausa_kod = '4.4.3.1' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Rekod pekerja tidak lengkap - maklumat peribadi tiada.
2. Pekerja kontraktor tidak direkodkan dalam sistem.
3. Dokumen pengenalan (IC/passport) tidak disalin.
4. Rekod tidak dikemaskini bila pekerja berhenti/masuk baru.
5. Tiada sistem pangkalan data pekerja.' WHERE klausa_kod = '4.4.3.2' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Pemeriksaan perumahan tidak dijalankan.
2. Piawaian perumahan tidak diketahui PIC.
3. Aduan penghuni tentang keadaan rumah tidak diambil tindakan.
4. Pemeriksaan dibuat tanpa senarai semak standard.
5. Rekod pemeriksaan tidak disimpan untuk audit.' WHERE klausa_kod = '4.4.3.5' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Jadual pemeriksaan rumah pekerja tidak wujud.
2. Senarai semak pemeriksaan tidak disediakan.
3. Hasil pemeriksaan tidak direkodkan.
4. Kerosakan dikenal pasti tapi tidak dibaiki.
5. PIC pemeriksaan perumahan tidak dilantik.' WHERE klausa_kod = '4.4.4.1' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Polisi alam sekitar tidak diwujudkan.
2. Polisi tidak ditandatangani pengurusan atasan.
3. Polisi tidak dikomunikasikan kepada pekerja/kontraktor.
4. Kandungan polisi tidak merangkumi biodiversiti dan HCV.
5. Polisi tidak merujuk Akta Kualiti Alam Sekeliling 1974.' WHERE klausa_kod = '4.5.1.1' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. EAI tidak dijalankan langsung.
2. Aspek alam sekitar (sisa, air, tanah, udara) tidak dikenal pasti.
3. Impak setiap aspek tidak dinilai (severity x likelihood).
4. Kawalan sedia ada tidak dikenal pasti dalam EAI.
5. EAI tidak dikemaskini bila ada perubahan operasi.' WHERE klausa_kod = '4.5.1.2' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Pelan pengurusan alam sekitar tidak diwujudkan.
2. Pelan tidak berdasarkan keputusan EAI.
3. Objektif/Sasaran alam sekitar tidak ditetapkan.
4. Tiada peruntukan sumber untuk pelaksanaan pelan.
5. Pelan tidak disemak atau dikemaskini tahunan.' WHERE klausa_kod = '4.5.1.3' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Tiada analisis keperluan latihan alam sekitar.
2. Modul latihan alam sekitar tidak disediakan.
3. Latihan tidak dijadualkan dalam pelan tahunan.
4. Rekod kehadiran latihan alam sekitar tiada.
5. Keberkesanan latihan tidak dinilai (pre/post test).' WHERE klausa_kod = '4.5.1.4' AND status = 'NC';
UPDATE public.bank_jawapan SET punca_akar = '1. Tiada sistem rekod penggunaan tenaga.
2. Bil elektrik/diesel/petrol tidak dikumpul.
3. Data penggunaan tenaga tidak dianalisis (trend, peak usage).
4. Unit ukuran tidak seragam (liter, kWj, RM).
5. Tiada PIC dilantik untuk pemantauan tenaga.' WHERE klausa_kod = '4.5.2.1' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Tiada pelan penggunaan tenaga boleh diperbaharui.
2. Sumber tenaga alternatif (solar, biogas) tidak dikenal pasti.
3. Tiada sasaran pengurangan tenaga ditetapkan.
4. Pelan penjimatan tenaga tidak dikomunikasikan.
5. Tiada bajet diperuntukkan untuk projek tenaga hijau.' WHERE klausa_kod = '4.5.2.2' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Senarai jenis sisa ladang tidak disediakan.
2. Rekod kitar semula (frond, EFB, POME) tidak disimpan.
3. Sisa tidak diasingkan - bercampur dalam satu longgokan.
4. Pelupusan sisa tidak mengikut Environmental Quality Act.
5. Pekerja tidak dilatih pengurusan sisa.' WHERE klausa_kod = '4.5.3.1' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. MSDS/SDS untuk setiap bahan kimia tidak tersedia di stor.
2. Stor racun tidak berkunci atau tidak ada ventilation.
3. Bekas racun kosong tidak triple-rinse atau dilupus bertauliah.
4. Pekerja sembur racun tidak guna PPE lengkap.
5. Rekod penggunaan racun tidak mencatat dos, tarikh, dan nozzle.' WHERE klausa_kod = '4.5.3.2' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Tiada tong sampah disediakan di kawasan pekerja.
2. Sisa domestik tidak dikutip secara berjadual.
3. Pekerja tidak dilatih tentang kebersihan persekitaran.
4. Rekod kutipan sampah tidak disimpan.
5. Tapak pelupusan sampah tidak diurus dengan betul.' WHERE klausa_kod = '4.5.3.3' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Data pelepasan GHG tidak dikira.
2. Metodologi kiraan GHG tidak diketahui.
3. Pelan pengurangan GHG tidak dibangunkan.
4. Sumber utama pelepasan tidak dikenal pasti.
5. Tiada sasaran pengurangan tahunan ditetapkan.' WHERE klausa_kod = '4.5.4.1' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Sumber air domestik tidak dikenal pasti.
2. Ujian kualiti air tidak dijalankan (bakteria, logam berat).
3. Rekod bacaan meter air tidak disimpan.
4. Tiada pelan penjimatan air atau kitar semula air.
5. Pekerja tidak dilatih tentang konservasi air.' WHERE klausa_kod = '4.5.5.1' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Zon penampan sungai tidak ditanda dengan jelas.
2. Racun/baja digunakan dalam lingkungan zon penampan.
3. Tanaman ditanam terlalu hampir dengan tebing sungai.
4. Tiada pemantauan berkala kualiti air sungai.
5. Pekerja tidak tahu lebar minima zon penampan.' WHERE klausa_kod = '4.5.5.2' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Laporan biodiversiti tidak disediakan.
2. Kawasan Konservasi Tinggi (HCV) tidak dikenal pasti.
3. Penilai HCV tidak bertauliah.
4. Data flora dan fauna terancam tiada.
5. Pelan pengurusan HCV tidak diwujudkan.' WHERE klausa_kod = '4.5.6.1' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Inventori flora/fauna tidak dijalankan.
2. Spesies terancam dalam IUCN Red List tidak dikenal pasti.
3. Data asas biodiversiti tidak dikemaskini tahunan.
4. Tiada database/sistem untuk simpan rekod biodiversiti.
5. Kakitangan tidak dilatih untuk kenal pasti spesies penting.' WHERE klausa_kod = '4.5.6.2' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Kawasan cerun, sungai, gambut tidak dipetakan.
2. Tiada tanda sempadan fizikal untuk kawasan sensitif.
3. Pemantauan berkala tidak dijadualkan.
4. Rekod pemantauan tidak disimpan.
5. Perubahan status kawasan sensitif tidak dilaporkan.' WHERE klausa_kod = '4.5.6.3' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Tiada modul latihan HCV/biodiversiti.
2. Kakitangan tidak tahu kawasan HCV di ladang mereka.
3. Latihan HCV tidak dijadualkan tahunan.
4. Rekod latihan HCV tiada.
5. Keberkesanan latihan tidak dinilai.' WHERE klausa_kod = '4.5.6.4' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Polisi zero burning tidak diwujudkan.
2. Polisi wujud tapi tidak dipamerkan.
3. Pekerja/kontraktor tidak dilatih larangan bakar.
4. Aktiviti pembakaran masih dikesan di ladang.
5. Tiada sanksi atau tindakan untuk pelanggaran polisi.' WHERE klausa_kod = '4.5.7.1' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. Tiada rekod pemantauan pematuhan polisi bakar.
2. Jadual rondaan pencegahan kebakaran tiada.
3. Alat pemadam api tidak diselenggara.
4. Rekod latihan kebakaran tidak disimpan.
5. Insiden kebakaran tidak disiasat atau dilaporkan.' WHERE klausa_kod = '4.5.7.2' AND status = 'NC';

UPDATE public.bank_jawapan SET punca_akar = '1. ERP tidak diwujudkan.
2. Pasukan ERT tidak dibentuk.
3. Latihan kebakaran/kecemasan tidak dijalankan.
4. Alat pemadam api tidak mencukupi atau tamat tempoh.
5. Pelan laluan kecemasan tidak dipamerkan.' WHERE klausa_kod = '4.5.7.3' AND status = 'NC';
