import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { LaporanPDF } from "@/lib/pdf/laporan-pdf";
import fs from "fs";
import path from "path";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

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
    .eq("id", id)
    .single();

  if (ralatAudit) {
    return NextResponse.json(
      {
        error: "Gagal muat audit",
      },
      { status: 500 }
    );
  }

  if (!audit) {
    return NextResponse.json(
      { error: "Audit tidak dijumpai" },
      { status: 404 }
    );
  }

  const { data: profil } = await supabase
    .from("pengguna")
    .select("rol, pusat_operasi_id")
    .eq("id", user.id)
    .single();

  if (!profil) {
    return NextResponse.json({ error: "Profil tidak dijumpai" }, { status: 403 });
  }

  const isAdminAuditor = ["admin", "lead_auditor", "auditor"].includes(profil.rol);
  const isPoMember =
    "pusat_operasi_id" in audit &&
    (audit as unknown as Record<string, unknown>).pusat_operasi_id === profil.pusat_operasi_id;

  const isAssigned =
    (audit as { lead_auditor_id?: string; auditor_ids?: string[] }).lead_auditor_id ===
      user.id ||
    (
      (audit as { auditor_ids?: string[] }).auditor_ids ?? []
    ).includes(user.id);

  if (!isAdminAuditor && !isPoMember && !isAssigned) {
    return NextResponse.json({ error: "Tiada akses kepada audit ini" }, { status: 403 });
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
     .eq("audit_id", id);

  if (ralatDapatan) {
    return NextResponse.json(
      {
        error: "Gagal muat dapatan",
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
