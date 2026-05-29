"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Butang } from "@/components/ui/butang";
import { stressTestSelatan2 } from "@/app/(dashboard)/audit/actions";

export function ButangStressTest() {
  const router = useRouter();
  const [memuat, setMemuat] = useState(false);
  const [mesej, setMesej] = useState<{ jenis: "ok" | "ralat"; teks: string } | null>(null);

  async function klikTest() {
    setMemuat(true);
    setMesej(null);
    const hasil = (await stressTestSelatan2()) as
      | { ok: true; auditId: string; noRujukan: string; po: string; bilNc: number; bilOfi: number }
      | { ok: false; ralat: string };
    if (hasil.ok) {
      setMesej({
        jenis: "ok",
        teks: `Audit: ${hasil.noRujukan} | ${hasil.po} | ${hasil.bilNc} NC + ${hasil.bilOfi} OFI`,
      });
      router.refresh();
    } else {
      setMesej({ jenis: "ralat", teks: hasil.ralat });
    }
    setMemuat(false);
  }

  return (
    <div className="flex items-center gap-2">
      <Butang
        variant="outline"
        size="sm"
        onClick={klikTest}
        disabled={memuat}
      >
        {memuat ? "Sedang uji..." : "🧪 Stress Test Selatan 2"}
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
