"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Butang } from "@/components/ui/butang";
import { seedSesiAudit } from "@/app/(dashboard)/audit/actions";

export function ButangSeedSesi() {
  const router = useRouter();
  const [memuat, setMemuat] = useState(false);
  const [mesej, setMesej] = useState<{ jenis: "ok" | "ralat"; teks: string } | null>(null);

  async function klikSeed() {
    setMemuat(true);
    setMesej(null);
    const hasil = (await seedSesiAudit()) as
      | { ok: true; count: number }
      | { ok: false; ralat: string };
    if (hasil.ok) {
      setMesej({ jenis: "ok", teks: `${hasil.count} sesi 2026 berjaya dimasukkan.` });
      router.refresh();
    } else {
      setMesej({ jenis: "ralat", teks: hasil.ralat });
    }
    setMemuat(false);
  }

  return (
    <div className="flex items-center gap-2">
      <Butang
        variant="secondary"
        size="sm"
        onClick={klikSeed}
        disabled={memuat}
      >
        {memuat ? "Sedang isi..." : "🌱 Seed Sesi 2026"}
      </Butang>
      {mesej && (
        <span
          className={`text-xs ${mesej.jenis === "ok" ? "text-emerald-700" : "text-destructive"}`}
        >
          {mesej.teks}
        </span>
      )}
    </div>
  );
}
