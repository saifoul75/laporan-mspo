// Dexie (IndexedDB) untuk offline-first audit
// Auditor boleh isi checklist tanpa internet, kemudian sync bila online.

import Dexie, { type Table } from "dexie";
import type {
  Audit,
  Dapatan,
  Bukti,
  PusatOperasi,
  Prinsip,
  Kriteria,
  ItemSemakan,
} from "@/types";

export type StatusSync = "tempatan" | "menunggu" | "selesai" | "ralat";

export interface DapatanTempatan extends Dapatan {
  sync_status: StatusSync;
  ralat_sync?: string;
  diubah_pada_tempatan: number; // epoch ms
}

export interface BuktiTempatan extends Bukti {
  sync_status: StatusSync;
  ralat_sync?: string;
  blob_tempatan?: Blob;
  diubah_pada_tempatan: number;
}

export interface AuditTempatan extends Audit {
  sync_status: StatusSync;
  diubah_pada_tempatan: number;
}

export interface BarisanSync {
  id?: number;
  jenis: "audit" | "dapatan" | "bukti";
  rekod_id: string;
  operasi: "cipta" | "kemaskini" | "padam";
  payload: unknown;
  cubaan: number;
  ralat_terakhir?: string;
  dicipta_pada: number;
}

class PangkalanDataMSPO extends Dexie {
  prinsip!: Table<Prinsip, string>;
  kriteria!: Table<Kriteria, string>;
  item_semakan!: Table<ItemSemakan, string>;
  pusat_operasi!: Table<PusatOperasi, string>;
  audit!: Table<AuditTempatan, string>;
  dapatan!: Table<DapatanTempatan, string>;
  bukti!: Table<BuktiTempatan, string>;
  barisan_sync!: Table<BarisanSync, number>;

  constructor() {
    super("mspo_audit_db");

    this.version(1).stores({
      prinsip: "id, nombor, kod",
      kriteria: "id, prinsip_id, kod, susunan",
      item_semakan: "id, kriteria_id, kod, susunan",
      pusat_operasi: "id, kod, wilayah",
      audit: "id, no_rujukan, pusat_operasi_id, status, sync_status, tarikh_audit",
      dapatan:
        "id, audit_id, item_semakan_id, [audit_id+item_semakan_id], status, sync_status",
      bukti: "id, dapatan_id, sync_status",
      barisan_sync: "++id, jenis, rekod_id, dicipta_pada",
    });

    // v2: Tambah index `cubaan` pada barisan_sync supaya
    // jalankanSync(), kiraBaki(), kiraGagal() boleh query ikut cubaan.
    // Tanpa index ini, semua sync operations akan throw SchemaError.
    this.version(2).stores({
      barisan_sync: "++id, jenis, rekod_id, dicipta_pada, cubaan",
    });
  }
}

export const db = new PangkalanDataMSPO();

// Helper: tambah ke barisan sync
export async function antrikanSync(
  jenis: BarisanSync["jenis"],
  rekod_id: string,
  operasi: BarisanSync["operasi"],
  payload: unknown
) {
  await db.barisan_sync.add({
    jenis,
    rekod_id,
    operasi,
    payload,
    cubaan: 0,
    dicipta_pada: Date.now(),
  });
}

// Helper: kira progress audit (offline)
export async function kiraProgresAudit(audit_id: string) {
  const [jumlahItem, dapatanList] = await Promise.all([
    db.item_semakan.count(),
    db.dapatan.where({ audit_id }).toArray(),
  ]);

  const dijawab = dapatanList.filter((d) => d.status !== "Pending").length;
  const peratus = jumlahItem > 0 ? (dijawab / jumlahItem) * 100 : 0;

  return {
    jumlah_item: jumlahItem,
    dijawab,
    peratus: Math.round(peratus),
    y: dapatanList.filter((d) => d.status === "Y").length,
    n: dapatanList.filter((d) => d.status === "N").length,
    nc: dapatanList.filter((d) => d.status === "NC").length,
    ofi: dapatanList.filter((d) => d.status === "OFI").length,
    na: dapatanList.filter((d) => d.status === "NA").length,
    pending: dapatanList.filter((d) => d.status === "Pending").length,
  };
}
