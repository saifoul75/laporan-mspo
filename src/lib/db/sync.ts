import { createClient } from "@/lib/supabase/client";
import { db, type BarisanSync, type DapatanTempatan } from "@/lib/db/dexie";

type DapatanTempatanInput = DapatanTempatan;

const HAD_CUBAAN = 5;
const MAX_QUEUE_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_QUEUE_SIZE = 500;

export type HasilSync = {
  jumlah: number;
  berjaya: number;
  gagal: number;
  ralat: { rekod_id: string; mesej: string }[];
};

let sedangBerjalan = false;

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

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return hasil;
    }

    const countQueue = await db.barisan_sync.count();
    if (countQueue > MAX_QUEUE_SIZE) {
      const toDelete = countQueue - MAX_QUEUE_SIZE;
      const oldest = await db.barisan_sync.orderBy("dicipta_pada").limit(toDelete).toArray();
      for (const item of oldest) {
        if (item.id !== undefined) await db.barisan_sync.delete(item.id);
      }
    }

    const now = Date.now();
    await db.barisan_sync
      .where("dicipta_pada")
      .below(now - MAX_QUEUE_AGE_MS)
      .delete();

    const senarai = await db.barisan_sync
      .where("cubaan")
      .below(HAD_CUBAAN)
      .sortBy("dicipta_pada");

    hasil.jumlah = senarai.length;

    for (const item of senarai) {
      try {
        await prosesSatu(supabase, item, user.id);
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
  item: BarisanSync,
  userId: string
) {
  if (item.jenis === "dapatan") {
    if (item.operasi === "padam") {
      const { error } = await supabase
        .from("dapatan")
        .delete()
        .eq("id", item.rekod_id);
      if (error) throw new Error(error.message);
    } else {
      const rawPayload = item.payload as Record<string, unknown>;
      const safePayload = {
        audit_id: rawPayload.audit_id,
        item_semakan_id: rawPayload.item_semakan_id,
        status: rawPayload.status,
        gred_nc: rawPayload.gred_nc,
        catatan: rawPayload.catatan,
        bukti_audit: rawPayload.bukti_audit,
        punca_akar: rawPayload.punca_akar,
        cadangan_tindakan: rawPayload.cadangan_tindakan,
        pic: rawPayload.pic,
        tarikh_siap_target: rawPayload.tarikh_siap_target,
        latitud: rawPayload.latitud,
        longitud: rawPayload.longitud,
        ketepatan_gps: rawPayload.ketepatan_gps,
        diaudit_oleh: userId,
      };

      const { data, error } = await supabase
        .from("dapatan")
        .upsert(safePayload as object, {
          onConflict: "audit_id,item_semakan_id",
        })
        .select()
        .single();
      if (error) throw new Error(error.message);

      if (data && typeof data === "object" && "id" in data) {
        const rekodServer = data as Record<string, unknown> & { id: string };
        const idServer = rekodServer.id;
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
    return;
  }

  if (item.jenis === "bukti") {
    return;
  }
}

export async function kiraBaki(): Promise<number> {
  return db.barisan_sync.where("cubaan").below(HAD_CUBAAN).count();
}

export async function kiraGagal(): Promise<number> {
  return db.barisan_sync.where("cubaan").aboveOrEqual(HAD_CUBAAN).count();
}
