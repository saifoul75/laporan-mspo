// Security regression tests — must pass in isolation without DB
// Verifies IDOR protections and auth guards exist in code

import assert from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf-8");
}

function mustContain(file, pattern, msg) {
  const content = read(file);
  const found = typeof pattern === "string" ? content.includes(pattern) : pattern.test(content);
  assert.ok(found, `${file}: ${msg}`);
}

function mustNotContain(file, pattern, msg) {
  const content = read(file);
  const found = typeof pattern === "string" ? content.includes(pattern) : pattern.test(content);
  assert.ok(!found, `${file}: ${msg} — pattern should NOT be present`);
}

// ── proxy.ts
mustNotContain("src/proxy.ts", 'pathname.startsWith("/hasil")', "proxy must NOT bypass /hasil");
mustContain("src/proxy.ts", "updateSession", "proxy must call updateSession");

// ── middleware.ts
mustContain("src/lib/supabase/middleware.ts", "Konfigurasi Supabase tiada", "middleware must fail-closed in prod");
mustNotContain("src/lib/supabase/middleware.ts", '"/hasil"', "/hasil should not be in public list");

// ── backup.ps1
const backupContent = read("backup.ps1");
mustContain("backup.ps1", ".env.local", "backup must mention .env.local exclusion");
mustContain("backup.ps1", "MANIFEST.txt", "backup must generate MANIFEST");
mustContain("backup.ps1", "Tiada fail .env", "backup must validate no .env leaked");
mustContain("backup.ps1", "Dikesan fail sensitif", "backup must detect leaked secrets");

// ── actions.ts IDOR
mustContain("src/app/(dashboard)/audit/actions.ts", "semakAksesAudit", "actions must have IDOR check function");
mustContain("src/app/(dashboard)/audit/actions.ts", "Tiada akses kepada audit ini", "actions must return 403 message");
mustContain("src/app/(dashboard)/audit/actions.ts", "audit_id !== auditId", "CAP must validate audit_id match");

// ── simpan-dapatan.ts - safe payload tidak boleh ada diaudit_oleh langsung ke Supabase
mustContain("src/lib/db/simpan-dapatan.ts", "payloadSupabase", "simpan-dapatan must have safe payload");
const simpanContent = read("src/lib/db/simpan-dapatan.ts");
const supabasePayloadIdx = simpanContent.indexOf("const payloadSupabase");
assert.ok(supabasePayloadIdx >= 0, "payloadSupabase must exist");
const supabasePayloadSection = simpanContent.substring(supabasePayloadIdx, supabasePayloadIdx + 1000);
assert.ok(!supabasePayloadSection.includes("diaudit_oleh"), "payloadSupabase must NOT contain diaudit_oleh - must be set from server auth");
// Local Dexie masih perlu diaudit_oleh untuk offline display — itu OK, tapi bukan di payload Supabase
assert.ok(simpanContent.includes("diaudit_oleh: payload.diaudit_oleh") || simpanContent.includes("diaudit_oleh:"), "local rekod still needs diaudit_oleh for UI");

// ── sync.ts
mustContain("src/lib/db/sync.ts", "userId", "sync must use auth userId");
mustContain("src/lib/db/sync.ts", "MAX_QUEUE", "sync must have queue limits");
mustContain("src/lib/db/sync.ts", "diaudit_oleh: userId", "sync must set diaudit_oleh from server auth");

// ── API routes no error details leak
const pdfRoute = read("src/app/api/laporan/[id]/pdf/route.tsx");
assert.ok(!pdfRoute.includes("butiran") || !pdfRoute.match(/butiran:\s*ralat\w*\.message/), "PDF route must NOT leak error.message as butiran");

const pptxRoute = read("src/app/api/laporan/[id]/pptx/route.ts");
assert.ok(!pptxRoute.includes("butiran"), "PPTX route must NOT leak error details");

// ── Public share PDF cache
mustContain("src/app/api/laporan/kongsi/[token]/pdf/route.tsx", "private, no-store", "public share PDF must be private no-store");
mustNotContain("src/app/api/laporan/kongsi/[token]/pdf/route.tsx", "public, max-age", "public share PDF must NOT be public cached");

// ── next.config headers
mustContain("next.config.mjs", "X-Frame-Options", "must have security headers");
mustContain("next.config.mjs", "X-Content-Type-Options", "must have nosniff");

// ── migrations existence
const migrations = ["0026_hardening_laporan_kongsi.sql", "0027_hardening_hasil_bulanan_dan_storage.sql", "0028_hardening_audit_idor.sql"];
for (const m of migrations) {
  const path = `supabase/migrations/${m}`;
  try {
    read(path);
  } catch {
    assert.fail(`Migration ${m} must exist`);
  }
}

console.log("✅ All security regression checks passed for mspo-audit");
