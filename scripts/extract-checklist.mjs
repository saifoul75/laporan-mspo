// Script: Extract MSPO checklist dari Excel
// Guna: node scripts/extract-checklist.mjs

import XLSX from "xlsx";
import { readFileSync, writeFileSync } from "fs";

const FILE = process.argv[2];
if (!FILE) {
  console.error("Usage: node extract-checklist.mjs <path-to-xlsx>");
  process.exit(1);
}

const wb = XLSX.readFile(FILE);
console.log("Sheets:", wb.SheetNames);

const result = {};
for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  result[name] = {
    bil_baris: rows.length,
    sample_first_5: rows.slice(0, 5),
    sample_mid: rows.slice(Math.floor(rows.length / 2), Math.floor(rows.length / 2) + 3),
  };
}

console.log(JSON.stringify(result, null, 2));
