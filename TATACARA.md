# TATACARA KERJA — Sistem Audit MSPO

> Flow lengkap dari mula daftar sampai laporan selesai.
> Tarikh: 28 Mei 2026 | Untuk: MOHD SAIFOUL AZUAN BIN MOHD ISA

---

## OVERVIEW — Flow Keseluruhan

```
1. SETUP AKAUN          → Daftar / login pengguna
2. DAFTAR PUSAT OPERASI → Master data PO sekali sahaja
3. CIPTA AUDIT BARU     → Pilih PO + Lead + Auditor + tarikh
4. ISI CHECKLIST        → 74 item semakan ikut MS 2530-2-2
5. SEMAK NC + OFI       → Auto-jana dari status dapatan
6. MUKTAMADKAN AUDIT    → Closing + kira CAP due date
7. JANA LAPORAN PDF     → Cover + Summary + NCR Table + Side Notes
```

---

## Q&A TATACARA

### ❓ Q1: Macam mana nak login pertama kali?

**Step:**
1. Buka browser → `http://localhost:3000` (server kena running: `npm run dev`)
2. Klik **Daftar** (kalau belum ada akaun) atau **Log Masuk**
3. Email + password
4. Akaun pertama auto jadi `auditor` — kena update rol manual

**Untuk anda:** Login pakai `raidanroid@gmail.com` (rol = admin).

---

### ❓ Q2: Macam mana nak tambah pengguna baru (auditor)?

**Cara A — Auditor sebenar yang akan login:**
1. Buka `http://localhost:3000/daftar`
2. Daftar email + password
3. Anda (admin) update rol di Supabase SQL Editor:
   ```sql
   update public.pengguna set rol = 'lead_auditor', nama_penuh = 'NAMA PENUH'
    where email = 'email@domain.com';
   ```

**Cara B — Auditor untuk LABEL sahaja (tak login):**
Sama macam Anuar/Ikhwan — minta Kilo cipta via SQL admin terus.

**Rol yang ada:**
- `admin` — kawalan penuh, boleh urus semua
- `lead_auditor` — boleh muktamadkan audit, urus PO
- `auditor` — boleh isi checklist sahaja
- `po_user` — pengguna pusat operasi (auditee), baca laporan sahaja

---

### ❓ Q3: Macam mana nak cipta Pusat Operasi baru?

**Step:**
1. Sidebar → **Pusat Operasi** → **+ Tambah PO**
2. Isi:
   - **Kod** (cth: PO13, PO14)
   - **Nama** (cth: PUSAT OPERASI BENTONG)
   - **Wilayah** (cth: Tengah 2)
   - Daerah, Negeri, Keluasan (opsyenal)
3. Klik **Cipta**

**12 PO sedia ada:** PO1-PO12 (Kuala Kangsar, Manjung, Tapah, Machang, Terengganu, Kuantan, Temerloh, Raub, Lipis, Melaka, Johor, Negeri Sembilan).

---

### ❓ Q4: Macam mana nak cipta audit baru?

**Step lengkap:**
1. Sidebar → **Audit** → **+ Audit Baru**
2. **Pusat Operasi:** pilih dari dropdown (12 pilihan)
3. **Lead Auditor:** pilih siapa yang akan tandatangan laporan
   - Default = anda sendiri (kalau admin/lead)
   - Boleh pilih sesiapa yang ada rol `admin` atau `lead_auditor`
4. **Auditor Pembantu:** tick checkbox sesiapa yang akan jadi anggota pasukan
   - Auto-exclude orang yang dah pilih sebagai Lead
   - Boleh kosong (audit solo)
5. **Tarikh Mula:** tarikh hari pertama audit
6. **Tarikh Tamat:** tarikh hari terakhir (opsyenal, default = sehari)
7. **Jenis Audit:** dropdown (Audit Dalaman, Pensijilan, Pengawasan, Persijilan Semula)
8. **Catatan:** bebas — skop, nota khas, dll
9. Klik **Cipta & Mula Checklist** — auto pergi ke page checklist

**No rujukan auto-jana** dengan format `MSPO-YYYYMM-NNNN`.

---

### ❓ Q5: Macam mana nak isi checklist audit?

**Setup:**
- Checklist ada **74 item** mengikut standard MS 2530-2-2:2022
- 5 Prinsip → 28 Kriteria → 74 Item Semakan

**Step per item:**
1. Klik tab **Buka Checklist** dari page audit
2. Pilih item dari senarai (boleh filter ikut Prinsip / Klausa / Status)
3. Set **Status** (mandatory):
   - **Y** = Ya, patuh
   - **N** = Tidak patuh
   - **NC** = Non-Conformity (perlu set gred Major/Minor)
   - **OFI** = Opportunity for Improvement
   - **NA** = Not Applicable
   - **Pending** = Belum jawab (default)
4. **Catatan** (mandatory untuk N/NC/OFI): kenyataan ketidakpatuhan
5. **Bukti Audit** (mandatory untuk N/NC): objective evidence
6. **Punca Akar** (NC sahaja): root cause analysis
7. **Cadangan Tindakan** (NC/OFI): tindakan pembetulan
8. **PIC** (NC): pegawai bertanggungjawab
9. **Tarikh Siap Target** (NC): jangkaan selesai
10. Save (auto-save bila tukar status)

**Auto-jana NC + OFI:**
- Setiap dapatan status `NC` → auto cipta entry dalam table `nc`
- Setiap dapatan status `OFI` → auto cipta entry dalam table `ofi`

---

### ❓ Q6: Macam mana nak ambil bukti foto?

**Status semasa:** Modul 3.2 (GPS/EXIF foto) **BELUM SIAP** — Task C dalam roadmap.

**Workaround sekarang:** Upload foto manual via field bukti dalam checklist (kalau ada UI muat naik), atau simpan dalam fail luar dan reference dalam `bukti_audit` text field.

---

### ❓ Q7: Macam mana nak muktamadkan audit (Closing)?

**Pra-syarat:**
- ✅ Anda ialah **admin** atau **lead_auditor** untuk audit ini
- ✅ Status audit BUKAN `draf` / `selesai` / `dibatalkan`
- ✅ TIADA dapatan status `Pending` (semua 74 item dah dijawab)

**Step:**
1. Buka page audit detail (`/audit/[id]`)
2. Panel kuning **"Mulakan Closing"** muncul di atas
3. Klik **Mulakan Closing**
4. Sistem tunjuk **Preview**:
   - Bilangan NC Major / NC Minor / OFI / Pending
   - Auto-detect gred (Major mengatasi Minor)
   - Anggaran tarikh akhir CAP
5. **Pilih Sumber Gred CAP:**
   - **Auto (Highest Finding)** — sistem ambil gred tertinggi automatik
   - **Manual Override (Lead Auditor)** — boleh turun gred dengan reason wajib (min 10 aksara) untuk audit trail MSPO
6. (Optional) Kalau pilih Manual:
   - Pilih gred: Major / Minor / Tiada CAP
   - Isi sebab override (cth: "Auditee bagi pembelaan dengan dokumen sokongan, Lead bersetuju turunkan gred")
7. Klik **Muktamadkan Sekarang**
8. Page refresh — muncul **Badge Countdown CAP** di atas

**Apa yang berlaku automatik (DB trigger):**
- `tarikh_muktamad` = `now()`
- `cap_grade_basis` = auto-detect (atau manual)
- `cap_due_date` = `tarikh_muktamad + 30 hari` (Major) atau `+ 90 hari` (Minor)
- `status` shift dari `sedang_dijalankan` → `menunggu_semakan`

---

### ❓ Q8: Macam mana nak baca status audit (English)?

**Sistem ada VIEW `audit_status_live`** yang map status BM → English:

| Status DB (BM) | Display (English) | Bila |
|----------------|-------------------|------|
| `draf` | **Draft** | Audit baru cipta |
| `dijadual` | **Scheduled** | Tarikh audit belum sampai |
| `dijadual` / `sedang_dijalankan` | **On-Site Evaluation** | Tarikh audit semasa berlangsung |
| `dijadual` / `sedang_dijalankan` | **Awaiting Closing** | Tarikh audit dah lepas tapi belum muktamadkan |
| `menunggu_semakan` | **Pending CAP** | Sudah muktamadkan, tunggu auditee submit CAP |
| `selesai` | **Completed** | Audit sepenuhnya selesai |
| `dibatalkan` | **Cancelled** | Audit dibatalkan |

Status display ni nampak di header page audit dan dashboard.

---

### ❓ Q9: Macam mana nak baca CAP Countdown?

**Selepas muktamadkan**, badge berwarna muncul atas page audit:

| Warna | Maksud | Contoh |
|-------|--------|--------|
| 🟢 Hijau | > 15 hari lagi | "85 hari lagi" |
| 🟡 Kuning | 6-15 hari | "10 hari lagi" |
| 🔴 Merah | ≤ 5 hari | "3 hari lagi (kritikal)" |
| ⚫ Merah gelap | Lewat | "LEWAT 5 hari" |

Selepas auditee submit CAP, status tukar ke `selesai` dan badge jadi grey.

---

### ❓ Q10: Macam mana nak jana laporan PDF?

**Step:**
1. Buka page audit detail
2. Klik butang **Lihat Laporan**
3. Klik **Muat Turun PDF** → fail download dengan nama `Laporan-MSPO-XXXXXX.pdf`

**PDF format Word — 4 halaman:**
1. **Cover** — RISDA org header, tajuk MSPO Internal Audit Report, info table (Type, Operating Unit, Reference No, Date, Scope, Lead Auditor, Auditor), Contents list, dual signature block
2. **Summary** — 4 perenggan introduction MS 2530-2-2:2022, jadual count NCR/OFI, "Proposed program / timing on closing of NCR"
3. **NCR/OFI Table** — Kolum: No | NCR Status | Juruaudit | Kenyataan Ketidakpatuhan | Klausa MSPO | Objective Evidence
4. **Side Notes** — 2 reminder MSPO (Management Review Meeting 4.1.10.1 + Latihan 4.1.5.1)

**Yang dipaparkan dalam PDF auto:**
- Lead Auditor name dari `audit.lead_auditor_id`
- Auditor list dari `audit.auditor_ids`
- Semua NC + OFI dari dapatan
- Tarikh audit, no rujukan, wilayah PO

---

### ❓ Q11: Macam mana nak padam audit?

**Pra-syarat:**
- ✅ Anda ialah **admin** atau **lead_auditor**
- ✅ Status audit = `draf` SAHAJA
- ❌ Tidak boleh padam audit yang dah `sedang_dijalankan` / `selesai` / `menunggu_semakan` / `dibatalkan`

**Step:**
1. Buka senarai audit
2. Cari audit draf → klik butang **Padam Draf** (warna merah)
3. Confirmation muncul → klik **Ya, Padam**
4. Audit + semua dapatan terkait dipadam (cascade)

**Audit trail kekal** dalam table `aktiviti` walaupun audit dipadam (dengan `audit_id = null` + rangkuman text yang ada no_rujukan).

---

### ❓ Q12: Macam mana nak tukar Lead Auditor untuk audit yang dah ada?

**Sekarang:** Belum ada UI untuk edit, kena update via SQL.

```sql
update public.audit
   set lead_auditor_id = (select id from public.pengguna where email = 'baru@domain.com')
 where no_rujukan = 'MSPO-XXX';
```

**Roadmap:** UI Edit Audit dalam task akan datang.

---

### ❓ Q13: Bila hari ini berdasarkan sistem?

Sistem guna **server time** (Supabase Cloud) untuk semua timestamp. Kalau anda kat Malaysia (UTC+8), timestamp UTC dalam DB akan auto-convert bila dipaparkan dalam UI.

Untuk testing, kalau perlu reset audit ke status sebelum closing:
```sql
update public.audit
   set status = 'sedang_dijalankan',
       tarikh_muktamad = null,
       cap_due_date = null,
       cap_due_days = null,
       cap_grade_basis = null,
       cap_grade_source = null,
       cap_grade_override_reason = null,
       cap_grade_overridden_by = null,
       cap_grade_overridden_at = null
 where id = '<audit_id>';
```

---

## STEP-BY-STEP — Audit dari A hingga Z

### FASA 1: PERSEDIAAN (sekali sahaja)

```
1.1 Login admin (raidanroid@gmail.com)
1.2 Pastikan PO sudah didaftar (12 PO sedia ada)
1.3 Pastikan auditor (Anuar, Saifoul, Ikhwan) sudah ada dalam pengguna table
```

### FASA 2: PERANCANGAN AUDIT (Modul 3.0 — Pra-Audit)

```
2.1 Sidebar → Audit → + Audit Baru
2.2 Pilih Pusat Operasi (cth: Kuala Kangsar)
2.3 Pilih Lead Auditor (cth: MOHD ANUAR BIN SAMSUDIN)
2.4 Tick Auditor Pembantu (cth: MOHD SAIFOUL AZUAN)
2.5 Set Tarikh Mula + Tarikh Tamat audit
2.6 Pilih Jenis Audit (Audit Dalaman)
2.7 Catatan: skop audit, nota khas
2.8 Klik Cipta & Mula Checklist
    → Auto generate no rujukan: MSPO-202605-XXXX
    → Status: draf
```

### FASA 3: PELAKSANAAN AUDIT (Modul 3.1 - 3.3)

**Modul 3.1 — Opening Meeting (UI BELUM SIAP — guna manual)**
```
3.1.1 Buka audit di page detail
3.1.2 Pertemuan dengan auditee (manual, di luar sistem)
3.1.3 Sahkan kehadiran (manual catatan)
```

**Modul 3.2 — Site Tour & Pemerhatian (UI BELUM SIAP)**
```
3.2.1 Audit lapangan (lawatan ladang/stor)
3.2.2 Ambil gambar bukti (manual, simpan dalam folder lain)
3.2.3 Catatan dalam buku log
```

**Modul 3.3 — Pengisian Checklist**
```
3.3.1 Klik Buka Checklist dari page audit
3.3.2 Untuk setiap 74 item:
      a. Pilih Status: Y / N / NC / OFI / NA
      b. Kalau NC, pilih Gred: Major / Minor
      c. Isi Catatan, Bukti Audit, Punca Akar (NC)
      d. Cadangan Tindakan + PIC + Tarikh Target (NC)
3.3.3 Pastikan SEMUA 74 item dijawab (tiada Pending)
3.3.4 Status audit auto-tukar ke sedang_dijalankan bila isi item pertama
```

### FASA 4: CLOSING & MUKTAMADKAN (Modul 3.4)

```
4.1 Buka page audit detail
4.2 Panel kuning "Mulakan Closing" muncul
4.3 Klik Mulakan Closing
4.4 Review preview:
    - Bilangan NC Major / Minor / OFI
    - Auto-detect gred (cth: MINOR)
    - Anggaran cap_due_date (cth: today + 90 hari)
4.5 Pilih sumber gred:
    - Auto (default)
    - Manual Override (kalau pembelaan auditee diterima)
4.6 Klik Muktamadkan Sekarang
4.7 Status audit → menunggu_semakan
4.8 Badge Countdown CAP muncul (90 hari tinggal)
```

### FASA 5: TINDAKAN PEMBETULAN (Modul 3.5 — UI BELUM SIAP)

```
5.1 Auditee terima notifikasi NC (manual via email/WhatsApp)
5.2 Auditee siapkan tindakan pembetulan
5.3 Auditee submit CAP (manual sekarang)
5.4 Lead Auditor verify CAP
5.5 Tukar status NC: open → closed → verified
5.6 Bila semua NC verified → Lead Auditor tukar status audit → selesai
```

### FASA 6: LAPORAN AKHIR

```
6.1 Buka page audit detail
6.2 Klik Lihat Laporan
6.3 Muat Turun PDF → 4 halaman lengkap
6.4 Hantar PDF kepada PO Manager + simpan dalam fail audit
```

---

## TROUBLESHOOTING

### Panel "Mulakan Closing" tidak muncul

| Sebab | Penyelesaian |
|-------|--------------|
| Bukan admin/lead_auditor | Login sebagai Lead Auditor yang betul |
| Status = draf | Mulakan checklist supaya status auto-tukar ke sedang_dijalankan |
| Status = selesai/dibatalkan | Audit dah closed — buat audit baru |
| Tarikh_muktamad sudah ada | Audit dah dimuktamadkan, tak boleh ulang |
| Ada dapatan Pending | Lengkapkan checklist dahulu |

### Senarai PO/Auditor tidak muncul dalam dropdown

| Sebab | Penyelesaian |
|-------|--------------|
| Anda bukan admin/lead/auditor | Naik taraf rol via SQL |
| Cache browser | Hard refresh (Ctrl+Shift+R) |
| Server tak running | `npm run dev` di `C:\Projects\mspo-audit` |

### PDF tak download

| Sebab | Penyelesaian |
|-------|--------------|
| Authentication expired | Logout & login semula |
| Audit status = draf | Mulakan checklist dahulu |
| Tiada dapatan | Isi minimum 1 item dalam checklist |

---

## INFO PENTING

- **Audit trail penuh:** Semua perubahan rekod dalam table `aktiviti` (auto via PostgreSQL trigger)
- **Tiada manual delete data audit lama** — kalau perlu rollback CAP, guna SQL
- **PDF guna data live** dari DB, bukan snapshot — bila edit dapatan, PDF auto reflect
- **CAP due date IMMUTABLE** selepas muktamadkan — kalau salah, kena rollback via SQL admin

---

## SOKONGAN

- **Sistem dev local:** `C:\Projects\mspo-audit`
- **Database:** Supabase Cloud (`lbklwflwiujdnuricxbt`)
- **Briefing folder:** `D:\JANET COWORKER\`
- **Progress log:** `C:\Projects\mspo-audit\PROGRESS.md`
- **Bila buka sesi Kilo baru:** taip *"Baca PROGRESS.md dan sambung kerja dari task yang belum siap"*

---

*Document version: 1.0 | Tarikh: 28 Mei 2026*
