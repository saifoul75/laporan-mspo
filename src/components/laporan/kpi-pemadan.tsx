"use client";

import { Card, CardContent } from "@/components/ui/card";

type KPI = {
  label: string;
  value: string;
  sublabel?: string;
  tone?: "default" | "success" | "warning" | "danger";
};

function toneClass(tone: KPI["tone"]) {
  switch (tone) {
    case "success":
      return "border-l-4 border-green-500";
    case "warning":
      return "border-l-4 border-amber-500";
    case "danger":
      return "border-l-4 border-red-500";
    default:
      return "border-l-4 border-blue-500";
  }
}

export function KPIPemadan({ items }: { items: KPI[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((kpi, i) => (
        <Card key={i} className={toneClass(kpi.tone)}>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
            <p className="mt-2 text-2xl font-bold">{kpi.value}</p>
            {kpi.sublabel && (
              <p className="mt-1 text-xs text-muted-foreground">{kpi.sublabel}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function pemadanNombor(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return new Intl.NumberFormat("ms-MY", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

export function pemadanPeratus(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return `${new Intl.NumberFormat("ms-MY", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n)}%`;
}

export function toneUntukCapai(pct: number | null | undefined): KPI["tone"] {
  if (pct === null || pct === undefined) return "default";
  if (pct >= 90) return "success";
  if (pct >= 70) return "warning";
  return "danger";
}