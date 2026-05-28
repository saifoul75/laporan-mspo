import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import PptxGenJS from "pptxgenjs";

// Force dynamic supaya tak prerender static masa build
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HIJAU = "1F7A45";
const KELABU_GELAP = "374151";
const KELABU = "6B7280";
const KELABU_CERAH = "F3F4F6";
const MERAH = "DC2626";
const ORANGE = "EA580C";
const BIRU = "2563EB";
const PUTIH = "FFFFFF";

type Dapatan = {
  id: string;
  status: string;
  gred_nc: string | null;
  catatan: string | null;
  bukti_audit: string | null;
  cadangan_tindakan: string | null;
  pic: string | null;
  tarikh_siap_target: string | null;
  item_semakan: {
    kod: string;
    tajuk: string;
    fail_rujukan: number | null;
  } | null;
};

function formatTarikh(d: string | null | undefined): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("ms-MY", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

const LABEL_JENIS: Record<string, string> = {
  audit_dalaman: "Audit Dalaman",
  audit_pensijilan: "Audit Pensijilan",
  audit_pengawasan: "Audit Pengawasan",
  audit_persijilan_semula: "Persijilan Semula",
};

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

  // Ambil audit + PO
  const { data: audit, error: ralatAudit } = await supabase
    .from("audit")
    .select(
      "*, pusat_operasi:pusat_operasi_id (kod, nama, wilayah, daerah, negeri, keluasan_hektar)"
    )
    .eq("id", params.id)
    .single();

  if (ralatAudit || !audit) {
    return NextResponse.json(
      { error: "Audit tidak dijumpai", butiran: ralatAudit?.message },
      { status: 404 }
    );
  }

  // Lead auditor
  let namaLead = "-";
  if (audit.lead_auditor_id) {
    const { data: leadProfil } = await supabase
      .from("pengguna")
      .select("nama_penuh")
      .eq("id", audit.lead_auditor_id)
      .single();
    namaLead = leadProfil?.nama_penuh ?? "-";
  }

  // Auditor pembantu
  let namaAuditorLain: string[] = [];
  if (audit.auditor_ids && Array.isArray(audit.auditor_ids) && audit.auditor_ids.length > 0) {
    const { data: auditorProfil } = await supabase
      .from("pengguna")
      .select("nama_penuh")
      .in("id", audit.auditor_ids);
    namaAuditorLain = (auditorProfil ?? []).map((p) => p.nama_penuh);
  }

  // Dapatan
  const { data: dapatanRaw } = await supabase
    .from("dapatan")
    .select(
      "id, status, gred_nc, catatan, bukti_audit, cadangan_tindakan, pic, tarikh_siap_target, item_semakan:item_semakan_id (kod, tajuk, fail_rujukan)"
    )
    .eq("audit_id", params.id);

  const dapatan = (dapatanRaw ?? []) as unknown as Dapatan[];

  const ncMajor = dapatan.filter((d) => d.status === "NC" && d.gred_nc === "major");
  const ncMinor = dapatan.filter((d) => d.status === "NC" && d.gred_nc === "minor");
  const ofiList = dapatan.filter((d) => d.status === "OFI");
  const stats = { Y: 0, N: 0, NC: 0, OFI: 0, NA: 0, Pending: 0 } as Record<string, number>;
  for (const d of dapatan) {
    stats[d.status] = (stats[d.status] ?? 0) + 1;
  }

  const namaPO = (audit.pusat_operasi as { nama?: string } | null)?.nama ?? "-";
  const wilayahPO = (audit.pusat_operasi as { wilayah?: string } | null)?.wilayah ?? "-";
  const tarikhAudit = formatTarikh(audit.tarikh_audit);
  const tarikhTamat = audit.tarikh_tamat ? formatTarikh(audit.tarikh_tamat) : tarikhAudit;
  const julatTarikh =
    audit.tarikh_tamat && audit.tarikh_tamat !== audit.tarikh_audit
      ? `${tarikhAudit} - ${tarikhTamat}`
      : tarikhAudit;
  const jenisAudit = LABEL_JENIS[audit.jenis_audit] ?? audit.jenis_audit;

  // Build PPT
  const pptx = new PptxGenJS();
  pptx.author = "RISDA Plantation Sdn Bhd";
  pptx.title = `Closing Meeting - ${audit.no_rujukan}`;
  pptx.subject = "Audit Dalaman MSPO";
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 inches

  // Helper: footer untuk semua slide
  const tambahFooter = (slide: PptxGenJS.Slide, noPage: number) => {
    slide.addText(
      `RISDA Plantation Sdn Bhd  |  ${audit.no_rujukan}  |  Slide ${noPage}`,
      {
        x: 0.3,
        y: 7.1,
        w: 12.7,
        h: 0.3,
        fontSize: 9,
        color: KELABU,
        align: "center",
      }
    );
  };

  // ===== SLIDE 1: COVER =====
  const s1 = pptx.addSlide();
  s1.background = { color: PUTIH };

  s1.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.33,
    h: 1.2,
    fill: { color: HIJAU },
    line: { color: HIJAU },
  });

  s1.addText("RISDA PLANTATION SDN. BHD.", {
    x: 0.5,
    y: 0.3,
    w: 12.33,
    h: 0.5,
    fontSize: 22,
    bold: true,
    color: PUTIH,
    align: "center",
  });
  s1.addText("(0324822-D)", {
    x: 0.5,
    y: 0.75,
    w: 12.33,
    h: 0.3,
    fontSize: 12,
    color: PUTIH,
    align: "center",
  });

  s1.addText("MESYUARAT PENUTUP AUDIT", {
    x: 0.5,
    y: 2.2,
    w: 12.33,
    h: 0.6,
    fontSize: 30,
    bold: true,
    color: HIJAU,
    align: "center",
  });
  s1.addText("Audit Dalaman MSPO", {
    x: 0.5,
    y: 2.85,
    w: 12.33,
    h: 0.5,
    fontSize: 18,
    color: KELABU_GELAP,
    align: "center",
  });

  s1.addText(namaPO, {
    x: 0.5,
    y: 3.8,
    w: 12.33,
    h: 0.6,
    fontSize: 28,
    bold: true,
    color: KELABU_GELAP,
    align: "center",
  });
  s1.addText(`Wilayah: ${wilayahPO}`, {
    x: 0.5,
    y: 4.4,
    w: 12.33,
    h: 0.4,
    fontSize: 16,
    color: KELABU,
    align: "center",
  });

  s1.addText(julatTarikh, {
    x: 0.5,
    y: 5.2,
    w: 12.33,
    h: 0.5,
    fontSize: 18,
    color: KELABU_GELAP,
    align: "center",
  });

  s1.addText(audit.no_rujukan, {
    x: 0.5,
    y: 6.2,
    w: 12.33,
    h: 0.4,
    fontSize: 14,
    italic: true,
    color: KELABU,
    align: "center",
  });

  s1.addText(
    "Standard: MS 2530-2-2:2022 - General Principles for Organised Smallholders",
    {
      x: 0.5,
      y: 6.55,
      w: 12.33,
      h: 0.3,
      fontSize: 10,
      italic: true,
      color: KELABU,
      align: "center",
    }
  );

  // ===== SLIDE 2: AGENDA =====
  const s2 = pptx.addSlide();
  s2.addText("Agenda Mesyuarat", {
    x: 0.5,
    y: 0.4,
    w: 12.33,
    h: 0.6,
    fontSize: 28,
    bold: true,
    color: HIJAU,
  });
  s2.addShape(pptx.ShapeType.line, {
    x: 0.5,
    y: 1.05,
    w: 12.33,
    h: 0,
    line: { color: HIJAU, width: 2 },
  });

  const agenda = [
    "1. Pengenalan & Skop Audit",
    "2. Pasukan Audit",
    "3. Methodology",
    "4. Ringkasan Dapatan",
    "5. Detail Non-Conformity (NC)",
    "6. Detail Opportunity for Improvement (OFI)",
    "7. Tarikh Akhir Tindakan Pembetulan (CAP)",
    "8. Soal Jawab & Penutup",
  ];
  s2.addText(agenda.join("\n\n"), {
    x: 1.0,
    y: 1.5,
    w: 11.33,
    h: 5.2,
    fontSize: 20,
    color: KELABU_GELAP,
    valign: "top",
  });
  tambahFooter(s2, 2);

  // ===== SLIDE 3: PENGENALAN =====
  const s3 = pptx.addSlide();
  s3.addText("Pengenalan & Skop", {
    x: 0.5,
    y: 0.4,
    w: 12.33,
    h: 0.6,
    fontSize: 28,
    bold: true,
    color: HIJAU,
  });
  s3.addShape(pptx.ShapeType.line, {
    x: 0.5,
    y: 1.05,
    w: 12.33,
    h: 0,
    line: { color: HIJAU, width: 2 },
  });

  const infoRows = [
    [{ text: "No. Rujukan Audit", options: { bold: true, fill: { color: KELABU_CERAH } } }, { text: audit.no_rujukan }],
    [{ text: "Pusat Operasi", options: { bold: true, fill: { color: KELABU_CERAH } } }, { text: namaPO }],
    [{ text: "Wilayah", options: { bold: true, fill: { color: KELABU_CERAH } } }, { text: wilayahPO }],
    [{ text: "Tarikh Audit", options: { bold: true, fill: { color: KELABU_CERAH } } }, { text: julatTarikh }],
    [{ text: "Jenis Audit", options: { bold: true, fill: { color: KELABU_CERAH } } }, { text: jenisAudit }],
    [{ text: "Standard", options: { bold: true, fill: { color: KELABU_CERAH } } }, { text: "MS 2530-2-2:2022" }],
    [{ text: "Skop", options: { bold: true, fill: { color: KELABU_CERAH } } }, { text: "5 Prinsip · 28 Kriteria · 74 Item Semakan" }],
  ];
  s3.addTable(infoRows, {
    x: 0.5,
    y: 1.4,
    w: 12.33,
    fontSize: 16,
    color: KELABU_GELAP,
    border: { type: "solid", color: "D1D5DB", pt: 1 },
    rowH: 0.55,
  });
  tambahFooter(s3, 3);

  // ===== SLIDE 4: PASUKAN AUDIT =====
  const s4 = pptx.addSlide();
  s4.addText("Pasukan Audit", {
    x: 0.5,
    y: 0.4,
    w: 12.33,
    h: 0.6,
    fontSize: 28,
    bold: true,
    color: HIJAU,
  });
  s4.addShape(pptx.ShapeType.line, {
    x: 0.5,
    y: 1.05,
    w: 12.33,
    h: 0,
    line: { color: HIJAU, width: 2 },
  });

  s4.addText("Lead Auditor", {
    x: 0.5,
    y: 1.5,
    w: 12.33,
    h: 0.4,
    fontSize: 14,
    bold: true,
    color: KELABU,
  });
  s4.addText(namaLead, {
    x: 0.5,
    y: 1.95,
    w: 12.33,
    h: 0.5,
    fontSize: 22,
    bold: true,
    color: KELABU_GELAP,
  });

  s4.addText("Auditor Pembantu", {
    x: 0.5,
    y: 3.0,
    w: 12.33,
    h: 0.4,
    fontSize: 14,
    bold: true,
    color: KELABU,
  });
  if (namaAuditorLain.length === 0) {
    s4.addText("(Tiada auditor pembantu)", {
      x: 0.5,
      y: 3.45,
      w: 12.33,
      h: 0.5,
      fontSize: 16,
      italic: true,
      color: KELABU,
    });
  } else {
    s4.addText(namaAuditorLain.map((n, i) => `${i + 1}. ${n}`).join("\n"), {
      x: 0.5,
      y: 3.45,
      w: 12.33,
      h: 3,
      fontSize: 18,
      color: KELABU_GELAP,
      valign: "top",
    });
  }
  tambahFooter(s4, 4);

  // ===== SLIDE 5: METHODOLOGY =====
  const s5 = pptx.addSlide();
  s5.addText("Methodology", {
    x: 0.5,
    y: 0.4,
    w: 12.33,
    h: 0.6,
    fontSize: 28,
    bold: true,
    color: HIJAU,
  });
  s5.addShape(pptx.ShapeType.line, {
    x: 0.5,
    y: 1.05,
    w: 12.33,
    h: 0,
    line: { color: HIJAU, width: 2 },
  });

  const metodologi = [
    "• Document Review - semakan dokumen induk (Fail 1-13)",
    "• Site Walk - lawatan lapangan ke ladang, stor, kawasan operasi",
    "• Interview - temubual dengan pekerja & pegawai",
    "• Photo Evidence - dokumentasi gambar bukti dengan timestamp",
    "• Cross-Reference - banding dapatan dengan klausa MS 2530-2-2:2022",
  ];
  s5.addText(metodologi.join("\n\n"), {
    x: 1.0,
    y: 1.6,
    w: 11.33,
    h: 5.2,
    fontSize: 18,
    color: KELABU_GELAP,
    valign: "top",
  });
  tambahFooter(s5, 5);

  // ===== SLIDE 6: RINGKASAN DAPATAN =====
  const s6 = pptx.addSlide();
  s6.addText("Ringkasan Dapatan", {
    x: 0.5,
    y: 0.4,
    w: 12.33,
    h: 0.6,
    fontSize: 28,
    bold: true,
    color: HIJAU,
  });
  s6.addShape(pptx.ShapeType.line, {
    x: 0.5,
    y: 1.05,
    w: 12.33,
    h: 0,
    line: { color: HIJAU, width: 2 },
  });

  // 6 kotak ringkasan
  const kotakConfig: { label: string; nilai: number; warna: string; x: number }[] = [
    { label: "Y (Patuh)", nilai: stats.Y ?? 0, warna: HIJAU, x: 0.5 },
    { label: "N (Tidak)", nilai: stats.N ?? 0, warna: MERAH, x: 2.7 },
    { label: "NC", nilai: stats.NC ?? 0, warna: ORANGE, x: 4.9 },
    { label: "OFI", nilai: stats.OFI ?? 0, warna: BIRU, x: 7.1 },
    { label: "NA", nilai: stats.NA ?? 0, warna: KELABU, x: 9.3 },
    { label: "Pending", nilai: stats.Pending ?? 0, warna: "9CA3AF", x: 11.5 },
  ];
  for (const k of kotakConfig) {
    s6.addShape(pptx.ShapeType.roundRect, {
      x: k.x,
      y: 1.5,
      w: 1.7,
      h: 1.5,
      fill: { color: k.warna },
      line: { color: k.warna },
      rectRadius: 0.1,
    });
    s6.addText(String(k.nilai), {
      x: k.x,
      y: 1.5,
      w: 1.7,
      h: 1.0,
      fontSize: 36,
      bold: true,
      color: PUTIH,
      align: "center",
      valign: "middle",
    });
    s6.addText(k.label, {
      x: k.x,
      y: 2.45,
      w: 1.7,
      h: 0.5,
      fontSize: 11,
      color: PUTIH,
      align: "center",
      valign: "middle",
    });
  }

  // Highlight NC breakdown
  s6.addText("Pecahan NC mengikut Gred:", {
    x: 0.5,
    y: 3.5,
    w: 12.33,
    h: 0.4,
    fontSize: 16,
    bold: true,
    color: KELABU_GELAP,
  });

  const ncBreakdown = [
    [
      { text: "Major NC", options: { bold: true, color: MERAH, fontSize: 14 } },
      { text: String(ncMajor.length), options: { bold: true, fontSize: 18, align: "center" as const } },
      { text: "30 hari kalendar", options: { fontSize: 12, color: KELABU } },
    ],
    [
      { text: "Minor NC", options: { bold: true, color: ORANGE, fontSize: 14 } },
      { text: String(ncMinor.length), options: { bold: true, fontSize: 18, align: "center" as const } },
      { text: "90 hari kalendar", options: { fontSize: 12, color: KELABU } },
    ],
    [
      { text: "OFI", options: { bold: true, color: BIRU, fontSize: 14 } },
      { text: String(ofiList.length), options: { bold: true, fontSize: 18, align: "center" as const } },
      { text: "Penambahbaikan berterusan", options: { fontSize: 12, color: KELABU } },
    ],
  ];
  s6.addTable(ncBreakdown, {
    x: 0.5,
    y: 4.1,
    w: 12.33,
    colW: [3, 2, 7.33],
    fontSize: 14,
    border: { type: "solid", color: "D1D5DB", pt: 1 },
    rowH: 0.7,
  });
  tambahFooter(s6, 6);

  // ===== SLIDES 7+: NC DETAIL (1 slide per NC) =====
  let pageNum = 7;
  const ncSemua = [...ncMajor, ...ncMinor];
  for (let i = 0; i < ncSemua.length; i++) {
    const nc = ncSemua[i];
    const isMajor = nc.gred_nc === "major";
    const slide = pptx.addSlide();

    // Header banner
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.33,
      h: 0.9,
      fill: { color: isMajor ? MERAH : ORANGE },
      line: { color: isMajor ? MERAH : ORANGE },
    });
    slide.addText(`NC #${i + 1} - ${isMajor ? "MAJOR" : "MINOR"}`, {
      x: 0.5,
      y: 0.15,
      w: 12.33,
      h: 0.6,
      fontSize: 24,
      bold: true,
      color: PUTIH,
    });

    slide.addText(
      `Klausa MSPO: ${nc.item_semakan?.kod ?? "-"}`,
      {
        x: 0.5,
        y: 1.1,
        w: 12.33,
        h: 0.4,
        fontSize: 14,
        bold: true,
        color: KELABU,
      }
    );
    slide.addText(nc.item_semakan?.tajuk ?? "-", {
      x: 0.5,
      y: 1.5,
      w: 12.33,
      h: 0.5,
      fontSize: 18,
      bold: true,
      color: KELABU_GELAP,
    });

    // Body table
    const ncBody = [
      [
        { text: "Kenyataan Ketidakpatuhan", options: { bold: true, fill: { color: KELABU_CERAH } } },
        { text: nc.catatan ?? "(Tiada catatan)" },
      ],
      [
        { text: "Bukti Audit (Objective Evidence)", options: { bold: true, fill: { color: KELABU_CERAH } } },
        { text: nc.bukti_audit ?? "-" },
      ],
      [
        { text: "Cadangan Tindakan Pembetulan", options: { bold: true, fill: { color: KELABU_CERAH } } },
        { text: nc.cadangan_tindakan ?? "-" },
      ],
      [
        { text: "PIC", options: { bold: true, fill: { color: KELABU_CERAH } } },
        { text: nc.pic ?? "-" },
      ],
      [
        { text: "Tarikh Sasaran Selesai", options: { bold: true, fill: { color: KELABU_CERAH } } },
        { text: nc.tarikh_siap_target ? formatTarikh(nc.tarikh_siap_target) : "-" },
      ],
    ];
    slide.addTable(ncBody, {
      x: 0.5,
      y: 2.2,
      w: 12.33,
      colW: [3.5, 8.83],
      fontSize: 12,
      color: KELABU_GELAP,
      border: { type: "solid", color: "D1D5DB", pt: 1 },
      autoPage: false,
    });

    tambahFooter(slide, pageNum++);
  }

  // ===== SLIDE OFI: senarai OFI dalam satu jadual =====
  if (ofiList.length > 0) {
    const sOfi = pptx.addSlide();
    sOfi.addText(`Opportunity for Improvement (OFI) - ${ofiList.length} item`, {
      x: 0.5,
      y: 0.4,
      w: 12.33,
      h: 0.6,
      fontSize: 24,
      bold: true,
      color: BIRU,
    });
    sOfi.addShape(pptx.ShapeType.line, {
      x: 0.5,
      y: 1.05,
      w: 12.33,
      h: 0,
      line: { color: BIRU, width: 2 },
    });

    const ofiHeader = [
      [
        { text: "#", options: { bold: true, fill: { color: BIRU }, color: PUTIH } },
        { text: "Klausa", options: { bold: true, fill: { color: BIRU }, color: PUTIH } },
        { text: "Pemerhatian", options: { bold: true, fill: { color: BIRU }, color: PUTIH } },
        { text: "Cadangan", options: { bold: true, fill: { color: BIRU }, color: PUTIH } },
      ],
    ];
    const ofiBody = ofiList.slice(0, 8).map((o, i) => [
      { text: String(i + 1) },
      { text: o.item_semakan?.kod ?? "-" },
      { text: o.catatan ?? "-" },
      { text: o.cadangan_tindakan ?? "-" },
    ]);
    sOfi.addTable([...ofiHeader, ...ofiBody], {
      x: 0.5,
      y: 1.4,
      w: 12.33,
      colW: [0.6, 1.5, 5.5, 4.73],
      fontSize: 11,
      color: KELABU_GELAP,
      border: { type: "solid", color: "D1D5DB", pt: 1 },
    });

    if (ofiList.length > 8) {
      sOfi.addText(`(+${ofiList.length - 8} OFI lagi - rujuk laporan PDF untuk senarai penuh)`, {
        x: 0.5,
        y: 6.5,
        w: 12.33,
        h: 0.3,
        fontSize: 10,
        italic: true,
        color: KELABU,
      });
    }
    tambahFooter(sOfi, pageNum++);
  }

  // ===== SLIDE: CAP TIMELINE =====
  const sCap = pptx.addSlide();
  sCap.addText("Tarikh Akhir Tindakan Pembetulan (CAP)", {
    x: 0.5,
    y: 0.4,
    w: 12.33,
    h: 0.6,
    fontSize: 26,
    bold: true,
    color: HIJAU,
  });
  sCap.addShape(pptx.ShapeType.line, {
    x: 0.5,
    y: 1.05,
    w: 12.33,
    h: 0,
    line: { color: HIJAU, width: 2 },
  });

  // Tunjuk CAP info kalau dah muktamadkan
  const sudahMuktamad = !!audit.tarikh_muktamad;
  if (sudahMuktamad) {
    const capRows = [
      [
        { text: "Tarikh Muktamadkan", options: { bold: true, fill: { color: KELABU_CERAH } } },
        { text: formatTarikh(audit.tarikh_muktamad) },
      ],
      [
        { text: "Gred CAP", options: { bold: true, fill: { color: KELABU_CERAH } } },
        { text: audit.cap_grade_basis ? audit.cap_grade_basis.toUpperCase() : "Tiada NC" },
      ],
      [
        { text: "Tempoh CAP", options: { bold: true, fill: { color: KELABU_CERAH } } },
        { text: audit.cap_due_days ? `${audit.cap_due_days} hari kalendar` : "-" },
      ],
      [
        { text: "Tarikh Akhir CAP", options: { bold: true, fill: { color: HIJAU }, color: PUTIH } },
        {
          text: audit.cap_due_date ? formatTarikh(audit.cap_due_date) : "-",
          options: { bold: true, fontSize: 18, color: HIJAU },
        },
      ],
    ];
    sCap.addTable(capRows, {
      x: 0.5,
      y: 1.5,
      w: 12.33,
      colW: [4, 8.33],
      fontSize: 14,
      color: KELABU_GELAP,
      border: { type: "solid", color: "D1D5DB", pt: 1 },
      rowH: 0.7,
    });
  } else {
    sCap.addText("Audit ini belum dimuktamadkan.\nKeputusan dan tarikh akhir CAP akan ditetapkan selepas Closing Meeting ini.", {
      x: 0.5,
      y: 1.7,
      w: 12.33,
      h: 1,
      fontSize: 16,
      italic: true,
      color: KELABU,
      align: "center",
    });

    const capRules = [
      [
        { text: "Major NC", options: { bold: true, color: MERAH } },
        { text: "30 hari kalendar dari Closing Meeting" },
      ],
      [
        { text: "Minor NC", options: { bold: true, color: ORANGE } },
        { text: "90 hari kalendar dari Closing Meeting" },
      ],
      [
        { text: "OFI", options: { bold: true, color: BIRU } },
        { text: "Tiada deadline mandatori (digalakkan dilaksanakan)" },
      ],
    ];
    sCap.addTable(capRules, {
      x: 0.5,
      y: 3.2,
      w: 12.33,
      colW: [3, 9.33],
      fontSize: 14,
      color: KELABU_GELAP,
      border: { type: "solid", color: "D1D5DB", pt: 1 },
      rowH: 0.7,
    });
  }

  sCap.addText("Sistem akan auto-track CAP dan hantar peringatan e-mel:", {
    x: 0.5,
    y: 5.5,
    w: 12.33,
    h: 0.4,
    fontSize: 13,
    bold: true,
    color: KELABU_GELAP,
  });
  sCap.addText("• Hari ke-15: amaran awal\n• Hari ke-25: peringatan akhir (Major)\n• Bulanan: untuk Minor NC", {
    x: 1.0,
    y: 5.95,
    w: 11.33,
    h: 1.0,
    fontSize: 12,
    color: KELABU_GELAP,
  });
  tambahFooter(sCap, pageNum++);

  // ===== SLIDE PENUTUP =====
  const sEnd = pptx.addSlide();
  sEnd.background = { color: HIJAU };

  sEnd.addText("Terima Kasih", {
    x: 0.5,
    y: 2.5,
    w: 12.33,
    h: 1.0,
    fontSize: 60,
    bold: true,
    color: PUTIH,
    align: "center",
  });
  sEnd.addText("Soal Jawab & Komen", {
    x: 0.5,
    y: 3.7,
    w: 12.33,
    h: 0.6,
    fontSize: 24,
    color: PUTIH,
    align: "center",
  });

  sEnd.addText("Komitmen pengurusan adalah kunci kepada penambahbaikan berterusan", {
    x: 0.5,
    y: 5.5,
    w: 12.33,
    h: 0.5,
    fontSize: 14,
    italic: true,
    color: PUTIH,
    align: "center",
  });
  sEnd.addText(`${namaPO}  |  ${julatTarikh}  |  ${audit.no_rujukan}`, {
    x: 0.5,
    y: 6.5,
    w: 12.33,
    h: 0.4,
    fontSize: 11,
    color: PUTIH,
    align: "center",
  });

  // Generate buffer
  const buf = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="Closing-${audit.no_rujukan}.pptx"`,
    },
  });
}
