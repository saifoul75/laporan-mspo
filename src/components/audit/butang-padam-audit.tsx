"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Butang } from "@/components/ui/butang";
import { padamAuditDraf } from "@/app/(dashboard)/audit/actions";

export function ButangPadamAudit({ auditId, noRujukan }: { auditId: string; noRujukan: string }) {
  const router = useRouter();
  const [tunjukSahkan, setTunjukSahkan] = useState(false);
  const [memuat, setMemuat] = useState(false);
  const [ralat, setRalat] = useState<string | null>(null);

  async function sahkanPadam() {
    setMemuat(true);
    setRalat(null);
    const hasil = await padamAuditDraf(auditId);
    if (!hasil.ok) {
      setRalat(hasil.ralat ?? "Ralat tidak diketahui");
      setMemuat(false);
      setTunjukSahkan(false);
      return;
    }
    router.push("/audit");
    router.refresh();
  }

  if (tunjukSahkan) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-destructive">
          Padam <strong>{noRujukan}</strong>?
        </span>
        <Butang
          type="button"
          size="sm"
          onClick={sahkanPadam}
          disabled={memuat}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          {memuat ? "Memadamkan..." : "Ya, Padam"}
        </Butang>
        <Butang
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setTunjukSahkan(false)}
          disabled={memuat}
        >
          Batal
        </Butang>
        {ralat && <span className="text-xs text-destructive">{ralat}</span>}
      </div>
    );
  }

  return (
    <Butang
      type="button"
      variant="outline"
      size="sm"
      onClick={(e) => {
        e.preventDefault(); // elak trigger Link parent
        e.stopPropagation();
        setTunjukSahkan(true);
      }}
      className="text-destructive hover:border-destructive hover:text-destructive"
    >
      Padam
    </Butang>
  );
}
