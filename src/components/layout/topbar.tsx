"use client";

import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Butang } from "@/components/ui/butang";
import { Badge } from "@/components/ui/badge";
import { PetunjukSync } from "@/components/layout/petunjuk-sync";
import { cn } from "@/lib/utils";
import type { RolPengguna } from "@/types";

const LABEL_ROL: Record<RolPengguna, string> = {
  admin: "Pentadbir",
  lead_auditor: "Lead Auditor",
  auditor: "Auditor",
  po_user: "Pusat Operasi",
};

const MODUL: { id: "hasil" | "audit"; label: string; home: string }[] = [
  { id: "hasil", label: "Hasil", home: "/hasil" },
  { id: "audit", label: "Audit", home: "/dashboard" },
];

export function TopBar({ nama, rol }: { nama: string; rol: RolPengguna }) {
  const router = useRouter();
  const pathname = usePathname();

  // Tentukan modul aktif dari laluan semasa (selaras dengan Sidebar)
  const modulAktif =
    pathname.startsWith("/hasil") || pathname.startsWith("/admin/upload")
      ? "hasil"
      : "audit";

  function getTajuk() {
    if (pathname.startsWith("/hasil")) return "Dashboard Hasil Projek — RISDA Plantation Sdn Bhd"
    return "Sistem Audit MSPO"
  }

  async function logKeluar() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/masuk");
    router.refresh();
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-3">
        <div className="md:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            M
          </div>
        </div>

        {/* Penukar modul — paparan mobile sahaja (sidebar uruskan desktop) */}
        <div className="flex gap-1 md:hidden">
          {MODUL.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => router.push(m.home)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                m.id === modulAktif
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Tajuk penuh — desktop sahaja (mobile guna penukar di atas) */}
        <h1 className="hidden text-base font-semibold md:block">{getTajuk()}</h1>
      </div>

      <div className="flex items-center gap-3">
        <PetunjukSync />
        <div className="hidden text-right sm:block">
          <div className="text-sm font-medium">{nama}</div>
          <Badge variant="outline" className="text-xs">
            {LABEL_ROL[rol]}
          </Badge>
        </div>
        <Butang variant="outline" size="sm" onClick={logKeluar}>
          Log Keluar
        </Butang>
      </div>
    </header>
  );
}
