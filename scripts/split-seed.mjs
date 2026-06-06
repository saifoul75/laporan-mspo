import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const file = readFileSync('supabase/migrations/0017_seed_hasil_bulanan.sql', 'utf8');
const header = file.split('\n').filter(l => l.startsWith('--')).join('\n');
const lines = file.split('\n').filter(l => l.startsWith('insert'));

const dir = join('supabase', 'seed-chunks');
mkdirSync(dir, { recursive: true });

const grouped = {};
for (const line of lines) {
  const m = line.match(/\('(\d{4}-\d{2})'/);
  if (!m) continue;
  (grouped[m[1]] ||= []).push(line);
}

const parts = Object.keys(grouped).sort();
for (let i = 0; i < parts.length; i++) {
  const month = parts[i];
  const num = String(i + 1).padStart(2, '0');
  const out = join(dir, `seed-${num}-${month}.sql`);
  writeFileSync(out, header + '\n\n' + grouped[month].join('\n') + '\n', 'utf8');
  console.log(`✓ ${out} (${grouped[month].length} insert)`);
}
console.log(`\nSiap! ${parts.length} fail dijana dalam ${dir}/`);
