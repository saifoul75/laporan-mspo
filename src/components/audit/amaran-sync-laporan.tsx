"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/db/dexie";
import { jalankanSync } from "@/lib/db/sync";
import { useOnline } from "@/lib/hooks/useOnline";
import { Butang } from "@/components/ui/butang";

interface KiraanLokal {
  jumlah: number;
  belum_sync: number;
  ralat: number;
}

/**
 * Pantau Dexie untuk audit semasa: kalau ada dapatan dengan
 * sync_status !== "selesai", paparkan amaran supaya auditor tahu
 * laporan tidak lengkap sehingga sync berjaya.
 */
export function AmaranSyncLaporan({ auditId }: { auditId: string }) {
  const online = useOnline();
  const [kiraan, setKiraan] = useState<KiraanLokal | null>(null);
  const [sedangSync, setSedangSync] = useState(false);

  useEffect(() => {
    let dibatalkan = false;
    async function muat() {
      try {
        const senarai = await db.dapatan.where({ audit_id: auditId }).toArray();
        if (dibatalkan) return;
        const belum = senarai.filter(
          (d) => d.sync_status && d.sync_status !== "selesai"
        ).length;
        const ralat = senarai.filter((d) => d.sync_status === "ralat").length;
        setKiraan({ jumlah: senarai.length, belum_sync: belum, ralat });
      } catch {
        // Dexie tak ready (contoh: SSR atau private mode) — abaikan
      }
    }
    muat();
    const t = setInterval(muat, 5_000);
    return () => {
      dibatalkan = true;
      clearInterval(t);
    };
  }, [auditId]);

  async function paksaSync() {
    if (!online || sedangSync) return;
    setSedangSync(true);
    try {
      await jalankanSync();
    } finally {
      setSedangSync(false);
    }
  }

  if (!kiraan || kiraan.belum_sync === 0) return null;

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-semibold">
            {kiraan.belum_sync} dapatan belum di-sync ke pelayan
          </div>
          <div className="mt-1 text-xs">
            Laporan ini hanya papar data dari pelayan. Dapatan yang masih dalam
            peranti (offline) tidak akan muncul sehingga sync berjaya.
            {kiraan.ralat > 0 && (
              <>
                {" "}
                <span className="font-semibold text-red-700">
                  {kiraan.ralat} rekod gagal sync
                </span>{" "}
                — sila semak peranan pengguna atau RLS.
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2 print:hidden">
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
