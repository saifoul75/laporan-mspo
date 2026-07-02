"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { RolPengguna } from "@/types";

interface ItemNav {
  label: string;
  href: string;
  rol?: RolPengguna[];
}

type ModulId = "hasil" | "audit";

const MODUL: { id: ModulId; label: string; home: string; item: ItemNav[] }[] = [
  {
    id: "hasil",
    label: "Hasil Projek",
    home: "/hasil/po",
    item: [
      { label: "Tab PO", href: "/hasil/po" },
      { label: "Tab Wilayah", href: "/hasil/wilayah" },
      { label: "Tab HQ", href: "/hasil/hq" },
    ],
  },
  {
    id: "audit",
    label: "Audit MSPO",
    home: "/dashboard",
    item: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Audit", href: "/audit" },
      { label: "NC", href: "/nc" },
      { label: "OFI", href: "/ofi" },
      { label: "Pusat Operasi", href: "/pusat-operasi" },
      { label: "Laporan", href: "/laporan" },
      { label: "Aktiviti", href: "/aktiviti" },
      { label: "Pengguna", href: "/pengguna", rol: ["admin"] },
      { label: "Tetapan", href: "/tetapan" },
    ],
  },
];

export function Sidebar({ rol }: { rol: RolPengguna }) {
  const pathname = usePathname();
  const router = useRouter();

  // Tentukan modul aktif dari laluan semasa
  const modulAktif: ModulId =
    pathname.startsWith("/hasil") ? "hasil" : "audit";

  const modul = MODUL.find((m) => m.id === modulAktif)!;
  const item = modul.item.filter((i) => !i.rol || i.rol.includes(rol));

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

      {/* Penukar modul */}
      <div className="grid grid-cols-2 gap-1 border-b p-2">
        {MODUL.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => router.push(m.home)}
            className={cn(
              "rounded-md px-2 py-1.5 text-xs font-semibold transition-colors",
              m.id === modulAktif
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Menu modul aktif sahaja */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {item.map((it) => {
          const aktif =
            it.href === modul.home
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
