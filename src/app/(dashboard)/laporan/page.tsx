import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatTarikh } from "@/lib/utils";

type BarisLaporan = {
  id: string;
  no_rujukan: string;
  tarikh_audit: string;
  status: string;
  pusat_operasi: { kod: string; nama: string; wilayah: string } | null;
};

export default async function HalamanLaporan() {
  const supabase = createClient();
  const { data: senarai } = await supabase
    .from("audit")
    .select(
      "id, no_rujukan, tarikh_audit, status, pusat_operasi:pusat_operasi_id (kod, nama, wilayah)"
    )
    .in("status", ["selesai", "menunggu_semakan"])
    .order("tarikh_audit", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Laporan Audit</h2>
        <p className="text-sm text-muted-foreground">
          Senarai laporan audit yang siap atau menunggu semakan.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Senarai Laporan</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!senarai || senarai.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Tiada laporan tersedia.
            </div>
          ) : (
            <div className="divide-y">
              {(senarai as unknown as BarisLaporan[]).map((a) => (
                <Link
                  key={a.id}
                  href={`/audit/${a.id}/laporan`}
                  className="flex items-center justify-between p-4 hover:bg-accent/50"
                >
                  <div>
                    <div className="font-semibold">{a.no_rujukan}</div>
                    <div className="text-sm text-muted-foreground">
                      {a.pusat_operasi?.nama ?? "-"} ·{" "}
                      {formatTarikh(a.tarikh_audit)}
                    </div>
                  </div>
                  <Badge>{a.status}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
