"use client";

import { useCallback, useEffect, useState } from "react";
import { useOnline } from "@/lib/hooks/useOnline";
import { jalankanSync, kiraBaki, kiraGagal, type HasilSync } from "@/lib/db/sync";

export type StatusSyncSemasa = "idle" | "menyelaras" | "ralat";

export interface KeadaanSync {
  online: boolean;
  status: StatusSyncSemasa;
  baki: number;
  gagal: number;
  hasilTerakhir: HasilSync | null;
  cubaSync: () => Promise<void>;
  segarkan: () => Promise<void>;
}

/**
 * Hook untuk pantau & cetuskan sync queue.
 * - Auto-jalankan bila online & ada baki
 * - Polling setiap 15s untuk update bilangan baki
 */
export function useSyncQueue(): KeadaanSync {
  const online = useOnline();
  const [status, setStatus] = useState<StatusSyncSemasa>("idle");
  const [baki, setBaki] = useState(0);
  const [gagal, setGagal] = useState(0);
  const [hasilTerakhir, setHasilTerakhir] = useState<HasilSync | null>(null);

  const segarkan = useCallback(async () => {
    try {
      const [b, g] = await Promise.all([kiraBaki(), kiraGagal()]);
      setBaki(b);
      setGagal(g);
    } catch {
      // Dexie mungkin tak ready
    }
  }, []);

  const cubaSync = useCallback(async () => {
    if (!online) return;
    setStatus("menyelaras");
    try {
      const hasil = await jalankanSync();
      setHasilTerakhir(hasil);
      setStatus(hasil.gagal > 0 ? "ralat" : "idle");
    } catch {
      setStatus("ralat");
    } finally {
      await segarkan();
    }
  }, [online, segarkan]);

  // Auto-segar bila mount + bila online berubah
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    segarkan().catch(() => {});
  }, [segarkan]);

  // Auto-trigger sync bila online & ada baki
  useEffect(() => {
    if (online && baki > 0 && status === "idle") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      cubaSync().catch(() => {});
    }
  }, [online, baki, status, cubaSync]);

  // Polling setiap 15 saat
  useEffect(() => {
    const t = setInterval(segarkan, 15_000);
    return () => clearInterval(t);
  }, [segarkan]);

  return {
    online,
    status,
    baki,
    gagal,
    hasilTerakhir,
    cubaSync,
    segarkan,
  };
}
