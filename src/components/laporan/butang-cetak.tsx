"use client";

import { Printer } from "lucide-react";
import { Butang } from "@/components/ui/butang";

export function ButangCetak({ label = "Cetak / PDF" }: { label?: string }) {
  return (
    <Butang
      variant="outline"
      size="sm"
      onClick={() => {
        if (typeof window !== "undefined") window.print();
      }}
    >
      <Printer className="h-4 w-4" />
      {label}
    </Butang>
  );
}