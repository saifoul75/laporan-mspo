import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  audit: { id: string; no_rujukan: string } | null;
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
  log_masuk: "Log Masuk",
  log_keluar: "Log Keluar",
};

const VARIAN_JENIS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  cipta: "default",
  kemaskini: "secondary",
  padam: "destructive",
  tukar_status: "secondary",
  pindaan_gred: "destructive",
  soft_close: "secondary",
  full_close: "default",
  buka_semula: "outline",
};

export default async function HalamanAktiviti() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");

  const { data: senarai } = await supabase
    .from("aktiviti")
    .select(
      "id, pengguna_nama, pengguna_rol, jenis, entiti, rangkuman, dicipta_pada, audit:audit_id (id, no_rujukan)"
    )
    .order("dicipta_pada", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Aktiviti Sistem</h2>
        <p className="text-sm text-muted-foreground">
          Rekod semua perubahan dalam sistem (200 terkini). Auto-recorded dari
          aksi pengguna.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Timeline Aktiviti ({senarai?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!senarai || senarai.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Tiada aktiviti direkodkan lagi.
            </div>
          ) : (
            <div className="divide-y">
              {(senarai as unknown as BarisAktiviti[]).map((a) => (
                <div key={a.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={VARIAN_JENIS[a.jenis] ?? "outline"}>
                        {LABEL_JENIS[a.jenis] ?? a.jenis}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {a.entiti}
                      </span>
                    </div>
                    <div className="text-sm">{a.rangkuman}</div>
                    <div className="text-xs text-muted-foreground">
                      Oleh{" "}
                      <span className="font-medium">
                        {a.pengguna_nama ?? "Sistem"}
                      </span>
                      {a.pengguna_rol && (
                        <span className="text-muted-foreground">
                          {" "}
                          ({a.pengguna_rol})
                        </span>
                      )}
                      {a.audit && (
                        <>
                          {" · "}
                          <Link
                            href={`/audit/${a.audit.id}`}
                            className="hover:underline"
                          >
                            {a.audit.no_rujukan}
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground sm:whitespace-nowrap">
                    {formatTarikhMasa(a.dicipta_pada)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
