import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { formatTarikhMasa } from "@/lib/utils";

type BarisAktiviti = {
  id: string;
  pengguna_nama: string | null;
  pengguna_rol: string | null;
  jenis: string;
  entiti: string;
  rangkuman: string | null;
  dicipta_pada: string;
};

const LABEL_JENIS: Record<string, string> = {
  cipta: "Cipta",
  kemaskini: "Kemaskini",
  padam: "Padam",
  tukar_status: "Tukar Status",
  pindaan_gred: "Pindaan Gred",
  soft_close: "Soft Close",
  full_close: "Full Close",
  buka_semula: "Buka Semula",
};

const VARIAN_JENIS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  cipta: "default",
  kemaskini: "secondary",
  padam: "destructive",
  tukar_status: "secondary",
  pindaan_gred: "destructive",
  soft_close: "secondary",
  full_close: "default",
  buka_semula: "outline",
};

export async function TimelineAktivitiAudit({
  auditId,
  had = 50,
}: {
  auditId: string;
  had?: number;
}) {
  const supabase = await createClient();
  const { data: senarai } = await supabase
    .from("aktiviti")
    .select(
      "id, pengguna_nama, pengguna_rol, jenis, entiti, rangkuman, dicipta_pada"
    )
    .eq("audit_id", auditId)
    .order("dicipta_pada", { ascending: false })
    .limit(had);

  if (!senarai || senarai.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Tiada aktiviti direkodkan untuk audit ini.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {(senarai as BarisAktiviti[]).map((a) => (
        <div key={a.id} className="flex gap-3">
          <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
          <div className="flex-1 space-y-1 border-l pb-3 pl-3 -ml-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={VARIAN_JENIS[a.jenis] ?? "outline"} className="text-xs">
                {LABEL_JENIS[a.jenis] ?? a.jenis}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatTarikhMasa(a.dicipta_pada)}
              </span>
            </div>
            <div className="text-sm">{a.rangkuman}</div>
            <div className="text-xs text-muted-foreground">
              {a.pengguna_nama ?? "Sistem"}
              {a.pengguna_rol && ` (${a.pengguna_rol})`}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
