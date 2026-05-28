import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import PptxGenJS from "pptxgenjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Palette moden RISDA — terinspirasi minimalist corporate
const HIJAU_GELAP = "0F4A2A";       // primary deep
const HIJAU = "1F7A45";              // primary brand
const HIJAU_TERANG = "10B981";       // accent
const EMAS = "D4A017";               // accent warm
const KRIM = "FAF8F3";               // background warm
const PUTIH = "FFFFFF";
const TEKS_GELAP = "111827";         // primary text
const TEKS_KELABU = "6B7280";        // secondary text
const TEKS_MUTED = "9CA3AF";         // tertiary text
const SEMPADAN_HALUS = "E5E7EB";
const MERAH = "B91C1C";
const MERAH_LATAR = "FEE2E2";
const ORANGE = "C2410C";
const ORANGE_LATAR = "FFEDD5";
const BIRU = "1E40AF";
const BIRU_LATAR = "DBEAFE";

type Dapatan = {
  id: string;
  status: string;
  gred_nc: string | null;
  catatan: string | null;
  bukti_audit: string | null;
  cadangan_tindakan: string | null;
  pic: string | null;
  tarikh_siap_target: string | null;
  item_semakan: { kod: string; tajuk: string; fail_rujukan: number | null } | null;
};

function formatTarikh(d: string | null | undefined): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("ms-MY", { day: "2-digit", month: "long", year: "numeric" });
}

const LABEL_JENIS: Record<string, string> = {
  audit_dalaman: "Audit Dalaman",
  audit_pensijilan: "Audit Pensijilan",
  audit_pengawasan: "Audit Pengawasan",
  audit_persijilan_semula: "Persijilan Semula",
};

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Tidak diauthentikasi" }, { status: 401 });
  }

  const { data: audit, error: ralatAudit } = await supabase
    .from("audit")
    .select("*, pusat_operasi:pusat_operasi_id (kod, nama, wilayah, daerah, negeri, keluasan_hektar)")
    .eq("id", params.id)
    .single();

  if (ralatAudit || !audit) {
    return NextResponse.json({ error: "Audit tidak dijumpai", butiran: ralatAudit?.message }, { status: 404 });
  }

  let namaLead = "-";
  if (audit.lead_auditor_id) {
    const { data: leadProfil } = await supabase
      .from("pengguna").select("nama_penuh").eq("id", audit.lead_auditor_id).single();
    namaLead = leadProfil?.nama_penuh ?? "-";
  }

  let namaAuditorLain: string[] = [];
  if (audit.auditor_ids && Array.isArray(audit.auditor_ids) && audit.auditor_ids.length > 0) {
    const { data: auditorProfil } = await supabase
      .from("pengguna").select("nama_penuh").in("id", audit.auditor_ids);
    namaAuditorLain = (auditorProfil ?? []).map((p) => p.nama_penuh);
  }

  const { data: dapatanRaw } = await supabase
    .from("dapatan")
    .select("id, status, gred_nc, catatan, bukti_audit, cadangan_tindakan, pic, tarikh_siap_target, item_semakan:item_semakan_id (kod, tajuk, fail_rujukan)")
    .eq("audit_id", params.id);

  const dapatan = (dapatanRaw ?? []) as unknown as Dapatan[];
  const ncMajor = dapatan.filter((d) => d.status === "NC" && d.gred_nc === "major");
  const ncMinor = dapatan.filter((d) => d.status === "NC" && d.gred_nc === "minor");
  const ofiList = dapatan.filter((d) => d.status === "OFI");
  const stats = { Y: 0, N: 0, NC: 0, OFI: 0, NA: 0, Pending: 0 } as Record<string, number>;
  for (const d of dapatan) stats[d.status] = (stats[d.status] ?? 0) + 1;

  const namaPO = (audit.pusat_operasi as { nama?: string } | null)?.nama ?? "-";
  const wilayahPO = (audit.pusat_operasi as { wilayah?: string } | null)?.wilayah ?? "-";
  const tarikhAudit = formatTarikh(audit.tarikh_audit);
  const tarikhTamat = audit.tarikh_tamat ? formatTarikh(audit.tarikh_tamat) : tarikhAudit;
  const julatTarikh = audit.tarikh_tamat && audit.tarikh_tamat !== audit.tarikh_audit
    ? `${tarikhAudit} — ${tarikhTamat}` : tarikhAudit;
  const jenisAudit = LABEL_JENIS[audit.jenis_audit] ?? audit.jenis_audit;

  const pptx = new PptxGenJS();
  pptx.author = "RISDA Plantation Sdn Bhd";
  pptx.title = `Closing Meeting - ${audit.no_rujukan}`;
  pptx.subject = "Audit Dalaman MSPO";
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5

  const W = 13.33;
  const H = 7.5;

  // ============ HELPER: header standard untuk content slide ============
  const tambahHeaderContent = (slide: PptxGenJS.Slide, tajuk: string, subtajuk?: string) => {
    // Top accent bar (thin)
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: W, h: 0.15,
      fill: { color: HIJAU }, line: { color: HIJAU },
    });
    // Left accent bar untuk title
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.6, y: 0.7, w: 0.08, h: 0.85,
      fill: { color: EMAS }, line: { color: EMAS },
    });
    // Title
    slide.addText(tajuk, {
      x: 0.85, y: 0.6, w: W - 1.2, h: 0.55,
      fontSize: 26, bold: true, color: TEKS_GELAP, fontFace: "Calibri",
    });
    // Subtitle (kecil, italic)
    if (subtajuk) {
      slide.addText(subtajuk, {
        x: 0.85, y: 1.15, w: W - 1.2, h: 0.35,
        fontSize: 12, color: TEKS_KELABU, fontFace: "Calibri", italic: true,
      });
    }
    // Bottom thin accent line
    slide.addShape(pptx.ShapeType.line, {
      x: 0.6, y: H - 0.5, w: W - 1.2, h: 0,
      line: { color: SEMPADAN_HALUS, width: 0.75 },
    });
  };

  const tambahFooter = (slide: PptxGenJS.Slide, noPage: number, jumlahPage?: number) => {
    // Brand mark kiri bawah
    slide.addText("RISDA PLANTATION", {
      x: 0.6, y: H - 0.4, w: 3, h: 0.3,
      fontSize: 9, bold: true, color: HIJAU, fontFace: "Calibri", charSpacing: 2,
    });
    // Audit ref tengah
    slide.addText(audit.no_rujukan, {
      x: 0, y: H - 0.4, w: W, h: 0.3,
      fontSize: 9, color: TEKS_MUTED, fontFace: "Calibri", align: "center",
    });
    // Page number kanan dalam circle
    slide.addShape(pptx.ShapeType.ellipse, {
      x: W - 1.0, y: H - 0.45, w: 0.4, h: 0.4,
      fill: { color: HIJAU }, line: { color: HIJAU },
    });
    slide.addText(jumlahPage ? `${noPage}/${jumlahPage}` : String(noPage), {
      x: W - 1.0, y: H - 0.45, w: 0.4, h: 0.4,
      fontSize: 11, bold: true, color: PUTIH, fontFace: "Calibri",
      align: "center", valign: "middle",
    });
  };

  // ============ KIRA TOTAL SLIDES ============
  let totalSlides = 6 // cover, agenda, pengenalan, pasukan, methodology, ringkasan
    + ncMajor.length + ncMinor.length // 1 per NC
    + (ofiList.length > 0 ? 1 : 0) // OFI table
    + 1 // CAP
    + 1; // penutup

  let pageNum = 0;

  // ===================================================================
  // SLIDE 1: COVER — Full bleed dengan accent design
  // ===================================================================
  pageNum++;
  const s1 = pptx.addSlide();
  s1.background = { color: KRIM };

  // Background hijau gelap kanan (60% width)
  s1.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: H,
    fill: { color: HIJAU_GELAP }, line: { color: HIJAU_GELAP },
  });

  // Krim bar bawah
  s1.addShape(pptx.ShapeType.rect, {
    x: 0, y: H - 1.2, w: W, h: 1.2,
    fill: { color: KRIM }, line: { color: KRIM },
  });

  // Emas accent vertical bar tengah
  s1.addShape(pptx.ShapeType.rect, {
    x: 1.2, y: 1.5, w: 0.12, h: 4.5,
    fill: { color: EMAS }, line: { color: EMAS },
  });

  // Tagline kecil atas
  s1.addText("MESYUARAT PENUTUP AUDIT", {
    x: 1.5, y: 1.5, w: W - 2, h: 0.4,
    fontSize: 13, bold: true, color: EMAS, fontFace: "Calibri", charSpacing: 6,
  });

  // Title besar
  s1.addText(namaPO, {
    x: 1.5, y: 2.0, w: W - 2.5, h: 1.5,
    fontSize: 44, bold: true, color: PUTIH, fontFace: "Calibri",
  });

  // Subtitle wilayah
  s1.addText(`Wilayah ${wilayahPO}`, {
    x: 1.5, y: 3.6, w: W - 2.5, h: 0.5,
    fontSize: 18, color: HIJAU_TERANG, fontFace: "Calibri",
  });

  // Tarikh
  s1.addText(julatTarikh, {
    x: 1.5, y: 4.4, w: W - 2.5, h: 0.5,
    fontSize: 22, bold: true, color: PUTIH, fontFace: "Calibri",
  });

  // Standard line italic
  s1.addText("Audit Dalaman · MS 2530-2-2:2022", {
    x: 1.5, y: 5.0, w: W - 2.5, h: 0.4,
    fontSize: 13, italic: true, color: "9CA3AF", fontFace: "Calibri",
  });

  // Footer info dalam krim section
  s1.addText("RISDA PLANTATION SDN. BHD.", {
    x: 1.2, y: H - 0.95, w: W - 2.4, h: 0.35,
    fontSize: 14, bold: true, color: HIJAU, fontFace: "Calibri", charSpacing: 4,
  });
  s1.addText(`(0324822-D)  ·  ${audit.no_rujukan}`, {
    x: 1.2, y: H - 0.55, w: W - 2.4, h: 0.3,
    fontSize: 10, color: TEKS_KELABU, fontFace: "Calibri",
  });

  // ===================================================================
  // SLIDE 2: AGENDA
  // ===================================================================
  pageNum++;
  const s2 = pptx.addSlide();
  s2.background = { color: PUTIH };
  tambahHeaderContent(s2, "Agenda Mesyuarat", `Aliran perbentangan untuk ${julatTarikh}`);

  const agendaItems = [
    { no: "01", title: "Pengenalan & Skop Audit", sub: "Latar belakang dan parameter audit" },
    { no: "02", title: "Pasukan Audit", sub: "Lead Auditor dan ahli pasukan" },
    { no: "03", title: "Methodology", sub: "Pendekatan dan teknik yang digunakan" },
    { no: "04", title: "Ringkasan Dapatan", sub: "Statistik keseluruhan keputusan audit" },
    { no: "05", title: "Detail Non-Conformity", sub: "Setiap NC dibincang secara terperinci" },
    { no: "06", title: "Opportunity for Improvement", sub: "Cadangan penambahbaikan berterusan" },
    { no: "07", title: "Tarikh Akhir CAP", sub: "Timeline tindakan pembetulan" },
    { no: "08", title: "Soal Jawab & Penutup", sub: "Komitmen dan persetujuan bersama" },
  ];

  // 2 column layout
  const colW = (W - 1.6) / 2;
  for (let i = 0; i < agendaItems.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.8 + col * (colW + 0.2);
    const y = 1.85 + row * 1.15;
    const item = agendaItems[i];

    // No number besar emas
    s2.addText(item.no, {
      x: x, y: y, w: 0.9, h: 0.9,
      fontSize: 36, bold: true, color: HIJAU, fontFace: "Calibri", valign: "top",
    });
    // Title
    s2.addText(item.title, {
      x: x + 0.95, y: y + 0.05, w: colW - 0.95, h: 0.4,
      fontSize: 14, bold: true, color: TEKS_GELAP, fontFace: "Calibri",
    });
    // Subtitle
    s2.addText(item.sub, {
      x: x + 0.95, y: y + 0.45, w: colW - 0.95, h: 0.4,
      fontSize: 10, color: TEKS_KELABU, fontFace: "Calibri",
    });
  }
  tambahFooter(s2, pageNum, totalSlides);

  // ===================================================================
  // SLIDE 3: PENGENALAN & SKOP
  // ===================================================================
  pageNum++;
  const s3 = pptx.addSlide();
  s3.background = { color: PUTIH };
  tambahHeaderContent(s3, "Pengenalan & Skop", "Maklumat asas audit dalaman");

  const infoData: Array<[string, string]> = [
    ["No. Rujukan", audit.no_rujukan],
    ["Pusat Operasi", namaPO],
    ["Wilayah", wilayahPO],
    ["Tarikh Audit", julatTarikh],
    ["Jenis Audit", jenisAudit],
    ["Standard", "MS 2530-2-2:2022"],
  ];

  for (let i = 0; i < infoData.length; i++) {
    const [label, value] = infoData[i];
    const y = 1.9 + i * 0.65;
    // Label kelabu
    s3.addText(label.toUpperCase(), {
      x: 0.85, y: y, w: 3.5, h: 0.55,
      fontSize: 10, bold: true, color: TEKS_MUTED, fontFace: "Calibri", charSpacing: 2, valign: "middle",
    });
    // Value
    s3.addText(value, {
      x: 4.5, y: y, w: W - 5.3, h: 0.55,
      fontSize: 16, color: TEKS_GELAP, fontFace: "Calibri", valign: "middle",
    });
    // Divider line
    s3.addShape(pptx.ShapeType.line, {
      x: 0.85, y: y + 0.6, w: W - 1.7, h: 0,
      line: { color: SEMPADAN_HALUS, width: 0.5 },
    });
  }

  // Skop callout box bawah
  s3.addShape(pptx.ShapeType.roundRect, {
    x: 0.85, y: 5.85, w: W - 1.7, h: 0.85,
    fill: { color: KRIM }, line: { color: SEMPADAN_HALUS, width: 0.5 },
    rectRadius: 0.08,
  });
  s3.addText("SKOP", {
    x: 1.1, y: 5.95, w: 1.5, h: 0.3,
    fontSize: 10, bold: true, color: HIJAU, fontFace: "Calibri", charSpacing: 3,
  });
  s3.addText("5 Prinsip MSPO  ·  28 Kriteria  ·  74 Item Semakan", {
    x: 1.1, y: 6.25, w: W - 2.2, h: 0.4,
    fontSize: 14, color: TEKS_GELAP, fontFace: "Calibri",
  });
  tambahFooter(s3, pageNum, totalSlides);

  // ===================================================================
  // SLIDE 4: PASUKAN AUDIT
  // ===================================================================
  pageNum++;
  const s4 = pptx.addSlide();
  s4.background = { color: PUTIH };
  tambahHeaderContent(s4, "Pasukan Audit", "Auditor yang bertanggungjawab untuk audit ini");

  // Lead Auditor card
  s4.addShape(pptx.ShapeType.roundRect, {
    x: 0.85, y: 1.9, w: W - 1.7, h: 1.6,
    fill: { color: HIJAU }, line: { color: HIJAU },
    rectRadius: 0.12,
  });
  s4.addText("LEAD AUDITOR", {
    x: 1.2, y: 2.05, w: 4, h: 0.35,
    fontSize: 11, bold: true, color: EMAS, fontFace: "Calibri", charSpacing: 4,
  });
  s4.addText(namaLead, {
    x: 1.2, y: 2.45, w: W - 2.4, h: 0.7,
    fontSize: 26, bold: true, color: PUTIH, fontFace: "Calibri",
  });
  s4.addText("Bertanggungjawab muktamadkan keputusan audit dan tandatangan laporan", {
    x: 1.2, y: 3.15, w: W - 2.4, h: 0.3,
    fontSize: 11, italic: true, color: "C7E5D2", fontFace: "Calibri",
  });

  // Auditor pembantu section
  s4.addText("AUDITOR PEMBANTU", {
    x: 0.85, y: 3.85, w: 5, h: 0.35,
    fontSize: 11, bold: true, color: TEKS_KELABU, fontFace: "Calibri", charSpacing: 4,
  });
  if (namaAuditorLain.length === 0) {
    s4.addText("Tiada auditor pembantu untuk audit ini", {
      x: 0.85, y: 4.25, w: W - 1.7, h: 0.5,
      fontSize: 14, italic: true, color: TEKS_MUTED, fontFace: "Calibri",
    });
  } else {
    for (let i = 0; i < Math.min(namaAuditorLain.length, 4); i++) {
      const y = 4.25 + i * 0.55;
      // Bullet hijau
      s4.addShape(pptx.ShapeType.ellipse, {
        x: 0.95, y: y + 0.18, w: 0.15, h: 0.15,
        fill: { color: HIJAU_TERANG }, line: { color: HIJAU_TERANG },
      });
      s4.addText(namaAuditorLain[i], {
        x: 1.25, y: y, w: W - 2.3, h: 0.5,
        fontSize: 16, color: TEKS_GELAP, fontFace: "Calibri", valign: "middle",
      });
    }
  }
  tambahFooter(s4, pageNum, totalSlides);

  // ===================================================================
  // SLIDE 5: METHODOLOGY
  // ===================================================================
  pageNum++;
  const s5 = pptx.addSlide();
  s5.background = { color: PUTIH };
  tambahHeaderContent(s5, "Methodology", "Pendekatan komprehensif dalam pelaksanaan audit");

  const metodList = [
    { num: "01", title: "Document Review", desc: "Semakan menyeluruh dokumen induk Fail 1-13 dan rekod operasi" },
    { num: "02", title: "Site Walk", desc: "Lawatan lapangan ke ladang, stor, kawasan operasi dan kemudahan" },
    { num: "03", title: "Interview", desc: "Temubual dengan pekerja, pegawai dan pihak pengurusan" },
    { num: "04", title: "Photo Evidence", desc: "Dokumentasi gambar bukti dengan timestamp dan koordinat GPS" },
    { num: "05", title: "Cross-Reference", desc: "Banding dapatan dengan klausa MS 2530-2-2:2022 secara objektif" },
  ];

  for (let i = 0; i < metodList.length; i++) {
    const m = metodList[i];
    const y = 1.9 + i * 0.95;
    // Number besar dalam square hijau
    s5.addShape(pptx.ShapeType.roundRect, {
      x: 0.85, y: y, w: 0.8, h: 0.8,
      fill: { color: HIJAU }, line: { color: HIJAU },
      rectRadius: 0.08,
    });
    s5.addText(m.num, {
      x: 0.85, y: y, w: 0.8, h: 0.8,
      fontSize: 18, bold: true, color: PUTIH, fontFace: "Calibri",
      align: "center", valign: "middle",
    });
    // Title
    s5.addText(m.title, {
      x: 1.85, y: y, w: W - 2.7, h: 0.4,
      fontSize: 16, bold: true, color: TEKS_GELAP, fontFace: "Calibri",
    });
    // Description
    s5.addText(m.desc, {
      x: 1.85, y: y + 0.4, w: W - 2.7, h: 0.4,
      fontSize: 11, color: TEKS_KELABU, fontFace: "Calibri",
    });
  }
  tambahFooter(s5, pageNum, totalSlides);

  // ===================================================================
  // SLIDE 6: RINGKASAN DAPATAN
  // ===================================================================
  pageNum++;
  const s6 = pptx.addSlide();
  s6.background = { color: PUTIH };
  tambahHeaderContent(s6, "Ringkasan Dapatan", `Statistik keseluruhan dari ${dapatan.length} item semakan`);

  // 6 stat cards modern
  const statCards = [
    { label: "PATUH", short: "Y", nilai: stats.Y ?? 0, warna: HIJAU, latar: "ECFDF5" },
    { label: "TIDAK PATUH", short: "N", nilai: stats.N ?? 0, warna: MERAH, latar: MERAH_LATAR },
    { label: "NON-CONFORMITY", short: "NC", nilai: stats.NC ?? 0, warna: ORANGE, latar: ORANGE_LATAR },
    { label: "OPPORTUNITY", short: "OFI", nilai: stats.OFI ?? 0, warna: BIRU, latar: BIRU_LATAR },
    { label: "TIDAK BERKENAAN", short: "NA", nilai: stats.NA ?? 0, warna: TEKS_KELABU, latar: "F3F4F6" },
    { label: "PENDING", short: "P", nilai: stats.Pending ?? 0, warna: "9CA3AF", latar: "F9FAFB" },
  ];
  const cardW = (W - 1.7 - 0.5) / 6; // 6 cards dengan 0.1 gap
  for (let i = 0; i < statCards.length; i++) {
    const c = statCards[i];
    const x = 0.85 + i * (cardW + 0.1);
    // Background card
    s6.addShape(pptx.ShapeType.roundRect, {
      x: x, y: 1.9, w: cardW, h: 1.7,
      fill: { color: c.latar }, line: { color: SEMPADAN_HALUS, width: 0.5 },
      rectRadius: 0.08,
    });
    // Top accent line
    s6.addShape(pptx.ShapeType.rect, {
      x: x, y: 1.9, w: cardW, h: 0.08,
      fill: { color: c.warna }, line: { color: c.warna },
    });
    // Number besar
    s6.addText(String(c.nilai), {
      x: x, y: 2.1, w: cardW, h: 0.9,
      fontSize: 40, bold: true, color: c.warna, fontFace: "Calibri",
      align: "center", valign: "middle",
    });
    // Label kecil
    s6.addText(c.label, {
      x: x, y: 3.05, w: cardW, h: 0.4,
      fontSize: 9, bold: true, color: TEKS_KELABU, fontFace: "Calibri",
      align: "center", charSpacing: 1,
    });
  }

  // NC Breakdown — table style cleaner
  s6.addText("PECAHAN NCR & OFI", {
    x: 0.85, y: 4.0, w: 5, h: 0.35,
    fontSize: 11, bold: true, color: TEKS_KELABU, fontFace: "Calibri", charSpacing: 4,
  });

  const breakdownData = [
    { label: "Major NC", bil: ncMajor.length, hari: "30 hari kalendar", warna: MERAH, latar: MERAH_LATAR },
    { label: "Minor NC", bil: ncMinor.length, hari: "90 hari kalendar", warna: ORANGE, latar: ORANGE_LATAR },
    { label: "OFI", bil: ofiList.length, hari: "Penambahbaikan berterusan", warna: BIRU, latar: BIRU_LATAR },
  ];
  for (let i = 0; i < breakdownData.length; i++) {
    const b = breakdownData[i];
    const y = 4.4 + i * 0.7;
    // Latar baris
    s6.addShape(pptx.ShapeType.roundRect, {
      x: 0.85, y: y, w: W - 1.7, h: 0.6,
      fill: { color: b.latar }, line: { color: b.latar },
      rectRadius: 0.05,
    });
    // Color chip
    s6.addShape(pptx.ShapeType.rect, {
      x: 0.85, y: y, w: 0.12, h: 0.6,
      fill: { color: b.warna }, line: { color: b.warna },
    });
    // Label
    s6.addText(b.label, {
      x: 1.15, y: y, w: 3, h: 0.6,
      fontSize: 16, bold: true, color: b.warna, fontFace: "Calibri", valign: "middle",
    });
    // Bil besar
    s6.addText(String(b.bil), {
      x: 4.5, y: y, w: 1, h: 0.6,
      fontSize: 22, bold: true, color: TEKS_GELAP, fontFace: "Calibri",
      align: "center", valign: "middle",
    });
    // Tempoh
    s6.addText(b.hari, {
      x: 5.7, y: y, w: W - 6.55, h: 0.6,
      fontSize: 12, color: TEKS_KELABU, fontFace: "Calibri", valign: "middle",
    });
  }
  tambahFooter(s6, pageNum, totalSlides);

  // ===================================================================
  // SLIDES NC: 1 per NC dengan layout polished
  // ===================================================================
  const ncSemua = [...ncMajor, ...ncMinor];
  for (let i = 0; i < ncSemua.length; i++) {
    pageNum++;
    const nc = ncSemua[i];
    const isMajor = nc.gred_nc === "major";
    const cWarna = isMajor ? MERAH : ORANGE;
    const cLatar = isMajor ? MERAH_LATAR : ORANGE_LATAR;

    const slide = pptx.addSlide();
    slide.background = { color: PUTIH };

    // Top accent bar warna gred
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: W, h: 0.15,
      fill: { color: cWarna }, line: { color: cWarna },
    });

    // Gred chip
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.6, y: 0.5, w: 1.5, h: 0.5,
      fill: { color: cLatar }, line: { color: cWarna, width: 1 },
      rectRadius: 0.25,
    });
    slide.addText(isMajor ? "MAJOR NC" : "MINOR NC", {
      x: 0.6, y: 0.5, w: 1.5, h: 0.5,
      fontSize: 11, bold: true, color: cWarna, fontFace: "Calibri",
      align: "center", valign: "middle", charSpacing: 2,
    });

    // NC number
    slide.addText(`#${i + 1} dari ${ncSemua.length}`, {
      x: W - 2.5, y: 0.6, w: 1.9, h: 0.3,
      fontSize: 11, color: TEKS_MUTED, fontFace: "Calibri", align: "right",
    });

    // Klausa
    slide.addText(`Klausa ${nc.item_semakan?.kod ?? "-"}`, {
      x: 0.6, y: 1.2, w: W - 1.2, h: 0.4,
      fontSize: 13, bold: true, color: HIJAU, fontFace: "Calibri", charSpacing: 2,
    });

    // Tajuk besar
    slide.addText(nc.item_semakan?.tajuk ?? "-", {
      x: 0.6, y: 1.55, w: W - 1.2, h: 0.8,
      fontSize: 22, bold: true, color: TEKS_GELAP, fontFace: "Calibri",
    });

    // Divider tipis
    slide.addShape(pptx.ShapeType.line, {
      x: 0.6, y: 2.5, w: W - 1.2, h: 0,
      line: { color: SEMPADAN_HALUS, width: 0.75 },
    });

    // Kenyataan ketidakpatuhan — body card hijau muda
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.6, y: 2.75, w: W - 1.2, h: 1.4,
      fill: { color: KRIM }, line: { color: SEMPADAN_HALUS, width: 0.5 },
      rectRadius: 0.08,
    });
    slide.addText("KENYATAAN KETIDAKPATUHAN", {
      x: 0.85, y: 2.85, w: W - 1.7, h: 0.3,
      fontSize: 10, bold: true, color: cWarna, fontFace: "Calibri", charSpacing: 3,
    });
    slide.addText(nc.catatan ?? "(Tiada catatan)", {
      x: 0.85, y: 3.15, w: W - 1.7, h: 0.95,
      fontSize: 12, color: TEKS_GELAP, fontFace: "Calibri", valign: "top",
    });

    // 2-column grid bawah: Bukti | Cadangan
    slide.addText("BUKTI AUDIT", {
      x: 0.6, y: 4.3, w: 6, h: 0.3,
      fontSize: 10, bold: true, color: HIJAU, fontFace: "Calibri", charSpacing: 3,
    });
    slide.addText(nc.bukti_audit ?? "-", {
      x: 0.6, y: 4.6, w: 6, h: 1.2,
      fontSize: 11, color: TEKS_GELAP, fontFace: "Calibri", valign: "top",
    });

    slide.addText("CADANGAN TINDAKAN", {
      x: 6.85, y: 4.3, w: 6, h: 0.3,
      fontSize: 10, bold: true, color: HIJAU, fontFace: "Calibri", charSpacing: 3,
    });
    slide.addText(nc.cadangan_tindakan ?? "-", {
      x: 6.85, y: 4.6, w: 6, h: 1.2,
      fontSize: 11, color: TEKS_GELAP, fontFace: "Calibri", valign: "top",
    });

    // PIC + tarikh sasaran
    slide.addShape(pptx.ShapeType.line, {
      x: 0.6, y: 5.95, w: W - 1.2, h: 0,
      line: { color: SEMPADAN_HALUS, width: 0.5 },
    });
    slide.addText("PIC", {
      x: 0.6, y: 6.1, w: 1, h: 0.3,
      fontSize: 9, bold: true, color: TEKS_MUTED, fontFace: "Calibri", charSpacing: 2,
    });
    slide.addText(nc.pic ?? "-", {
      x: 0.6, y: 6.4, w: 5, h: 0.4,
      fontSize: 14, bold: true, color: TEKS_GELAP, fontFace: "Calibri",
    });
    slide.addText("TARIKH SASARAN SELESAI", {
      x: 6.5, y: 6.1, w: 4, h: 0.3,
      fontSize: 9, bold: true, color: TEKS_MUTED, fontFace: "Calibri", charSpacing: 2,
    });
    slide.addText(nc.tarikh_siap_target ? formatTarikh(nc.tarikh_siap_target) : "-", {
      x: 6.5, y: 6.4, w: 6.3, h: 0.4,
      fontSize: 14, bold: true, color: cWarna, fontFace: "Calibri",
    });

    tambahFooter(slide, pageNum, totalSlides);
  }

  // ===================================================================
  // SLIDE OFI: jadual moden
  // ===================================================================
  if (ofiList.length > 0) {
    pageNum++;
    const sOfi = pptx.addSlide();
    sOfi.background = { color: PUTIH };
    tambahHeaderContent(sOfi, "Opportunity for Improvement", `${ofiList.length} cadangan penambahbaikan dikenalpasti`);

    // Header row
    sOfi.addShape(pptx.ShapeType.rect, {
      x: 0.6, y: 1.9, w: W - 1.2, h: 0.5,
      fill: { color: BIRU }, line: { color: BIRU },
    });
    const headers = ["#", "KLAUSA", "PEMERHATIAN", "CADANGAN"];
    const widths = [0.7, 1.5, 5.5, W - 1.2 - 0.7 - 1.5 - 5.5];
    let xPos = 0.6;
    for (let i = 0; i < headers.length; i++) {
      sOfi.addText(headers[i], {
        x: xPos + 0.15, y: 1.9, w: widths[i] - 0.15, h: 0.5,
        fontSize: 10, bold: true, color: PUTIH, fontFace: "Calibri",
        valign: "middle", charSpacing: 2,
      });
      xPos += widths[i];
    }

    // Body rows
    const ofiTunjuk = ofiList.slice(0, 7);
    for (let i = 0; i < ofiTunjuk.length; i++) {
      const o = ofiTunjuk[i];
      const y = 2.4 + i * 0.55;
      // Alternating background
      if (i % 2 === 0) {
        sOfi.addShape(pptx.ShapeType.rect, {
          x: 0.6, y: y, w: W - 1.2, h: 0.55,
          fill: { color: KRIM }, line: { color: KRIM },
        });
      }
      xPos = 0.6;
      const cells = [
        String(i + 1),
        o.item_semakan?.kod ?? "-",
        o.catatan ?? "-",
        o.cadangan_tindakan ?? "-",
      ];
      for (let j = 0; j < cells.length; j++) {
        sOfi.addText(cells[j], {
          x: xPos + 0.15, y: y, w: widths[j] - 0.15, h: 0.55,
          fontSize: j === 0 ? 12 : 10,
          bold: j <= 1,
          color: j === 1 ? HIJAU : TEKS_GELAP,
          fontFace: "Calibri", valign: "middle",
        });
        xPos += widths[j];
      }
    }

    if (ofiList.length > 7) {
      sOfi.addText(`+ ${ofiList.length - 7} OFI lagi  ·  Rujuk laporan PDF untuk senarai penuh`, {
        x: 0.6, y: 6.45, w: W - 1.2, h: 0.3,
        fontSize: 10, italic: true, color: TEKS_MUTED, fontFace: "Calibri",
      });
    }
    tambahFooter(sOfi, pageNum, totalSlides);
  }

  // ===================================================================
  // SLIDE CAP: timeline visual
  // ===================================================================
  pageNum++;
  const sCap = pptx.addSlide();
  sCap.background = { color: PUTIH };
  tambahHeaderContent(sCap, "Tarikh Akhir Tindakan Pembetulan", "Timeline mandatori untuk auditee menyelesaikan CAP");

  const sudahMuktamad = !!audit.tarikh_muktamad;
  if (sudahMuktamad) {
    // Big date display
    sCap.addShape(pptx.ShapeType.roundRect, {
      x: 0.85, y: 2.0, w: W - 1.7, h: 2.2,
      fill: { color: HIJAU }, line: { color: HIJAU },
      rectRadius: 0.12,
    });
    sCap.addText("TARIKH AKHIR CAP", {
      x: 0.85, y: 2.2, w: W - 1.7, h: 0.4,
      fontSize: 12, bold: true, color: EMAS, fontFace: "Calibri", charSpacing: 5, align: "center",
    });
    sCap.addText(audit.cap_due_date ? formatTarikh(audit.cap_due_date) : "—", {
      x: 0.85, y: 2.65, w: W - 1.7, h: 1.1,
      fontSize: 48, bold: true, color: PUTIH, fontFace: "Calibri", align: "center",
    });
    const gradeText = audit.cap_grade_basis
      ? `${audit.cap_grade_basis.toUpperCase()}  ·  ${audit.cap_due_days} hari kalendar`
      : "Tiada NC — tiada CAP wajib";
    sCap.addText(gradeText, {
      x: 0.85, y: 3.75, w: W - 1.7, h: 0.4,
      fontSize: 14, color: "C7E5D2", fontFace: "Calibri", align: "center", italic: true,
    });

    // Info kecil bawah
    sCap.addText(`Tarikh muktamadkan: ${formatTarikh(audit.tarikh_muktamad)}`, {
      x: 0.85, y: 4.4, w: W - 1.7, h: 0.4,
      fontSize: 12, color: TEKS_KELABU, fontFace: "Calibri", align: "center",
    });
  } else {
    // Belum muktamad — tunjuk rules visual
    sCap.addText("Audit belum dimuktamadkan", {
      x: 0.85, y: 1.95, w: W - 1.7, h: 0.5,
      fontSize: 16, italic: true, color: TEKS_KELABU, fontFace: "Calibri", align: "center",
    });
    sCap.addText("Tarikh akhir CAP akan ditetapkan selepas Closing Meeting ini", {
      x: 0.85, y: 2.4, w: W - 1.7, h: 0.4,
      fontSize: 12, color: TEKS_MUTED, fontFace: "Calibri", align: "center",
    });

    const capRules = [
      { gred: "MAJOR NC", tempoh: "30 HARI", warna: MERAH, latar: MERAH_LATAR, x: 0.85 },
      { gred: "MINOR NC", tempoh: "90 HARI", warna: ORANGE, latar: ORANGE_LATAR, x: 5.07 },
      { gred: "OFI", tempoh: "—", warna: BIRU, latar: BIRU_LATAR, x: 9.29 },
    ];
    for (const r of capRules) {
      sCap.addShape(pptx.ShapeType.roundRect, {
        x: r.x, y: 3.1, w: 4.0, h: 2.0,
        fill: { color: r.latar }, line: { color: r.warna, width: 1 },
        rectRadius: 0.1,
      });
      sCap.addText(r.gred, {
        x: r.x, y: 3.3, w: 4.0, h: 0.5,
        fontSize: 13, bold: true, color: r.warna, fontFace: "Calibri",
        align: "center", charSpacing: 3,
      });
      sCap.addText(r.tempoh, {
        x: r.x, y: 3.85, w: 4.0, h: 0.8,
        fontSize: 32, bold: true, color: r.warna, fontFace: "Calibri", align: "center",
      });
      sCap.addText("kalendar dari Closing", {
        x: r.x, y: 4.7, w: 4.0, h: 0.3,
        fontSize: 10, italic: true, color: TEKS_KELABU, fontFace: "Calibri", align: "center",
      });
    }
  }

  // Notifikasi info bawah
  sCap.addShape(pptx.ShapeType.roundRect, {
    x: 0.85, y: 5.5, w: W - 1.7, h: 1.3,
    fill: { color: KRIM }, line: { color: SEMPADAN_HALUS, width: 0.5 },
    rectRadius: 0.08,
  });
  sCap.addText("PERINGATAN AUTOMATIK", {
    x: 1.1, y: 5.65, w: 5, h: 0.3,
    fontSize: 10, bold: true, color: HIJAU, fontFace: "Calibri", charSpacing: 3,
  });
  sCap.addText("Sistem akan hantar amaran e-mel pada hari ke-15 dan ke-25 (Major), serta peringatan bulanan untuk Minor NC", {
    x: 1.1, y: 5.95, w: W - 2.2, h: 0.85,
    fontSize: 12, color: TEKS_GELAP, fontFace: "Calibri", valign: "top",
  });
  tambahFooter(sCap, pageNum, totalSlides);

  // ===================================================================
  // SLIDE PENUTUP: full bleed elegan
  // ===================================================================
  pageNum++;
  const sEnd = pptx.addSlide();
  sEnd.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: H,
    fill: { color: HIJAU_GELAP }, line: { color: HIJAU_GELAP },
  });

  // Emas accent bar atas
  sEnd.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: 0.2,
    fill: { color: EMAS }, line: { color: EMAS },
  });

  // Quote besar
  sEnd.addText("Terima Kasih", {
    x: 0.5, y: 2.4, w: W - 1, h: 1.3,
    fontSize: 72, bold: true, color: PUTIH, fontFace: "Calibri", align: "center",
  });

  // Divider emas
  sEnd.addShape(pptx.ShapeType.line, {
    x: W / 2 - 1, y: 3.95, w: 2, h: 0,
    line: { color: EMAS, width: 2 },
  });

  sEnd.addText("Soal Jawab & Komen", {
    x: 0.5, y: 4.15, w: W - 1, h: 0.6,
    fontSize: 22, color: HIJAU_TERANG, fontFace: "Calibri", align: "center",
  });

  // Quote italic
  sEnd.addText("\"Komitmen pengurusan adalah kunci kepada penambahbaikan berterusan\"", {
    x: 1, y: 5.2, w: W - 2, h: 0.5,
    fontSize: 14, italic: true, color: "C7E5D2", fontFace: "Calibri", align: "center",
  });

  // Bottom info
  sEnd.addShape(pptx.ShapeType.line, {
    x: 1, y: H - 1.2, w: W - 2, h: 0,
    line: { color: "2D5C3F", width: 0.5 },
  });
  sEnd.addText(namaPO, {
    x: 0.5, y: H - 1.05, w: W - 1, h: 0.35,
    fontSize: 13, bold: true, color: PUTIH, fontFace: "Calibri", align: "center", charSpacing: 2,
  });
  sEnd.addText(`${julatTarikh}  ·  ${audit.no_rujukan}  ·  ${pageNum}/${totalSlides}`, {
    x: 0.5, y: H - 0.7, w: W - 1, h: 0.3,
    fontSize: 10, color: "9CA3AF", fontFace: "Calibri", align: "center",
  });

  const buf = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="Closing-${audit.no_rujukan}.pptx"`,
    },
  });
}
