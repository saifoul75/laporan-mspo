// ============================================================
// STRESS TEST — Wilayah Timur 1 (v2)
// Dapatan: 1 NC Minor + 3 OFI
// Cara guna: node stress-test-timur1.mjs
// ============================================================

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://lbklwflwiujdnuricxbt.supabase.co";
const SERVICE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxia2x3Zmx3aXVqZG51cmljeGJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc5ODM4MiwiZXhwIjoyMDk1Mzc0MzgyfQ.VOcBYERgKLgG3QS2ozAZWFGEBJx1CglQ7GQ6UVczgSA";

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function log(msg) { console.log(`[JJ] ${msg}`); }
function err(msg) { console.error(`[ERR] ${msg}`); process.exit(1); }

async function main() {
  console.log("\n========================================");
  console.log("  JJ STRESS TEST — WILAYAH TIMUR 1 v2");
  console.log("========================================\n");

  // ── 1. Buang audit lama kalau ada ────────────────────────
  log("Buang audit test lama (MSPO-202606-T1-%)...");
  await db.from("audit").delete().like("no_rujukan", "MSPO-202606-T1-%");

  // ── 2. Cari PO Timur ──────────────────────────────────────
  const { data: po } = await db
    .from("pusat_operasi")
    .select("id, kod, nama, wilayah")
    .ilike("wilayah", "%Timur%")
    .limit(1)
    .single();
  if (!po) err("Tiada PO Timur");
  log(`PO: ${po.nama} (${po.wilayah})`);

  // ── 3. Cari auditor ───────────────────────────────────────
  const { data: auditor } = await db
    .from("pengguna")
    .select("id, nama_penuh")
    .in("rol", ["lead_auditor", "admin"])
    .limit(1)
    .single();
  if (!auditor) err("Tiada auditor");
  log(`Auditor: ${auditor.nama_penuh}`);

  // ── 4. Ambil NC dari Utara 1 ──────────────────────────────
  const { data: auditUtara } = await db
    .from("audit")
    .select("id, no_rujukan")
    .eq("no_rujukan", "MSPO-202604-UT1-01")
    .maybeSingle();

  let ncCatatan = "Rekod tidak dikemaskini dan tidak diselenggara dengan sempurna.";
  let ncBukti   = "Semakan fail mendapati rekod tidak lengkap.";
  let ncCadangan = "Kemaskini semua rekod mengikut prosedur yang ditetapkan.";

  if (auditUtara) {
    const { data: ncUtara } = await db
      .from("dapatan")
      .select("catatan, bukti_audit, cadangan_tindakan, item_semakan:item_semakan_id(kod)")
      .eq("audit_id", auditUtara.id)
      .eq("status", "NC")
      .eq("gred_nc", "minor")
      .limit(1)
      .maybeSingle();

    if (ncUtara) {
      ncCatatan  = ncUtara.catatan || ncCatatan;
      ncBukti    = ncUtara.bukti_audit || ncBukti;
      ncCadangan = ncUtara.cadangan_tindakan || ncCadangan;
      log(`NC pattern ambil dari Utara 1: klausa ${ncUtara.item_semakan?.kod}`);
    }
  } else {
    log("Audit Utara 1 tiada. Guna text NC default.");
  }

  // ── 5. Cipta audit baru ───────────────────────────────────
  const noRujukan = `MSPO-202606-T1-${Math.random().toString(36).substring(2,6).toUpperCase()}`;
  log(`\nCipta audit: ${noRujukan}`);

  const { data: audit, error: errAudit } = await db
    .from("audit")
    .insert({
      no_rujukan: noRujukan,
      pusat_operasi_id: po.id,
      lead_auditor_id: auditor.id,
      auditor_ids: [],
      tarikh_audit: "2026-06-22",
      tarikh_tamat: "2026-06-25",
      jenis_audit: "audit_dalaman",
      status: "sedang_dijalankan",
    })
    .select()
    .single();
  if (errAudit) err("Gagal cipta audit: " + errAudit.message);
  log(`✓ Audit ID: ${audit.id}`);

  // ── 6. Tunggu trigger prefill ─────────────────────────────
  log("Tunggu trigger prefill...");
  await new Promise(r => setTimeout(r, 2500));

  // ── 7. Query dapatan sebenar yang wujud ───────────────────
  const { data: semuaDapatan } = await db
    .from("dapatan")
    .select("id, item_semakan_id, status, item_semakan:item_semakan_id(kod)")
    .eq("audit_id", audit.id)
    .order("item_semakan_id");

  log(`Dapatan prefilled: ${semuaDapatan?.length || 0} baris`);

  if (!semuaDapatan?.length) {
    // Tiada trigger prefill — insert dapatan manual
    log("Tiada prefill. Insert dapatan manual...");

    const { data: items } = await db
      .from("item_semakan")
      .select("id, kod")
      .limit(10);

    if (!items?.length) err("Tiada item semakan");

    const toInsert = items.map(item => ({
      audit_id: audit.id,
      item_semakan_id: item.id,
      status: "Pending",
      diaudit_oleh: auditor.id,
    }));

    const { error: errInsert } = await db.from("dapatan").insert(toInsert);
    if (errInsert) err("Gagal insert dapatan: " + errInsert.message);
    log(`✓ ${toInsert.length} dapatan diinsert manual`);

    // Re-query
    const { data: requery } = await db
      .from("dapatan")
      .select("id, item_semakan_id, status, item_semakan:item_semakan_id(kod)")
      .eq("audit_id", audit.id);
    semuaDapatan.push(...(requery || []));
  }

  // ── 8. Assign NC Minor (baris pertama) ───────────────────
  const dapatanNC = semuaDapatan[0];
  const { error: errNC } = await db
    .from("dapatan")
    .update({
      status: "NC",
      gred_nc: "minor",
      catatan: ncCatatan,
      bukti_audit: ncBukti,
      cadangan_tindakan: ncCadangan,
      pic: auditor.nama_penuh,
      tarikh_siap_target: new Date(Date.now() + 90*86400000).toISOString().split("T")[0],
    })
    .eq("id", dapatanNC.id);
  if (errNC) err("Gagal NC: " + errNC.message);
  log(`✓ NC Minor → ${dapatanNC.item_semakan?.kod}`);

  // ── 9. Assign 3 OFI ──────────────────────────────────────
  const dapatanOFI = semuaDapatan.slice(1, 4);
  for (let i = 0; i < dapatanOFI.length; i++) {
    const d = dapatanOFI[i];
    const { error: errOFI } = await db
      .from("dapatan")
      .update({
        status: "OFI",
        catatan: `Peluang penambahbaikan dikenal pasti pada klausa ${d.item_semakan?.kod}.`,
        cadangan_tindakan: "Semak dan tingkatkan prosedur sedia ada.",
      })
      .eq("id", d.id);
    if (errOFI) log(`⚠ OFI ${i+1}: ${errOFI.message}`);
    else log(`✓ OFI ${i+1} → ${d.item_semakan?.kod}`);
  }

  // ── 10. Baki → Y ─────────────────────────────────────────
  const idsBaki = semuaDapatan.slice(4).map(d => d.id);
  if (idsBaki.length) {
    await db.from("dapatan").update({ status: "Y" }).in("id", idsBaki);
    log(`✓ Baki ${idsBaki.length} dapatan → Y`);
  }

  // ── 11. Muktamadkan ───────────────────────────────────────
  const { error: errMuktamad } = await db
    .from("audit")
    .update({
      status: "menunggu_semakan",
      tarikh_muktamad: new Date().toISOString(),
    })
    .eq("id", audit.id);
  if (errMuktamad) log(`⚠ Muktamad: ${errMuktamad.message}`);
  else log(`✓ Status → menunggu_semakan`);

  // ── 12. Ringkasan akhir ───────────────────────────────────
  const { data: semak } = await db
    .from("dapatan")
    .select("status, gred_nc")
    .eq("audit_id", audit.id);

  const stats = { Y: 0, NC: 0, OFI: 0, Pending: 0 };
  for (const d of semak || []) stats[d.status] = (stats[d.status]||0) + 1;

  console.log("\n========================================");
  console.log("  RINGKASAN");
  console.log("========================================");
  console.log(`  No Rujukan : ${noRujukan}`);
  console.log(`  PO         : ${po.nama}`);
  console.log(`  Wilayah    : ${po.wilayah}`);
  console.log(`  Tarikh     : 2026-06-22 - 2026-06-25`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  Y (Patuh)  : ${stats.Y}`);
  console.log(`  NC Minor   : ${stats.NC}`);
  console.log(`  OFI        : ${stats.OFI}`);
  console.log(`  Pending    : ${stats.Pending}`);
  console.log("========================================");
  console.log(`\n  ✅ Buka app → cari ${noRujukan}`);
  console.log(`     Jana PDF dan PPTX untuk verify.\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
