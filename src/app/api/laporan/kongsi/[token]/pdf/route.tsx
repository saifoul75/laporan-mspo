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

  if (!/^[a-zA-Z0-9_-]{8,}$/.test(token)) {
    return NextResponse.json({ error: "Token tidak sah" }, { status: 404 });
  }

  const supabase = createPublicClient();

  const { data: laporanData } = await supabase.rpc("dapatkan_laporan_dengan_token", {
    p_token: token,
  });

  if (!laporanData || (Array.isArray(laporanData) && laporanData.length === 0)) {
    return NextResponse.json(
      { error: "Laporan tidak dijumpai atau perkongsian tidak aktif" },
      { status: 404 }
    );
  }

  const laporan = Array.isArray(laporanData) ? laporanData[0] : laporanData;
  const auditId = (laporan as { audit_id: string }).audit_id;

  const { data: auditRpc } = await supabase.rpc("dapatkan_audit_dengan_token", {
    p_token: token,
  });

  const auditInfo = Array.isArray(auditRpc) ? auditRpc[0] : auditRpc;

  if (!auditInfo) {
    return NextResponse.json({ error: "Gagal muat data audit" }, { status: 500 });
  }

  const { data: poData } = await supabase.rpc("dapatkan_po_dengan_token", {
    p_token: token,
  });
  const poInfo = Array.isArray(poData) ? poData[0] : poData;

  const { data: penggunaData } = await supabase.rpc("dapatkan_pengguna_dengan_token", {
    p_token: token,
  });
  const penggunaList = (Array.isArray(penggunaData) ? penggunaData : penggunaData ? [penggunaData] : []) as {
    id: string;
    nama_penuh: string;
  }[];

  const leadId = auditInfo.lead_auditor_id as string | undefined;
  const auditorIds = (auditInfo.auditor_ids as string[]) ?? [];

  const namaLeadAuditor = leadId
    ? penggunaList.find((p) => p.id === leadId)?.nama_penuh ?? ""
    : "";
  const pembantuId = auditorIds.find((id: string) => id !== leadId);
  const namaAuditorLain = pembantuId
    ? penggunaList.find((p) => p.id === pembantuId)?.nama_penuh ?? null
    : null;

  const { data: dapatanRpc } = await supabase.rpc("dapatkan_dapatan_dengan_token", {
    p_token: token,
  });

  let dapatan: unknown[] = [];
  if (dapatanRpc) {
    dapatan = Array.isArray(dapatanRpc) ? dapatanRpc : [dapatanRpc];
  }

  const audit = {
    ...auditInfo,
    pusat_operasi: poInfo ?? null,
  };

  let logoBase64: string | null = null;
  try {
    const logoPath = path.join(process.cwd(), "public", "logo-risda.png");
    if (fs.existsSync(logoPath)) {
      logoBase64 = "data:image/png;base64," + fs.readFileSync(logoPath).toString("base64");
    }
  } catch {
    /* logo optional */
  }

  const buffer = await renderToBuffer(
    <LaporanPDF
      audit={audit as never}
      dapatan={(dapatan ?? []) as never}
      namaLeadAuditor={namaLeadAuditor}
      namaAuditorLain={namaAuditorLain}
      logoBase64={logoBase64}
    />
  );

  const safeRef = String((audit as { no_rujukan?: string }).no_rujukan ?? "laporan").replace(
    /[^a-zA-Z0-9-_]/g,
    "_"
  );
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Laporan-${safeRef}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
