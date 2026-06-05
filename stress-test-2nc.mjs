// ============================================================
// STRESS TEST — 2 NC Minor
// NC 1: Latihan pekerja
// NC 2: Gaji pekerja lewat
// ============================================================

import { createClient } from "@supabase/supabase-js";

const db = createClient(
  "https://lbklwflwiujdnuricxbt.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxia2x3Zmx3aXVqZG51cmljeGJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc5ODM4MiwiZXhwIjoyMDk1Mzc0MzgyfQ.VOcBYERgKLgG3QS2ozAZWFGEBJx1CglQ7GQ6UVczgSA",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function log(msg) { console.log(`[JJ] ${msg}`); }
function err(msg) { console.error(`[ERR] ${msg}`); process.exit(1); }

async function main() {
  console.log("\n========================================");
  console.log("  STRESS TEST — 2 NC MINOR");
  console.log("  Latihan & Gaji Pekerja Lewat");
  console.log("========================================\n");

  // ── 1. Cari klausa berkaitan latihan ─────────────────────
  const { data: itemLatihan } = await db
    .from("item_semakan")
    .select("id, kod, tajuk")
    .or("tajuk.ilike.%latihan%,tajuk.ilike.%training%")
    .limit(1)
    .maybeSingle();

  // ── 2. Cari klausa berkaitan gaji/upah ───────────────────
  const { data: itemGaji } = await db
    .from("item_semakan")
    .select("id, kod, tajuk")
    .or("tajuk.ilike.%gaji%,tajuk.ilike.%upah%,tajuk.ilike.%bayaran%,tajuk.ilike.%wage%")
    .limit(1)
    .maybeSingle();

  log(`Klausa latihan : ${itemLatihan ? `${itemLatihan.kod} — ${itemLatihan.tajuk}` : "Tidak dijumpai, guna item tersedia"}`);
  log(`Klausa gaji    : ${itemGaji ? `${itemGaji.kod} — ${itemGaji.tajuk}` : "Tidak dijumpai, guna item tersedia"}`);

  // ── 3. Cari PO Timur ──────────────────────────────────────
  const { data: po } = await db
    .from("pusat_operasi")
    .select("id, kod, nama, wilayah")
    .ilike("wilayah", "%Timur%")
    .limit(1)
    .single();
  if (!po) err("Tiada PO Timur");
  log(`PO: ${po.nama}`);

  // ── 4. Cari auditor ───────────────────────────────────────
  const { data: auditor } = await db
    .from("pengguna")
    .select("id, nama_penuh")
    .in("rol", ["lead_auditor", "admin"])
    .limit(1)
    .single();
  if (!auditor) err("Tiada auditor");

  // ── 5. Cipta audit ────────────────────────────────────────
  const noRujukan = `MSPO-202606-T1-2NC-${Math.random().toString(36).substring(2,5).toUpperCase()}`;
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

  // ── 7. Query dapatan sebenar ──────────────────────────────
  const { data: semuaDapatan } = await db
    .from("dapatan")
    .select("id, item_semakan_id, status, item_semakan:item_semakan_id(id, kod, tajuk)")
    .eq("audit_id", audit.id)
    .order("item_semakan_id");

  log(`Dapatan prefilled: ${semuaDapatan?.length || 0} baris`);

  if (!semuaDapatan?.length) err("Tiada dapatan. Semak trigger prefill.");

  // ── 8. Cari row yang match klausa latihan & gaji ──────────
  let rowLatihan = semuaDapatan.find(d =>
    d.item_semakan?.tajuk?.toLowerCase().includes("latihan") ||
    d.item_semakan?.tajuk?.toLowerCase().includes("training")
  );

  let rowGaji = semuaDapatan.find(d =>
    d.item_semakan?.tajuk?.toLowerCase().includes("gaji") ||
    d.item_semakan?.tajuk?.toLowerCase().includes("upah") ||
    d.item_semakan?.tajuk?.toLowerCase().includes("bayaran") ||
    d.item_semakan?.tajuk?.toLowerCase().includes("wage")
  );

  // Fallback: guna baris pertama & kedua jika tak jumpa
  if (!rowLatihan) {
    rowLatihan = semuaDapatan[0];
    log(`⚠ Klausa latihan tidak ada dalam prefill. Guna: ${rowLatihan.item_semakan?.kod}`);
  }
  if (!rowGaji || rowGaji.id === rowLatihan.id) {
    rowGaji = semuaDapatan.find(d => d.id !== rowLatihan.id);
    log(`⚠ Klausa gaji tidak ada dalam prefill. Guna: ${rowGaji?.item_semakan?.kod}`);
  }

  if (!rowLatihan || !rowGaji) err("Tidak cukup dapatan untuk assign 2 NC.");

  // ── 9. Update NC 1 — Latihan ──────────────────────────────
  await db.from("dapatan").update({
    status: "NC",
    gred_nc: "minor",
    catatan: "Rekod latihan pekerja tidak lengkap. Tiada bukti kehadiran dan sijil latihan disimpan dalam Fail 5.",
    bukti_audit: "Semakan Fail 5 mendapati tiada rekod latihan bagi tahun semasa.",
    cadangan_tindakan: "Kemaskini rekod latihan dan pastikan sijil latihan difailkan dalam Fail 5 selepas setiap sesi latihan.",
    pic: auditor.nama_penuh,
    tarikh_siap_target: new Date(Date.now() + 90*86400000).toISOString().split("T")[0],
  }).eq("id", rowLatihan.id);
  log(`✓ NC Minor 1 → ${rowLatihan.item_semakan?.kod} (Latihan)`);

  // ── 10. Update NC 2 — Gaji ───────────────────────────────
  await db.from("dapatan").update({
    status: "NC",
    gred_nc: "minor",
    catatan: "Gaji pekerja direkodkan lewat daripada tarikh sepatutnya. Tiada justifikasi bertulis disertakan.",
    bukti_audit: "Semakan slip gaji mendapati bayaran gaji bulan Mac 2026 dibuat pada 10 April 2026.",
    cadangan_tindakan: "Pastikan gaji dibayar tidak lewat dari 7hb setiap bulan. Rekodkan sebab kelewatan jika berlaku.",
    pic: auditor.nama_penuh,
    tarikh_siap_target: new Date(Date.now() + 90*86400000).toISOString().split("T")[0],
  }).eq("id", rowGaji.id);
  log(`✓ NC Minor 2 → ${rowGaji.item_semakan?.kod} (Gaji)`);

  // ── 11. Baki → Y ─────────────────────────────────────────
  const idsBaki = semuaDapatan
    .filter(d => d.id !== rowLatihan.id && d.id !== rowGaji.id)
    .map(d => d.id);
  if (idsBaki.length) {
    await db.from("dapatan").update({ status: "Y" }).in("id", idsBaki);
    log(`✓ Baki ${idsBaki.length} dapatan → Y`);
  }

  // ── 12. Muktamadkan ───────────────────────────────────────
  await db.from("audit").update({
    status: "menunggu_semakan",
    tarikh_muktamad: new Date().toISOString(),
  }).eq("id", audit.id);
  log(`✓ Audit → menunggu_semakan`);

  // ── 13. Ringkasan ─────────────────────────────────────────
  const { data: semak } = await db
    .from("dapatan").select("status").eq("audit_id", audit.id);

  const stats = { Y: 0, NC: 0, OFI: 0, Pending: 0 };
  for (const d of semak || []) stats[d.status] = (stats[d.status]||0)+1;

  console.log("\n========================================");
  console.log("  RINGKASAN");
  console.log("========================================");
  console.log(`  No Rujukan : ${noRujukan}`);
  console.log(`  PO         : ${po.nama}`);
  console.log(`  NC Minor 1 : ${rowLatihan.item_semakan?.kod} — Latihan`);
  console.log(`  NC Minor 2 : ${rowGaji.item_semakan?.kod} — Gaji`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  Y (Patuh)  : ${stats.Y}`);
  console.log(`  NC Minor   : ${stats.NC}`);
  console.log(`  OFI        : ${stats.OFI}`);
  console.log(`  Pending    : ${stats.Pending}`);
  console.log("========================================");
  console.log(`\n  ✅ Buka app → cari ${noRujukan}`);
  console.log(`     Verify 2 NC dalam CAP → status auto Selesai\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
