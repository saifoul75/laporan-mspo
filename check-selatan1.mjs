// Check status audit Selatan 1
import { createClient } from "@supabase/supabase-js";

const db = createClient(
  "https://lbklwflwiujdnuricxbt.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxia2x3Zmx3aXVqZG51cmljeGJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc5ODM4MiwiZXhwIjoyMDk1Mzc0MzgyfQ.VOcBYERgKLgG3QS2ozAZWFGEBJx1CglQ7GQ6UVczgSA",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  console.log("\n=== CHECK AUDIT SELATAN 1 ===\n");

  // Cari semua audit wilayah Selatan
  const { data: audits } = await db
    .from("audit")
    .select("id, no_rujukan, status, tarikh_audit, tarikh_tamat, pusat_operasi:pusat_operasi_id(nama, wilayah)")
    .order("tarikh_audit", { ascending: false });

  const selatan = (audits || []).filter(a =>
    a.pusat_operasi?.wilayah?.toLowerCase().includes("selatan")
  );

  if (!selatan.length) {
    console.log("Tiada audit Selatan dijumpai dalam database.\n");
    return;
  }

  for (const a of selatan) {
    console.log(`No Rujukan : ${a.no_rujukan}`);
    console.log(`PO        : ${a.pusat_operasi?.nama}`);
    console.log(`Tarikh    : ${a.tarikh_audit} - ${a.tarikh_tamat || "-"}`);
    console.log(`Status    : ${a.status}`);

    // Statistik dapatan
    const { data: dapatan } = await db
      .from("dapatan")
      .select("status, gred_nc")
      .eq("audit_id", a.id);

    const stats = { Y: 0, NC: 0, OFI: 0, Pending: 0, N: 0, NA: 0 };
    for (const d of dapatan || []) stats[d.status] = (stats[d.status]||0)+1;

    console.log(`Dapatan   : Y=${stats.Y} | NC=${stats.NC} | OFI=${stats.OFI} | Pending=${stats.Pending}`);
    console.log("─────────────────────────────────────");
  }
}

main().catch(console.error);
