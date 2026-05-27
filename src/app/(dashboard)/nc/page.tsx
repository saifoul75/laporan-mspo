import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatTarikh } from "@/lib/utils";

const LABEL_STATUS_NC: Record<string, string> = {
  open: "Open",
  in_progress: "Sedang Tindakan",
  closed: "Closed",
  verified: "Verified",
};

type BarisNC = {
  id: string;
  no_nc: string;
  klausa_kod: string;
  prinsip_kod: string;
  fail_rujukan: number | null;
  dapatan: string;
  gred: "major" | "minor";
  status: string;
  pic: string | null;
  tarikh_siap: string | null;
  dicipta_pada: string;
  audit: {
    id: string;
    no_rujukan: string;
    pusat_operasi: { kod: string; nama: string } | null;
  } | null;
};

export default async function HalamanNC() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");

  const { data: senarai } = await supabase
    .from("nc")
    .select(
      "id, no_nc, klausa_kod, prinsip_kod, fail_rujukan, dapatan, gred, status, pic, tarikh_siap, dicipta_pada, audit:audit_id (id, no_rujukan, pusat_operasi:pusat_operasi_id (kod, nama))"
    )
    .order("dicipta_pada", { ascending: false });

  const stats = { open: 0, in_progress: 0, closed: 0, verified: 0 } as Record<string, number>;
  const stats_gred = { major: 0, minor: 0 } as Record<string, number>;
  for (const n of senarai ?? []) {
    stats[n.status as string] = (stats[n.status as string] ?? 0) + 1;
    stats_gred[n.gred as string] = (stats_gred[n.gred as string] ?? 0) + 1;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Non-Conformity (NC)</h2>
        <p className="text-sm text-muted-foreground">
          Senarai NC dijana automatik dari dapatan audit. Tindakan pembetulan
          dan status dikemaskini di sini.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ringkasan</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Stat label="Open" nilai={stats.open ?? 0} warna="bg-red-100 text-red-800" />
          <Stat label="Sedang Tindakan" nilai={stats.in_progress ?? 0} warna="bg-amber-100 text-amber-800" />
          <Stat label="Closed" nilai={stats.closed ?? 0} warna="bg-emerald-100 text-emerald-800" />
          <Stat label="Verified" nilai={stats.verified ?? 0} warna="bg-blue-100 text-blue-800" />
          <div className="ml-auto flex gap-3 text-sm">
            <span className="rounded-full bg-red-600 px-2 py-1 font-medium text-white">
              Major: {stats_gred.major ?? 0}
            </span>
            <span className="rounded-full bg-amber-500 px-2 py-1 font-medium text-white">
              Minor: {stats_gred.minor ?? 0}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Senarai NC ({senarai?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!senarai || senarai.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Tiada NC didaftar. NC akan dijana automatik bila auditor pilih
              status NC pada checklist.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3">No. NC</th>
                    <th className="p-3">Klausa</th>
                    <th className="p-3">Audit / PO</th>
                    <th className="p-3">Gred</th>
                    <th className="p-3">PIC</th>
                    <th className="p-3">Tarikh Siap</th>
                    <th className="p-3">Status</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(senarai as unknown as BarisNC[]).map((n) => (
                    <tr key={n.id} className="hover:bg-accent/50">
                      <td className="p-3 font-mono text-xs">{n.no_nc}</td>
                      <td className="p-3">
                        <div className="font-mono text-xs">{n.klausa_kod}</div>
                        <div className="text-xs text-muted-foreground">
                          {n.prinsip_kod}
                          {n.fail_rujukan ? ` · Fail ${n.fail_rujukan}` : ""}
                        </div>
                      </td>
                      <td className="p-3">
                        {n.audit ? (
                          <Link
                            href={`/audit/${n.audit.id}`}
                            className="text-sm hover:underline"
                          >
                            {n.audit.no_rujukan}
                          </Link>
                        ) : (
                          "-"
                        )}
                        <div className="text-xs text-muted-foreground">
                          {n.audit?.pusat_operasi?.nama ?? "-"}
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={
                            n.gred === "major"
                              ? "rounded-full bg-red-600 px-2 py-0.5 text-xs font-medium text-white"
                              : "rounded-full bg-amber-500 px-2 py-0.5 text-xs font-medium text-white"
                          }
                        >
                          {String(n.gred).toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 text-xs">{n.pic ?? "-"}</td>
                      <td className="p-3 text-xs">
                        {n.tarikh_siap ? formatTarikh(n.tarikh_siap) : "-"}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">
                          {LABEL_STATUS_NC[n.status] ?? n.status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {n.audit ? (
                          <Link
                            href={`/audit/${n.audit.id}/checklist?klausa=${encodeURIComponent(n.klausa_kod)}`}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            Edit
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  nilai,
  warna,
}: {
  label: string;
  nilai: number;
  warna: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`rounded-full px-2 py-1 text-xs font-medium ${warna}`}>
        {label}
      </span>
      <span className="text-lg font-semibold">{nilai}</span>
    </div>
  );
}
