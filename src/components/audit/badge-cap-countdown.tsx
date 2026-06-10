"use client";

import { formatTarikh } from "@/lib/utils";
import { useState } from "react";

interface Props {
  capDueDate: string | null; // ISO date dari DB
  capDueDays: number | null; // 30 atau 90
  capGradeBasis: "major" | "minor" | null;
  capGradeSource: "auto_highest_finding" | "manual_lead_auditor" | null;
  status: string; // status_db (BM)
}

/**
 * Badge countdown CAP — paparkan baki hari sehingga tarikh akhir CAP.
 * Hanya tunjuk kalau audit dah muktamadkan (cap_due_date wujud).
 */
export function BadgeCapCountdown({
  capDueDate,
  capDueDays,
  capGradeBasis,
  capGradeSource,
  status,
}: Props) {
  const nowMs = useState(() => Date.now())[0];

  if (!capDueDate || !capDueDays || !capGradeBasis) {
    return null;
  }

  const dueMs = new Date(capDueDate + "T23:59:59").getTime();
  const bakiMs = dueMs - nowMs;
  const bakiHari = Math.ceil(bakiMs / 86_400_000);
  const lewat = bakiHari < 0;
  const kritikal = !lewat && bakiHari <= 5;
  const amaran = !lewat && !kritikal && bakiHari <= 15;

  // Color scheme
  let kelas = "border-emerald-300 bg-emerald-50 text-emerald-900";
  let label = `${bakiHari} hari lagi`;
  if (lewat) {
    kelas = "border-red-500 bg-red-100 text-red-900";
    label = `LEWAT ${Math.abs(bakiHari)} hari`;
  } else if (kritikal) {
    kelas = "border-red-400 bg-red-50 text-red-900";
    label = `${bakiHari} hari lagi (kritikal)`;
  } else if (amaran) {
    kelas = "border-amber-400 bg-amber-50 text-amber-900";
    label = `${bakiHari} hari lagi`;
  }

  // Kalau dah selesai/dibatalkan, kurangkan emphasize
  if (status === "selesai" || status === "dibatalkan") {
    kelas = "border-gray-300 bg-gray-50 text-gray-700";
  }

  const gredLabel = capGradeBasis === "major" ? "MAJOR" : "MINOR";
  const sourceLabel =
    capGradeSource === "manual_lead_auditor" ? " (override)" : "";

  return (
    <div className={`rounded-md border p-3 text-sm ${kelas}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold uppercase">
            Tarikh Akhir CAP
          </div>
          <div className="mt-1 text-base font-bold">
            {formatTarikh(capDueDate)}
          </div>
          <div className="mt-1 text-xs">
            Gred: {gredLabel} (+{capDueDays} hari)
            {sourceLabel}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{label}</div>
        </div>
      </div>
    </div>
  );
}
