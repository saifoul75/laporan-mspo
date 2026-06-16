import { readFileSync, writeFileSync } from "node:fs";
import { read, utils } from "xlsx";
import { resolve } from "node:path";

const PO_WILAYAH = {
  'GERIK':'UTARA','KEDAH':'UTARA','KG.GAJAH':'UTARA','KUALA KANGSAR':'UTARA',
  'LENGGONG':'UTARA','MANJUNG':'UTARA','SELANGOR':'UTARA','SIK':'UTARA','TAPAH':'UTARA',
  'BENTONG':'TENGAH','JERANTUT':'TENGAH','KUANTAN':'TENGAH','LIPIS':'TENGAH',
  'PEKAN':'TENGAH','RAUB':'TENGAH','ROMPIN':'TENGAH','TEMERLOH':'TENGAH',
  'BESUT':'TIMUR','DUNGUN':'TIMUR','KUALA BERANG':'TIMUR','MACHANG':'TIMUR',
  'ALOR GAJAH':'SELATAN','BUKIT KEPONG':'SELATAN','GEMENCEH':'SELATAN',
  'JASIN':'SELATAN','JOHOR':'SELATAN','MASJID TANAH':'SELATAN','MELAKA':'SELATAN',
  'MUAR':'SELATAN','N.SEMBILAN':'SELATAN','REMBAU':'SELATAN'
};

function escSql(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? "true" : "false";
  return `'${String(v).replace(/'/g, "''")}'`;
}

const xlsx = readFileSync("C:/Users/USER/Desktop/LAPORAN HASIL/Unt Cawangan 2026.xlsx");
const wb = read(xlsx, { type: "buffer" });

function extractMaster2026(ws) {
  const rows = utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
  const out = [];
  for (let i = 4; i < rows.length; i++) {
    const r = rows[i] || [];
    const pol = (r[2] || "").toString().trim();
    const nama = (r[3] || "").toString().trim();
    if (!nama || !pol || nama === pol) continue;
    if (/^\d+$/.test(nama)) continue;
    if (/^(pol\s*[\/]?\s*p\.?n\.?|nama\s+projek)$/i.test(nama)) continue;
    const luasKaw = Number(r[4]) || 0;
    const luasProd = Number(r[5]) || 0;
    const peserta = Number(r[6]) || 0;
    out.push({ pusat_operasi: pol, nama_projek: nama, luas_kawasan_hek: luasKaw, luas_produktif_hek: luasProd, bilangan_peserta: peserta });
  }
  return out;
}

const masterSawit = extractMaster2026(wb.Sheets["SAWIT"]).map(p => ({ ...p, jenis: "SAWIT", kategori: null }));
const masterGetah = extractMaster2026(wb.Sheets["GETAH"]).map(p => ({ ...p, jenis: "GETAH", kategori: null }));
const semuaMaster = [...masterSawit, ...masterGetah];
console.log(`Master 2026: ${masterSawit.length} sawit + ${masterGetah.length} getah = ${semuaMaster.length}`);

let sql = "";
sql += "-- ============================================================\n";
sql += "-- Migration 0023: Migrasi ke Skema Baru hasil_bulanan\n";
sql += "-- Sumber: Unt Cawangan 2020-2026, sheet SAWIT & GETAH\n";
sql += "-- Master projek: 2026 | Crosswalk daerah->PO | Wilayah ditambah\n";
sql += "-- ============================================================\n\n";

sql += "-- 1) DROP struktur lama\n";
sql += "DROP VIEW IF EXISTS public.v_hasil_bulanan CASCADE;\n";
sql += "DROP VIEW IF EXISTS public.v_hasil_tahunan CASCADE;\n";
sql += "DROP VIEW IF EXISTS public.v_hasil_tahunan_projek CASCADE;\n";
sql += "DROP VIEW IF EXISTS public.v_trend_tahunan CASCADE;\n";
sql += "DROP VIEW IF EXISTS public.v_bulan_tersedia CASCADE;\n";
sql += "DROP TABLE IF EXISTS public.hasil_bulanan CASCADE;\n\n";

sql += "-- 2) JADUAL UTAMA (fact, long-format)\n";
sql += `create table if not exists public.hasil_bulanan (
  id                    bigint generated always as identity primary key,
  tahun                 int     not null,
  jenis                 text    not null check (jenis in ('SAWIT','GETAH')),
  kategori              text,
  pusat_operasi         text    not null,
  pusat_operasi_master  text,
  pusat_operasi_final   text,
  wilayah               text,
  kategori_master       text,
  nama_projek           text    not null,
  luas_kawasan_hek      numeric,
  luas_produktif_hek    numeric,
  bilangan_peserta      int,
  bulan                 int     not null check (bulan between 1 and 12),
  bulan_nama            text,
  hasil                 numeric not null,
  unit                  text    not null,
  in_master_2026        boolean default false
);\n\n`;

sql += `create index if not exists idx_hb_tahun  on public.hasil_bulanan(tahun);
create index if not exists idx_hb_jenis  on public.hasil_bulanan(jenis);
create index if not exists idx_hb_pofin  on public.hasil_bulanan(pusat_operasi_final);
create index if not exists idx_hb_wil    on public.hasil_bulanan(wilayah);
create index if not exists idx_hb_projek on public.hasil_bulanan(nama_projek);\n\n`;

sql += "-- 3) JADUAL MASTER PROJEK 2026\n";
sql += `create table if not exists public.projek_master_2026 (
  jenis text not null check (jenis in ('SAWIT','GETAH')),
  kategori text, pusat_operasi text not null, nama_projek text not null,
  luas_kawasan_hek numeric, luas_produktif_hek numeric, bilangan_peserta int,
  primary key (jenis, nama_projek)
);\n\n`;

sql += "-- 4) RUJUKAN crosswalk & wilayah\n";
sql += `create table if not exists public.crosswalk_daerah_po (
  daerah_asal text primary key, pusat_operasi text, wilayah text
);
create table if not exists public.po_wilayah (
  pusat_operasi text primary key, wilayah text
);\n\n`;

sql += "-- 5) VIEW RINGKASAN\n";
sql += `create or replace view public.v_ringkasan_po as
with luas_projek as (
  select distinct tahun, wilayah, pusat_operasi_final as po, jenis, nama_projek, luas_produktif_hek
  from public.hasil_bulanan where pusat_operasi_final <> ''
),
luas_agg as (
  select tahun, wilayah, po, jenis, sum(luas_produktif_hek) as luas from luas_projek group by 1,2,3,4
),
hasil_agg as (
  select tahun, wilayah, pusat_operasi_final as po, jenis, sum(hasil) as jumlah_hasil
  from public.hasil_bulanan where pusat_operasi_final <> '' group by 1,2,3,4
)
select h.tahun, h.wilayah, h.po as pusat_operasi, h.jenis, h.jumlah_hasil,
       l.luas as luas_produktif_hek,
       round(h.jumlah_hasil/nullif(l.luas,0),3) as hasil_per_hek
from hasil_agg h left join luas_agg l using (tahun,wilayah,po,jenis);\n\n`;

sql += `create or replace view public.v_ringkasan_wilayah as
with lp as (
  select distinct tahun, wilayah, jenis, pusat_operasi_final, nama_projek, luas_produktif_hek
  from public.hasil_bulanan where pusat_operasi_final <> ''
)
select h.tahun, h.wilayah, h.jenis, sum(h.hasil) as jumlah_hasil,
       (select sum(luas_produktif_hek) from lp where lp.tahun=h.tahun and lp.wilayah=h.wilayah and lp.jenis=h.jenis) as luas
from public.hasil_bulanan h where h.pusat_operasi_final <> ''
group by h.tahun, h.wilayah, h.jenis;\n\n`;

sql += "-- 6) RLS + POLISI BACA-AWAM\n";
sql += "alter table public.hasil_bulanan       enable row level security;\n";
sql += "alter table public.projek_master_2026  enable row level security;\n";
sql += "alter table public.crosswalk_daerah_po enable row level security;\n";
sql += "alter table public.po_wilayah          enable row level security;\n\n";

sql += `create policy "baca_awam_hasil"     on public.hasil_bulanan       for select to anon, authenticated using (true);
create policy "baca_awam_master"    on public.projek_master_2026  for select to anon, authenticated using (true);
create policy "baca_awam_crosswalk" on public.crosswalk_daerah_po for select to anon, authenticated using (true);
create policy "baca_awam_powil"     on public.po_wilayah          for select to anon, authenticated using (true);\n\n`;

sql += `grant usage on schema public to anon, authenticated;
grant select on public.hasil_bulanan, public.projek_master_2026, public.crosswalk_daerah_po, public.po_wilayah to anon, authenticated;
grant select on public.v_ringkasan_po, public.v_ringkasan_wilayah to anon, authenticated;\n\n`;

sql += "-- 7) INSERT po_wilayah (31 PO)\n";
sql += "insert into public.po_wilayah (pusat_operasi, wilayah) values\n";
const poRows = Object.entries(PO_WILAYAH).map(([po, wil], i, arr) => {
  const sep = i < arr.length - 1 ? "," : "";
  return `  (${escSql(po)}, ${escSql(wil)})${sep}`;
});
sql += poRows.join("\n") + "\n";
sql += "on conflict (pusat_operasi) do update set wilayah = excluded.wilayah;\n\n";

sql += "-- 8) INSERT crosswalk_daerah_po (identity mapping: daerah_asal = pusat_operasi)\n";
sql += "insert into public.crosswalk_daerah_po (daerah_asal, pusat_operasi, wilayah) values\n";
const cwRows = Object.entries(PO_WILAYAH).map(([po, wil], i, arr) => {
  const sep = i < arr.length - 1 ? "," : "";
  return `  (${escSql(po)}, ${escSql(po)}, ${escSql(wil)})${sep}`;
});
sql += cwRows.join("\n") + "\n";
sql += "on conflict (daerah_asal) do update set pusat_operasi = excluded.pusat_operasi, wilayah = excluded.wilayah;\n\n";

sql += `-- 9) INSERT projek_master_2026 (${semuaMaster.length} projek)\n`;
sql += "insert into public.projek_master_2026 (jenis, kategori, pusat_operasi, nama_projek, luas_kawasan_hek, luas_produktif_hek, bilangan_peserta) values\n";
const mRows = semuaMaster.map((p, i, arr) => {
  const sep = i < arr.length - 1 ? "," : "";
  return `  (${escSql(p.jenis)}, ${escSql(p.kategori)}, ${escSql(p.pusat_operasi)}, ${escSql(p.nama_projek)}, ${p.luas_kawasan_hek}, ${p.luas_produktif_hek}, ${p.bilangan_peserta})${sep}`;
});
sql += mRows.join("\n") + "\n";
sql += "on conflict (jenis, nama_projek) do update set kategori = excluded.kategori, pusat_operasi = excluded.pusat_operasi, luas_kawasan_hek = excluded.luas_kawasan_hek, luas_produktif_hek = excluded.luas_produktif_hek, bilangan_peserta = excluded.bilangan_peserta;\n";

const failMig = "supabase/migrations/0023_migrasi_skema_hasil_baru.sql";
writeFileSync(failMig, sql);
console.log(`\nDijana: ${failMig}`);
console.log(`Saiz: ${(sql.length / 1024).toFixed(1)} KB`);
console.log(`Baris SQL: ${sql.split("\n").length}`);
