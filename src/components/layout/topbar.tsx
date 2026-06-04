"use client";

import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Butang } from "@/components/ui/butang";
import { Badge } from "@/components/ui/badge";
import { PetunjukSync } from "@/components/layout/petunjuk-sync";
import type { RolPengguna } from "@/types";

const LABEL_ROL: Record<RolPengguna, string> = {
  admin: "Pentadbir",
  lead_auditor: "Lead Auditor",
  auditor: "Auditor",
  po_user: "Pusat Operasi",
};

export function TopBar({ nama, rol }: { nama: string; rol: RolPengguna }) {
  const router = useRouter();
  const pathname = usePathname();

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
        <h1 className="text-base font-semibold">{getTajuk()}</h1>
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
