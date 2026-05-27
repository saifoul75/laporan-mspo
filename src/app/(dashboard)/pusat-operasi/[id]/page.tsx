import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Butang } from "@/components/ui/butang";
import { Badge } from "@/components/ui/badge";
import { BadgeStatus } from "@/components/ui/badge-status";
import { formatTarikh } from "@/lib/utils";

const LABEL_STATUS: Record<string, string> = {
  draf: "Draf",
  dijadual: "Dijadual",
  sedang_dijalankan: "Sedang Dijalankan",
  menunggu_semakan: "Menunggu Semakan",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

const LABEL_JENIS: Record<string, string> = {
  audit_dalaman: "Audit Dalaman",
  audit_pensijilan: "Audit Pensijilan",
  audit_pengawasan: "Audit Pengawasan",
  audit_persijilan_semula: "Persijilan Semula",
};

export default async function HalamanPODetail({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");

  const { data: po } = await supabase
    .from("pusat_operasi")
    .select("*")
    .eq("id", params.id)
    .single();
  if (!po) notFound();

  // Senarai audit untuk PO ni
  const { data: senaraiAudit } = await supabase
    .from("audit")
    .select(
      "id, no_rujukan, tarikh_audit, tarikh_tamat, status, jenis_audit, catatan"
    )
    .eq("pusat_operasi_id", params.id)
    .order("tarikh_audit", { ascending: false });

  // Kira agregat dapatan keseluruhan untuk PO ni
  const auditIds = (senaraiAudit ?? []).map((a) => a.id);
  let totalY = 0,
    totalNC = 0,
    totalOFI = 0,
    totalNA = 0,
    totalN = 0,
    totalPending = 0;

  if (auditIds.length > 0) {
    const { data: allDapatan } = await supabase
      .from("dapatan")
      .select("status")
      .in("audit_id", auditIds);

    for (const d of allDapatan ?? []) {
      if (d.status === "Y") totalY++;
      else if (d.status === "N") totalN++;
      else if (d.status === "NC") totalNC++;
      else if (d.status === "OFI") totalOFI++;
      else if (d.status === "NA") totalNA++;
      else totalPending++;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/pusat-operasi"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Pusat Operasi
        </Link>
        <h2 className="mt-2 text-2xl font-bold">
          {po.kod} - {po.nama}
        </h2>
        <p className="text-sm text-muted-foreground">{po.wilayah}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Maklumat Pusat Operasi</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Maklumat label="Kod" nilai={po.kod} />
          <Maklumat label="Wilayah" nilai={po.wilayah} />
          <Maklumat label="Daerah" nilai={po.daerah ?? "-"} />
          <Maklumat label="Negeri" nilai={po.negeri ?? "-"} />
          <Maklumat
            label="Keluasan"
            nilai={po.keluasan_hektar ? `${po.keluasan_hektar} ha` : "-"}
          />
          {po.alamat && (
            <div className="sm:col-span-2">
              <div className="text-xs uppercase text-muted-foreground">
                Alamat
              </div>
              <div className="mt-1 text-sm">{po.alamat}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {auditIds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Dapatan Keseluruhan</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Stat status="Y" nilai={totalY} />
            <Stat status="N" nilai={totalN} />
            <Stat status="NC" nilai={totalNC} />
            <Stat status="OFI" nilai={totalOFI} />
            <Stat status="NA" nilai={totalNA} />
            <Stat status="Pending" nilai={totalPending} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Senarai Audit ({senaraiAudit?.length ?? 0})</CardTitle>
          <Link href="/audit/baru">
            <Butang size="sm">+ Audit Baru</Butang>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {!senaraiAudit || senaraiAudit.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Tiada audit untuk PO ini.{" "}
              <Link
                href="/audit/baru"
                className="text-primary hover:underline"
              >
                Cipta audit baru
              </Link>
              .
            </div>
          ) : (
            <div className="divide-y">
              {senaraiAudit.map((a) => (
                <Link
                  key={a.id}
                  href={`/audit/${a.id}`}
                  className="flex flex-col gap-2 p-4 hover:bg-accent/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{a.no_rujukan}</span>
                      <Badge variant="outline">
                        {LABEL_JENIS[a.jenis_audit] ?? a.jenis_audit}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatTarikh(a.tarikh_audit)}
                      {a.tarikh_tamat && ` - ${formatTarikh(a.tarikh_tamat)}`}
                    </div>
                  </div>
                  <Badge>{LABEL_STATUS[a.status] ?? a.status}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Maklumat({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{nilai}</div>
    </div>
  );
}

function Stat({
  status,
  nilai,
}: {
  status: "Y" | "N" | "NC" | "OFI" | "NA" | "Pending";
  nilai: number;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
      <BadgeStatus status={status} />
      <span className="text-lg font-semibold">{nilai}</span>
    </div>
  );
}
