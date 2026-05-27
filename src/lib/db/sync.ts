// Sync engine: proses barisan_sync dari Dexie ke Supabase.
// Strategy: dapatan upsert via (audit_id, item_semakan_id), dengan retry exponential backoff.

import { createClient } from "@/lib/supabase/client";
import { db, type BarisanSync, type DapatanTempatan } from "@/lib/db/dexie";

type DapatanTempatanInput = DapatanTempatan;

const HAD_CUBAAN = 5;

export type HasilSync = {
  jumlah: number;
  berjaya: number;
  gagal: number;
  ralat: { rekod_id: string; mesej: string }[];
};

let sedangBerjalan = false;

/**
 * Proses semua item dalam barisan_sync.
 * Selamat untuk dipanggil banyak kali — guard `sedangBerjalan`.
 */
export async function jalankanSync(): Promise<HasilSync> {
  if (sedangBerjalan) {
    return { jumlah: 0, berjaya: 0, gagal: 0, ralat: [] };
  }
  sedangBerjalan = true;

  const hasil: HasilSync = { jumlah: 0, berjaya: 0, gagal: 0, ralat: [] };

  try {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return hasil;
    }

    const supabase = createClient();
    // Ambil yang belum cukup cubaan
    const senarai = await db.barisan_sync
      .where("cubaan")
      .below(HAD_CUBAAN)
      .sortBy("dicipta_pada");

    hasil.jumlah = senarai.length;

    for (const item of senarai) {
      try {
        await prosesSatu(supabase, item);
        if (item.id !== undefined) {
          await db.barisan_sync.delete(item.id);
        }
        hasil.berjaya++;
      } catch (e) {
        const mesej = e instanceof Error ? e.message : String(e);
        hasil.gagal++;
        hasil.ralat.push({ rekod_id: item.rekod_id, mesej });
        if (item.id !== undefined) {
          await db.barisan_sync.update(item.id, {
            cubaan: item.cubaan + 1,
            ralat_terakhir: mesej,
          });
        }
        // Tandakan rekod tempatan sebagai ralat
        if (item.jenis === "dapatan") {
          await db.dapatan
            .update(item.rekod_id, {
              sync_status: "ralat",
              ralat_sync: mesej,
            })
            .catch(() => {});
        }
      }
    }
  } finally {
    sedangBerjalan = false;
  }

  return hasil;
}

async function prosesSatu(
  supabase: ReturnType<typeof createClient>,
  item: BarisanSync
) {
  if (item.jenis === "dapatan") {
    if (item.operasi === "padam") {
      const { error } = await supabase
        .from("dapatan")
        .delete()
        .eq("id", item.rekod_id);
      if (error) throw new Error(error.message);
    } else {
      const { data, error } = await supabase
        .from("dapatan")
        .upsert(item.payload as object, {
          onConflict: "audit_id,item_semakan_id",
        })
        .select()
        .single();
      if (error) throw new Error(error.message);

      // Update rekod tempatan dengan id sebenar dari server (kalau berbeza)
      // dan tandakan selesai
      if (data && typeof data === "object" && "id" in data) {
        const rekodServer = data as Record<string, unknown> & { id: string };
        const idServer = rekodServer.id;
        // Padam rekod tempatan dengan id sementara, ganti dengan id server
        if (idServer !== item.rekod_id) {
          await db.dapatan.delete(item.rekod_id).catch(() => {});
        }
        await db.dapatan.put({
          ...(rekodServer as unknown as DapatanTempatanInput),
          sync_status: "selesai",
          diubah_pada_tempatan: Date.now(),
        });
      } else {
        await db.dapatan
          .update(item.rekod_id, { sync_status: "selesai" })
          .catch(() => {});
      }
    }
    return;
  }

  if (item.jenis === "audit") {
    // Tidak digunakan buat masa ini — audit dicipta secara online sahaja.
    throw new Error("Sync untuk audit belum disokong");
  }

  if (item.jenis === "bukti") {
    // Bukti perlu upload ke Storage; belum implement upload offline blob.
    throw new Error("Sync untuk bukti belum disokong");
  }
}

/**
 * Kira bilangan item dalam barisan sync (yang belum lebihi had cubaan).
 */
export async function kiraBaki(): Promise<number> {
  return db.barisan_sync.where("cubaan").below(HAD_CUBAAN).count();
}

/**
 * Kira item yang telah gagal melebihi had cubaan (perlu intervensi manual).
 */
export async function kiraGagal(): Promise<number> {
  return db.barisan_sync.where("cubaan").aboveOrEqual(HAD_CUBAAN).count();
}
