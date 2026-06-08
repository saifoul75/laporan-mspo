import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const LABEL_STATUS_OFI: Record<string, string> = {
  kiv_kuning: "KIV Kuning",
  open: "Open",
  tutup: "Tutup",
};

type BarisOFI = {
  id: string;
  no_ofi: string;
  klausa_kod: string;
  fail_rujukan: number | null;
  pemerhatian: string | null;
  cadangan: string | null;
  pic: string | null;
  status: string;
  dicipta_pada: string;
  audit: {
    id: string;
    no_rujukan: string;
    pusat_operasi: { kod: string; nama: string } | null;
  } | null;
};

export default async function HalamanOFI() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");

  const { data: senarai } = await supabase
    .from("ofi")
    .select(
      "id, no_ofi, klausa_kod, fail_rujukan, pemerhatian, cadangan, pic, status, dicipta_pada, audit:audit_id (id, no_rujukan, pusat_operasi:pusat_operasi_id (kod, nama))"
    )
    .order("dicipta_pada", { ascending: false });

  const stats = { kiv_kuning: 0, open: 0, tutup: 0 } as Record<string, number>;
  for (const o of senarai ?? []) {
    stats[o.status as string] = (stats[o.status as string] ?? 0) + 1;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Opportunity for Improvement (OFI)</h2>
        <p className="text-sm text-muted-foreground">
          Senarai OFI dijana automatik dari dapatan audit. Cadangan
          penambahbaikan dan PIC diuruskan di sini.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ringkasan</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Stat label="KIV Kuning" nilai={stats.kiv_kuning ?? 0} warna="bg-amber-100 text-amber-800" />
          <Stat label="Open" nilai={stats.open ?? 0} warna="bg-blue-100 text-blue-800" />
          <Stat label="Tutup" nilai={stats.tutup ?? 0} warna="bg-emerald-100 text-emerald-800" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Senarai OFI ({senarai?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!senarai || senarai.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Tiada OFI didaftar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3">No. OFI</th>
                    <th className="p-3">Klausa</th>
                    <th className="p-3">Audit / PO</th>
                    <th className="p-3">Pemerhatian</th>
                    <th className="p-3">PIC</th>
                    <th className="p-3">Status</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(senarai as unknown as BarisOFI[]).map((o) => (
                    <tr key={o.id} className="hover:bg-accent/50">
                      <td className="p-3 font-mono text-xs">{o.no_ofi}</td>
                      <td className="p-3">
                        <div className="font-mono text-xs">{o.klausa_kod}</div>
                        <div className="text-xs text-muted-foreground">
                          {o.fail_rujukan ? `Fail ${o.fail_rujukan}` : ""}
                        </div>
                      </td>
                      <td className="p-3">
                        {o.audit ? (
                          <Link
                            href={`/audit/${o.audit.id}`}
                            className="text-sm hover:underline"
                          >
                            {o.audit.no_rujukan}
                          </Link>
                        ) : (
                          "-"
                        )}
                        <div className="text-xs text-muted-foreground">
                          {o.audit?.pusat_operasi?.nama ?? "-"}
                        </div>
                      </td>
                      <td className="p-3 text-xs">
                        <div className="line-clamp-2 max-w-md">
                          {o.pemerhatian ?? "-"}
                        </div>
                      </td>
                      <td className="p-3 text-xs">{o.pic ?? "-"}</td>
                      <td className="p-3">
                        <Badge variant="outline">
                          {LABEL_STATUS_OFI[o.status] ?? o.status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {o.audit ? (
                          <Link
                            href={`/audit/${o.audit.id}/checklist?klausa=${encodeURIComponent(o.klausa_kod)}`}
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
