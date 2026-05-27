# MSPO Audit

Sistem audit MSPO (Malaysian Sustainable Palm Oil) berasaskan **MS2530-2-2:2022** untuk RISDA Plantation Sdn Bhd. Dibina dengan Next.js 14, Supabase, dan Tailwind CSS.

## Ciri Utama

- **Checklist audit** lengkap: 5 prinsip, 28 kriteria, 74 item semakan dari Master Checklist v6.5
- **Status dapatan** ikut RPSB: Y (Comply) / N / NC (Major+Minor) / OFI / N/A / Pending
- **Mod luar talian** (offline-first) dengan IndexedDB
- **GPS tagging** dan **muat naik gambar bukti** terus dari peranti
- **NC/OFI tracking** dengan PIC, tarikh siap, dan punca akar
- **Laporan PDF** auto-jana ikut dapatan
- **Multi-rol**: Admin, Lead Auditor, Auditor, PO User
- **Pelbagai Pusat Operasi** (Wilayah Utara/Tengah/Selatan/Timur)

## Tech Stack

- **Next.js 14** (App Router) + TypeScript
- **Supabase** (PostgreSQL + Auth + Storage + RLS)
- **Tailwind CSS** + shadcn-style components
- **Dexie.js** untuk IndexedDB offline storage
- **react-hook-form** + Zod untuk borang
- **@react-pdf/renderer** untuk laporan PDF

## Setup

### 1. Pemasangan dependency

```powershell
cd C:\Projects\mspo-audit
npm install
```

### 2. Setup Supabase

1. Daftar projek baru di [supabase.com](https://supabase.com)
2. Salin URL dan anon key ke `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

3. Jalankan migration di **SQL Editor** Supabase (ikut urutan):
   - `supabase/migrations/0001_skema_asas.sql` — schema, enum, RLS policies
   - `supabase/migrations/0002_seed_mspo_v65.sql` — 5 prinsip, 28 kriteria, 74 item, 13 fail

4. Aktifkan Email Auth di Supabase Dashboard → Authentication → Providers

### 3. Jalankan dev server

```powershell
npm run dev
```

Buka `http://localhost:3000`

### 4. Cipta akaun pertama

1. Daftar di `/daftar` (akan jadi `auditor` secara default)
2. Untuk jadikan admin, edit terus di Supabase:

```sql
update public.pengguna set rol = 'admin' where email = 'youremail@example.com';
```

## Struktur Projek

```
src/
├── app/
│   ├── (auth)/                  Halaman log masuk & daftar
│   ├── (dashboard)/             Halaman selepas log masuk
│   │   ├── audit/               Senarai, baru, checklist, laporan
│   │   ├── pusat-operasi/       Daftar PO
│   │   ├── laporan/             Senarai laporan
│   │   └── tetapan/, pengguna/
│   └── api/laporan/[id]/pdf/    Endpoint PDF
├── components/
│   ├── audit/                   Borang & checklist khusus audit
│   ├── layout/                  Sidebar, topbar
│   └── ui/                      Butang, Input, Card, Badge, dll
├── lib/
│   ├── supabase/                Client (browser), server, middleware
│   ├── db/dexie.ts              IndexedDB schema (offline)
│   ├── pdf/laporan-pdf.tsx      Template laporan PDF
│   ├── hooks/useGPS.ts          Hook capture GPS
│   └── utils.ts
├── types/                       TypeScript types
└── data/                        Fail rujukan

supabase/migrations/             SQL migrations
scripts/                         Util scripts (extract checklist Excel)
```

## Skema MSPO

### 5 Prinsip
| Kod | Tajuk | Bil. Klausa |
|-----|-------|------------:|
| P1  | Komitmen Pengurusan dan Tanggungjawab | 28 |
| P2  | Ketelusan | 10 |
| P3  | Pematuhan Undang-Undang dan Hak Tanah | 9 |
| P4  | Tanggungjawab Sosial, KKP | 8 |
| P5  | Alam Sekitar, Biodiversiti, Ekosistem | 19 |
| **Jumlah** | | **74 item** |

### Status Dapatan
- **Y** — Comply (patuh)
- **N** — Tidak Patuh
- **NC** — Non-Conformity (major / minor)
- **OFI** — Opportunity for Improvement
- **NA** — Not Applicable
- **Pending** — Belum disemak

### Fail Kulit Keras (1-13)
1. Manual & SOP Lestari
2. Pengurusan MSPO (MRM, Audit Dalaman)
3. Ketelusan
4. Pelan Pengurusan
5. Perundangan & Tanah
6. Pengurusan Sosial
7. Pengurusan KKP
8. Alam Sekitar & Biodiversiti
9. Pentadbiran (Harga & Kontraktor)
10. Pengurusan Pekerja
11. Latihan Pekerja
12. Integriti
13. Tanam Semula & Pembangunan Baru

## Skrip Berguna

```powershell
# Build production
npm run build

# Lint
npm run lint

# Extract data dari Excel ke JSON (untuk update seed)
node scripts/dump-checklist.mjs <path-to-xlsx> output.json

# Jana SQL seed dari JSON
node scripts/jana-seed.mjs input.json supabase/migrations/0002_seed.sql
```

## TODO Akan Datang

- [ ] Sync logic Dexie ↔ Supabase yang lengkap (queue + retry)
- [ ] Halaman urus NC dan OFI berasingan
- [ ] Dashboard analytics dengan charts
- [ ] Eksport Excel
- [ ] Mode dark
- [ ] Notifikasi (PIC reminder bila NC near tarikh siap)

## Lesen

Internal RISDA Plantation Sdn Bhd.
