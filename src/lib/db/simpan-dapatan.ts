// Helper: simpan dapatan secara offline-first.
// Strategy:
//   1. Tulis ke IndexedDB (Dexie) sebagai sumber kebenaran tempatan
//   2. Tambah ke barisan_sync untuk dihantar ke Supabase
//   3. Cetuskan sync (fire-and-forget) — kalau online, ia akan terus pergi
//   4. Pulangkan rekod tempatan supaya UI boleh kemaskini optimistik

import { db, antrikanSync, type DapatanTempatan } from "@/lib/db/dexie";
import { jalankanSync } from "@/lib/db/sync";
import type { Dapatan, StatusDapatan, GredNC } from "@/types";

export interface PayloadSimpanan {
  audit_id: string;
  item_semakan_id: string;
  status: StatusDapatan;
  gred_nc: GredNC | null;
  catatan: string | null;
  bukti_audit: string | null;
  punca_akar: string | null;
  cadangan_tindakan: string | null;
  pic: string | null;
  tarikh_siap_target: string | null;
  latitud: number | null;
  longitud: number | null;
  ketepatan_gps: number | null;
  diaudit_oleh: string;
}

/**
 * Simpan dapatan ke Dexie + queue. Pulangkan rekod yang disimpan
 * (dengan id sementara kalau baru).
 */
export async function simpanDapatanOffline(
  payload: PayloadSimpanan,
  idSediaAda?: string
): Promise<DapatanTempatan> {
  const sekarang = new Date().toISOString();
  const id = idSediaAda ?? jana_uuid();

  const rekod: DapatanTempatan = {
    id,
    audit_id: payload.audit_id,
    item_semakan_id: payload.item_semakan_id,
    status: payload.status,
    gred_nc: payload.gred_nc,
    catatan: payload.catatan,
    bukti_audit: payload.bukti_audit,
    punca_akar: payload.punca_akar,
    cadangan_tindakan: payload.cadangan_tindakan,
    pic: payload.pic,
    tarikh_siap_target: payload.tarikh_siap_target,
    latitud: payload.latitud,
    longitud: payload.longitud,
    ketepatan_gps: payload.ketepatan_gps,
    diaudit_oleh: payload.diaudit_oleh,
    dirakam_pada: sekarang,
    dikemaskini_pada: sekarang,
    sync_status: "menunggu",
    diubah_pada_tempatan: Date.now(),
  };

  await db.dapatan.put(rekod);

  // Payload untuk Supabase (tanpa id supaya server boleh assign kalau baru,
  // dan upsert akan match ikut composite (audit_id, item_semakan_id)).
  const payloadSupabase = {
    ...payload,
  };

  await antrikanSync("dapatan", id, idSediaAda ? "kemaskini" : "cipta", payloadSupabase);

  // Cuba sync sekarang (kalau offline, jalankanSync akan no-op)
  if (typeof navigator !== "undefined" && navigator.onLine) {
    void jalankanSync().catch(() => {});
  }

  return rekod;
}

function jana_uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback ringkas
  return "tmp-" + Math.random().toString(36).slice(2) + "-" + Date.now();
}

/**
 * Tukarkan rekod tempatan ke jenis Dapatan untuk konsumsi UI.
 */
export function keDapatan(t: DapatanTempatan): Partial<Dapatan> {
  return {
    id: t.id,
    audit_id: t.audit_id,
    item_semakan_id: t.item_semakan_id,
    status: t.status,
    gred_nc: t.gred_nc ?? null,
    catatan: t.catatan ?? null,
    bukti_audit: t.bukti_audit ?? null,
    punca_akar: t.punca_akar ?? null,
    cadangan_tindakan: t.cadangan_tindakan ?? null,
    pic: t.pic ?? null,
    tarikh_siap_target: t.tarikh_siap_target ?? null,
    latitud: t.latitud ?? null,
    longitud: t.longitud ?? null,
    ketepatan_gps: t.ketepatan_gps ?? null,
    diaudit_oleh: t.diaudit_oleh,
    dirakam_pada: t.dirakam_pada,
    dikemaskini_pada: t.dikemaskini_pada,
    sync_status: t.sync_status,
  };
}
