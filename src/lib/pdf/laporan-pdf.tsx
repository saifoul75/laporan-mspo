import { Document, Page, Text, View, StyleSheet, Font, Image } from "@react-pdf/renderer";
import React from "react";

// Matikan auto-hyphenation
Font.registerHyphenationCallback((word) => [word]);

const HIJAU = "#1f7a45";
const KELABU = "#6b7280";
const KELABU_CERAH = "#f3f4f6";
const SEMPADAN = "#d1d5db";

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: "Helvetica", color: "#1f2937" },

  logoWrap: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  logo: { width: 60, height: 60 },

  coverOrg: { fontSize: 11, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 2 },
  coverNo: { fontSize: 9, textAlign: "center", color: KELABU, marginBottom: 16 },
  coverLine: { borderBottom: "2 solid #1f7a45", marginBottom: 12 },
  coverTajuk: { fontSize: 14, fontFamily: "Helvetica-Bold", textAlign: "center", color: HIJAU, marginBottom: 4 },
  coverFor: { fontSize: 10, textAlign: "center", marginBottom: 2 },
  coverTarikh: { fontSize: 9, textAlign: "center", color: KELABU, marginBottom: 12 },
  coverStandard: { fontSize: 8, textAlign: "center", color: KELABU, marginBottom: 16, fontStyle: "italic" },

  infoTable: { marginBottom: 16 },
  infoRow: { flexDirection: "row", borderBottom: "1 solid #d1d5db", paddingVertical: 4 },
  infoLabel: { width: 130, fontFamily: "Helvetica-Bold", fontSize: 9 },
  infoValue: { flex: 1, fontSize: 9 },

  contentsTitle: { fontFamily: "Helvetica-Bold", fontSize: 9, marginBottom: 4 },
  contentsItem: { fontSize: 9, marginBottom: 2, paddingLeft: 8 },

  sigBlock: { flexDirection: "row", marginTop: 24, gap: 20 },
  sigBox: { flex: 1 },
  sigLine: { borderBottom: "1 solid #374151", marginBottom: 4, marginTop: 24 },
  sigLabel: { fontSize: 8, color: KELABU },
  sigNama: { fontSize: 9, fontFamily: "Helvetica-Bold" },

  pageHeaderWrap: { borderBottom: "2 solid #1f7a45", marginBottom: 10, paddingBottom: 6 },
  seksyenOrg: { fontFamily: "Helvetica-Bold", fontSize: 10, textAlign: "center", marginBottom: 1 },
  seksyenWilayah: { fontSize: 9, textAlign: "center", color: KELABU, marginBottom: 1 },
  seksyenTajuk: { fontFamily: "Helvetica-Bold", fontSize: 10, textAlign: "center", marginBottom: 2, color: HIJAU },
  seksyenTarikh: { fontSize: 8, textAlign: "center", color: KELABU },

  introTitle: { fontFamily: "Helvetica-Bold", fontSize: 9, marginBottom: 6, marginTop: 8 },
  introItem: { fontSize: 9, marginBottom: 5, lineHeight: 1.4 },

  countTable: { marginTop: 10, marginBottom: 10 },
  countRow: { flexDirection: "row", borderBottom: "1 solid #d1d5db", paddingVertical: 4 },
  countLabel: { width: 80, fontFamily: "Helvetica-Bold", fontSize: 9 },
  countMajor: { width: 80, fontSize: 9 },
  countMinor: { width: 80, fontSize: 9 },
  countOFI: { width: 80, fontSize: 9 },

  tableWrap: { marginTop: 8 },
  thead: { flexDirection: "row", backgroundColor: KELABU_CERAH, paddingVertical: 5, paddingHorizontal: 4, borderBottom: "1 solid #d1d5db" },
  tbody: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 4, borderBottom: "1 solid #d1d5db" },

  cNo: { width: 18, fontFamily: "Helvetica-Bold", fontSize: 8 },
  cStatus: { width: 38, fontFamily: "Helvetica-Bold", fontSize: 8 },
  cJuruaudit: { width: 38, fontFamily: "Helvetica-Bold", fontSize: 8 },
  cKenyataan: { flex: 1, fontFamily: "Helvetica-Bold", fontSize: 8 },
  cKlausa: { width: 42, fontFamily: "Helvetica-Bold", fontSize: 8 },
  cTandatangan: { width: 75, fontFamily: "Helvetica-Bold", fontSize: 8 },

  cNoB: { width: 18, fontSize: 8 },
  cStatusB: { width: 38, fontSize: 8 },
  cJuruauditB: { width: 38, fontSize: 8 },
  cKenyataanB: { flex: 1, fontSize: 8, lineHeight: 1.4 },
  cKlausaB: { width: 42, fontSize: 8 },
  cTandatanganB: { width: 75, fontSize: 8, color: KELABU },

  snThead: { flexDirection: "row", backgroundColor: KELABU_CERAH, paddingVertical: 5, paddingHorizontal: 4, borderBottom: "1 solid #d1d5db" },
  snTbody: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 4, borderBottom: "1 solid #d1d5db" },
  snNo: { width: 20, fontFamily: "Helvetica-Bold", fontSize: 8 },
  snMatter: { flex: 2, fontFamily: "Helvetica-Bold", fontSize: 8 },
  snRemark: { flex: 1, fontFamily: "Helvetica-Bold", fontSize: 8 },
  snKlausa: { width: 55, fontFamily: "Helvetica-Bold", fontSize: 8 },
  snNoB: { width: 20, fontSize: 8 },
  snMatterB: { flex: 2, fontSize: 8, lineHeight: 1.4 },
  snRemarkB: { flex: 1, fontSize: 8, lineHeight: 1.4 },
  snKlausaB: { width: 55, fontSize: 8 },

  footer: { position: "absolute", bottom: 20, left: 36, right: 36, textAlign: "center", fontSize: 7, color: "#9ca3af" },
});

type AuditPDF = {
  no_rujukan: string;
  tarikh_audit: string;
  tarikh_tamat?: string | null;
  jenis_audit: string;
  status: string;
  pusat_operasi: { kod: string; nama: string; wilayah: string | null } | null;
};

type DapatanPDF = {
  id: string;
  status: string;
  gred_nc: string | null;
  catatan: string | null;
  bukti_audit: string | null;
  cadangan_tindakan: string | null;
  item_semakan: { kod: string; tajuk: string; fail_rujukan: number | null } | null;
};

interface LaporanPDFProps {
  audit: AuditPDF;
  dapatan: DapatanPDF[];
  namaLeadAuditor?: string;
  namaAuditorLain?: string | null;
  logoBase64?: string | null;
}

function formatTarikh(d: string | null | undefined) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("ms-MY", { day: "2-digit", month: "long", year: "numeric" });
}

function deriveInitials(nama: string): string {
  const skip = ["BIN", "BINTI", "A/L", "A/P"];
  const words = nama.toUpperCase().split(/\s+/).filter((w) => !skip.includes(w));
  return words.slice(0, 3).map((w) => w[0]).join("");
}

function buildKenyataan(d: DapatanPDF): string {
  if (!d.catatan && !d.bukti_audit) return "-";
  const parts: string[] = [];
  if (d.catatan) parts.push("Findings: " + d.catatan);
  if (d.bukti_audit) parts.push("Objective Evidence: " + d.bukti_audit);
  return parts.join("\n\n");
}

function buildStatusLabel(d: DapatanPDF): string {
  if (d.status === "NC") {
    return d.gred_nc === "major" ? "Major" : "Minor";
  }
  return "OFI";
}

const LABEL_JENIS: Record<string, string> = {
  audit_dalaman: "MSPO Internal Audit",
  audit_pensijilan: "MSPO Certification Audit",
  audit_pengawasan: "MSPO Surveillance Audit",
  audit_persijilan_semula: "MSPO Re-Certification Audit",
};

function PageHeader(props: { tajuk: string; wilayah: string; julat: string; logoBase64?: string | null }) {
  return (
    <View style={s.pageHeaderWrap}>
      {props.logoBase64 && (
        <Image src={props.logoBase64} style={{ width: 36, height: 36, marginBottom: 4 } as never} />
      )}
      <Text style={s.seksyenOrg}>RISDA PLANTATION SDN. BHD. (0324822-D)</Text>
      <Text style={s.seksyenWilayah}>{props.wilayah}</Text>
      <Text style={s.seksyenTajuk}>{props.tajuk}</Text>
      <Text style={s.seksyenTarikh}>{props.julat}</Text>
    </View>
  );
}

const SIDE_NOTES = [
  {
    matter: "Pengurusan hendaklah mengadakan Mesyuarat Semakan Pengurusan (Management Review Meeting) selepas audit dalaman dilakukan. Perbincangan hendaklah merangkumi: keputusan audit dalaman, maklumbalas pelanggan, prestasi dan pematuhan MSPO, status tindakan dan pembetulan, tindakan susulan, perubahan yang boleh menjejaskan sistem pengurusan, serta cadangan penambahbaikan.",
    remark: "Mengadakan Management Review Meeting",
    klausa: "4.1.10.1",
  },
  {
    matter: "Setiap pegawai bertanggungjawab dalam komuniti MSPO perlu diberikan latihan dan mengadakan perbincangan khusus berkenaan MSPO berkenaan peranan masing-masing bagi menambahbaik pemahaman keperluan MSPO.",
    remark: "Latihan dan perbincangan MSPO untuk semua pegawai",
    klausa: "4.1.5.1",
  },
];

const CONTENTS = [
  "1. Summary Info of Audit",
  "2. Audit Report Summary",
  "3. Non-Conformity Record (NCR)",
  "4. Side Notes / Reminder",
];

const INTRO_ITEMS = [
  "1)  Audit yang dijalankan ini mengikut klausa yang ada di dalam MS 2530-2-2:2022: General Principles for Organised Smallholders (Less than 40.46 Hectares).",
  "2)  Pegawai bertanggungjawab memberikan kerjasama dengan baik sepanjang proses semakan dokumentasi.",
  "3)  Pihak pengurusan menyediakan fail induk yang lengkap sesuai dengan dokumen diperlukan bagi pensijilan MSPO.",
  "4)  Pihak pengurusan sentiasa bersedia untuk menerima segala teguran dan sentiasa untuk memperbaiki kelemahan yang ada.",
];

export function LaporanPDF(props: LaporanPDFProps) {
  const { audit, dapatan, namaLeadAuditor, namaAuditorLain, logoBase64 } = props;

  const ncList = dapatan.filter((d) => d.status === "NC");
  const ofiList = dapatan.filter((d) => d.status === "OFI");
  const nc_major = ncList.filter((d) => d.gred_nc === "major").length;
  const nc_minor = ncList.filter((d) => d.gred_nc === "minor").length;

  const namaPO = audit.pusat_operasi != null ? audit.pusat_operasi.nama : "-";
  const namaWilayah = audit.pusat_operasi != null ? (audit.pusat_operasi.wilayah != null ? audit.pusat_operasi.wilayah : "-") : "-";
  const namaLead = namaLeadAuditor != null ? namaLeadAuditor : "MOHD SAIFOUL AZUAN BIN MOHD ISA";
  const namaAuditorPembantu = namaAuditorLain != null ? namaAuditorLain : "-";
  const tarikhMula = formatTarikh(audit.tarikh_audit);
  const tarikhTamat = audit.tarikh_tamat != null ? formatTarikh(audit.tarikh_tamat) : tarikhMula;
  const julat = tarikhMula === tarikhTamat ? tarikhMula : tarikhMula + " - " + tarikhTamat;
  const jenisAudit = LABEL_JENIS[audit.jenis_audit] != null ? LABEL_JENIS[audit.jenis_audit] : audit.jenis_audit;
  const inisialLead = deriveInitials(namaLead);
  const inisialAuditor = namaAuditorPembantu !== "-" ? deriveInitials(namaAuditorPembantu) : "";
  const inisialJuruaudit = inisialAuditor !== "" && inisialLead !== inisialAuditor
    ? inisialLead + " / " + inisialAuditor
    : inisialLead;

  const allDapatan = ncList.concat(ofiList);
  const tarikhJana = new Date().toLocaleDateString("ms-MY");

  const infoRows = [
    ["Type of Audit", jenisAudit],
    ["Operating Unit", namaPO],
    ["Reference No", audit.no_rujukan],
    ["This Audit Date", julat],
    ["Previous Audit Date", "-"],
    ["Scope of Audit", "MSPO MS 2530-2-2:2022 General Principles for Organised Smallholders (Less than 40.46 Hectares)"],
    ["Lead Auditor", namaLead],
    ["Auditor(s)", namaAuditorPembantu],
  ];

  const ncMinorText = nc_minor > 0 ? "Minor - 30 Hari" : "-";
  const ncMajorText = nc_major > 0 ? " | Major - 30 Hari" : "";
  const closingText = "Proposed program / timing on closing of NCR (if any):\n" + ncMinorText + ncMajorText;
  const footerText1 = "RISDA Plantation Sdn Bhd | " + audit.no_rujukan + " | Dijana: " + tarikhJana;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {logoBase64 != null && (
          <View style={s.logoWrap}>
            <Image src={logoBase64} style={s.logo} />
          </View>
        )}
        <View style={{ marginBottom: 8 }}>
          <Text style={s.coverOrg}>RISDA PLANTATION SDN. BHD. (0324822-D)</Text>
          <Text style={s.coverNo}>{namaWilayah}</Text>
        </View>
        <View style={s.coverLine} />
        <Text style={s.coverTajuk}>MSPO INTERNAL AUDIT REPORT</Text>
        <Text style={s.coverFor}>{"FOR " + namaPO}</Text>
        <Text style={s.coverTarikh}>{julat}</Text>
        <Text style={s.coverStandard}>{"This report is produced based on assessment done with reference from:\nMS 2530-2-2:2022; General Principles for Organised Smallholders (Less than 40.46 Hectares)"}</Text>

        <View style={s.infoTable}>
          {infoRows.map((row) => (
            <View key={row[0]} style={s.infoRow}>
              <Text style={s.infoLabel}>{row[0]}</Text>
              <Text style={s.infoValue}>{row[1]}</Text>
            </View>
          ))}
        </View>

        <Text style={s.contentsTitle}>Contents of Report:</Text>
        {CONTENTS.map((c) => (
          <Text key={c} style={s.contentsItem}>{c}</Text>
        ))}

        <View style={s.sigBlock}>
          <View style={s.sigBox}>
            <View style={s.sigLine} />
            <Text style={s.sigNama}>Lead Auditor Signature:</Text>
            <Text style={s.sigLabel}>{"Name: " + namaLead}</Text>
            <Text style={s.sigLabel}>{"Date: " + tarikhTamat}</Text>
          </View>
          <View style={s.sigBox}>
            <View style={s.sigLine} />
            <Text style={s.sigNama}>{"Management Representative" + "'" + "s Signature:"}</Text>
            <Text style={s.sigLabel}>Name:</Text>
            <Text style={s.sigLabel}>Date:</Text>
          </View>
        </View>

        <Text style={s.footer}>{footerText1}</Text>
      </Page>

      <Page size="A4" style={s.page}>
        <PageHeader tajuk="INTERNAL SYSTEM AUDIT REPORT SUMMARY" wilayah={namaWilayah} julat={julat} logoBase64={logoBase64} />

        <Text style={s.introTitle}>INTRODUCTION</Text>
        {INTRO_ITEMS.map((p) => (
          <Text key={p} style={s.introItem}>{p}</Text>
        ))}

        <Text style={[s.introTitle, { marginTop: 12 }]}>Number of OFI/NCR raised:</Text>
        <View style={s.countTable}>
          <View style={s.countRow}>
            <Text style={s.countLabel}>NCR</Text>
            <Text style={s.countMajor}>{String(nc_major) + " Major"}</Text>
            <Text style={s.countMinor}>{String(nc_minor) + " Minor"}</Text>
          </View>
          <View style={s.countRow}>
            <Text style={s.countLabel}>OFI</Text>
            <Text style={s.countOFI}>{String(ofiList.length)}</Text>
          </View>
        </View>

        <Text style={s.introItem}>{closingText}</Text>

        <View style={[s.sigBlock, { marginTop: 32 }]}>
          <View style={s.sigBox}>
            <View style={s.sigLine} />
            <Text style={s.sigNama}>Lead Auditor Signature:</Text>
            <Text style={s.sigLabel}>{"Date: " + tarikhTamat}</Text>
          </View>
          <View style={s.sigBox} />
        </View>

        <Text style={s.footer}>{footerText1}</Text>
      </Page>

      <Page size="A4" style={s.page}>
        <PageHeader tajuk="NON-CONFORMITY RECORD (NCR) AND PELUANG PENAMBAHBAIKAN (OFI)" wilayah={namaWilayah} julat={julat} logoBase64={logoBase64} />

        <View style={s.tableWrap}>
          <View style={s.thead}>
            <Text style={s.cNo}>No.</Text>
            <Text style={s.cStatus}>NCR Status</Text>
            <Text style={s.cJuruaudit}>Juruaudit</Text>
            <Text style={s.cKenyataan}>Kenyataan Ketidakpatuhan (NCR)</Text>
            <Text style={s.cKlausa}>Klausa MSPO</Text>
            <Text style={s.cTandatangan}>Penerimaan Bukti / NCR Ditutup oleh Lead Auditor</Text>
          </View>

          {allDapatan.map((d, i) => (
            <View key={d.id} style={s.tbody}>
              <Text style={s.cNoB}>{String(i + 1)}</Text>
              <Text style={s.cStatusB}>{buildStatusLabel(d)}</Text>
              <Text style={s.cJuruauditB}>{inisialJuruaudit}</Text>
              <Text style={s.cKenyataanB}>{buildKenyataan(d)}</Text>
              <Text style={s.cKlausaB}>{d.item_semakan != null ? d.item_semakan.kod : "-"}</Text>
              <Text style={s.cTandatanganB}> </Text>
            </View>
          ))}
        </View>

        <Text style={s.footer}>{footerText1}</Text>
      </Page>

      <Page size="A4" style={s.page}>
        <PageHeader tajuk="SIDE NOTES / REMINDER" wilayah={namaWilayah} julat={julat} logoBase64={logoBase64} />

        <View style={s.tableWrap}>
          <View style={s.snThead}>
            <Text style={s.snNo}>No.</Text>
            <Text style={s.snMatter}>Matters</Text>
            <Text style={s.snRemark}>Remark</Text>
            <Text style={s.snKlausa}>MSPO</Text>
          </View>
          {SIDE_NOTES.map((n, i) => (
            <View key={String(i)} style={s.snTbody}>
              <Text style={s.snNoB}>{String(i + 1)}</Text>
              <Text style={s.snMatterB}>{n.matter}</Text>
              <Text style={s.snRemarkB}>{n.remark}</Text>
              <Text style={s.snKlausaB}>{n.klausa}</Text>
            </View>
          ))}
        </View>

        <Text style={s.footer}>{footerText1}</Text>
      </Page>
    </Document>
  );
}
