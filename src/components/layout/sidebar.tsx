"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { RolPengguna } from "@/types";

interface ItemNav {
  label: string;
  href: string;
  rol?: RolPengguna[];
}

const ITEM: ItemNav[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Audit", href: "/audit" },
  { label: "NC", href: "/nc" },
  { label: "OFI", href: "/ofi" },
  { label: "Pusat Operasi", href: "/pusat-operasi" },
  { label: "Laporan", href: "/laporan" },
  { label: "Aktiviti", href: "/aktiviti" },
  { label: "Pengguna", href: "/pengguna", rol: ["admin"] },
  { label: "Tetapan", href: "/tetapan" },
];

export function Sidebar({ rol }: { rol: RolPengguna }) {
  const pathname = usePathname();
  const item = ITEM.filter((i) => !i.rol || i.rol.includes(rol));

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-card md:flex">
      {/* Jenama */}
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
          M
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight">MSPO Audit</div>
          <div className="text-xs text-muted-foreground">MS2530-2-2:2022</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {item.map((it) => {
          const aktif =
            it.href === "/dashboard"
              ? pathname === it.href
              : pathname.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                aktif
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {it.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
