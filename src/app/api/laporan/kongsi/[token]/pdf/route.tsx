// /api/laporan/kongsi/[token]/pdf — Muat turun PDF laporan yang dikongsi (AWAM)
// Tiada auth diperlukan. Token diselesaikan → laporan → PDF dijana semula.
// Menggunakan semula LaporanPDF yang sama dengan laluan /api/laporan/[id]/pdf.

import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { LaporanPDF } from "@/lib/pdf/laporan-pdf";
import { createPublicClient } from "@/lib/supabase/public";
import fs from "fs";
import path from "path";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Sanitasi: token mestilah alphanumeric/dash/underscore
  if (!/^[a-zA-Z0-9_-]{8,}$/.test(token)) {
    return NextResponse.json({ error: "Token tidak sah" }, { status: 404 });
  }

  const supabase = createPublicClient();

  // 1. Selesaikan token → audit_id
  const { data: laporan } = await supabase
    .from("laporan")
    .select("audit_id")
    .eq("token_kongsi", token)
    .eq("kongsi_aktif", true)
    .single();

  if (!laporan) {
    return NextResponse.json(
      { error: "Laporan tidak dijumpai atau perkongsian tidak aktif" },
      { status: 404 }
    );
  }

  const auditId = laporan.audit_id as string;

  // 2. Muat audit
  const { data: audit, error: ralatAudit } = await supabase
    .from("audit")
    .select(
      "*, pusat_operasi:pusat_operasi_id (kod, nama, wilayah, daerah, negeri, keluasan_hektar)"
    )
    .eq("id", auditId)
    .single();

  if (ralatAudit || !audit) {
    return NextResponse.json(
      { error: "Gagal muat data audit" },
      { status: 500 }
    );
  }

  // 3. Nama auditor
  let namaLeadAuditor = "";
  let namaAuditorLain: string | null = null;

  if (audit.lead_auditor_id) {
    const { data: leadProfil } = await supabase
      .from("pengguna")
      .select("nama_penuh")
      .eq("id", audit.lead_auditor_id)
      .single();
    if (leadProfil?.nama_penuh) namaLeadAuditor = leadProfil.nama_penuh;
  }

  const auditorIds: string[] = audit.auditor_ids ?? [];
  const pembantuId = auditorIds.find((id: string) => id !== audit.lead_auditor_id);
  if (pembantuId) {
    const { data: pembantuProfil } = await supabase
      .from("pengguna")
      .select("nama_penuh")
      .eq("id", pembantuId)
      .single();
    if (pembantuProfil?.nama_penuh) namaAuditorLain = pembantuProfil.nama_penuh;
  }

  // 4. Muat dapatan
  const { data: dapatan, error: ralatDapatan } = await supabase
    .from("dapatan")
    .select(
      "id, status, gred_nc, catatan, bukti_audit, cadangan_tindakan, pic, tarikh_siap_target, item_semakan:item_semakan_id (kod, tajuk, fail_rujukan, kriteria:kriteria_id (kod, prinsip:prinsip_id (kod, tajuk)))"
    )
    .eq("audit_id", auditId);

  if (ralatDapatan) {
    return NextResponse.json(
      { error: "Gagal muat dapatan" },
      { status: 500 }
    );
  }

  // 5. Logo (pilihan)
  let logoBase64: string | null = null;
  try {
    const logoPath = path.join(process.cwd(), "public", "logo-risda.png");
    if (fs.existsSync(logoPath)) {
      logoBase64 =
        "data:image/png;base64," + fs.readFileSync(logoPath).toString("base64");
    }
  } catch {
    /* logo pilihan — teruskan tanpa logo */
  }

  // 6. Jana PDF
  const buffer = await renderToBuffer(
    <LaporanPDF
      audit={audit as never}
      dapatan={(dapatan ?? []) as never}
      namaLeadAuditor={namaLeadAuditor}
      namaAuditorLain={namaAuditorLain}
      logoBase64={logoBase64}
    />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Laporan-${audit.no_rujukan}.pdf"`,
      // Benarkan cache ringkas di CDN (5 minit) — kandungan tidak berubah tanpa token baru
      "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
    },
  });
}
