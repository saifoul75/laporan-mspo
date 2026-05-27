import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import React from "react";

// Matikan auto-hyphenation — elak perkataan terpotong salah (contoh: "disedi-akan")
Font.registerHyphenationCallback((word) => [word]);

const HIJAU = "#1f7a45";
const KELABU = "#6b7280";
const KELABU_CERAH = "#f3f4f6";
const SEMPADAN = "#d1d5db";

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: "Helvetica", color: "#1f2937" },

  // Cover
  coverOrg: { fontSize: 11, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 2 },
  coverNo: { fontSize: 9, textAlign: "center", color: KELABU, marginBottom: 16 },
  coverLine: { borderBottom: `2 solid ${HIJAU}`, marginBottom: 12 },
  coverTajuk: { fontSize: 14, fontFamily: "Helvetica-Bold", textAlign: "center", color: HIJAU, marginBottom: 4 },
  coverFor: { fontSize: 10, textAlign: "center", marginBottom: 2 },
  coverTarikh: { fontSize: 9, textAlign: "center", color: KELABU, marginBottom: 12 },
  coverStandard: { fontSize: 8, textAlign: "center", color: KELABU, marginBottom: 16, fontStyle: "italic" },

  // Info table (cover)
  infoTable: { marginBottom: 16 },
  infoRow: { flexDirection: "row", borderBottom: `1 solid ${SEMPADAN}`, paddingVertical: 4 },
  infoLabel: { width: 130, fontFamily: "Helvetica-Bold", fontSize: 9 },
  infoValue: { flex: 1, fontSize: 9 },

  // Contents
  contentsTitle: { fontFamily: "Helvetica-Bold", fontSize: 9, marginBottom: 4 },
  contentsItem: { fontSize: 9, marginBottom: 2, paddingLeft: 8 },

  // Signature block
  sigBlock: { flexDirection: "row", marginTop: 24, gap: 20 },
  sigBox: { flex: 1 },
  sigLine: { borderBottom: `1 solid #374151`, marginBottom: 4, marginTop: 24 },
  sigLabel: { fontSize: 8, color: KELABU },
  sigNama: { fontSize: 9, fontFamily: "Helvetica-Bold" },

  // Section header
  seksyenOrg: { fontFamily: "Helvetica-Bold", fontSize: 10, textAlign: "center", marginBottom: 2 },
  seksyenTajuk: { fontFamily: "Helvetica-Bold", fontSize: 10, textAlign: "center", marginBottom: 12, color: HIJAU },

  // Introduction
  introTitle: { fontFamily: "Helvetica-Bold", fontSize: 9, marginBottom: 6, marginTop: 8 },
  introItem: { fontSize: 9, marginBottom: 5, lineHeight: 1.4 },

  // Count table
  countTable: { marginTop: 10, marginBottom: 10 },
  countRow: { flexDirection: "row", borderBottom: `1 solid ${SEMPADAN}`, paddingVertical: 4 },
  countLabel: { width: 80, fontFamily: "Helvetica-Bold", fontSize: 9 },
  countMajor: { width: 80, fontSize: 9 },
  countMinor: { width: 80, fontSize: 9 },
  countOFI: { width: 80, fontSize: 9 },

  // NCR/OFI main table
  tableWrap: { marginTop: 8 },
  thead: { flexDirection: "row", backgroundColor: KELABU_CERAH, paddingVertical: 5, paddingHorizontal: 4, borderBottom: `1 solid ${SEMPADAN}` },
  tbody: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 4, borderBottom: `1 solid ${SEMPADAN}` },

  cNo: { width: 20, fontFamily: "Helvetica-Bold", fontSize: 8 },
  cStatus: { width: 45, fontFamily: "Helvetica-Bold", fontSize: 8 },
  cJuruaudit: { width: 45, fontFamily: "Helvetica-Bold", fontSize: 8 },
  cKenyataan: { flex: 1, fontFamily: "Helvetica-Bold", fontSize: 8 },
  cKlausa: { width: 50, fontFamily: "Helvetica-Bold", fontSize: 8 },
  cBukti: { width: 80, fontFamily: "Helvetica-Bold", fontSize: 8 },

  cNoB: { width: 20, fontSize: 8 },
  cStatusB: { width: 45, fontSize: 8 },
  cJuruauditB: { width: 45, fontSize: 8 },
  cKenyataanB: { flex: 1, fontSize: 8, lineHeight: 1.4 },
  cKlausaB: { width: 50, fontSize: 8 },
  cBuktiB: { width: 80, fontSize: 8, lineHeight: 1.4 },

  // Side notes
  snThead: { flexDirection: "row", backgroundColor: KELABU_CERAH, paddingVertical: 5, paddingHorizontal: 4, borderBottom: `1 solid ${SEMPADAN}` },
  snTbody: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 4, borderBottom: `1 solid ${SEMPADAN}` },
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
}

function formatTarikh(d: string | null | undefined) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("ms-MY", { day: "2-digit", month: "long", year: "numeric" });
}

const LABEL_JENIS: Record<string, string> = {
  audit_dalaman: "MSPO Internal Audit",
  audit_pensijilan: "MSPO Certification Audit",
  audit_pengawasan: "MSPO Surveillance Audit",
  audit_persijilan_semula: "MSPO Re-Certification Audit",
};

const SIDE_NOTES = [
  {
    matter:
      "Pengurusan hendaklah mengadakan Mesyuarat Semakan Pengurusan (Management Review Meeting) selepas audit dalaman dilakukan. Perbincangan hendaklah merangkumi: keputusan audit dalaman, maklumbalas pelanggan, prestasi dan pematuhan MSPO, status tindakan dan pembetulan, tindakan susulan, perubahan yang boleh menjejaskan sistem pengurusan, serta cadangan penambahbaikan.",
    remark: "Mengadakan Management Review Meeting",
    klausa: "4.1.10.1",
  },
  {
    matter:
      "Setiap pegawai bertanggungjawab dalam komuniti MSPO perlu diberikan latihan dan mengadakan perbincangan khusus berkenaan MSPO berkenaan peranan masing-masing bagi menambahbaik pemahaman keperluan MSPO.",
    remark: "Latihan dan perbincangan MSPO untuk semua pegawai",
    klausa: "4.1.5.1",
  },
];

export function LaporanPDF({ audit, dapatan, namaLeadAuditor }: LaporanPDFProps) {
  const ncList = dapatan.filter((d) => d.status === "NC");
  const ofiList = dapatan.filter((d) => d.status === "OFI");
  const nc_major = ncList.filter((d) => d.gred_nc === "major").length;
  const nc_minor = ncList.filter((d) => d.gred_nc === "minor").length;

  const namaPO = audit.pusat_operasi?.nama ?? "-";
  const namaWilayah = audit.pusat_operasi?.wilayah ?? "-";
  const namaAuditor = namaLeadAuditor ?? "MOHD SAIFOUL AZUAN BIN MOHD ISA";
  const tarikhAudit = formatTarikh(audit.tarikh_audit);
  const jenisAudit = LABEL_JENIS[audit.jenis_audit] ?? audit.jenis_audit;

  const allDapatan = [...ncList, ...ofiList];

  return (
    <Document>
      {/* ===== HALAMAN 1: COVER ===== */}
      <Page size="A4" style={s.page}>
        <View style={{ marginBottom: 8 }}>
          <Text style={s.coverOrg}>RISDA PLANTATION SDN. BHD. (0324822-D)</Text>
          <Text style={s.coverNo}>{namaWilayah}</Text>
        </View>
        <View style={s.coverLine} />
        <Text style={s.coverTajuk}>MSPO INTERNAL AUDIT REPORT</Text>
        <Text style={s.coverFor}>FOR {namaPO}</Text>
        <Text style={s.coverTarikh}>{tarikhAudit}</Text>
        <Text style={s.coverStandard}>
          This report is produced based on assessment done with reference from:{"\n"}
          MS 2530-2-2:2022; General Principles for Organised Smallholders (Less than 40.46 Hectares)
        </Text>

        {/* Info Table */}
        <View style={s.infoTable}>
          {[
            ["Type of Audit", jenisAudit],
            ["Operating Unit", namaPO],
            ["Reference No", audit.no_rujukan],
            ["This Audit Date", tarikhAudit],
            ["Previous Audit Date", "—"],
            [
              "Scope of Audit",
              "MSPO MS 2530-2-2:2022 General Principles for Organised Smallholders (Less than 40.46 Hectares)",
            ],
            ["Lead Auditor", namaAuditor],
            ["Auditor(s)", namaAuditor],
          ].map(([label, value]) => (
            <View key={label} style={s.infoRow}>
              <Text style={s.infoLabel}>{label}</Text>
              <Text style={s.infoValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Contents */}
        <Text style={s.contentsTitle}>Contents of Report:</Text>
        {[
          "1. Summary Info of Audit",
          "2. Audit Report Summary",
          "3. Non-Conformity Record (NCR)",
          "4. Side Notes / Reminder",
        ].map((c) => (
          <Text key={c} style={s.contentsItem}>
            {c}
          </Text>
        ))}

        {/* Signatures */}
        <View style={s.sigBlock}>
          <View style={s.sigBox}>
            <View style={s.sigLine} />
            <Text style={s.sigNama}>Lead Auditor Signature:</Text>
            <Text style={s.sigLabel}>Name: {namaAuditor}</Text>
            <Text style={s.sigLabel}>Date: {tarikhAudit}</Text>
          </View>
          <View style={s.sigBox}>
            <View style={s.sigLine} />
            <Text style={s.sigNama}>Management Representative{"'"}s Signature:</Text>
            <Text style={s.sigLabel}>Name:</Text>
            <Text style={s.sigLabel}>Date:</Text>
          </View>
        </View>

        <Text style={s.footer}>
          RISDA Plantation Sdn Bhd | {audit.no_rujukan} | Dijana: {new Date().toLocaleDateString("ms-MY")}
        </Text>
      </Page>

      {/* ===== HALAMAN 2: SUMMARY ===== */}
      <Page size="A4" style={s.page}>
        <Text style={s.seksyenOrg}>RISDA PLANTATION SDN. BHD.</Text>
        <Text style={s.seksyenTajuk}>INTERNAL SYSTEM AUDIT REPORT SUMMARY</Text>

        <Text style={s.introTitle}>INTRODUCTION</Text>
        {[
          "1)  Audit yang dijalankan ini mengikut klausa yang ada di dalam MS 2530-2-2:2022: General Principles for Organised Smallholders (Less than 40.46 Hectares).",
          "2)  Pegawai bertanggungjawab memberikan kerjasama dengan baik sepanjang proses semakan dokumentasi.",
          "3)  Pihak pengurusan menyediakan fail induk yang lengkap sesuai dengan dokumen diperlukan bagi pensijilan MSPO.",
          "4)  Pihak pengurusan sentiasa bersedia untuk menerima segala teguran dan sentiasa untuk memperbaiki kelemahan yang ada.",
        ].map((p) => (
          <Text key={p} style={s.introItem}>
            {p}
          </Text>
        ))}

        <Text style={[s.introTitle, { marginTop: 12 }]}>Number of OFI/NCR raised:</Text>
        <View style={s.countTable}>
          <View style={s.countRow}>
            <Text style={s.countLabel}>NCR</Text>
            <Text style={s.countMajor}>{nc_major} Major</Text>
            <Text style={s.countMinor}>{nc_minor} Minor</Text>
          </View>
          <View style={s.countRow}>
            <Text style={s.countLabel}>OFI</Text>
            <Text style={s.countOFI}>{ofiList.length}</Text>
          </View>
        </View>

        <Text style={s.introItem}>
          Proposed program / timing on closing of NCR (if any):{"\n"}
          {nc_minor > 0 ? "Minor – 30 Hari" : "—"}
          {nc_major > 0 ? " | Major – 30 Hari" : ""}
        </Text>

        {/* Signature */}
        <View style={[s.sigBlock, { marginTop: 32 }]}>
          <View style={s.sigBox}>
            <View style={s.sigLine} />
            <Text style={s.sigNama}>Lead Auditor Signature:</Text>
            <Text style={s.sigLabel}>Date: {tarikhAudit}</Text>
          </View>
          <View style={s.sigBox} />
        </View>

        <Text style={s.footer}>
          RISDA Plantation Sdn Bhd | {audit.no_rujukan} | Dijana: {new Date().toLocaleDateString("ms-MY")}
        </Text>
      </Page>

      {/* ===== HALAMAN 3: NCR/OFI TABLE ===== */}
      <Page size="A4" style={s.page}>
        <Text style={s.seksyenOrg}>RISDA PLANTATION SDN. BHD.</Text>
        <Text style={s.seksyenTajuk}>NON-CONFORMITY RECORD (NCR) {"&"} PELUANG PENAMBAHBAIKAN (OFI)</Text>

        <View style={s.tableWrap}>
          {/* Header */}
          <View style={s.thead}>
            <Text style={s.cNo}>No.</Text>
            <Text style={s.cStatus}>NCR Status</Text>
            <Text style={s.cJuruaudit}>Juruaudit</Text>
            <Text style={s.cKenyataan}>Kenyataan Ketidakpatuhan / OFI</Text>
            <Text style={s.cKlausa}>Klausa MSPO</Text>
            <Text style={s.cBukti}>Objective Evidence / Bukti</Text>
          </View>

          {/* Rows */}
          {allDapatan.map((d, i) => (
            <View key={d.id} style={s.tbody}>
              <Text style={s.cNoB}>{i + 1}</Text>
              <Text style={s.cStatusB}>
                {d.status === "NC"
                  ? `${d.gred_nc === "major" ? "Major" : "Minor"} NC`
                  : "OFI"}
              </Text>
              <Text style={s.cJuruauditB}>Tim Audit</Text>
              <Text style={s.cKenyataanB}>{d.catatan ?? "-"}</Text>
              <Text style={s.cKlausaB}>{d.item_semakan?.kod ?? "-"}</Text>
              <Text style={s.cBuktiB}>{d.bukti_audit ?? "-"}</Text>
            </View>
          ))}
        </View>

        <Text style={s.footer}>
          RISDA Plantation Sdn Bhd | {audit.no_rujukan} | Dijana: {new Date().toLocaleDateString("ms-MY")}
        </Text>
      </Page>

      {/* ===== HALAMAN 4: SIDE NOTES ===== */}
      <Page size="A4" style={s.page}>
        <Text style={s.seksyenOrg}>RISDA PLANTATION SDN. BHD.</Text>
        <Text style={s.seksyenTajuk}>SIDE NOTES / REMINDER</Text>

        <View style={s.tableWrap}>
          <View style={s.snThead}>
            <Text style={s.snNo}>No.</Text>
            <Text style={s.snMatter}>Matter(s)</Text>
            <Text style={s.snRemark}>Remark</Text>
            <Text style={s.snKlausa}>MSPO</Text>
          </View>
          {SIDE_NOTES.map((n, i) => (
            <View key={i} style={s.snTbody}>
              <Text style={s.snNoB}>{i + 1}</Text>
              <Text style={s.snMatterB}>{n.matter}</Text>
              <Text style={s.snRemarkB}>{n.remark}</Text>
              <Text style={s.snKlausaB}>{n.klausa}</Text>
            </View>
          ))}
        </View>

        <Text style={s.footer}>
          RISDA Plantation Sdn Bhd | {audit.no_rujukan} | Dijana: {new Date().toLocaleDateString("ms-MY")}
        </Text>
      </Page>
    </Document>
  );
}
