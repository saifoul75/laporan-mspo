import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BadgeStatus } from "@/components/ui/badge-status";
import Link from "next/link";
import { Butang } from "@/components/ui/butang";
import { formatTarikh } from "@/lib/utils";

type AuditTerkini = {
  id: string;
  no_rujukan: string;
  tarikh_audit: string;
  status: string;
  jenis_audit: string;
  pusat_operasi: { kod: string; nama: string; wilayah: string } | null;
};

export default async function HalamanDashboard() {
  const supabase = await createClient();

  const [{ count: jumlahAudit }, { count: jumlahPO }, { count: jumlahItem }, { data: auditTerkini }] =
    await Promise.all([
      supabase.from("audit").select("*", { count: "exact", head: true }),
      supabase.from("pusat_operasi").select("*", { count: "exact", head: true }),
      supabase.from("item_semakan").select("*", { count: "exact", head: true }),
      supabase
        .from("audit")
        .select(
          "id, no_rujukan, tarikh_audit, status, jenis_audit, pusat_operasi:pusat_operasi_id (kod, nama, wilayah)"
        )
        .order("tarikh_audit", { ascending: false })
        .limit(5),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Ringkasan aktiviti audit MSPO anda.
          </p>
        </div>
        <Link href="/audit/baru">
          <Butang>+ Audit Baru</Butang>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KadStatistik tajuk="Jumlah Audit" nilai={jumlahAudit ?? 0} />
        <KadStatistik tajuk="Pusat Operasi" nilai={jumlahPO ?? 0} />
        <KadStatistik tajuk="Standard" nilai="MS2530-2-2:2022" kecil />
        <KadStatistik tajuk="Item Semakan" nilai={jumlahItem ?? 0} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audit Terkini</CardTitle>
        </CardHeader>
        <CardContent>
          {!auditTerkini || auditTerkini.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Tiada audit lagi. Klik &quot;Audit Baru&quot; untuk mula.
            </p>
          ) : (
            <div className="divide-y">
              {(auditTerkini as unknown as AuditTerkini[]).map((a) => (
                <Link
                  key={a.id}
                  href={`/audit/${a.id}`}
                  className="flex items-center justify-between py-3 hover:bg-accent/50"
                >
                  <div>
                    <div className="font-medium">{a.no_rujukan}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.pusat_operasi?.nama ?? "-"} ·{" "}
                      {formatTarikh(a.tarikh_audit)}
                    </div>
                  </div>
                  <Badge variant="outline">{a.status}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status Dapatan</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <BadgeStatus status="Y" />
          <BadgeStatus status="N" />
          <BadgeStatus status="NC" />
          <BadgeStatus status="OFI" />
          <BadgeStatus status="NA" />
          <BadgeStatus status="Pending" />
        </CardContent>
      </Card>
    </div>
  );
}

function KadStatistik({
  tajuk,
  nilai,
  kecil,
}: {
  tajuk: string;
  nilai: number | string;
  kecil?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs uppercase text-muted-foreground">{tajuk}</div>
        <div className={kecil ? "mt-2 text-lg font-semibold" : "mt-2 text-3xl font-bold"}>
          {nilai}
        </div>
      </CardContent>
    </Card>
  );
}
