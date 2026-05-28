import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import PptxGenJS from "pptxgenjs";
import path from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ─── Palette RISDA ───────────────────────────────────────────────────────────
const MERAH        = "C0182A";
const MERAH_LATAR  = "FDECEA";
const HIJAU_GELAP  = "1A3C25";
const EMAS         = "D4A017";
const EMAS_LATAR   = "FFF8E1";
const PUTIH        = "FFFFFF";
const TEKS_GELAP   = "1A1A1A";
const TEKS_KELABU  = "555555";
const TEKS_MUTED   = "9CA3AF";
const SEMPADAN     = "E0E0E0";
const ORANGE       = "D97706";
const ORANGE_LATAR = "FFFBEB";
const BIRU         = "1D4ED8";
const BIRU_LATAR   = "EFF6FF";
const KELABU_LATAR = "F3F4F6";

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
  if (!user) return NextResponse.json({ error: "Tidak diauthentikasi" }, { status: 401 });

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

  const namaPO    = (audit.pusat_operasi as { nama?: string } | null)?.nama ?? "-";
  const wilayahPO = (audit.pusat_operasi as { wilayah?: string } | null)?.wilayah ?? "-";
  const tarikhAudit = formatTarikh(audit.tarikh_audit);
  const tarikhTamat = audit.tarikh_tamat ? formatTarikh(audit.tarikh_tamat) : tarikhAudit;
  const julatTarikh = audit.tarikh_tamat && audit.tarikh_tamat !== audit.tarikh_audit
    ? `${tarikhAudit} - ${tarikhTamat}` : tarikhAudit;
  const jenisAudit = LABEL_JENIS[audit.jenis_audit] ?? audit.jenis_audit;
  const logoPath   = path.join(process.cwd(), "public", "logo-risda.png");

  const pptx = new PptxGenJS();
  pptx.author  = "RISDA Plantation Sdn Bhd";
  pptx.title   = `Closing Meeting - ${audit.no_rujukan}`;
  pptx.subject = "Audit Dalaman MSPO";
  pptx.layout  = "LAYOUT_WIDE";

  const W = 13.33;
  const H = 7.5;

  // ── HELPER: header standard content slides ────────────────────────────────
  const tambahHeaderContent = (slide: PptxGenJS.Slide, tajuk: string, subtajuk?: string) => {
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: W, h: 0.12,
      fill: { color: MERAH }, line: { color: MERAH },
    });
    try { slide.addImage({ path: logoPath, x: 0.15, y: 0.14, w: 0.34, h: 0.42 }); } catch (_) {}
    slide.addText("RISDA Plantation Sdn Bhd", {
      x: 0.6, y: 0.17, w: 5, h: 0.25,
      fontSize: 10, bold: true, color: TEKS_GELAP, fontFace: "Calibri", valign: "middle",
    });
    slide.addText(audit.no_rujukan, {
      x: W - 4.2, y: 0.17, w: 4.0, h: 0.25,
      fontSize: 9, color: TEKS_KELABU, fontFace: "Calibri", align: "right", valign: "middle",
    });
    slide.addShape(pptx.ShapeType.line, {
      x: 0, y: 0.62, w: W, h: 0,
      line: { color: SEMPADAN, width: 0.5 },
    });
    slide.addText(tajuk, {
      x: 0.5, y: 0.72, w: W - 1, h: 0.55,
      fontSize: 24, bold: true, color: MERAH, fontFace: "Calibri", valign: "middle",
    });
    if (subtajuk) {
      slide.addText(subtajuk, {
        x: 0.5, y: 1.25, w: W - 1, h: 0.3,
        fontSize: 11, color: TEKS_KELABU, fontFace: "Calibri", italic: true,
      });
    }
  };

  // ── HELPER: footer hijau gelap ────────────────────────────────────────────
  const tambahFooter = (slide: PptxGenJS.Slide, noPage: number, jumlahPage?: number) => {
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: H - 0.38, w: W, h: 0.38,
      fill: { color: HIJAU_GELAP }, line: { color: HIJAU_GELAP },
    });
    slide.addText("RISDA Plantation Sdn Bhd  (0324822-D)  |  Jabatan Perladangan", {
      x: 0.3, y: H - 0.38, w: 9, h: 0.38,
      fontSize: 8.5, color: PUTIH, fontFace: "Calibri", valign: "middle",
    });
    slide.addText(jumlahPage ? `${noPage} / ${jumlahPage}` : String(noPage), {
      x: W - 1.5, y: H - 0.38, w: 1.3, h: 0.38,
      fontSize: 9, bold: true, color: PUTIH, fontFace: "Calibri", align: "right", valign: "middle",
    });
  };

  // ── KIRA TOTAL SLIDES ─────────────────────────────────────────────────────
  const adaNC  = ncMajor.length + ncMinor.length > 0;
  const adaOfi = ofiList.length > 0;
  const totalSlides = 6
    + (adaNC  ? 1 : 0)
    + ncMajor.length + ncMinor.length
    + (adaOfi ? 2 : 0)   // divider + table
    + 1                   // perbincangan
    + 1                   // cap
    + 1;                  // penutup

  let pageNum = 0;

  // ===========================================================
  // SLIDE 1: COVER
  // ===========================================================
  pageNum++;
  const s1 = pptx.addSlide();
  s1.background = { color: PUTIH };

  // Red header band
  s1.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: 1.55,
    fill: { color: MERAH }, line: { color: MERAH },
  });
  try { s1.addImage({ path: logoPath, x: 0.3, y: 0.12, w: 0.5, h: 0.62 }); } catch (_) {}
  s1.addText("AUDIT DALAMAN MSPO 2026", {
    x: 1.0, y: 0.12, w: W - 1.4, h: 0.5,
    fontSize: 22, bold: true, color: PUTIH, fontFace: "Calibri", valign: "middle",
  });
  s1.addText(`${jenisAudit.toUpperCase()}  ·  MS 2530-2-2:2022`, {
    x: 1.0, y: 0.65, w: W - 1.4, h: 0.32,
    fontSize: 11.5, color: "FFD0D0", fontFace: "Calibri", valign: "middle",
  });
  s1.addText(audit.no_rujukan, {
    x: 1.0, y: 1.0, w: W - 1.4, h: 0.3,
    fontSize: 11, bold: true, color: EMAS, fontFace: "Calibri", valign: "middle",
  });

  // Wilayah
  s1.addText(`WILAYAH ${wilayahPO.toUpperCase()}`, {
    x: 0.5, y: 1.78, w: W - 1, h: 0.75,
    fontSize: 36, bold: true, color: MERAH, fontFace: "Calibri", align: "center",
  });
  s1.addShape(pptx.ShapeType.line, {
    x: 2.0, y: 2.6, w: W - 4, h: 0,
    line: { color: SEMPADAN, width: 1 },
  });

  // PO card
  s1.addShape(pptx.ShapeType.roundRect, {
    x: 3.2, y: 2.8, w: 6.93, h: 1.55,
    fill: { color: "F7F7F7" }, line: { color: SEMPADAN, width: 0.5 },
    rectRadius: 0.08,
  });
  s1.addText(namaPO, {
    x: 3.2, y: 2.95, w: 6.93, h: 0.52,
    fontSize: 20, bold: true, color: TEKS_GELAP, fontFace: "Calibri", align: "center",
  });
  s1.addText(julatTarikh, {
    x: 3.2, y: 3.5, w: 6.93, h: 0.38,
    fontSize: 14, bold: true, color: MERAH, fontFace: "Calibri", align: "center",
  });

  s1.addText("MESYUARAT PENUTUP AUDIT", {
    x: 0.5, y: 4.55, w: W - 1, h: 0.4,
    fontSize: 12, bold: true, color: TEKS_KELABU, fontFace: "Calibri",
    align: "center", charSpacing: 4,
  });

  // Footer hijau gelap
  s1.addShape(pptx.ShapeType.rect, {
    x: 0, y: H - 0.55, w: W, h: 0.55,
    fill: { color: HIJAU_GELAP }, line: { color: HIJAU_GELAP },
  });
  s1.addText("RISDA Plantation Sdn Bhd  (0324822-D)  |  Jabatan Perladangan", {
    x: 0.3, y: H - 0.55, w: W - 0.6, h: 0.55,
    fontSize: 9.5, color: PUTIH, fontFace: "Calibri", valign: "middle", align: "center",
  });

  // ===========================================================
  // SLIDE 2: AGENDA
  // ===========================================================
  pageNum++;
  const s2 = pptx.addSlide();
  s2.background = { color: PUTIH };
  tambahHeaderContent(s2, "Agenda Mesyuarat", `Aliran perbentangan — ${julatTarikh}`);

  const agendaItems = [
    { no: "01", title: "Pengenalan & Skop Audit",    sub: "Latar belakang dan parameter audit" },
    { no: "02", title: "Pasukan Audit",               sub: "Lead Auditor dan ahli pasukan" },
    { no: "03", title: "Methodology",                sub: "Pendekatan dan teknik yang digunakan" },
    { no: "04", title: "Ringkasan Dapatan",           sub: "Statistik keseluruhan keputusan audit" },
    { no: "05", title: "Detail Non-Conformity",       sub: "Setiap NC dibincang secara terperinci" },
    { no: "06", title: "Opportunity for Improvement", sub: "Cadangan penambahbaikan berterusan" },
    { no: "07", title: "Tarikh Akhir CAP",            sub: "Timeline tindakan pembetulan" },
    { no: "08", title: "Soal Jawab & Penutup",        sub: "Komitmen dan persetujuan bersama" },
  ];

  const colW = (W - 1.4) / 2;
  for (let i = 0; i < agendaItems.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x   = 0.5 + col * (colW + 0.2);
    const y   = 1.7 + row * 1.2;
    const itm = agendaItems[i];
    s2.addShape(pptx.ShapeType.roundRect, {
      x, y, w: colW, h: 1.05,
      fill: { color: i % 2 === 0 ? "F9F9F9" : PUTIH },
      line: { color: SEMPADAN, width: 0.5 },
      rectRadius: 0.06,
    });
    s2.addText(itm.no, {
      x: x + 0.15, y: y + 0.12, w: 0.72, h: 0.72,
      fontSize: 30, bold: true, color: MERAH, fontFace: "Calibri",
    });
    s2.addText(itm.title, {
      x: x + 0.92, y: y + 0.1, w: colW - 1.05, h: 0.42,
      fontSize: 13, bold: true, color: TEKS_GELAP, fontFace: "Calibri",
    });
    s2.addText(itm.sub, {
      x: x + 0.92, y: y + 0.52, w: colW - 1.05, h: 0.38,
      fontSize: 10, color: TEKS_KELABU, fontFace: "Calibri",
    });
  }
  tambahFooter(s2, pageNum, totalSlides);

  // ===========================================================
  // SLIDE 3: PENGENALAN & SKOP
  // ===========================================================
  pageNum++;
  const s3 = pptx.addSlide();
  s3.background = { color: PUTIH };
  tambahHeaderContent(s3, "Pengenalan & Skop", "Maklumat asas audit dalaman");

  const infoData: Array<[string, string]> = [
    ["No. Rujukan",   audit.no_rujukan],
    ["Pusat Operasi", namaPO],
    ["Wilayah",       wilayahPO],
    ["Tarikh Audit",  julatTarikh],
    ["Jenis Audit",   jenisAudit],
    ["Standard",      "MS 2530-2-2:2022"],
  ];
  for (let i = 0; i < infoData.length; i++) {
    const [label, value] = infoData[i];
    const y = 1.72 + i * 0.65;
    s3.addText(label.toUpperCase(), {
      x: 0.5, y, w: 3.5, h: 0.55,
      fontSize: 10, bold: true, color: TEKS_MUTED, fontFace: "Calibri", charSpacing: 2, valign: "middle",
    });
    s3.addShape(pptx.ShapeType.line, {
      x: 4.2, y: y + 0.1, w: 0, h: 0.35,
      line: { color: MERAH, width: 1.5 },
    });
    s3.addText(value, {
      x: 4.5, y, w: W - 5.2, h: 0.55,
      fontSize: 15, color: TEKS_GELAP, fontFace: "Calibri", valign: "middle",
    });
    s3.addShape(pptx.ShapeType.line, {
      x: 0.5, y: y + 0.6, w: W - 1, h: 0,
      line: { color: SEMPADAN, width: 0.5 },
    });
  }
  s3.addShape(pptx.ShapeType.roundRect, {
    x: 0.5, y: 5.78, w: W - 1, h: 0.88,
    fill: { color: MERAH_LATAR }, line: { color: MERAH, width: 0.5 },
    rectRadius: 0.08,
  });
  s3.addText("SKOP AUDIT", {
    x: 0.85, y: 5.88, w: 2, h: 0.3,
    fontSize: 10, bold: true, color: MERAH, fontFace: "Calibri", charSpacing: 3,
  });
  s3.addText("5 Prinsip MSPO  ·  28 Kriteria  ·  74 Item Semakan", {
    x: 0.85, y: 6.18, w: W - 1.7, h: 0.4,
    fontSize: 14, color: TEKS_GELAP, fontFace: "Calibri",
  });
  tambahFooter(s3, pageNum, totalSlides);

  // ===========================================================
  // SLIDE 4: PASUKAN AUDIT
  // ===========================================================
  pageNum++;
  const s4 = pptx.addSlide();
  s4.background = { color: PUTIH };
  tambahHeaderContent(s4, "Pasukan Audit", "Auditor yang bertanggungjawab untuk audit ini");

  s4.addShape(pptx.ShapeType.roundRect, {
    x: 0.5, y: 1.85, w: W - 1, h: 1.65,
    fill: { color: MERAH }, line: { color: MERAH }, rectRadius: 0.1,
  });
  s4.addText("LEAD AUDITOR", {
    x: 0.9, y: 2.02, w: 4, h: 0.35,
    fontSize: 11, bold: true, color: EMAS, fontFace: "Calibri", charSpacing: 4,
  });
  s4.addText(namaLead, {
    x: 0.9, y: 2.42, w: W - 1.8, h: 0.7,
    fontSize: 26, bold: true, color: PUTIH, fontFace: "Calibri",
  });
  s4.addText("Bertanggungjawab muktamadkan keputusan audit dan tandatangan laporan", {
    x: 0.9, y: 3.12, w: W - 1.8, h: 0.3,
    fontSize: 11, italic: true, color: "FFB3B3", fontFace: "Calibri",
  });

  s4.addText("AUDITOR PEMBANTU", {
    x: 0.5, y: 3.8, w: 5, h: 0.35,
    fontSize: 11, bold: true, color: TEKS_KELABU, fontFace: "Calibri", charSpacing: 4,
  });
  if (namaAuditorLain.length === 0) {
    s4.addText("Tiada auditor pembantu untuk audit ini", {
      x: 0.5, y: 4.22, w: W - 1, h: 0.5,
      fontSize: 14, italic: true, color: TEKS_MUTED, fontFace: "Calibri",
    });
  } else {
    for (let i = 0; i < Math.min(namaAuditorLain.length, 4); i++) {
      const y = 4.22 + i * 0.56;
      s4.addShape(pptx.ShapeType.ellipse, {
        x: 0.62, y: y + 0.19, w: 0.15, h: 0.15,
        fill: { color: MERAH }, line: { color: MERAH },
      });
      s4.addText(namaAuditorLain[i], {
        x: 0.92, y, w: W - 1.5, h: 0.5,
        fontSize: 16, color: TEKS_GELAP, fontFace: "Calibri", valign: "middle",
      });
    }
  }
  tambahFooter(s4, pageNum, totalSlides);

  // ===========================================================
  // SLIDE 5: METHODOLOGY
  // ===========================================================
  pageNum++;
  const s5 = pptx.addSlide();
  s5.background = { color: PUTIH };
  tambahHeaderContent(s5, "Methodology", "Pendekatan komprehensif dalam pelaksanaan audit");

  const metodList = [
    { num: "01", title: "Document Review",  desc: "Semakan menyeluruh dokumen induk Fail 1-13 dan rekod operasi" },
    { num: "02", title: "Site Walk",         desc: "Lawatan lapangan ke ladang, stor, kawasan operasi dan kemudahan" },
    { num: "03", title: "Interview",         desc: "Temubual dengan pekerja, pegawai dan pihak pengurusan" },
    { num: "04", title: "Photo Evidence",    desc: "Dokumentasi gambar bukti dengan timestamp dan koordinat GPS" },
    { num: "05", title: "Cross-Reference",   desc: "Banding dapatan dengan klausa MS 2530-2-2:2022 secara objektif" },
  ];
  for (let i = 0; i < metodList.length; i++) {
    const m = metodList[i];
    const y = 1.7 + i * 0.97;
    s5.addShape(pptx.ShapeType.roundRect, {
      x: 0.5, y, w: 0.82, h: 0.82,
      fill: { color: MERAH }, line: { color: MERAH }, rectRadius: 0.06,
    });
    s5.addText(m.num, {
      x: 0.5, y, w: 0.82, h: 0.82,
      fontSize: 18, bold: true, color: PUTIH, fontFace: "Calibri", align: "center", valign: "middle",
    });
    s5.addText(m.title, {
      x: 1.5, y: y + 0.05, w: W - 2.2, h: 0.38,
      fontSize: 15, bold: true, color: TEKS_GELAP, fontFace: "Calibri",
    });
    s5.addText(m.desc, {
      x: 1.5, y: y + 0.43, w: W - 2.2, h: 0.38,
      fontSize: 11, color: TEKS_KELABU, fontFace: "Calibri",
    });
  }
  tambahFooter(s5, pageNum, totalSlides);

  // ===========================================================
  // SLIDE 6: RINGKASAN DAPATAN
  // ===========================================================
  pageNum++;
  const s6 = pptx.addSlide();
  s6.background = { color: PUTIH };
  tambahHeaderContent(s6, "Ringkasan Dapatan", `Statistik keseluruhan — ${dapatan.length} item semakan`);

  const statCards = [
    { label: "PATUH",           nilai: stats.Y ?? 0,       warna: "2E7D45", latar: "F0FDF4" },
    { label: "TIDAK PATUH",     nilai: stats.N ?? 0,       warna: MERAH,    latar: MERAH_LATAR },
    { label: "NON-CONFORMITY",  nilai: stats.NC ?? 0,      warna: ORANGE,   latar: ORANGE_LATAR },
    { label: "OFI",             nilai: stats.OFI ?? 0,     warna: BIRU,     latar: BIRU_LATAR },
    { label: "TIDAK BERKENAAN", nilai: stats.NA ?? 0,      warna: TEKS_KELABU, latar: KELABU_LATAR },
    { label: "PENDING",         nilai: stats.Pending ?? 0, warna: TEKS_MUTED,  latar: "F9FAFB" },
  ];
  const cW = (W - 1.2 - 5 * 0.12) / 6;
  for (let i = 0; i < statCards.length; i++) {
    const c = statCards[i];
    const x = 0.6 + i * (cW + 0.12);
    s6.addShape(pptx.ShapeType.roundRect, {
      x, y: 1.75, w: cW, h: 1.75,
      fill: { color: c.latar }, line: { color: SEMPADAN, width: 0.5 }, rectRadius: 0.06,
    });
    s6.addShape(pptx.ShapeType.rect, {
      x, y: 1.75, w: cW, h: 0.1,
      fill: { color: c.warna }, line: { color: c.warna },
    });
    s6.addText(String(c.nilai), {
      x, y: 1.95, w: cW, h: 0.95,
      fontSize: 42, bold: true, color: c.warna, fontFace: "Calibri", align: "center", valign: "middle",
    });
    s6.addText(c.label, {
      x, y: 3.0, w: cW, h: 0.42,
      fontSize: 8.5, bold: true, color: TEKS_KELABU, fontFace: "Calibri", align: "center",
    });
  }

  s6.addText("PECAHAN NCR & OFI", {
    x: 0.6, y: 3.85, w: 5, h: 0.35,
    fontSize: 11, bold: true, color: TEKS_KELABU, fontFace: "Calibri", charSpacing: 4,
  });
  const breakdown = [
    { label: "Major NC", bil: ncMajor.length, hari: "30 hari kalendar",          warna: MERAH,  latar: MERAH_LATAR },
    { label: "Minor NC", bil: ncMinor.length, hari: "90 hari kalendar",          warna: ORANGE, latar: ORANGE_LATAR },
    { label: "OFI",      bil: ofiList.length, hari: "Penambahbaikan berterusan", warna: BIRU,   latar: BIRU_LATAR },
  ];
  for (let i = 0; i < breakdown.length; i++) {
    const b = breakdown[i];
    const y = 4.25 + i * 0.72;
    s6.addShape(pptx.ShapeType.roundRect, {
      x: 0.6, y, w: W - 1.2, h: 0.62,
      fill: { color: b.latar }, line: { color: b.latar }, rectRadius: 0.05,
    });
    s6.addShape(pptx.ShapeType.rect, {
      x: 0.6, y, w: 0.12, h: 0.62,
      fill: { color: b.warna }, line: { color: b.warna },
    });
    s6.addText(b.label, {
      x: 0.9, y, w: 3, h: 0.62,
      fontSize: 16, bold: true, color: b.warna, fontFace: "Calibri", valign: "middle",
    });
    s6.addText(String(b.bil), {
      x: 4.3, y, w: 1, h: 0.62,
      fontSize: 22, bold: true, color: TEKS_GELAP, fontFace: "Calibri", align: "center", valign: "middle",
    });
    s6.addText(b.hari, {
      x: 5.5, y, w: W - 6.3, h: 0.62,
      fontSize: 12, color: TEKS_KELABU, fontFace: "Calibri", valign: "middle",
    });
  }
  tambahFooter(s6, pageNum, totalSlides);

  // ===========================================================
  // NC DIVIDER
  // ===========================================================
  const ncSemua = [...ncMajor, ...ncMinor];
  if (ncSemua.length > 0) {
    pageNum++;
    const sDivNC = pptx.addSlide();
    sDivNC.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: W, h: H,
      fill: { color: HIJAU_GELAP }, line: { color: HIJAU_GELAP },
    });
    const ncLabel = ncMajor.length > 0 && ncMinor.length > 0
      ? "NC MAJOR & NC MINOR"
      : ncMajor.length > 0 ? "NC MAJOR" : "NC MINOR";
    sDivNC.addShape(pptx.ShapeType.line, {
      x: W / 2 - 1.0, y: 2.88, w: 2.0, h: 0,
      line: { color: EMAS, width: 1.5 },
    });
    sDivNC.addText("NON-CONFORMITY", {
      x: 0, y: 2.35, w: W, h: 0.48,
      fontSize: 13, bold: true, color: EMAS, fontFace: "Calibri", align: "center", charSpacing: 8,
    });
    sDivNC.addText(ncLabel, {
      x: 0, y: 3.0, w: W, h: 1.0,
      fontSize: 54, bold: true, color: PUTIH, fontFace: "Calibri", align: "center",
    });
    sDivNC.addText(`Penemuan 1 Hingga ${ncSemua.length}`, {
      x: 0, y: 4.1, w: W, h: 0.5,
      fontSize: 17, color: "AAAAAA", fontFace: "Calibri", align: "center", italic: true,
    });
    sDivNC.addShape(pptx.ShapeType.rect, {
      x: 0, y: H - 0.38, w: W, h: 0.38,
      fill: { color: "0F2818" }, line: { color: "0F2818" },
    });
    sDivNC.addText("RISDA Plantation Sdn Bhd  (0324822-D)", {
      x: 0, y: H - 0.38, w: W, h: 0.38,
      fontSize: 8.5, color: "888888", fontFace: "Calibri", valign: "middle", align: "center",
    });
  }

  // ===========================================================
  // NC SLIDES
  // ===========================================================
  for (let i = 0; i < ncSemua.length; i++) {
    pageNum++;
    const nc       = ncSemua[i];
    const isMajor  = nc.gred_nc === "major";
    const cWarna   = isMajor ? MERAH : ORANGE;
    const cLatar   = isMajor ? MERAH_LATAR : ORANGE_LATAR;
    const cGred    = isMajor ? "MAJOR NC" : "MINOR NC";
    const slide    = pptx.addSlide();
    slide.background = { color: PUTIH };

    // Header (inline — NC slides guna merah untuk gred chip)
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: W, h: 0.12,
      fill: { color: MERAH }, line: { color: MERAH },
    });
    try { slide.addImage({ path: logoPath, x: 0.15, y: 0.14, w: 0.34, h: 0.42 }); } catch (_) {}
    slide.addText("RISDA Plantation Sdn Bhd", {
      x: 0.6, y: 0.17, w: 5, h: 0.25,
      fontSize: 10, bold: true, color: TEKS_GELAP, fontFace: "Calibri", valign: "middle",
    });
    slide.addText(`${audit.no_rujukan}  ·  ${namaPO}`, {
      x: W - 5.2, y: 0.17, w: 5.0, h: 0.25,
      fontSize: 9, color: TEKS_KELABU, fontFace: "Calibri", align: "right", valign: "middle",
    });
    slide.addShape(pptx.ShapeType.line, {
      x: 0, y: 0.62, w: W, h: 0,
      line: { color: SEMPADAN, width: 0.5 },
    });

    // Gred chip
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.5, y: 0.72, w: 1.42, h: 0.44,
      fill: { color: cLatar }, line: { color: cWarna, width: 1 }, rectRadius: 0.22,
    });
    slide.addText(cGred, {
      x: 0.5, y: 0.72, w: 1.42, h: 0.44,
      fontSize: 10, bold: true, color: cWarna, fontFace: "Calibri",
      align: "center", valign: "middle", charSpacing: 1,
    });
    slide.addText(`${i + 1} / ${ncSemua.length}`, {
      x: W - 2.5, y: 0.75, w: 2.3, h: 0.35,
      fontSize: 11, color: TEKS_MUTED, fontFace: "Calibri", align: "right",
    });

    // Klausa + Tajuk
    slide.addText(`Klausa  ${nc.item_semakan?.kod ?? "-"}`, {
      x: 0.5, y: 1.25, w: W - 1, h: 0.38,
      fontSize: 12, bold: true, color: "2E7D45", fontFace: "Calibri", charSpacing: 1,
    });
    slide.addText(nc.item_semakan?.tajuk ?? "-", {
      x: 0.5, y: 1.6, w: W - 1, h: 0.85,
      fontSize: 21, bold: true, color: TEKS_GELAP, fontFace: "Calibri",
    });
    slide.addShape(pptx.ShapeType.line, {
      x: 0.5, y: 2.55, w: W - 1, h: 0,
      line: { color: SEMPADAN, width: 0.75 },
    });

    // Kenyataan card
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.5, y: 2.7, w: W - 1, h: 1.45,
      fill: { color: cLatar }, line: { color: cWarna, width: 0.5 }, rectRadius: 0.06,
    });
    slide.addText("KENYATAAN KETIDAKPATUHAN", {
      x: 0.78, y: 2.82, w: W - 1.56, h: 0.3,
      fontSize: 9.5, bold: true, color: cWarna, fontFace: "Calibri", charSpacing: 2.5,
    });
    slide.addText(nc.catatan ?? "(Tiada catatan)", {
      x: 0.78, y: 3.12, w: W - 1.56, h: 0.98,
      fontSize: 11.5, color: TEKS_GELAP, fontFace: "Calibri", valign: "top",
    });

    // 2-col: Bukti | Cadangan
    const half = W / 2 - 0.1;
    slide.addText("BUKTI AUDIT", {
      x: 0.5, y: 4.3, w: half, h: 0.3,
      fontSize: 9.5, bold: true, color: MERAH, fontFace: "Calibri", charSpacing: 2.5,
    });
    slide.addText(nc.bukti_audit ?? "-", {
      x: 0.5, y: 4.6, w: half, h: 1.22,
      fontSize: 11, color: TEKS_GELAP, fontFace: "Calibri", valign: "top",
    });
    slide.addShape(pptx.ShapeType.line, {
      x: W / 2 + 0.05, y: 4.25, w: 0, h: 1.65,
      line: { color: SEMPADAN, width: 0.5 },
    });
    slide.addText("CADANGAN TINDAKAN", {
      x: W / 2 + 0.25, y: 4.3, w: half, h: 0.3,
      fontSize: 9.5, bold: true, color: MERAH, fontFace: "Calibri", charSpacing: 2.5,
    });
    slide.addText(nc.cadangan_tindakan ?? "-", {
      x: W / 2 + 0.25, y: 4.6, w: half - 0.25, h: 1.22,
      fontSize: 11, color: TEKS_GELAP, fontFace: "Calibri", valign: "top",
    });

    // PIC + tarikh
    slide.addShape(pptx.ShapeType.line, {
      x: 0.5, y: 5.95, w: W - 1, h: 0,
      line: { color: SEMPADAN, width: 0.5 },
    });
    slide.addText("PIC", {
      x: 0.5, y: 6.08, w: 1, h: 0.28,
      fontSize: 9, bold: true, color: TEKS_MUTED, fontFace: "Calibri", charSpacing: 2,
    });
    slide.addText(nc.pic ?? "-", {
      x: 0.5, y: 6.36, w: 5.5, h: 0.38,
      fontSize: 13, bold: true, color: TEKS_GELAP, fontFace: "Calibri",
    });
    slide.addText("TARIKH SASARAN", {
      x: 6.5, y: 6.08, w: 4, h: 0.28,
      fontSize: 9, bold: true, color: TEKS_MUTED, fontFace: "Calibri", charSpacing: 2,
    });
    slide.addText(nc.tarikh_siap_target ? formatTarikh(nc.tarikh_siap_target) : "-", {
      x: 6.5, y: 6.36, w: 6.3, h: 0.38,
      fontSize: 13, bold: true, color: cWarna, fontFace: "Calibri",
    });
    tambahFooter(slide, pageNum, totalSlides);
  }

  // ===========================================================
  // OFI DIVIDER + TABLE
  // ===========================================================
  if (ofiList.length > 0) {
    pageNum++;
    const sDivOfi = pptx.addSlide();
    sDivOfi.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: W, h: H,
      fill: { color: EMAS }, line: { color: EMAS },
    });
    sDivOfi.addShape(pptx.ShapeType.line, {
      x: W / 2 - 1.0, y: 2.88, w: 2.0, h: 0,
      line: { color: PUTIH, width: 1.5 },
    });
    sDivOfi.addText("PELUANG PENAMBAHBAIKAN", {
      x: 0, y: 2.35, w: W, h: 0.48,
      fontSize: 13, bold: true, color: PUTIH, fontFace: "Calibri", align: "center", charSpacing: 6, italic: true,
    });
    sDivOfi.addText("OFI", {
      x: 0, y: 3.0, w: W, h: 1.0,
      fontSize: 72, bold: true, color: PUTIH, fontFace: "Calibri", align: "center",
    });
    sDivOfi.addText(`${ofiList.length} Cadangan Penambahbaikan Dikenalpasti`, {
      x: 0, y: 4.12, w: W, h: 0.5,
      fontSize: 16, color: "7A5F00", fontFace: "Calibri", align: "center",
    });
    sDivOfi.addShape(pptx.ShapeType.rect, {
      x: 0, y: H - 0.38, w: W, h: 0.38,
      fill: { color: "7A5F00" }, line: { color: "7A5F00" },
    });
    sDivOfi.addText("RISDA Plantation Sdn Bhd  (0324822-D)", {
      x: 0, y: H - 0.38, w: W, h: 0.38,
      fontSize: 8.5, color: "FFF3CD", fontFace: "Calibri", valign: "middle", align: "center",
    });

    // OFI TABLE
    pageNum++;
    const sOfi = pptx.addSlide();
    sOfi.background = { color: PUTIH };
    tambahHeaderContent(sOfi, "Opportunity for Improvement", `${ofiList.length} cadangan penambahbaikan dikenalpasti`);
    sOfi.addShape(pptx.ShapeType.rect, {
      x: 0.5, y: 1.72, w: W - 1, h: 0.48,
      fill: { color: MERAH }, line: { color: MERAH },
    });
    const hdrs  = ["#", "KLAUSA", "PEMERHATIAN", "CADANGAN"];
    const wdths = [0.65, 1.5, 5.5, W - 1 - 0.65 - 1.5 - 5.5];
    let xp = 0.5;
    for (let i = 0; i < hdrs.length; i++) {
      sOfi.addText(hdrs[i], {
        x: xp + 0.12, y: 1.72, w: wdths[i] - 0.12, h: 0.48,
        fontSize: 10, bold: true, color: PUTIH, fontFace: "Calibri", valign: "middle", charSpacing: 2,
      });
      xp += wdths[i];
    }
    const ofiTunjuk = ofiList.slice(0, 7);
    for (let i = 0; i < ofiTunjuk.length; i++) {
      const o = ofiTunjuk[i];
      const y = 2.2 + i * 0.56;
      if (i % 2 === 0) {
        sOfi.addShape(pptx.ShapeType.rect, {
          x: 0.5, y, w: W - 1, h: 0.56,
          fill: { color: EMAS_LATAR }, line: { color: EMAS_LATAR },
        });
      }
      xp = 0.5;
      const cells = [String(i + 1), o.item_semakan?.kod ?? "-", o.catatan ?? "-", o.cadangan_tindakan ?? "-"];
      for (let j = 0; j < cells.length; j++) {
        sOfi.addText(cells[j], {
          x: xp + 0.12, y, w: wdths[j] - 0.12, h: 0.56,
          fontSize: j === 0 ? 12 : 10, bold: j <= 1,
          color: j === 1 ? "2E7D45" : TEKS_GELAP,
          fontFace: "Calibri", valign: "middle",
        });
        xp += wdths[j];
      }
    }
    if (ofiList.length > 7) {
      sOfi.addText(`+ ${ofiList.length - 7} OFI lagi  ·  Rujuk laporan PDF untuk senarai penuh`, {
        x: 0.5, y: 6.38, w: W - 1, h: 0.3,
        fontSize: 10, italic: true, color: TEKS_MUTED, fontFace: "Calibri",
      });
    }
    tambahFooter(sOfi, pageNum, totalSlides);
  }

  // ===========================================================
  // PERBINCANGAN SLIDE
  // ===========================================================
  pageNum++;
  const sPerbinc = pptx.addSlide();
  sPerbinc.background = { color: PUTIH };
  tambahHeaderContent(sPerbinc, "Perbincangan", "Ringkasan semua dapatan dan tindakan susulan");

  sPerbinc.addShape(pptx.ShapeType.rect, {
    x: 0.5, y: 1.65, w: W - 1, h: 0.45,
    fill: { color: MERAH }, line: { color: MERAH },
  });
  const pHdrs  = ["No", "Gred", "Klausa", "Pusat/Lokasi", "Pemerhatian"];
  const pWdths = [0.6, 1.3, 1.5, 3.0, W - 1 - 0.6 - 1.3 - 1.5 - 3.0];
  let pXp = 0.5;
  for (let i = 0; i < pHdrs.length; i++) {
    sPerbinc.addText(pHdrs[i], {
      x: pXp + 0.1, y: 1.65, w: pWdths[i] - 0.1, h: 0.45,
      fontSize: 10, bold: true, color: PUTIH, fontFace: "Calibri", valign: "middle",
    });
    pXp += pWdths[i];
  }

  const semua = [
    ...ncMajor.map(d => ({ ...d, jenis: "Major NC", warna: MERAH })),
    ...ncMinor.map(d => ({ ...d, jenis: "Minor NC", warna: ORANGE })),
    ...ofiList.map(d => ({ ...d, jenis: "OFI",      warna: BIRU })),
  ];
  const maxRows = Math.min(semua.length, 8);
  for (let i = 0; i < maxRows; i++) {
    const d = semua[i];
    const y = 2.1 + i * 0.56;
    if (i % 2 === 1) {
      sPerbinc.addShape(pptx.ShapeType.rect, {
        x: 0.5, y, w: W - 1, h: 0.56,
        fill: { color: "F5F5F5" }, line: { color: "F5F5F5" },
      });
    }
    pXp = 0.5;
    const cells = [
      String(i + 1),
      d.jenis,
      d.item_semakan?.kod ?? "-",
      namaPO,
      (d.catatan ?? "-").substring(0, 130),
    ];
    for (let j = 0; j < cells.length; j++) {
      sPerbinc.addText(cells[j], {
        x: pXp + 0.1, y, w: pWdths[j] - 0.1, h: 0.56,
        fontSize: j === 0 ? 12 : 9.5, bold: j <= 1,
        color: j === 1 ? d.warna : j === 2 ? "2E7D45" : TEKS_GELAP,
        fontFace: "Calibri", valign: "middle",
      });
      pXp += pWdths[j];
    }
  }
  if (semua.length > maxRows) {
    sPerbinc.addText(`+ ${semua.length - maxRows} dapatan lagi`, {
      x: 0.5, y: 2.1 + maxRows * 0.56 + 0.08, w: W - 1, h: 0.3,
      fontSize: 10, italic: true, color: TEKS_MUTED, fontFace: "Calibri",
    });
  }
  tambahFooter(sPerbinc, pageNum, totalSlides);

  // ===========================================================
  // CAP SLIDE
  // ===========================================================
  pageNum++;
  const sCap = pptx.addSlide();
  sCap.background = { color: PUTIH };
  tambahHeaderContent(sCap, "Tarikh Akhir Tindakan Pembetulan", "Timeline mandatori untuk auditee menyelesaikan CAP");

  const sudahMuktamad = !!audit.tarikh_muktamad;
  if (sudahMuktamad) {
    sCap.addShape(pptx.ShapeType.roundRect, {
      x: 0.5, y: 1.9, w: W - 1, h: 2.35,
      fill: { color: MERAH }, line: { color: MERAH }, rectRadius: 0.1,
    });
    sCap.addText("TARIKH AKHIR CAP", {
      x: 0.5, y: 2.1, w: W - 1, h: 0.42,
      fontSize: 12, bold: true, color: EMAS, fontFace: "Calibri", charSpacing: 5, align: "center",
    });
    sCap.addText(audit.cap_due_date ? formatTarikh(audit.cap_due_date) : "-", {
      x: 0.5, y: 2.58, w: W - 1, h: 1.15,
      fontSize: 48, bold: true, color: PUTIH, fontFace: "Calibri", align: "center",
    });
    const gradeText = audit.cap_grade_basis
      ? `${String(audit.cap_grade_basis).toUpperCase()}  -  ${audit.cap_due_days} hari kalendar`
      : "Tiada NC - tiada CAP wajib";
    sCap.addText(gradeText, {
      x: 0.5, y: 3.8, w: W - 1, h: 0.4,
      fontSize: 13, color: "FFB3B3", fontFace: "Calibri", align: "center", italic: true,
    });
    sCap.addText(`Tarikh muktamadkan: ${formatTarikh(audit.tarikh_muktamad)}`, {
      x: 0.5, y: 4.44, w: W - 1, h: 0.4,
      fontSize: 12, color: TEKS_KELABU, fontFace: "Calibri", align: "center",
    });
  } else {
    sCap.addText("Audit belum dimuktamadkan", {
      x: 0.5, y: 1.88, w: W - 1, h: 0.5,
      fontSize: 16, italic: true, color: TEKS_KELABU, fontFace: "Calibri", align: "center",
    });
    sCap.addText("Tarikh akhir CAP akan ditetapkan selepas Closing Meeting ini", {
      x: 0.5, y: 2.35, w: W - 1, h: 0.4,
      fontSize: 12, color: TEKS_MUTED, fontFace: "Calibri", align: "center",
    });
    const capRules = [
      { gred: "MAJOR NC", tempoh: "30 HARI", warna: MERAH,  latar: MERAH_LATAR,  x: 0.5 },
      { gred: "MINOR NC", tempoh: "90 HARI", warna: ORANGE, latar: ORANGE_LATAR, x: 4.92 },
      { gred: "OFI",      tempoh: "-",       warna: BIRU,   latar: BIRU_LATAR,   x: 9.34 },
    ];
    for (const r of capRules) {
      sCap.addShape(pptx.ShapeType.roundRect, {
        x: r.x, y: 3.05, w: 3.9, h: 2.12,
        fill: { color: r.latar }, line: { color: r.warna, width: 1 }, rectRadius: 0.1,
      });
      sCap.addText(r.gred, {
        x: r.x, y: 3.22, w: 3.9, h: 0.5,
        fontSize: 13, bold: true, color: r.warna, fontFace: "Calibri", align: "center", charSpacing: 3,
      });
      sCap.addText(r.tempoh, {
        x: r.x, y: 3.78, w: 3.9, h: 0.86,
        fontSize: 32, bold: true, color: r.warna, fontFace: "Calibri", align: "center",
      });
      sCap.addText("kalendar dari Closing", {
        x: r.x, y: 4.7, w: 3.9, h: 0.35,
        fontSize: 10, italic: true, color: TEKS_KELABU, fontFace: "Calibri", align: "center",
      });
    }
  }
  sCap.addShape(pptx.ShapeType.roundRect, {
    x: 0.5, y: 5.35, w: W - 1, h: 1.38,
    fill: { color: MERAH_LATAR }, line: { color: MERAH, width: 0.5 }, rectRadius: 0.08,
  });
  sCap.addText("PERINGATAN AUTOMATIK", {
    x: 0.85, y: 5.48, w: 5, h: 0.3,
    fontSize: 10, bold: true, color: MERAH, fontFace: "Calibri", charSpacing: 3,
  });
  sCap.addText("Sistem akan hantar amaran e-mel pada hari ke-15 dan ke-25 (Major), serta peringatan bulanan untuk Minor NC", {
    x: 0.85, y: 5.8, w: W - 1.7, h: 0.88,
    fontSize: 12, color: TEKS_GELAP, fontFace: "Calibri", valign: "top",
  });
  tambahFooter(sCap, pageNum, totalSlides);

  // ===========================================================
  // PENUTUP - merah full bleed
  // ===========================================================
  pageNum++;
  const sEnd = pptx.addSlide();
  sEnd.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: H,
    fill: { color: MERAH }, line: { color: MERAH },
  });
  try { sEnd.addImage({ path: logoPath, x: W / 2 - 0.48, y: 0.3, w: 0.96, h: 1.18 }); } catch (_) {}
  sEnd.addText("AUDIT DALAMAN MSPO 2026", {
    x: 0.5, y: 1.65, w: W - 1, h: 0.6,
    fontSize: 26, bold: true, color: PUTIH, fontFace: "Calibri", align: "center",
  });
  sEnd.addText(`WILAYAH ${wilayahPO.toUpperCase()}`, {
    x: 0.5, y: 2.3, w: W - 1, h: 0.55,
    fontSize: 20, bold: true, color: EMAS, fontFace: "Calibri", align: "center", charSpacing: 3,
  });
  sEnd.addShape(pptx.ShapeType.roundRect, {
    x: W / 2 - 1.25, y: 2.95, w: 2.5, h: 0.46,
    fill: { color: "9B0E1F" }, line: { color: "9B0E1F" }, rectRadius: 0.23,
  });
  sEnd.addText("SESI PENUTUPAN", {
    x: W / 2 - 1.25, y: 2.95, w: 2.5, h: 0.46,
    fontSize: 11, bold: true, color: PUTIH, fontFace: "Calibri",
    align: "center", valign: "middle", charSpacing: 2,
  });
  sEnd.addShape(pptx.ShapeType.roundRect, {
    x: 3.2, y: 3.55, w: 6.93, h: 1.55,
    fill: { color: "9B0E1F" }, line: { color: "7A0B18" }, rectRadius: 0.08,
  });
  sEnd.addText(namaPO, {
    x: 3.2, y: 3.72, w: 6.93, h: 0.52,
    fontSize: 19, bold: true, color: PUTIH, fontFace: "Calibri", align: "center",
  });
  sEnd.addText(julatTarikh, {
    x: 3.2, y: 4.25, w: 6.93, h: 0.38,
    fontSize: 14, bold: true, color: EMAS, fontFace: "Calibri", align: "center",
  });
  sEnd.addShape(pptx.ShapeType.line, {
    x: 1.2, y: H - 1.0, w: W - 2.4, h: 0,
    line: { color: "9B0E1F", width: 1 },
  });
  sEnd.addText("RISDA Plantation Sdn Bhd  (0324822-D)  -  Jabatan Perladangan", {
    x: 0.5, y: H - 0.9, w: W - 1, h: 0.35,
    fontSize: 11, bold: true, color: EMAS, fontFace: "Calibri", align: "center",
  });
  sEnd.addText(`${audit.no_rujukan}  -  ${julatTarikh}`, {
    x: 0.5, y: H - 0.55, w: W - 1, h: 0.3,
    fontSize: 10, color: "FFB3B3", fontFace: "Calibri", align: "center",
  });

  const buf = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="Closing-${audit.no_rujukan}.pptx"`,
    },
  });
} dapatan lagi`, {
      x: 0.5, y: 2.1 + maxRows * 0.56 + 0.08, w: W - 1, h: 0.3,
      fontSize: 10, italic: true, color: TEKS_MUTED, fontFace: "Calibri",
    });
  }
  tambahFooter(sPerbinc, pageNum, totalSlides);

  // ===========================================================
  // CAP SLIDE
  // ===========================================================
  pageNum++;
  const sCap = pptx.addSlide();
  sCap.background = { color: PUTIH };
  tambahHeaderContent(sCap, "Tarikh Akhir Tindakan Pembetulan", "Timeline mandatori untuk auditee menyelesaikan CAP");

  const sudahMuktamad = !!audit.tarikh_muktamad;
  if (sudahMuktamad) {
    sCap.addShape(pptx.ShapeType.roundRect, {
      x: 0.5, y: 1.9, w: W - 1, h: 2.35,
      fill: { color: MERAH }, line: { color: MERAH }, rectRadius: 0.1,
    });
    sCap.addText("TARIKH AKHIR CAP", {
      x: 0.5, y: 2.1, w: W - 1, h: 0.42,
      fontSize: 12, bold: true, color: EMAS, fontFace: "Calibri", charSpacing: 5, align: "center",
    });
    sCap.addText(audit.cap_due_date ? formatTarikh(audit.cap_due_date) : "—", {
      x: 0.5, y: 2.58, w: W - 1, h: 1.15,
      fontSize: 48, bold: true, color: PUTIH, fontFace: "Calibri", align: "center",
    });
    sCap.addText(
      audit.cap_grade_basis
        ? `${audit.cap_grade_basis.toUpperCase()}  ·  ${audit.cap_due_days} hari kalendar`
        : "Tiada NC — tiada CAP wajib",
      {
        x: 0.5, y: 3.8, w: W - 1, h: 0.4,
        fontSize: 13, color: "FFB3B3", fontFace: "Calibri", align: "center", italic: true,
      }
    );
    sCap.addText(`Tarikh muktamadkan: ${formatTarikh(audit.tarikh_muktamad)}`, {
      x: 0.5, y: 4.44, w: W - 1, h: 0.4,
      fontSize: 12, color: TEKS_KELABU, fontFace: "Calibri", align: "center",
    });
  } else {
    sCap.addText("Audit belum dimuktamadkan", {
      x: 0.5, y: 1.88, w: W - 1, h: 0.5,
      fontSize: 16, italic: true, color: TEKS_KELABU, fontFace: "Calibri", align: "center",
    });
    sCap.addText("Tarikh akhir CAP akan ditetapkan selepas Closing Meeting ini", {
      x: 0.5, y: 2.35, w: W - 1, h: 0.4,
      fontSize: 12, color: TEKS_MUTED, fontFace: "Calibri", align: "center",
    });
    const capRules = [
      { gred: "MAJOR NC", tempoh: "30 HARI", warna: MERAH,  latar: MERAH_LATAR,  x: 0.5 },
      { gred: "MINOR NC", tempoh: "90 HARI", warna: ORANGE, latar: ORANGE_LATAR, x: 4.92 },
      { gred: "OFI",      tempoh: "—",       warna: BIRU,   latar: BIRU_LATAR,   x: 9.34 },
    ];
    for (const r of capRules) {
      sCap.addShape(pptx.ShapeType.roundRect, {
        x: r.x, y: 3.05, w: 3.9, h: 2.12,
        fill: { color: r.latar }, line: { color: r.warna, width: 1 }, rectRadius: 0.1,
      });
      sCap.addText(r.gred, {
        x: r.x, y: 3.22, w: 3.9, h: 0.5,
        fontSize: 13, bold: true, color: r.warna, fontFace: "Calibri", align: "center", charSpacing: 3,
      });
      sCap.addText(r.tempoh, {
        x: r.x, y: 3.78, w: 3.9, h: 0.86,
        fontSize: 32, bold: true, color: r.warna, fontFace: "Calibri", align: "center",
      });
      sCap.addText("kalendar dari Closing", {
        x: r.x, y: 4.7, w: 3.9, h: 0.35,
        fontSize: 10, italic: true, color: TEKS_KELABU, fontFace: "Calibri", align: "center",
      });
    }
  }
  sCap.addShape(pptx.ShapeType.roundRect, {
    x: 0.5, y: 5.35, w: W - 1, h: 1.38,
    fill: { color: MERAH_LATAR }, line: { color: MERAH, width: 0.5 }, rectRadius: 0.08,
  });
  sCap.addText("PERINGATAN AUTOMATIK", {
    x: 0.85, y: 5.48, w: 5, h: 0.3,
    fontSize: 10, bold: true, color: MERAH, fontFace: "Calibri", charSpacing: 3,
  });
  sCap.addText("Sistem akan hantar amaran e-mel pada hari ke-15 dan ke-25 (Major), serta peringatan bulanan untuk Minor NC", {
    x: 0.85, y: 5.8, w: W - 1.7, h: 0.88,
    fontSize: 12, color: TEKS_GELAP, fontFace: "Calibri", valign: "top",
  });
  tambahFooter(sCap, pageNum, totalSlides);

  // ===========================================================
  // PENUTUP — merah full bleed
  // ===========================================================
  pageNum++;
  const sEnd = pptx.addSlide();
  sEnd.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: H,
    fill: { color: MERAH }, line: { color: MERAH },
  });
  try { sEnd.addImage({ path: logoPath, x: W / 2 - 0.48, y: 0.3, w: 0.96, h: 1.18 }); } catch (_) {}
  sEnd.addText("AUDIT DALAMAN MSPO 2026", {
    x: 0.5, y: 1.65, w: W - 1, h: 0.6,
    fontSize: 26, bold: true, color: PUTIH, fontFace: "Calibri", align: "center",
  });
  sEnd.addText(`WILAYAH ${wilayahPO.toUpperCase()}`, {
    x: 0.5, y: 2.3, w: W - 1, h: 0.55,
    fontSize: 20, bold: true, color: EMAS, fontFace: "Calibri", align: "center", charSpacing: 3,
  });
  sEnd.addShape(pptx.ShapeType.roundRect, {
    x: W / 2 - 1.25, y: 2.95, w: 2.5, h: 0.46,
    fill: { color: "9B0E1F" }, line: { color: "9B0E1F" }, rectRadius: 0.23,
  });
  sEnd.addText("SESI PENUTUPAN", {
    x: W / 2 - 1.25, y: 2.95, w: 2.5, h: 0.46,
    fontSize: 11, bold: true, color: PUTIH, fontFace: "Calibri",
    align: "center", valign: "middle", charSpacing: 2,
  });
  sEnd.addShape(pptx.ShapeType.roundRect, {
    x: 3.2, y: 3.55, w: 6.93, h: 1.55,
    fill: { color: "9B0E1F" }, line: { color: "7A0B18" }, rectRadius: 0.08,
  });
  sEnd.addText(namaPO, {
    x: 3.2, y: 3.72, w: 6.93, h: 0.52,
    fontSize: 19, bold: true, color: PUTIH, fontFace: "Calibri", align: "center",
  });
  sEnd.addText(julatTarikh, {
    x: 3.2, y: 4.25, w: 6.93, h: 0.38,
    fontSize: 14, bold: true, color: EMAS, fontFace: "Calibri", align: "center",
  });
  sEnd.addShape(pptx.ShapeType.line, {
    x: 1.2, y: H - 1.0, w: W - 2.4, h: 0,
    line: { color: "9B0E1F", width: 1 },
  });
  sEnd.addText("RISDA Plantation Sdn Bhd  (0324822-D)  ·  Jabatan Perladangan", {
    x: 0.5, y: H - 0.9, w: W - 1, h: 0.35,
    fontSize: 11, bold: true, color: EMAS, fontFace: "Calibri", align: "center",
  });
  sEnd.addText(`${audit.no_rujukan}  ·  ${julatTarikh}`, {
    x: 0.5, y: H - 0.55, w: W - 1, h: 0.3,
    fontSize: 10, color: "FFB3B3", fontFace: "Calibri", align: "center",
  });

  const buf = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="Closing-${audit.no_rujukan}.pptx"`,
    },
  });
}
    sPerbinc.addText(`+ ${semua.length - maxRows} dapatan lagi`, {
      x: 0.5, y: 2.1 + maxRows * 0.56 + 0.08, w: W - 1, h: 0.3,
      fontSize: 10, italic: true, color: TEKS_MUTED, fontFace: "Calibri",
    });
  }
  tambahFooter(sPerbinc, pageNum, totalSlides);

  // CAP SLIDE
  pageNum++;
  const sCap = pptx.addSlide();
  sCap.background = { color: PUTIH };
  tambahHeaderContent(sCap, "Tarikh Akhir Tindakan Pembetulan", "Timeline mandatori untuk auditee menyelesaikan CAP");

  const sudahMuktamad = !!audit.tarikh_muktamad;
  if (sudahMuktamad) {
    sCap.addShape(pptx.ShapeType.roundRect, {
      x: 0.5, y: 1.9, w: W - 1, h: 2.35,
      fill: { color: MERAH }, line: { color: MERAH }, rectRadius: 0.1,
    });
    sCap.addText("TARIKH AKHIR CAP", {
      x: 0.5, y: 2.1, w: W - 1, h: 0.42,
      fontSize: 12, bold: true, color: EMAS, fontFace: "Calibri", charSpacing: 5, align: "center",
    });
    sCap.addText(audit.cap_due_date ? formatTarikh(audit.cap_due_date) : "-", {
      x: 0.5, y: 2.58, w: W - 1, h: 1.15,
      fontSize: 48, bold: true, color: PUTIH, fontFace: "Calibri", align: "center",
    });
    const gradeText = audit.cap_grade_basis
      ? String(audit.cap_grade_basis).toUpperCase() + "  -  " + String(audit.cap_due_days) + " hari kalendar"
      : "Tiada NC - tiada CAP wajib";
    sCap.addText(gradeText, {
      x: 0.5, y: 3.8, w: W - 1, h: 0.4,
      fontSize: 13, color: "FFB3B3", fontFace: "Calibri", align: "center", italic: true,
    });
    sCap.addText("Tarikh muktamadkan: " + formatTarikh(audit.tarikh_muktamad), {
      x: 0.5, y: 4.44, w: W - 1, h: 0.4,
      fontSize: 12, color: TEKS_KELABU, fontFace: "Calibri", align: "center",
    });
  } else {
    sCap.addText("Audit belum dimuktamadkan", {
      x: 0.5, y: 1.88, w: W - 1, h: 0.5,
      fontSize: 16, italic: true, color: TEKS_KELABU, fontFace: "Calibri", align: "center",
    });
    sCap.addText("Tarikh akhir CAP akan ditetapkan selepas Closing Meeting ini", {
      x: 0.5, y: 2.35, w: W - 1, h: 0.4,
      fontSize: 12, color: TEKS_MUTED, fontFace: "Calibri", align: "center",
    });
    const capRules = [
      { gred: "MAJOR NC", tempoh: "30 HARI", warna: MERAH,  latar: MERAH_LATAR,  x: 0.5 },
      { gred: "MINOR NC", tempoh: "90 HARI", warna: ORANGE, latar: ORANGE_LATAR, x: 4.92 },
      { gred: "OFI",      tempoh: "-",       warna: BIRU,   latar: BIRU_LATAR,   x: 9.34 },
    ];
    for (const r of capRules) {
      sCap.addShape(pptx.ShapeType.roundRect, {
        x: r.x, y: 3.05, w: 3.9, h: 2.12,
        fill: { color: r.latar }, line: { color: r.warna, width: 1 }, rectRadius: 0.1,
      });
      sCap.addText(r.gred, {
        x: r.x, y: 3.22, w: 3.9, h: 0.5,
        fontSize: 13, bold: true, color: r.warna, fontFace: "Calibri", align: "center", charSpacing: 3,
      });
      sCap.addText(r.tempoh, {
        x: r.x, y: 3.78, w: 3.9, h: 0.86,
        fontSize: 32, bold: true, color: r.warna, fontFace: "Calibri", align: "center",
      });
      sCap.addText("kalendar dari Closing", {
        x: r.x, y: 4.7, w: 3.9, h: 0.35,
        fontSize: 10, italic: true, color: TEKS_KELABU, fontFace: "Calibri", align: "center",
      });
    }
  }
  sCap.addShape(pptx.ShapeType.roundRect, {
    x: 0.5, y: 5.35, w: W - 1, h: 1.38,
    fill: { color: MERAH_LATAR }, line: { color: MERAH, width: 0.5 }, rectRadius: 0.08,
  });
  sCap.addText("PERINGATAN AUTOMATIK", {
    x: 0.85, y: 5.48, w: 5, h: 0.3,
    fontSize: 10, bold: true, color: MERAH, fontFace: "Calibri", charSpacing: 3,
  });
  sCap.addText("Sistem akan hantar amaran e-mel pada hari ke-15 dan ke-25 (Major), serta peringatan bulanan untuk Minor NC", {
    x: 0.85, y: 5.8, w: W - 1.7, h: 0.88,
    fontSize: 12, color: TEKS_GELAP, fontFace: "Calibri", valign: "top",
  });
  tambahFooter(sCap, pageNum, totalSlides);

  // PENUTUP
  pageNum++;
  const sEnd = pptx.addSlide();
  sEnd.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: H,
    fill: { color: MERAH }, line: { color: MERAH },
  });
  try { sEnd.addImage({ path: logoPath, x: W / 2 - 0.48, y: 0.3, w: 0.96, h: 1.18 }); } catch (_) {}
  sEnd.addText("AUDIT DALAMAN MSPO 2026", {
    x: 0.5, y: 1.65, w: W - 1, h: 0.6,
    fontSize: 26, bold: true, color: PUTIH, fontFace: "Calibri", align: "center",
  });
  sEnd.addText("WILAYAH " + wilayahPO.toUpperCase(), {
    x: 0.5, y: 2.3, w: W - 1, h: 0.55,
    fontSize: 20, bold: true, color: EMAS, fontFace: "Calibri", align: "center", charSpacing: 3,
  });
  sEnd.addShape(pptx.ShapeType.roundRect, {
    x: W / 2 - 1.25, y: 2.95, w: 2.5, h: 0.46,
    fill: { color: "9B0E1F" }, line: { color: "9B0E1F" }, rectRadius: 0.23,
  });
  sEnd.addText("SESI PENUTUPAN", {
    x: W / 2 - 1.25, y: 2.95, w: 2.5, h: 0.46,
    fontSize: 11, bold: true, color: PUTIH, fontFace: "Calibri",
    align: "center", valign: "middle", charSpacing: 2,
  });
  sEnd.addShape(pptx.ShapeType.roundRect, {
    x: 3.2, y: 3.55, w: 6.93, h: 1.55,
    fill: { color: "9B0E1F" }, line: { color: "7A0B18" }, rectRadius: 0.08,
  });
  sEnd.addText(namaPO, {
    x: 3.2, y: 3.72, w: 6.93, h: 0.52,
    fontSize: 19, bold: true, color: PUTIH, fontFace: "Calibri", align: "center",
  });
  sEnd.addText(julatTarikh, {
    x: 3.2, y: 4.25, w: 6.93, h: 0.38,
    fontSize: 14, bold: true, color: EMAS, fontFace: "Calibri", align: "center",
  });
  sEnd.addShape(pptx.ShapeType.line, {
    x: 1.2, y: H - 1.0, w: W - 2.4, h: 0,
    line: { color: "9B0E1F", width: 1 },
  });
  sEnd.addText("RISDA Plantation Sdn Bhd  (0324822-D)  -  Jabatan Perladangan", {
    x: 0.5, y: H - 0.9, w: W - 1, h: 0.35,
    fontSize: 11, bold: true, color: EMAS, fontFace: "Calibri", align: "center",
  });
  sEnd.addText(audit.no_rujukan + "  -  " + julatTarikh, {
    x: 0.5, y: H - 0.55, w: W - 1, h: 0.3,
    fontSize: 10, color: "FFB3B3", fontFace: "Calibri", align: "center",
  });

  const buf = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="Closing-${audit.no_rujukan}.pptx"`,
    },
  });
}
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="Closing-${audit.no_rujukan}.pptx"`,
    },
  });
}
