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
const HIJAU_FOREST = "0A3D2B";
const HIJAU_PANEL  = "0F5C3C";
const HIJAU_MINT   = "6FCF97";
const HIJAU_SUB    = "A8D5BA";
const NAVY         = "0D1B2A";
const NAVY_GELAP   = "050D14";
const BIRU_MUDA    = "90CAF9";
const _KELABU_LATAR = "F3F4F6";

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

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Tidak diauthentikasi" }, { status: 401 });

  const { data: audit, error: ralatAudit } = await supabase
    .from("audit")
    .select("*, pusat_operasi:pusat_operasi_id (kod, nama, wilayah, daerah, negeri, keluasan_hektar)")
    .eq("id", id)
    .single();

  if (ralatAudit || !audit) {
    return NextResponse.json({ error: "Audit tidak dijumpai", butiran: ralatAudit?.message }, { status: 404 });
  }

  let _namaLead = "-";
  if (audit.lead_auditor_id) {
    const { data: leadProfil } = await supabase
      .from("pengguna").select("nama_penuh").eq("id", audit.lead_auditor_id).single();
    _namaLead = leadProfil?.nama_penuh ?? "-";
  }

  let _namaAuditorLain: string[] = [];
  if (audit.auditor_ids && Array.isArray(audit.auditor_ids) && audit.auditor_ids.length > 0) {
    const { data: auditorProfil } = await supabase
      .from("pengguna").select("nama_penuh").in("id", audit.auditor_ids);
    _namaAuditorLain = (auditorProfil ?? []).map((p) => p.nama_penuh);
  }

  const { data: dapatanRaw } = await supabase
     .from("dapatan")
     .select("id, status, gred_nc, catatan, bukti_audit, cadangan_tindakan, pic, tarikh_siap_target, item_semakan:item_semakan_id (kod, tajuk, fail_rujukan)")
     .eq("audit_id", id);

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
    try { slide.addImage({ path: logoPath, x: 0.15, y: 0.14, w: 0.7, h: 0.86 }); } catch (_) {}
    slide.addText("RISDA Plantation Sdn Bhd", {
      x: 0.95, y: 0.17, w: 5, h: 0.28,
      fontSize: 14, bold: true, color: TEKS_GELAP, fontFace: "Calibri", valign: "middle",
    });
    slide.addText(audit.no_rujukan, {
      x: W - 4.5, y: 0.17, w: 4.3, h: 0.28,
      fontSize: 14, color: TEKS_KELABU, fontFace: "Calibri", align: "right", valign: "middle",
    });
    slide.addShape(pptx.ShapeType.line, {
      x: 0, y: 0.72, w: W, h: 0,
      line: { color: SEMPADAN, width: 0.5 },
    });
    slide.addText(tajuk, {
      x: 0.5, y: 0.8, w: W - 1, h: 0.6,
      fontSize: 28, bold: true, color: MERAH, fontFace: "Calibri", valign: "middle",
    });
    if (subtajuk) {
      slide.addText(subtajuk, {
        x: 0.5, y: 1.42, w: W - 1, h: 0.35,
        fontSize: 14, color: TEKS_KELABU, fontFace: "Calibri", italic: true,
      });
    }
  };

  // ── HELPER: footer hijau gelap ────────────────────────────────────────────
  const tambahFooter = (slide: PptxGenJS.Slide, noPage: number, jumlahPage?: number) => {
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: H - 0.55, w: W, h: 0.55,
      fill: { color: HIJAU_GELAP }, line: { color: HIJAU_GELAP },
    });
    slide.addText("RISDA Plantation Sdn Bhd  (0324822-D)  |  Jabatan Perladangan", {
      x: 0.3, y: H - 0.55, w: 9, h: 0.55,
      fontSize: 12, color: PUTIH, fontFace: "Calibri", valign: "middle",
    });
    slide.addText(jumlahPage ? `${noPage} / ${jumlahPage}` : String(noPage), {
      x: W - 1.8, y: H - 0.55, w: 1.5, h: 0.55,
      fontSize: 14, bold: true, color: PUTIH, fontFace: "Calibri", align: "right", valign: "middle",
    });
  };

  // ── SLIDE QUEUE ──────────────────────────────────────────────────────────
  type BuildSlide = (s: PptxGenJS.Slide, no: number, total: number) => void;
  const slideFns: BuildSlide[] = [];
  const daftar = (fn: BuildSlide) => { slideFns.push(fn); };

  const ITEMS_PER_SLIDE = 6;
  const semuaBincang = [
    ...ncMajor.map(d => ({ ...d, jenis: "Major NC", warna: MERAH,  latar: MERAH_LATAR })),
    ...ncMinor.map(d => ({ ...d, jenis: "Minor NC", warna: ORANGE, latar: ORANGE_LATAR })),
    ...ofiList.map(d => ({ ...d, jenis: "OFI",      warna: BIRU,   latar: BIRU_LATAR })),
  ];
  const bincSlides = Math.ceil(semuaBincang.length / ITEMS_PER_SLIDE) || 1;
  const adaMajor0  = ncMajor.length === 0;

  // ===========================================================
  // SLIDE 1: COVER
  // ===========================================================
  daftar((s1, no, total) => {
    s1.background = { color: PUTIH };
    s1.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: W, h: 1.55,
      fill: { color: MERAH }, line: { color: MERAH },
    });
    try { s1.addImage({ path: logoPath, x: 0.25, y: 0.08, w: 1.0, h: 1.23 }); } catch (_) {}
    s1.addText("AUDIT DALAMAN MSPO 2026", {
      x: 1.4, y: 0.12, w: W - 1.55, h: 0.55,
      fontSize: 28, bold: true, color: PUTIH, fontFace: "Calibri", valign: "middle",
    });
    s1.addText(`${jenisAudit.toUpperCase()}  ·  MS 2530-2-2:2022`, {
      x: 1.4, y: 0.7, w: W - 1.55, h: 0.32,
      fontSize: 16, color: "FFD0D0", fontFace: "Calibri", valign: "middle",
    });
    s1.addText(audit.no_rujukan, {
      x: 1.15, y: 1.05, w: W - 1.55, h: 0.3,
      fontSize: 13, bold: true, color: EMAS, fontFace: "Calibri", valign: "middle",
    });
    s1.addText(`WILAYAH ${wilayahPO.toUpperCase()}`, {
      x: 0.5, y: 1.78, w: W - 1, h: 0.75,
      fontSize: 42, bold: true, color: MERAH, fontFace: "Calibri", align: "center",
    });
    s1.addShape(pptx.ShapeType.line, {
      x: 2.0, y: 2.6, w: W - 4, h: 0,
      line: { color: SEMPADAN, width: 1 },
    });
    s1.addShape(pptx.ShapeType.roundRect, {
      x: 2.7, y: 2.8, w: 7.93, h: 1.55,
      fill: { color: "F7F7F7" }, line: { color: SEMPADAN, width: 0.5 },
      rectRadius: 0.08,
    });
    s1.addText(namaPO, {
      x: 2.7, y: 2.95, w: 7.93, h: 0.52,
      fontSize: 24, bold: true, color: TEKS_GELAP, fontFace: "Calibri", align: "center",
    });
    s1.addText(julatTarikh, {
      x: 2.7, y: 3.5, w: 7.93, h: 0.38,
      fontSize: 16, bold: true, color: MERAH, fontFace: "Calibri", align: "center",
    });
    s1.addText("MESYUARAT PENUTUP AUDIT", {
      x: 0.5, y: 4.55, w: W - 1, h: 0.4,
      fontSize: 14, bold: true, color: TEKS_KELABU, fontFace: "Calibri",
      align: "center", charSpacing: 4,
    });
    s1.addShape(pptx.ShapeType.rect, {
      x: 0, y: H - 0.55, w: W, h: 0.55,
      fill: { color: HIJAU_GELAP }, line: { color: HIJAU_GELAP },
    });
    s1.addText("RISDA Plantation Sdn Bhd  (0324822-D)  |  Jabatan Perladangan", {
      x: 0.3, y: H - 0.55, w: W - 0.6, h: 0.55,
      fontSize: 11, color: PUTIH, fontFace: "Calibri", valign: "middle", align: "center",
    });
  });

  // ===========================================================
  // SLIDE 2: METHODOLOGY
  // ===========================================================
  daftar((s, no, total) => {
    s.background = { color: PUTIH };
    tambahHeaderContent(s, "Methodology", "Pendekatan komprehensif dalam pelaksanaan audit");
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
      s.addShape(pptx.ShapeType.roundRect, {
        x: 0.5, y, w: 0.82, h: 0.82,
        fill: { color: MERAH }, line: { color: MERAH }, rectRadius: 0.06,
      });
      s.addText(m.num, {
        x: 0.5, y, w: 0.82, h: 0.82,
        fontSize: 22, bold: true, color: PUTIH, fontFace: "Calibri", align: "center", valign: "middle",
      });
      s.addText(m.title, {
        x: 1.5, y: y + 0.05, w: W - 2.2, h: 0.38,
        fontSize: 18, bold: true, color: TEKS_GELAP, fontFace: "Calibri",
      });
      s.addText(m.desc, {
        x: 1.5, y: y + 0.43, w: W - 2.2, h: 0.38,
        fontSize: 14, color: TEKS_KELABU, fontFace: "Calibri",
      });
    }
    tambahFooter(s, no, total);
  });

  // ===========================================================
  // SLIDE 3: SURPRISE — 0 MAJOR NC (hanya bila tiada Major NC)
  // ===========================================================
  if (adaMajor0) {
    daftar((s, _no, _total) => {
      s.background = { color: NAVY };
      s.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: W * 0.42, h: H,
        fill: { color: MERAH }, line: { type: "none" },
      });
      s.addText("Berita baik dahulu.", {
        x: 0.2, y: 0.8, w: W * 0.42 - 0.3, h: 0.4,
        fontSize: 11, italic: true, color: "FFCDD2", align: "center", fontFace: "Calibri",
      });
      s.addText("0", {
        x: 0.2, y: 1.3, w: W * 0.42 - 0.3, h: 3.2,
        fontSize: 180, bold: true, color: PUTIH, align: "center", valign: "middle", fontFace: "Calibri",
      });
      s.addText("MAJOR NC", {
        x: 0.2, y: 4.7, w: W * 0.42 - 0.3, h: 0.6,
        fontSize: 26, bold: true, color: PUTIH, align: "center", charSpacing: 5, fontFace: "Calibri",
      });
      const rx = W * 0.45;
      s.addText([
        { text: "Tiada\n", options: { color: PUTIH } },
        { text: "ketidakpatuhan\n", options: { color: EMAS } },
        { text: "kritikal dikesan.", options: { color: PUTIH } },
      ], {
        x: rx, y: 1.3, w: W - rx - 0.4, h: 2.3,
        fontSize: 34, bold: true, fontFace: "Calibri", valign: "middle",
      });
      s.addShape(pptx.ShapeType.line, {
        x: rx, y: 3.6, w: W - rx - 0.4, h: 0,
        line: { color: EMAS, width: 2 },
      });
      s.addText(
        "Ini bukan nasib. Ini hasil kerja pasukan yang sedar tentang kepentingan pematuhan MSPO.\n\nSekarang, mari kita tengok ringkasan penuh.",
        {
          x: rx, y: 3.8, w: W - rx - 0.4, h: 2.0,
          fontSize: 12, color: BIRU_MUDA, fontFace: "Calibri", valign: "top",
        }
      );
      s.addShape(pptx.ShapeType.rect, {
        x: 0, y: H - 0.4, w: W, h: 0.4,
        fill: { color: NAVY_GELAP }, line: { type: "none" },
      });
      s.addText(`${audit.no_rujukan}  —  ${namaPO}`, {
        x: 0, y: H - 0.4, w: W, h: 0.4,
        fontSize: 7, color: TEKS_MUTED, align: "center", valign: "middle", fontFace: "Calibri",
      });
    });
  }

  // ===========================================================
  // RINGKASAN DAPATAN
  // ===========================================================
  daftar((s6, no, total) => {
    s6.background = { color: PUTIH };
    tambahHeaderContent(s6, "Ringkasan Dapatan", `Statistik keseluruhan — ${dapatan.length} item semakan`);
    s6.addText("KEPUTUSAN AUDIT", {
      x: 0.6, y: 1.68, w: W - 1.2, h: 0.55,
      fontSize: 18, bold: true, color: TEKS_MUTED, fontFace: "Calibri", align: "center", charSpacing: 6,
    });
    const bigCards = [
      { label: "MEMATUHI", nilai: stats.Y ?? 0, warna: MERAH,    latar: PUTIH },
      { label: "TIDAK MEMATUHI", nilai: stats.N ?? 0, warna: MERAH,    latar: MERAH_LATAR },
      { label: "TINDAKAN",  nilai: (stats.NC ?? 0) + (stats.OFI ?? 0), warna: MERAH, latar: PUTIH },
    ];
    const bc = (W - 1.6 - 0.3) / 3;
    for (let i = 0; i < 3; i++) {
      const card = bigCards[i];
      const cx = 0.8 + i * (bc + 0.15);
      s6.addShape(pptx.ShapeType.roundRect, {
        x: cx, y: 2.25, w: bc, h: 3.4,
        fill: { color: card.latar }, line: { color: card.warna, width: 2.5 }, rectRadius: 0.12,
      });
      s6.addText(String(card.nilai), {
        x: cx, y: 2.55, w: bc, h: 2.0,
        fontSize: 72, bold: true, color: card.warna, fontFace: "Calibri", align: "center", valign: "middle",
      });
      s6.addText(card.label, {
        x: cx, y: 4.55, w: bc, h: 0.55,
        fontSize: 14, bold: true, color: card.warna, fontFace: "Calibri", align: "center",
        charSpacing: 4,
      });
    }
    s6.addShape(pptx.ShapeType.rect, {
      x: 0, y: 6.45, w: W, h: 0.8,
      fill: { color: MERAH }, line: { color: MERAH },
    });
    const compliance = stats.Y ?? 0;
    const totalItems = stats.Y + stats.N + stats.NC + stats.OFI + stats.NA + stats.Pending;
    const pct = totalItems > 0 ? Math.round((compliance / totalItems) * 100) : 0;
    s6.addText(`JUMLH PEMATUHAN:  ${pct}%  ·  ${compliance}/${totalItems} ITEM SEMAKAN`, {
      x: 0.6, y: 6.5, w: W - 1.2, h: 0.65,
      fontSize: 16, bold: true, color: PUTIH, fontFace: "Calibri", align: "center",
      charSpacing: 2,
    });
    tambahFooter(s6, no, total);
  });

  // ===========================================================
  // NC DIVIDER
  // ===========================================================
  const ncSemua = [...ncMajor, ...ncMinor];
  if (ncSemua.length > 0) {
    daftar((sDivNC, _no, _total) => {
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
        fontSize: 16, bold: true, color: EMAS, fontFace: "Calibri", align: "center", charSpacing: 8,
      });
      sDivNC.addText(ncLabel, {
        x: 0, y: 3.0, w: W, h: 1.0,
        fontSize: 58, bold: true, color: PUTIH, fontFace: "Calibri", align: "center",
      });
      sDivNC.addText(`Penemuan 1 Hingga ${ncSemua.length}`, {
        x: 0, y: 4.1, w: W, h: 0.5,
        fontSize: 19, color: "AAAAAA", fontFace: "Calibri", align: "center", italic: true,
      });
      sDivNC.addShape(pptx.ShapeType.rect, {
        x: 0, y: H - 0.38, w: W, h: 0.38,
        fill: { color: "0F2818" }, line: { color: "0F2818" },
      });
      sDivNC.addText("RISDA Plantation Sdn Bhd  (0324822-D)", {
        x: 0, y: H - 0.38, w: W, h: 0.38,
        fontSize: 14, color: "888888", fontFace: "Calibri", valign: "middle", align: "center",
      });
    });
  }

  // ===========================================================
  // NC SLIDES
  // ===========================================================
  for (let i = 0; i < ncSemua.length; i++) {
    const nc       = ncSemua[i];
    const isMajor  = nc.gred_nc === "major";
    const cWarna   = isMajor ? MERAH : ORANGE;
    const cLatar   = isMajor ? MERAH_LATAR : ORANGE_LATAR;
    const cGred    = isMajor ? "MAJOR NC" : "MINOR NC";
    daftar((slide, no, total) => {
    slide.background = { color: PUTIH };

    // Header (inline — NC slides guna merah untuk gred chip)
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: W, h: 0.12,
      fill: { color: MERAH }, line: { color: MERAH },
    });
    try { slide.addImage({ path: logoPath, x: 0.15, y: 0.14, w: 0.7, h: 0.86 }); } catch (_) {}
    slide.addText("RISDA Plantation Sdn Bhd", {
      x: 0.95, y: 0.17, w: 5, h: 0.28,
      fontSize: 14, bold: true, color: TEKS_GELAP, fontFace: "Calibri", valign: "middle",
    });
    slide.addText(`${audit.no_rujukan}  ·  ${namaPO}`, {
      x: W - 5.5, y: 0.17, w: 5.3, h: 0.28,
      fontSize: 14, color: TEKS_KELABU, fontFace: "Calibri", align: "right", valign: "middle",
    });
    slide.addShape(pptx.ShapeType.line, {
      x: 0, y: 0.62, w: W, h: 0,
      line: { color: SEMPADAN, width: 0.5 },
    });

    // Gred chip
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.5, y: 0.72, w: 1.5, h: 0.48,
      fill: { color: cLatar }, line: { color: cWarna, width: 1 }, rectRadius: 0.22,
    });
    slide.addText(cGred, {
      x: 0.5, y: 0.72, w: 1.5, h: 0.48,
      fontSize: 12, bold: true, color: cWarna, fontFace: "Calibri",
      align: "center", valign: "middle", charSpacing: 1,
    });
    slide.addText(`${i + 1} / ${ncSemua.length}`, {
      x: W - 2.5, y: 0.75, w: 2.3, h: 0.35,
      fontSize: 13, color: TEKS_MUTED, fontFace: "Calibri", align: "right",
    });

    // Klausa + Tajuk
    slide.addText(`Klausa  ${nc.item_semakan?.kod ?? "-"}`, {
      x: 0.5, y: 1.3, w: W - 1, h: 0.38,
      fontSize: 14, bold: true, color: "2E7D45", fontFace: "Calibri", charSpacing: 1,
    });
    slide.addText(nc.item_semakan?.tajuk ?? "-", {
      x: 0.5, y: 1.65, w: W - 1, h: 0.85,
      fontSize: 24, bold: true, color: TEKS_GELAP, fontFace: "Calibri",
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
      fontSize: 12, bold: true, color: cWarna, fontFace: "Calibri", charSpacing: 2.5,
    });
    slide.addText(nc.catatan ?? "(Tiada catatan)", {
      x: 0.78, y: 3.12, w: W - 1.56, h: 0.98,
      fontSize: 14, color: TEKS_GELAP, fontFace: "Calibri", valign: "top",
    });

    // 2-col: Bukti | Cadangan
    const half = W / 2 - 0.1;
    slide.addText("BUKTI AUDIT", {
      x: 0.5, y: 4.3, w: half, h: 0.3,
      fontSize: 14, bold: true, color: MERAH, fontFace: "Calibri", charSpacing: 2.5,
    });
    slide.addText(nc.bukti_audit ?? "-", {
      x: 0.5, y: 4.6, w: half, h: 1.8,
      fontSize: 14, color: TEKS_GELAP, fontFace: "Calibri", valign: "top",
    });
    slide.addShape(pptx.ShapeType.line, {
      x: W / 2 + 0.05, y: 4.25, w: 0, h: 2.1,
      line: { color: SEMPADAN, width: 0.5 },
    });
    slide.addText("CADANGAN TINDAKAN", {
      x: W / 2 + 0.25, y: 4.3, w: half, h: 0.3,
      fontSize: 14, bold: true, color: MERAH, fontFace: "Calibri", charSpacing: 2.5,
    });
    slide.addText(nc.cadangan_tindakan ?? "-", {
      x: W / 2 + 0.25, y: 4.6, w: half - 0.25, h: 1.8,
      fontSize: 14, color: TEKS_GELAP, fontFace: "Calibri", valign: "top",
    });
    tambahFooter(slide, no, total);
    });
  }

  // ===========================================================
  // OFI DIVIDER + TABLE
  // ===========================================================
  if (ofiList.length > 0) {
    daftar((sDivOfi, _no, _total) => {
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
      fontSize: 16, bold: true, color: PUTIH, fontFace: "Calibri", align: "center", charSpacing: 6, italic: true,
    });
    sDivOfi.addText("OFI", {
      x: 0, y: 3.0, w: W, h: 1.0,
      fontSize: 78, bold: true, color: PUTIH, fontFace: "Calibri", align: "center",
    });
    sDivOfi.addText(`${ofiList.length} Cadangan Penambahbaikan Dikenalpasti`, {
      x: 0, y: 4.12, w: W, h: 0.5,
      fontSize: 18, color: "7A5F00", fontFace: "Calibri", align: "center",
    });
    sDivOfi.addShape(pptx.ShapeType.rect, {
      x: 0, y: H - 0.38, w: W, h: 0.38,
      fill: { color: "7A5F00" }, line: { color: "7A5F00" },
    });
    sDivOfi.addText("RISDA Plantation Sdn Bhd  (0324822-D)", {
      x: 0, y: H - 0.38, w: W, h: 0.38,
      fontSize: 14, color: "FFF3CD", fontFace: "Calibri", valign: "middle", align: "center",
    });
    });

    // OFI TABLE
    daftar((sOfi, no, total) => {
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
        fontSize: 12, bold: true, color: PUTIH, fontFace: "Calibri", valign: "middle", charSpacing: 2,
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
          fontSize: j === 0 ? 13 : 11, bold: j <= 1,
          color: j === 1 ? "2E7D45" : TEKS_GELAP,
          fontFace: "Calibri", valign: "middle",
        });
        xp += wdths[j];
      }
    }
    if (ofiList.length > 7) {
      sOfi.addText(`+ ${ofiList.length - 7} OFI lagi  ·  Rujuk laporan PDF untuk senarai penuh`, {
        x: 0.5, y: 6.38, w: W - 1, h: 0.35,
        fontSize: 14, italic: true, color: TEKS_MUTED, fontFace: "Calibri",
      });
    }
    tambahFooter(sOfi, no, total);
    });
  }

  // ===========================================================
  // SLIDE PERBINCANGAN — SEMUA DAPATAN NC & OFI
  // ===========================================================
  for (let sIdx = 0; sIdx < bincSlides; sIdx++) {
    daftar((sPerbinc, no, total) => {
    sPerbinc.background = { color: PUTIH };
    const _bincLabel = bincSlides > 1 ? `Sesi ${sIdx + 1} / ${bincSlides}` : undefined;
    tambahHeaderContent(sPerbinc, "Perbincangan Dapatan Audit", `Sesi ${sIdx + 1}/${bincSlides} — hujah bersama auditee untuk setiap penemuan`);

    const rowH = 0.65;
    const startY = 1.85;
    const pHdrs  = ["No", "Gred", "Klausa", "Pemerhatian"];
    const pWdths = [0.5, 1.2, 1.4, W - 1 - 0.5 - 1.2 - 1.4];

    sPerbinc.addShape(pptx.ShapeType.rect, {
      x: 0.5, y: startY, w: W - 1, h: 0.55,
      fill: { color: MERAH }, line: { color: MERAH },
    });
    let pXp = 0.5;
    for (let i = 0; i < pHdrs.length; i++) {
      sPerbinc.addText(pHdrs[i], {
        x: pXp + 0.08, y: startY, w: pWdths[i] - 0.08, h: 0.55,
        fontSize: 14, bold: true, color: PUTIH, fontFace: "Calibri", valign: "middle",
      });
      pXp += pWdths[i];
    }

    const start = sIdx * ITEMS_PER_SLIDE;
    const end = Math.min(start + ITEMS_PER_SLIDE, semuaBincang.length);
    for (let i = start; i < end; i++) {
      const d = semuaBincang[i];
      const rowIdx = i - start;
      const y = startY + 0.55 + rowIdx * rowH;
      if (rowIdx % 2 === 1) {
        sPerbinc.addShape(pptx.ShapeType.rect, {
          x: 0.5, y, w: W - 1, h: rowH,
          fill: { color: "F5F5F5" }, line: { color: "F5F5F5" },
        });
      }
      pXp = 0.5;
      const cells = [
        String(i + 1),
        d.jenis,
        d.item_semakan?.kod ?? "-",
        (d.catatan ?? "-").substring(0, 200),
      ];
      for (let j = 0; j < cells.length; j++) {
        sPerbinc.addText(cells[j], {
          x: pXp + 0.08, y, w: pWdths[j] - 0.08, h: rowH,
          fontSize: 14, bold: j <= 1,
          color: j === 1 ? d.warna : j === 2 ? "2E7D45" : TEKS_GELAP,
          fontFace: "Calibri", valign: "middle", autoFit: true,
        });
        pXp += pWdths[j];
      }
    }
    tambahFooter(sPerbinc, no, total);
    });
  }

  // ===========================================================
  // YANG BAIK, KAMI CATAT JUGA — penghargaan
  // ===========================================================
  daftar((sBaik) => {
    sBaik.background = { color: HIJAU_FOREST };
    sBaik.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 0.08, h: H,
      fill: { color: EMAS }, line: { type: "none" },
    });
    sBaik.addText("\u2605  CATATAN POSITIF PASUKAN AUDIT  \u2605", {
      x: 0.2, y: 0.4, w: W - 0.4, h: 0.45,
      fontSize: 11, italic: true, color: HIJAU_MINT, align: "center", charSpacing: 3, fontFace: "Calibri",
    });
    sBaik.addText("Yang Baik,", {
      x: 0.2, y: 0.95, w: W - 0.4, h: 1.3,
      fontSize: 60, bold: true, color: PUTIH, align: "center", fontFace: "Calibri",
    });
    sBaik.addText("Kami Catat Juga.", {
      x: 0.2, y: 2.1, w: W - 0.4, h: 1.3,
      fontSize: 60, bold: true, color: EMAS, align: "center", fontFace: "Calibri",
    });
    sBaik.addShape(pptx.ShapeType.line, {
      x: W / 2 - 4, y: 3.6, w: 8, h: 0,
      line: { color: EMAS, width: 2 },
    });

    const obs = [
      "Kerjasama pasukan ladang amat dihargai sepanjang proses audit",
      "Fail dan dokumentasi disusun dengan teliti dan mudah untuk dirujuk",
      "Kakitangan terbuka menerima dapatan dan bersedia untuk bertindak balas",
      "Semangat untuk terus maju ke tahap pematuhan yang lebih tinggi",
    ];
    const boxW2 = (W - 0.6) / 2 - 0.2;
    obs.forEach((ob, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const bx = 0.3 + col * (boxW2 + 0.2);
      const by = 3.8 + row * 0.85;
      sBaik.addShape(pptx.ShapeType.roundRect, {
        x: bx, y: by, w: boxW2, h: 0.72,
        fill: { color: HIJAU_PANEL }, line: { color: EMAS, width: 0.75 }, rectRadius: 0.04,
      });
      sBaik.addText([
        { text: "\u2714  ", options: { color: HIJAU_MINT, bold: true } },
        { text: ob,            options: { color: PUTIH } },
      ], {
        x: bx + 0.12, y: by, w: boxW2 - 0.2, h: 0.72,
        fontSize: 10, valign: "middle", fontFace: "Calibri",
      });
    });
    sBaik.addText(
      `\u201C Audit bukan hukuman. Ia satu perjalanan bersama. Terima kasih, ${namaPO}. \u201D`,
      {
        x: 0.5, y: 5.6, w: W - 1, h: 0.5,
        fontSize: 11, italic: true, color: HIJAU_SUB, align: "center", fontFace: "Calibri",
      }
    );
    sBaik.addShape(pptx.ShapeType.rect, {
      x: 0, y: H - 0.4, w: W, h: 0.4,
      fill: { color: "062A1C" }, line: { type: "none" },
    });
    sBaik.addText(`RISDA Plantation Sdn Bhd  |  Jabatan Perladangan  |  ${audit.no_rujukan}`, {
      x: 0, y: H - 0.4, w: W, h: 0.4,
      fontSize: 7, color: HIJAU_SUB, align: "center", valign: "middle", fontFace: "Calibri",
    });
  });

  // ===========================================================
  // PENUTUP - merah full bleed
  // ===========================================================
  daftar((sEnd) => {
  sEnd.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: W, h: H,
    fill: { color: MERAH }, line: { color: MERAH },
  });
  try { sEnd.addImage({ path: logoPath, x: W / 2 - 0.62, y: 0.25, w: 1.24, h: 1.52 }); } catch (_) {}
  sEnd.addText("AUDIT DALAMAN MSPO 2026", {
    x: 0.5, y: 1.9, w: W - 1, h: 0.65,
    fontSize: 30, bold: true, color: PUTIH, fontFace: "Calibri", align: "center",
  });
  sEnd.addText(`WILAYAH ${wilayahPO.toUpperCase()}`, {
    x: 0.5, y: 2.6, w: W - 1, h: 0.55,
    fontSize: 24, bold: true, color: EMAS, fontFace: "Calibri", align: "center", charSpacing: 3,
  });
  sEnd.addShape(pptx.ShapeType.roundRect, {
    x: W / 2 - 1.25, y: 3.25, w: 2.5, h: 0.46,
    fill: { color: "9B0E1F" }, line: { color: "9B0E1F" }, rectRadius: 0.23,
  });
  sEnd.addText("SESI PENUTUPAN", {
    x: W / 2 - 1.25, y: 3.25, w: 2.5, h: 0.46,
    fontSize: 12, bold: true, color: PUTIH, fontFace: "Calibri",
    align: "center", valign: "middle", charSpacing: 2,
  });
  sEnd.addShape(pptx.ShapeType.roundRect, {
    x: 3.2, y: 3.85, w: 6.93, h: 1.55,
    fill: { color: "9B0E1F" }, line: { color: "7A0B18" }, rectRadius: 0.08,
  });
  sEnd.addText(namaPO, {
    x: 3.2, y: 4.02, w: 6.93, h: 0.52,
    fontSize: 22, bold: true, color: PUTIH, fontFace: "Calibri", align: "center",
  });
  sEnd.addText(julatTarikh, {
    x: 3.2, y: 4.55, w: 6.93, h: 0.38,
    fontSize: 16, bold: true, color: EMAS, fontFace: "Calibri", align: "center",
  });
  sEnd.addShape(pptx.ShapeType.line, {
    x: 1.2, y: H - 1.0, w: W - 2.4, h: 0,
    line: { color: "9B0E1F", width: 1 },
  });
  sEnd.addText("RISDA Plantation Sdn Bhd  (0324822-D)  -  Jabatan Perladangan", {
    x: 0.5, y: H - 0.9, w: W - 1, h: 0.35,
    fontSize: 13, bold: true, color: EMAS, fontFace: "Calibri", align: "center",
  });
  sEnd.addText(`${audit.no_rujukan}  ·  ${julatTarikh}`, {
    x: 0.5, y: H - 0.55, w: W - 1, h: 0.3,
    fontSize: 12, color: "FFB3B3", fontFace: "Calibri", align: "center",
  });
  });

  // ── RENDER SEMUA SLIDE ─────────────────────────────────────────────────
  const totalSlides = slideFns.length;
  {
    let no = 0;
    for (const fn of slideFns) {
      no++;
      fn(pptx.addSlide(), no, totalSlides);
    }
  }

  const buf = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="Closing-${audit.no_rujukan}.pptx"`,
    },
  });
}
