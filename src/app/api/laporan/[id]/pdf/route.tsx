import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { LaporanPDF } from "@/lib/pdf/laporan-pdf";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();

  // Pastikan user authenticated supaya RLS tidak senyap pulangkan kosong
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

  const buffer = await renderToBuffer(
    <LaporanPDF audit={audit as never} dapatan={(dapatan ?? []) as never} />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Laporan-${audit.no_rujukan}.pdf"`,
    },
  });
}
