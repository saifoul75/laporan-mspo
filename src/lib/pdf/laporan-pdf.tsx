import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import React from "react";

// Matikan auto-hyphenation — elak perkataan terpotong salah (contoh: "disedi-akan")
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1f2937",
  },
  header: {
    borderBottom: "2 solid #1f7a45",
    paddingBottom: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f7a45",
  },
  subtitle: {
    fontSize: 10,
    color: "#6b7280",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 12,
    marginBottom: 6,
    color: "#1f7a45",
  },
  row: { flexDirection: "row", marginBottom: 4 },
  label: { width: 110, color: "#6b7280" },
  value: { flex: 1 },
  table: {
    marginTop: 6,
    borderTop: "1 solid #d1d5db",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottom: "1 solid #d1d5db",
    fontWeight: "bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottom: "1 solid #e5e7eb",
  },
  cellKlausa: { width: 50, fontSize: 9 },
  cellTajuk: { flex: 3, fontSize: 9 },
  cellFail: { width: 40, fontSize: 9 },
  cellStatus: { width: 45, fontSize: 9, fontWeight: "bold" },
  cellCatatan: { flex: 2, fontSize: 9 },
  ringkasan: {
    flexDirection: "row",
    marginTop: 6,
    flexWrap: "wrap",
    gap: 8,
  },
  kotakStat: {
    border: "1 solid #d1d5db",
    borderRadius: 4,
    padding: 6,
    width: "30%",
    marginRight: 6,
    marginBottom: 6,
  },
  statLabel: { fontSize: 9, color: "#6b7280" },
  statNilai: { fontSize: 16, fontWeight: "bold", marginTop: 2 },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 32,
    right: 32,
    textAlign: "center",
    fontSize: 8,
    color: "#9ca3af",
  },
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
  cadangan_tindakan: string | null;
  item_semakan: {
    kod: string;
    tajuk: string;
    fail_rujukan: number | null;
  } | null;
};

interface LaporanPDFProps {
  audit: AuditPDF;
  dapatan: DapatanPDF[];
}

function formatTarikh(d: string | null | undefined) {
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
  audit_persijilan_semula: "Audit Persijilan Semula",
};

const LABEL_STATUS: Record<string, string> = {
  draf: "Draf",
  dijadual: "Dijadual",
  sedang_dijalankan: "Sedang Dijalankan",
  menunggu_semakan: "Menunggu Semakan",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

function labelJenis(val: string) {
  return LABEL_JENIS[val] ?? val;
}

function labelStatus(val: string) {
  return LABEL_STATUS[val] ?? val;
}

export function LaporanPDF({ audit, dapatan }: LaporanPDFProps) {
  const stats = { Y: 0, N: 0, NC: 0, OFI: 0, NA: 0, Pending: 0 } as Record<
    string,
    number
  >;
  let nc_major = 0,
    nc_minor = 0;
  for (const d of dapatan) {
    stats[d.status as string] = (stats[d.status as string] ?? 0) + 1;
    if (d.status === "NC") {
      if (d.gred_nc === "major") nc_major++;
      else if (d.gred_nc === "minor") nc_minor++;
    }
  }

  const ncList = dapatan.filter((d) => d.status === "NC");
  const ofiList = dapatan.filter((d) => d.status === "OFI");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>LAPORAN AUDIT MSPO</Text>
          <Text style={styles.subtitle}>
            Standard MS2530-2-2:2022 | RISDA Plantation Sdn Bhd
          </Text>
        </View>

        {/* Maklumat Audit */}
        <Text style={styles.sectionTitle}>Maklumat Audit</Text>
        <View style={styles.row}>
          <Text style={styles.label}>No. Rujukan</Text>
          <Text style={styles.value}>{audit.no_rujukan}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Pusat Operasi</Text>
          <Text style={styles.value}>
            {audit.pusat_operasi?.kod} - {audit.pusat_operasi?.nama}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Wilayah</Text>
          <Text style={styles.value}>{audit.pusat_operasi?.wilayah ?? "-"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Tarikh Audit</Text>
          <Text style={styles.value}>{formatTarikh(audit.tarikh_audit)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Jenis Audit</Text>
          <Text style={styles.value}>{labelJenis(audit.jenis_audit)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.value}>{labelStatus(audit.status)}</Text>
        </View>

        {/* Ringkasan */}
        <Text style={styles.sectionTitle}>Ringkasan Eksekutif</Text>
        <View style={styles.ringkasan}>
          {(["Y", "N", "NC", "OFI", "NA", "Pending"] as const).map((s) => (
            <View key={s} style={styles.kotakStat}>
              <Text style={styles.statLabel}>{s}</Text>
              <Text style={styles.statNilai}>{stats[s] ?? 0}</Text>
            </View>
          ))}
          <View style={styles.kotakStat}>
            <Text style={styles.statLabel}>NC Major</Text>
            <Text style={styles.statNilai}>{nc_major}</Text>
          </View>
          <View style={styles.kotakStat}>
            <Text style={styles.statLabel}>NC Minor</Text>
            <Text style={styles.statNilai}>{nc_minor}</Text>
          </View>
        </View>

        {/* Senarai NC */}
        {ncList.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              Non-Conformity ({ncList.length})
            </Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.cellKlausa}>Klausa</Text>
                <Text style={styles.cellTajuk}>Item</Text>
                <Text style={styles.cellFail}>Fail</Text>
                <Text style={styles.cellStatus}>Gred</Text>
                <Text style={styles.cellCatatan}>Catatan</Text>
              </View>
              {ncList.map((r) => (
                <View key={r.id} style={styles.tableRow}>
                  <Text style={styles.cellKlausa}>{r.item_semakan?.kod}</Text>
                  <Text style={styles.cellTajuk}>{r.item_semakan?.tajuk}</Text>
                  <Text style={styles.cellFail}>
                    {r.item_semakan?.fail_rujukan
                      ? `Fail ${r.item_semakan.fail_rujukan}`
                      : "-"}
                  </Text>
                  <Text style={styles.cellStatus}>{r.gred_nc ?? "-"}</Text>
                  <Text style={styles.cellCatatan}>{r.catatan ?? "-"}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Senarai OFI */}
        {ofiList.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              Opportunity for Improvement ({ofiList.length})
            </Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.cellKlausa}>Klausa</Text>
                <Text style={styles.cellTajuk}>Item</Text>
                <Text style={styles.cellFail}>Fail</Text>
                <Text style={styles.cellCatatan}>Catatan / Cadangan</Text>
              </View>
              {ofiList.map((r) => (
                <View key={r.id} style={styles.tableRow}>
                  <Text style={styles.cellKlausa}>{r.item_semakan?.kod}</Text>
                  <Text style={styles.cellTajuk}>{r.item_semakan?.tajuk}</Text>
                  <Text style={styles.cellFail}>
                    {r.item_semakan?.fail_rujukan
                      ? `Fail ${r.item_semakan.fail_rujukan}`
                      : "-"}
                  </Text>
                  <Text style={styles.cellCatatan}>
                    {r.catatan ?? r.cadangan_tindakan ?? "-"}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={styles.footer}>
          Dijana oleh Sistem MSPO Audit | {new Date().toLocaleString("ms-MY")}
        </Text>
      </Page>
    </Document>
  );
}
