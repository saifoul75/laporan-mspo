# Apps Script — Sync Hasil Ladang RISDA

> Walk folder Google Drive → baca sheet TAPAH setiap PO → upsert ke Supabase `hasil_bulanan_src`.

## Kenapa Apps Script (bukan Vercel)?

- Akses Drive natif — Apps Script jalan dalam akaun Google, tak perlu share folder ke service account.
- Kuota lega + trigger natif — time-driven harian, tak risau timeout 10-60s had Vercel.
- Konsisten dengan backup sedia ada yang sudah guna Apps Script.

## Setup (sekali sahaja)

### 1. Cipta Apps Script project baru

- Buka https://script.google.com → **New Project**.
- Namakan: `RISDA Sync Hasil Ladang`.
- Paste fail dari folder `apps-script/`:
  - `config.gs` → tab `Code.gs` (padam kod lalai, paste)
  - `Code.gs` → tab `Code.gs` (ganti dengan ini — padam config dulu)

Atau gunakan `clasp` (disyorkan untuk versi-kawalan):

```bash
npm install -g @google/clasp
clasp login
clasp create --type standalone --title "RISDA Sync Hasil Ladang"
clasp push
```

### 2. Set Script Properties

Pergi ke **Project Settings → Script Properties** dan tambah:

| Key                          | Value                                          | Contoh                                  |
| ---------------------------- | ---------------------------------------------- | --------------------------------------- |
| `SUPABASE_URL`               | URL projek Supabase                            | `https://lbklwflwiujdnuricxbt.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY`  | Service role key (Settings → API)              | `eyJhbGciOi...` (Jangan kongsi!)        |
| `SUPABASE_ROOT_FOLDER_ID`    | ID folder HQ Google Drive                      | `1BVi7AYsvbBGEoIA541Ev1YVhRa2MA8JX`     |
| `TAHUN_SYNC`                 | Tahun data untuk sync                          | `2026`                                  |
| `AUDIT_LOG_SHEET_ID`         | ID spreadsheet untuk log audit (opsyenal)      | -                                       |

> ⚠️ **JANGAN simpan SERVICE_ROLE_KEY dalam fail .gs atau commit ke git.**
> Ia hanya untuk server-side (Apps Script / Vercel env).

### 3. Uji satu PO dulu (UTARA → TAPAH)

```javascript
// Dalam Apps Script editor
syncPO('TAPAH', 2026);
```

Periksa:
- Tiada error di Logger.
- Buka Supabase Table Editor → `hasil_bulanan_src` → tapis `pusat_operasi_final = 'TAPAH' AND tahun = 2026`.
- Bandingkan bil baris dengan sheet TAPAH (5 projek sawit × 12 bulan = max 60 baris sawit, dll).

### 4. Uji wilayah UTARA (6 PO)

```javascript
syncUtara(2026);
```

Kriteria lulus:
- ✅ Run 2× → bil baris sama (upsert, bukan insert duplicate).
- ✅ Data sejarah 2020-2025 di `hasil_bulanan_src` tidak terjejas.
- ✅ Sel kosong di sheet tidak jadi baris dalam DB.
- ✅ v_capai_matlamat untuk TAPAH (Jan 2026 GESIR 1) = 70.50% (kiraan manual).

### 5. Aktifkan sync harian (selepas UTARA lulus)

Buka **Triggers** di kiri Apps Script editor:

| Field              | Value                              |
| ------------------ | ---------------------------------- |
| Function           | `syncSemuaWilayah`                 |
| Deployment         | `Head`                             |
| Event source       | `Time-driven`                      |
| Type               | `Day timer`                        |
| Time               | antara 2am - 3am (MYT)             |

Klik **Save**. Akan muncul notifikasi e-mel bila sync gagal.

## Senarai PO → Wilayah (automatik dari CONFIG.PO_WILAYAH)

| Wilayah | PO                                                              |
| ------- | --------------------------------------------------------------- |
| UTARA   | KUALA KANGSAR, MANJUNG, TAPAH, GERIK, KEDAH UTARA, KEDAH SELATAN |
| TIMUR   | KUALA BERANG, MACHANG                                            |
| TENGAH  | KUANTAN, LIPIS, RAUB, ROMPIN, TEMERLOH                          |
| SELATAN | JOHOR, MELAKA, N.SEMBILAN                                       |

## Anatomi Sheet TAPAH (dijangka)

```
A                 B              C              D           E..P        Q
─────────────────────────────────────────────────────────────────────────────
HASIL SAWIT (MT)
BIL    NAMA PROJEK        LUAS BERHASIL   SASARAN       JAN..DEC    JUMLAH
1      TSK ME Sg Keroh    69.0294         918.09        54.4 ...    1100.50
2      TSK ME Kpg Rasau   80.0            960.0         22.82...    800.30
...
JUMLAH
HASIL GETAH (kg)
BIL    NAMA PROJEK        LUAS BERHASIL   SASARAN       JAN..DEC    JUMLAH
1      TSK LEREK          20.0            200.0         0 ...       50.0
```

Penanda teks **wajib**:
- `HASIL SAWIT` (atau `HASIL SAWIT (MT)`) → mula blok sawit
- `HASIL GETAH` (atau `HASIL GETAH (kg)`) → mula blok getah
- `JUMLAH` → henti blok

Sel kosong/dash → **langkau** (tidak jadi baris).

## Skema DB Target

- **Table**: `public.hasil_bulanan_src`
- **UNIQUE**: `(tahun, bulan, pusat_operasi_final, nama_projek, jenis)` ← untuk upsert
- **Lajur diisi**: `tahun, jenis, unit, bulan, bulan_nama, kod_bulan, pusat_operasi, pusat_operasi_master, pusat_operasi_final, wilayah, nama_projek, luas_kawasan_hek, luas_produktif_hek, hasil`

Lajur `in_master_2026`, `kategori`, `kategori_master`, `bilangan_peserta`, `negeri` tidak diisi dari Apps Script (auto-kemudian via view atau migration).

## Tambah Tahun Baru (cth 2027)

1. Update Script Property `TAHUN_SYNC` ke `2027`.
2. Tambah baris baru dalam `projek_ref` untuk tahun 2027 (SQL Admin — di luar skop Apps Script).
3. Tambah baris baru dalam `matlamat_projek` jika peratusan berubah (opsyenal — biasanya sama).
4. Run `syncSemuaWilayah(2027)` sekali untuk populate.
5. Trigger harian akan automatik sync 2027 selepas itu.

Tiada perubahan struktur DB diperlukan — tambah baris tahun=2027 sahaja.

## Fail dalam Folder Ini

| Fail          | Tujuan                                                       |
| ------------- | ------------------------------------------------------------ |
| `config.gs`   | Konfigurasi statik (PO, wilayah, lajur bulan, nama kanonik). |
| `Code.gs`     | Walk folder + extract + upsert + audit log.                  |
| `README.md`   | Dokumen ini.                                                 |

## Troubleshooting

| Simptom                                | Punca                                    | Penyelesaian                                         |
| -------------------------------------- | ---------------------------------------- | ---------------------------------------------------- |
| `SUPABASE_URL / ... belum diset`       | Script Properties belum diisi            | Isi ikut seksyen 2.                                  |
| `Folder wilayah tidak dijumpai`        | ID folder dalam CONFIG salah             | Update `CONFIG.WILAYAH_FOLDER_IDS` atau jalan dari root. |
| `Tiada baris diekstrak`                | Marker `HASIL SAWIT/GETAH` tak dijumpai  | Semak spelling dalam sheet; buka `testSetup()`.     |
| Run 2× duplicate                       | UNIQUE constraint belum ada              | Pastikan migration `0024` sudah apply.               |
| HTTP 401 dari Supabase                 | Service role key salah/expired           |jana semula key di Supabase Dashboard.                |

## Audit Log

Setiap run catat ke Logger dan (opsyenal) ke spreadsheet audit.
Format JSON:

```json
{
  "wilayah": "UTARA",
  "tahun": 2026,
  "baris": 1247,
  "hasil": { "upserted": 1247, "errors": 0, "total": 1247 }
}
```

Untuk audit kepatuhan MSPO, simpan log min 5 tahun.