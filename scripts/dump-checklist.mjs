// Dump full Master Checklist sheet to JSON
import XLSX from "xlsx";
import { writeFileSync } from "fs";

const FILE = process.argv[2];
const OUT = process.argv[3] || "checklist-data.json";
if (!FILE) {
  console.error("Usage: node dump-checklist.mjs <xlsx> [output.json]");
  process.exit(1);
}

const wb = XLSX.readFile(FILE);
const ws = wb.Sheets["Master Checklist"];
if (!ws) {
  console.error("Sheet 'Master Checklist' tidak dijumpai");
  process.exit(1);
}

const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

// Cari row header
let headerIdx = -1;
for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  if (r[0] === "No." && String(r[1]).includes("Fail")) {
    headerIdx = i;
    break;
  }
}
if (headerIdx === -1) {
  console.error("Header row tidak dijumpai");
  process.exit(1);
}

const headers = rows[headerIdx].map((h) => String(h).replace(/\s+/g, " ").trim());
console.log("Headers:", JSON.stringify(headers));

const dataRows = rows.slice(headerIdx + 1).filter((r) => {
  const first = String(r[0] ?? "").trim();
  return first && /^\d+$/.test(first);
});

console.log("Bil. data rows:", dataRows.length);

const objects = dataRows.map((r) => {
  const obj = {};
  headers.forEach((h, i) => {
    if (h) obj[h] = r[i];
  });
  return obj;
});

writeFileSync(OUT, JSON.stringify({ headers, rows: objects }, null, 2));
console.log("Saved:", OUT);
console.log("Sample row 1:", JSON.stringify(objects[0], null, 2));
console.log("Sample row mid:", JSON.stringify(objects[Math.floor(objects.length / 2)], null, 2));
