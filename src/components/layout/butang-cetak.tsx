"use client";

import { Butang } from "@/components/ui/butang";

export function ButangCetak() {
  return (
    <Butang type="button" variant="outline" onClick={() => window.print()}>
      Cetak
    </Butang>
  );
}
