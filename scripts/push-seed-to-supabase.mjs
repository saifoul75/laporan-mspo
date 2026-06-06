import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const SUPABASE_URL = "https://lbklwflwiujdnuricxbt.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxia2x3Zmx3aXVqZG51cmljeGJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc5ODM4MiwiZXhwIjoyMDk1Mzc0MzgyfQ.VOcBYERgKLgG3QS2ozAZWFGEBJx1CglQ7GQ6UVczgSA";

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
    console.log(`OK Batch ${i / batchSize + 1} — ${batch.length} baris`);
  }

  console.log(`\nSiap! ${rows.length} baris di-upsert ke Supabase.`);
}

main().catch((e) => {
  console.error("Ralat:", e.message);
  process.exit(1);
});