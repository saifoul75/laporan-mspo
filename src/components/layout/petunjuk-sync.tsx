"use client";

import { useSyncQueue } from "@/lib/hooks/useSyncQueue";
import { Butang } from "@/components/ui/butang";
import { cn } from "@/lib/utils";

/**
 * Indikator status sync untuk topbar.
 * Tunjuk: online/offline + bilangan baki + butang force-sync.
 */
export function PetunjukSync() {
  const { online, status, baki, gagal, cubaSync } = useSyncQueue();

  const labelStatus = !online
    ? "Luar Talian"
    : status === "menyelaras"
    ? "Menyelaras..."
    : baki > 0
    ? `${baki} menunggu`
    : gagal > 0
    ? `${gagal} gagal`
    : "Tersegerak";

  const warna = !online
    ? "bg-amber-500"
    : status === "menyelaras"
    ? "bg-blue-500 animate-pulse"
    : baki > 0
    ? "bg-amber-500"
    : gagal > 0
    ? "bg-red-500"
    : "bg-emerald-500";

  const adaTindakan = online && (baki > 0 || gagal > 0);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs">
        <span className={cn("h-2 w-2 rounded-full", warna)} />
        <span className="hidden text-muted-foreground sm:inline">
          {labelStatus}
        </span>
      </div>
      {adaTindakan && (
        <Butang
          type="button"
          variant="outline"
          size="sm"
          onClick={cubaSync}
          disabled={status === "menyelaras"}
          className="h-7 text-xs"
        >
          Sync
        </Butang>
      )}
    </div>
  );
}
