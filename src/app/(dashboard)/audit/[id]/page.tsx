import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Butang } from "@/components/ui/butang";
import { Badge } from "@/components/ui/badge";
import { BadgeStatus } from "@/components/ui/badge-status";
import { TimelineAktivitiAudit } from "@/components/audit/timeline-aktiviti";
import { formatTarikh } from "@/lib/utils";

export default async function HalamanAudit({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");

  const { data: audit } = await supabase
    .from("audit")
    .select(
      "*, pusat_operasi:pusat_operasi_id (kod, nama, wilayah, daerah, negeri, keluasan_hektar)"
    )
    .eq("id", params.id)
    .single();
  if (!audit) notFound();

  const po = audit.pusat_operasi as
    | {
        kod: string;
        nama: string;
        wilayah: string;
        daerah: string | null;
        negeri: string | null;
        keluasan_hektar: number | null;
      }
    | null;

  const [{ data: dapatanList }, { count: ncCount }, { count: ofiCount }] =
    await Promise.all([
      supabase
        .from("dapatan")
        .select("status, gred_nc")
        .eq("audit_id", params.id),
      supabase
        .from("nc")
        .select("*", { count: "exact", head: true })
        .eq("audit_id", params.id),
      supabase
        .from("ofi")
        .select("*", { count: "exact", head: true })
        .eq("audit_id", params.id),
    ]);

  const stats = {
    Y: 0,
    N: 0,
    NC: 0,
    OFI: 0,
    NA: 0,
    Pending: 0,
  } as Record<string, number>;
  for (const d of dapatanList ?? []) {
    stats[d.status as string] = (stats[d.status as string] ?? 0) + 1;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/audit" className="text-sm text-muted-foreground hover:underline">
          ← Senarai Audit
        </Link>
        <h2 className="mt-2 text-2xl font-bold">{audit.no_rujukan}</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Maklumat Audit</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Maklumat label="Pusat Operasi" nilai={
            po?.nama
              ? `${po.kod} - ${po.nama}`
              : "-"
          } />
          <Maklumat label="Wilayah" nilai={po?.wilayah ?? "-"} />
          <Maklumat label="Tarikh Audit" nilai={formatTarikh(audit.tarikh_audit)} />
          <Maklumat
            label="Tarikh Tamat"
            nilai={audit.tarikh_tamat ? formatTarikh(audit.tarikh_tamat) : "-"}
          />
          <Maklumat label="Jenis Audit" nilai={audit.jenis_audit} />
          <Maklumat
            label="Status"
            nilai={<Badge>{audit.status}</Badge>}
          />
          {audit.catatan && (
            <div className="sm:col-span-2">
              <div className="text-xs uppercase text-muted-foreground">Catatan</div>
              <div className="mt-1 text-sm">{audit.catatan}</div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ringkasan Dapatan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {(["Y", "N", "NC", "OFI", "NA", "Pending"] as const).map((s) => (
              <div key={s} className="flex items-center gap-2">
                <BadgeStatus status={s} />
                <span className="text-lg font-semibold">{stats[s] ?? 0}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 border-t pt-4">
            <Stat label="NC dijana" nilai={ncCount ?? 0} />
            <Stat label="OFI dijana" nilai={ofiCount ?? 0} />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Link href={`/audit/${audit.id}/checklist`}>
          <Butang>Buka Checklist</Butang>
        </Link>
        <Link href={`/audit/${audit.id}/laporan`}>
          <Butang variant="outline">Lihat Laporan</Butang>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Timeline Aktiviti</CardTitle>
        </CardHeader>
        <CardContent>
          <TimelineAktivitiAudit auditId={audit.id} />
        </CardContent>
      </Card>
    </div>
  );
}

function Maklumat({ label, nilai }: { label: string; nilai: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{nilai}</div>
    </div>
  );
}

function Stat({ label, nilai }: { label: string; nilai: number }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{nilai}</div>
    </div>
  );
}
