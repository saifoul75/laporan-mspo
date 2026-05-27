"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { db, antrikanSync } from "@/lib/db/dexie";
import { jalankanSync, type HasilSync } from "@/lib/db/sync";
import { useOnline } from "@/lib/hooks/useOnline";
import { Butang } from "@/components/ui/butang";

interface KiraanLokal {
  jumlah: number;
  belum_sync: number;
  ralat: number;
  ralat_terakhir: string | null;
}

/**
 * Pantau Dexie untuk audit semasa: kalau ada dapatan dengan
 * sync_status !== "selesai", paparkan amaran supaya auditor tahu
 * laporan tidak lengkap sehingga sync berjaya.
 */
export function AmaranSyncLaporan({ auditId }: { auditId: string }) {
  const online = useOnline();
  const masihMount = useRef(true);
  const [kiraan, setKiraan] = useState<KiraanLokal | null>(null);
  const [sedangSync, setSedangSync] = useState(false);
  const [hasilTerakhir, setHasilTerakhir] = useState<HasilSync | null>(null);
  const [mesejPulih, setMesejPulih] = useState<string | null>(null);

  // Track mount state supaya setKiraan tidak dipanggil selepas unmount
  useEffect(() => {
    masihMount.current = true;
    return () => { masihMount.current = false; };
  }, []);

  async function muatKiraan() {
    try {
      const senarai = await db.dapatan.where({ audit_id: auditId }).toArray();
      const belum = senarai.filter(
        (d) => d.sync_status && d.sync_status !== "selesai"
      );
      const ralat = belum.filter((d) => d.sync_status === "ralat");
      const ralatPertama = ralat.find((d) => d.ralat_sync)?.ralat_sync ?? null;
      if (!masihMount.current) return;
      setKiraan({
        jumlah: senarai.length,
        belum_sync: belum.length,
        ralat: ralat.length,
        ralat_terakhir: ralatPertama,
      });
    } catch {
      // Dexie tak ready (SSR / private mode) — abaikan
    }
  }

  useEffect(() => {
    muatKiraan();
    const t = setInterval(muatKiraan, 5_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditId]);

  async function paksaSync() {
    console.log("[AmaranSync] paksaSync clicked", { online, sedangSync });
    if (!online || sedangSync) {
      console.log("[AmaranSync] Skipped - online:", online, "sedangSync:", sedangSync);
      return;
    }
    setSedangSync(true);
    setHasilTerakhir(null);
    setMesejPulih(null);
    try {
      console.log("[AmaranSync] Calling jalankanSync()...");
      const hasil = await jalankanSync();
      console.log("[AmaranSync] Hasil:", hasil);
      setHasilTerakhir(hasil);
      // Kalau queue kosong tapi Dexie masih ada rekod belum_sync,
      // beri petunjuk eksplisit kepada pengguna
      if (hasil.jumlah === 0 && kiraan && kiraan.belum_sync > 0) {
        setMesejPulih(
          "Queue kosong tetapi rekod tempatan masih bertanda belum sync. Klik 'Pulihkan & Sync' untuk re-queue."
        );
      }
    } catch (e) {
      console.error("[AmaranSync] Ralat sync:", e);
      const mesej = e instanceof Error ? e.message : String(e);
      setHasilTerakhir({
        jumlah: 0,
        berjaya: 0,
        gagal: 1,
        ralat: [{ rekod_id: "(unknown)", mesej }],
      });
    } finally {
      setSedangSync(false);
      await muatKiraan();
    }
  }

  /**
   * Pulih rekod orphan: rekod Dexie yang sync_status != "selesai"
   * tetapi tiada entry dalam barisan_sync (atau cubaan dah lebihi had).
   * Re-queue supaya jalankanSync() boleh proses semula.
   */
  async function pulihkanOrphan() {
    if (sedangSync) return;
    setSedangSync(true);
    setHasilTerakhir(null);
    try {
      const senarai = await db.dapatan
        .where({ audit_id: auditId })
        .toArray();
      const belum = senarai.filter(
        (d) => d.sync_status && d.sync_status !== "selesai"
      );

      let bilangan = 0;
      for (const d of belum) {
        // Padam entry queue lama (kalau ada) supaya cubaan reset
        const lama = await db.barisan_sync
          .where({ rekod_id: d.id })
          .toArray();
        for (const q of lama) {
          if (q.id !== undefined) await db.barisan_sync.delete(q.id);
        }

        // Bina semula payload bersih untuk Supabase
        const payload = {
          audit_id: d.audit_id,
          item_semakan_id: d.item_semakan_id,
          status: d.status,
          gred_nc: d.gred_nc ?? null,
          catatan: d.catatan ?? null,
          bukti_audit: d.bukti_audit ?? null,
          punca_akar: d.punca_akar ?? null,
          cadangan_tindakan: d.cadangan_tindakan ?? null,
          tarikh_siap_target: d.tarikh_siap_target ?? null,
          pic: d.pic ?? null,
          latitud: d.latitud ?? null,
          longitud: d.longitud ?? null,
          ketepatan_gps: d.ketepatan_gps ?? null,
          diaudit_oleh: d.diaudit_oleh,
        };
        await antrikanSync("dapatan", d.id, "kemaskini", payload);
        await db.dapatan.update(d.id, {
          sync_status: "menunggu",
          ralat_sync: null,
        });
        bilangan++;
      }

      setMesejPulih(`${bilangan} rekod di-queue semula. Cuba sync sekarang.`);

      // Auto-trigger sync selepas re-queue
      if (online && bilangan > 0) {
        const hasil = await jalankanSync();
        setHasilTerakhir(hasil);
      }
    } finally {
      setSedangSync(false);
      await muatKiraan();
    }
  }

  if (!kiraan || kiraan.belum_sync === 0) return null;

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex-1">
          <div className="font-semibold">
            {kiraan.belum_sync} dapatan belum di-sync ke pelayan
          </div>
          <div className="mt-1 text-xs">
            Laporan ini hanya papar data dari pelayan. Dapatan yang masih dalam
            peranti (offline) tidak akan muncul sehingga sync berjaya.
          </div>

          {kiraan.ralat > 0 && (
            <div className="mt-2 rounded border border-red-300 bg-red-50 p-2 text-xs text-red-900">
              <div className="font-semibold">
                {kiraan.ralat} rekod gagal sync
              </div>
              {kiraan.ralat_terakhir && (
                <div className="mt-1 break-all font-mono text-[11px]">
                  Ralat: {kiraan.ralat_terakhir}
                </div>
              )}
            </div>
          )}

          {hasilTerakhir && (
            <div
              className={`mt-2 rounded border p-2 text-xs ${
                hasilTerakhir.gagal > 0
                  ? "border-red-300 bg-red-50 text-red-900"
                  : "border-emerald-300 bg-emerald-50 text-emerald-900"
              }`}
            >
              <div className="font-semibold">
                Hasil sync: {hasilTerakhir.berjaya} berjaya, {hasilTerakhir.gagal}{" "}
                gagal (jumlah: {hasilTerakhir.jumlah})
              </div>
              {hasilTerakhir.ralat.length > 0 && (
                <ul className="ml-4 mt-1 list-disc">
                  {hasilTerakhir.ralat.slice(0, 3).map((r, i) => (
                    <li key={i} className="break-all font-mono text-[11px]">
                      {r.mesej}
                    </li>
                  ))}
                  {hasilTerakhir.ralat.length > 3 && (
                    <li>+{hasilTerakhir.ralat.length - 3} lagi...</li>
                  )}
                </ul>
              )}
            </div>
          )}

          {mesejPulih && (
            <div className="mt-2 rounded border border-blue-300 bg-blue-50 p-2 text-xs text-blue-900">
              {mesejPulih}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 print:hidden">
          {online ? (
            <Butang
              type="button"
              variant="outline"
              size="sm"
              onClick={paksaSync}
              disabled={sedangSync}
            >
              {sedangSync ? "Menyelaras..." : "Sync Sekarang"}
            </Butang>
          ) : (
            <span className="text-xs">Luar talian</span>
          )}
          {online && kiraan.belum_sync > 0 && (
            <Butang
              type="button"
              variant="outline"
              size="sm"
              onClick={pulihkanOrphan}
              disabled={sedangSync}
              title="Re-queue rekod kalau Sync Sekarang tidak berkesan"
            >
              Pulihkan & Sync
            </Butang>
          )}
          <Link href={`/audit/${auditId}/checklist`}>
            <Butang type="button" variant="outline" size="sm">
              Buka Checklist
            </Butang>
          </Link>
        </div>
      </div>
    </div>
  );
}
