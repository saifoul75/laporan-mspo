import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";

// Muat pemboleh ubah persekitaran dari .env.local (diutamakan) atau .env
// (Node 20.12+/21.7+ menyokong process.loadEnvFile)
for (const f of [".env.local", ".env"]) {
  if (existsSync(f)) {
    try {
      process.loadEnvFile(f);
      break;
    } catch {
      /* abaikan ralat muat .env */
    }
  }
}

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Ralat: sila set NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY dalam fail .env.local"
  );
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const COLUMNS = [
  "kod_bulan", "nama_bulan", "jenis", "pol_pn", "bil", "nama", "peserta",
  "luas_hek", "luas_operasi", "hasil", "hasil_per_hek", "matlamat_setahun",
  "pct_setahun", "pendapatan", "kos", "untung_rugi",
];

function parseValuesLine(line) {
  const m = line.match(/values\s*\((.+)\)\s*on conflict/);
  if (!m) return null;

  const raw = m[1];
  const vals = [];
  let i = 0;
  let inStr = false;
  let current = "";

  while (i < raw.length) {
    const ch = raw[i];
    if (ch === "'" && !inStr) {
      inStr = true;
      current += ch;
    } else if (ch === "'" && inStr) {
      if (raw[i + 1] === "'") {
        current += "''";
        i++;
      } else {
        inStr = false;
        current += ch;
      }
    } else if (ch === "," && !inStr) {
      vals.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
    i++;
  }
  if (current.trim()) vals.push(current.trim());

  if (vals.length !== COLUMNS.length) return null;

  const row = {};
  for (let j = 0; j < COLUMNS.length; j++) {
    let v = vals[j];
    if (v.startsWith("'") && v.endsWith("'")) {
      row[COLUMNS[j]] = v.slice(1, -1).replace(/''/g, "'");
    } else {
      row[COLUMNS[j]] = Number(v);
    }
  }
  return row;
}

async function main() {
  const sql = readFileSync("supabase/migrations/0017_seed_hasil_bulanan.sql", "utf8");
  const lines = sql.split("\n").filter((l) => l.startsWith("insert"));

  const rows = [];
  for (const line of lines) {
    const row = parseValuesLine(line);
    if (row) rows.push(row);
  }

  console.log(`Parse: ${rows.length} baris dibaca`);

  const batchSize = 200;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await db
      .from("hasil_bulanan")
      .upsert(batch, { onConflict: "kod_bulan, jenis, nama" });
    if (error) {
      console.error(`Batch ${i / batchSize + 1} gagal:`, error.message);
      process.exit(1);
    }
    console.log(`OK Batch ${i / batchSize + 1} \u2014 ${batch.length} baris`);
  }

  console.log(`\nSiap! ${rows.length} baris di-upsert ke Supabase.`);
}

main().catch((e) => {
  console.error("Ralat:", e.message);
  process.exit(1);
});
