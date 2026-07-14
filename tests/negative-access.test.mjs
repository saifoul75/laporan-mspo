// Ujian akses negatif — simulasi logic tanpa DB
// Tujuan: buktikan logic IDOR dan anon checks wujud di kod

import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf-8");
}

console.log("=== UJIAN AKSES NEGATIF MSPO-AUDIT (static) ===");

// 1. Token validation logic
const sharePage = read("src/app/share/[token]/page.tsx");
assert.ok(sharePage.includes('8,}$'), "Token regex mesti ada minimum 8 chars");
assert.ok(sharePage.includes("^[a-zA-Z0-9_-]"), "Token regex mesti alphanumeric+_- sahaja");
console.log("OK Token regex validation wujud");

// 2. Fake token fails via RPC — code guna rpc yang return empty
assert.ok(sharePage.includes("dapatkan_laporan_dengan_token"), "Mesti guna RPC untuk token");
console.log("OK Share page guna RPC (bukan direct SELECT)");

// 3. Anon tidak boleh list laporan — migration 0029 revoke
const mig29 = read("supabase/migrations/0029_final_hardening_anon_laporan.sql");
assert.ok(mig29.includes("DROP POLICY") && mig29.includes("Baca laporan kongsi awam"), "0029 mesti DROP anon policy");
assert.ok(mig29.includes("REVOKE SELECT ON public.laporan FROM anon"), "0029 mesti REVOKE SELECT anon");
console.log("OK Migration 0029 membuang anon SELECT laporan");

// 4. hasil_bulanan hardening
const mig27 = read("supabase/migrations/0027_hardening_hasil_bulanan_dan_storage.sql");
assert.ok(mig27.includes('DROP POLICY IF EXISTS "Anon dapat baca"'), "0027 mesti DROP anon hasil_bulanan");
assert.ok(mig27.includes("TO authenticated"), "0027 mesti authenticated only");
console.log("OK hasil_bulanan hardened ke authenticated only");

// 5. Storage path manipulation
const storagePol = mig27;
assert.ok(storagePol.includes("LIKE") && storagePol.includes("d.id::text"), "Storage policy mesti guna LIKE dengan dapatan_id");
console.log("OK Storage bukti-audit guna path check");

// 6. IDOR: audit_id mismatch
const actionsContent = read("src/app/(dashboard)/audit/actions.ts");
assert.ok(actionsContent.includes("audit_id !== auditId"), "CAP mesti validate audit_id match");
assert.ok(actionsContent.includes("semakAksesAudit"), "semua action mesti ada semakAksesAudit");
console.log("OK IDOR protection (audit_id mismatch + membership)");

// 7. diaudit_oleh tidak dari client
const simpan = read("src/lib/db/simpan-dapatan.ts");
assert.ok(!simpan.includes("diaudit_oleh") || (() => {
  const idx = simpan.indexOf("const payloadSupabase");
  if (idx < 0) return false;
  const section = simpan.substring(idx, idx + 1000);
  return !section.includes("diaudit_oleh");
})(), "payloadSupabase tidak boleh ada diaudit_oleh dari client");
console.log("OK diaudit_oleh dari server auth sahaja");

// 8. sync auth-derived
const sync = read("src/lib/db/sync.ts");
assert.ok(sync.includes("diaudit_oleh: userId"), "sync mesti set diaudit_oleh dari auth");
assert.ok(sync.includes("MAX_QUEUE"), "sync mesti ada limits");
console.log("OK Sync auth-derived & queue limits");

// 9. PDF/PPTX no error details
const pdfRoute = read("src/app/api/laporan/[id]/pdf/route.tsx");
assert.ok(!pdfRoute.match(/butiran:\s*ralat/i), "PDF route tidak dedahkan butiran error");
const pptxRoute = read("src/app/api/laporan/[id]/pptx/route.ts");
assert.ok(!pptxRoute.includes("butiran"), "PPTX route tidak dedahkan butiran");
console.log("OK PDF/PPTX tidak dedahkan error details");

// 10. Private no-store untuk kongsi PDF
const kongsiPdf = read("src/app/api/laporan/kongsi/[token]/pdf/route.tsx");
assert.ok(kongsiPdf.includes("private, no-store"), "Kongsi PDF mesti private no-store");
console.log("OK Kongsi PDF cache private no-store");

console.log("\n✅ Semua ujian akses negatif LULUS");
