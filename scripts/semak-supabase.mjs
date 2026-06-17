// scripts/semak-supabase.mjs
// Semak data dalam Supabase: hasil_bulanan + views
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env.local');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split('=').map((s) => s.trim()))
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const log = (label, data) => {
  console.log('\n=== ' + label + ' ===');
  console.log(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
};

async function main() {
  // 1. Projek info
  log('URL', env.NEXT_PUBLIC_SUPABASE_URL);

  // 2. Senarai jadual
  const { data: tables, error: e1 } = await supabase
    .from('information_schema.tables')
    .select('table_name, table_type')
    .eq('table_schema', 'public')
    .order('table_name');
  log('JADUAL DALAM SKEMA public', tables?.map((t) => t.table_name).join(', ') || e1?.message);

  // 3. Views
  const { data: views, error: e2 } = await supabase
    .from('information_schema.views')
    .select('table_name')
    .eq('table_schema', 'public')
    .order('table_name');
  log('VIEWS DALAM SKEMA public', views?.map((v) => v.table_name).join(', ') || e2?.message);

  // 4. Jumlah baris hasil_bulanan
  const { count: total, error: e3 } = await supabase
    .from('hasil_bulanan')
    .select('*', { count: 'exact', head: true });
  log('JUMLAH BARIS hasil_bulanan', total ?? e3?.message);

  // 5. Senarai tahun & bulan yang ada
  const { data: months, error: e4 } = await supabase
    .from('hasil_bulanan')
    .select('kod_bulan, nama_bulan')
    .order('kod_bulan');
  if (months && months.length > 0) {
    const unik = [...new Set(months.map((m) => m.kod_bulan))];
    const tahun = [...new Set(unik.map((k) => k.substring(0, 4)))].sort();
    log('TAHUN TERSEDIA', tahun);
    log('BULAN TERSEDIA', unik.join(', '));
    log('JUMLAH BULAN UNIK', unik.length);
  } else {
    log('BULAN TERSEDIA', e4?.message || 'Tiada data');
  }

  // 6. Agregat tahun x jenis
  const { data: rows, error: e5 } = await supabase
    .from('hasil_bulanan')
    .select('kod_bulan, jenis, hasil');
  if (rows && rows.length > 0) {
    const agg = {};
    for (const r of rows) {
      const tahun = r.kod_bulan?.substring(0, 4) || '?';
      const key = `${tahun}|${r.jenis}`;
      agg[key] = (agg[key] || 0) + Number(r.hasil || 0);
    }
    const sortKeys = Object.keys(agg).sort();
    const table = sortKeys.map((k) => {
      const [t, j] = k.split('|');
      return { tahun: t, jenis: j, jumlah_hasil: Number(agg[k].toFixed(2)) };
    });
    log('AGREGAT TAHUN x JENIS', table);
  } else {
    log('AGREGAT TAHUN x JENIS', e5?.message || 'Tiada data');
  }

  // 7. Cuba view v_trend_tahunan (jika ada)
  const { data: trend, error: e6 } = await supabase
    .from('v_trend_tahunan')
    .select('*')
    .order('tahun', { ascending: true });
  if (trend) {
    log('VIEW v_trend_tahunan', trend);
  } else {
    log('VIEW v_trend_tahunan', 'TIADA / ERROR: ' + (e6?.message || 'unknown'));
  }

  // 8. Cuba view v_bulan_tersedia (jika ada)
  const { data: vb, error: e7 } = await supabase
    .from('v_bulan_tersedia')
    .select('*')
    .order('kod_bulan', { ascending: true });
  if (vb) {
    log('VIEW v_bulan_tersedia', vb);
  } else {
    log('VIEW v_bulan_tersedia', 'TIADA / ERROR: ' + (e7?.message || 'unknown'));
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
