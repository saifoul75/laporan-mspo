// Jenis data untuk MSPO Audit (MS2530-2-2:2022 - 5 Prinsip)
// Berdasarkan SKILL v2.4 RPSB

export type RolPengguna = "admin" | "lead_auditor" | "auditor" | "po_user";

export type StatusAudit =
  | "draf"
  | "dijadual"
  | "sedang_dijalankan"
  | "menunggu_semakan"
  | "selesai"
  | "dibatalkan";

export type JenisAudit =
  | "audit_dalaman"
  | "audit_pensijilan"
  | "audit_pengawasan"
  | "audit_persijilan_semula";

// Status dapatan ikut SKILL: Y | N | NC | OFI | N/A | Pending
export type StatusDapatan = "Y" | "N" | "NC" | "OFI" | "NA" | "Pending";

// Gred NC: Major atau Minor
export type GredNC = "major" | "minor";

export type JenisKlausa = "major" | "minor"; // klasifikasi kriteria

export interface Pengguna {
  id: string;
  email: string;
  nama_penuh: string;
  no_telefon?: string | null;
  rol: RolPengguna;
  pusat_operasi_id?: string | null;
  dicipta_pada: string;
}

// Pusat Operasi (PO) - satu wilayah boleh ada banyak PO
export interface PusatOperasi {
  id: string;
  kod: string;          // contoh: "PO1", "WU1-PO1"
  nama: string;         // contoh: "Wilayah Utara 1"
  wilayah: string;      // Utara/Selatan/Tengah/Timur
  alamat?: string | null;
  daerah?: string | null;
  negeri?: string | null;
  keluasan_hektar?: number | null;
  latitud?: number | null;
  longitud?: number | null;
  dicipta_pada: string;
}

export interface Prinsip {
  id: string;
  nombor: number;        // 1..5
  kod: string;           // "P1".."P5"
  tajuk: string;
  fokus_utama?: string | null;
  bil_klausa?: number | null;
}

export interface Kriteria {
  id: string;
  prinsip_id: string;
  kod: string;           // "4.1.1", "4.1.2", ... "4.5.7"
  tajuk: string;
  penerangan?: string | null;
  susunan: number;
}

// Item semakan dalaman (74 item RPSB)
export interface ItemSemakan {
  id: string;
  kriteria_id: string;
  kod: string;           // contoh "4.1.1.1", "4.5.4.1"
  tajuk: string;
  bukti_wajib?: string | null;
  fail_rujukan?: number | null;   // 1..13
  seksyen_fail?: string | null;
  jenis_klausa: JenisKlausa;
  ofi_default?: boolean | null;   // true jika selalu OFI di RPSB
  catatan_default?: string | null;
  susunan: number;
}

// Fail Kulit Keras 1-13
export interface FailKulitKeras {
  id: string;
  nombor: number;        // 1..13
  nama: string;
  ringkasan?: string | null;
}

export interface SeksyenFail {
  id: string;
  fail_id: string;
  kod: string;           // "Seksyen 1", "Seksyen 2"
  nama: string;
  susunan: number;
}

export interface Audit {
  id: string;
  no_rujukan: string;
  pusat_operasi_id: string;
  lead_auditor_id: string;
  auditor_ids: string[];
  sesi_id?: string | null;
  tarikh_audit: string;
  tarikh_tamat?: string | null;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  jenis_audit: JenisAudit;
  status: StatusAudit;
  catatan?: string | null;
  tarikh_muktamad?: string | null;
  cap_due_date?: string | null;
  dicipta_pada: string;
  dikemaskini_pada: string;
}

export interface Dapatan {
  id: string;
  audit_id: string;
  item_semakan_id: string;
  status: StatusDapatan;
  gred_nc?: GredNC | null;
  catatan?: string | null;
  bukti_audit?: string | null;
  punca_akar?: string | null;        // 5 Whys / Fishbone
  cadangan_tindakan?: string | null;
  tarikh_siap_target?: string | null;
  pic?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  ketepatan_gps?: number | null;
  diaudit_oleh: string;
  dirakam_pada: string;
  dikemaskini_pada: string;
  // Sync
  sync_status?: "tempatan" | "menunggu" | "selesai" | "ralat";
}

// NC = Non-Conformity Report (CAR)
export interface NC {
  id: string;
  no_nc: string;                     // NC-001-2026
  audit_id: string;
  dapatan_id: string;
  klausa_kod: string;
  prinsip_kod: string;
  fail_rujukan?: number | null;
  rekod_terlibat?: string | null;
  dapatan: string;
  bukti?: string | null;
  punca_akar?: string | null;
  tindakan_pembetulan?: string | null;
  pic?: string | null;
  tarikh_siap?: string | null;
  status: "open" | "in_progress" | "closed" | "verified";
  gred: GredNC;
  dicipta_pada: string;
  dikemaskini_pada: string;
}

// OFI = Opportunity for Improvement
export interface OFI {
  id: string;
  no_ofi: string;                    // OFI-001-2026
  audit_id: string;
  dapatan_id: string;
  klausa_kod: string;
  fail_rujukan?: number | null;
  pemerhatian: string;
  cadangan?: string | null;
  pic?: string | null;
  status: "kiv_kuning" | "open" | "tutup";
  dicipta_pada: string;
  dikemaskini_pada: string;
}

export interface SesiAudit {
  id: string;
  nama_sesi: string;
  wilayah: string;
  tarikh_mula: string;
  tarikh_tamat: string;
  catatan?: string | null;
  dicipta_pada: string;
  dikemaskini_pada: string;
}

export interface Bukti {
  id: string;
  dapatan_id: string;
  jenis: "gambar" | "dokumen";
  url_storan: string;
  nama_fail: string;
  saiz_bait?: number | null;
  latitud?: number | null;
  longitud?: number | null;
  dimuat_naik_pada: string;
  // Offline
  blob_tempatan?: Blob;
  sync_status?: "tempatan" | "menunggu" | "selesai" | "ralat";
}

export interface Laporan {
  id: string;
  audit_id: string;
  url_pdf?: string | null;
  ringkasan_eksekutif?: string | null;
  jumlah_y: number;
  jumlah_n: number;
  jumlah_nc_major: number;
  jumlah_nc_minor: number;
  jumlah_ofi: number;
  jumlah_na: number;
  jumlah_pending: number;
  dijana_pada: string;
}
