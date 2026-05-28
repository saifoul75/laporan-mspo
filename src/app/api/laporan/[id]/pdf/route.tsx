import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { LaporanPDF } from "@/lib/pdf/laporan-pdf";
import fs from "fs";
import path from "path";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Tidak diauthentikasi" },
      { status: 401 }
    );
  }

  const { data: audit, error: ralatAudit } = await supabase
    .from("audit")
    .select(
      "*, pusat_operasi:pusat_operasi_id (kod, nama, wilayah, daerah, negeri, keluasan_hektar)"
    )
    .eq("id", params.id)
    .single();

  if (ralatAudit) {
    return NextResponse.json(
      {
        error: "Gagal muat audit",
        butiran: ralatAudit.message,
        audit_id: params.id,
      },
      { status: 500 }
    );
  }

  if (!audit) {
    return NextResponse.json(
      { error: "Audit tidak dijumpai", audit_id: params.id },
      { status: 404 }
    );
  }

  let namaLeadAuditor = "MOHD SAIFOUL AZUAN BIN MOHD ISA";
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

  const { data: dapatan, error: ralatDapatan } = await supabase
    .from("dapatan")
    .select(
      "id, status, gred_nc, catatan, bukti_audit, cadangan_tindakan, pic, tarikh_siap_target, item_semakan:item_semakan_id (kod, tajuk, fail_rujukan, kriteria:kriteria_id (kod, prinsip:prinsip_id (kod, tajuk)))"
    )
    .eq("audit_id", params.id);

  if (ralatDapatan) {
    return NextResponse.json(
      {
        error: "Gagal muat dapatan",
        butiran: ralatDapatan.message,
        audit_id: params.id,
      },
      { status: 500 }
    );
  }

  let logoBase64: string | null = null;
  try {
    const logoPath = path.join(process.cwd(), "public", "logo-risda.png");
    if (fs.existsSync(logoPath)) {
      logoBase64 = "data:image/png;base64," + fs.readFileSync(logoPath).toString("base64");
    }
  } catch { /* logo optional */ }

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
    },
  });
}
