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

// Status audit yang dianggap "boleh dilaporkan".
// Audit `draf` dan `dibatalkan` disembunyikan; selainnya layak.
const STATUS_BOLEH_LAPOR = [
  "dijadual",
  "sedang_dijalankan",
  "menunggu_semakan",
  "selesai",
];

export default async function HalamanLaporan() {
  const supabase = await createClient();

  // Ambil senarai laporan + kiraan keseluruhan (untuk diagnostik)
  const [senaraiRes, kiraanRes] = await Promise.all([
    supabase
      .from("audit")
      .select(
        "id, no_rujukan, tarikh_audit, status, pusat_operasi:pusat_operasi_id (kod, nama, wilayah)"
      )
      .in("status", STATUS_BOLEH_LAPOR)
      .order("tarikh_audit", { ascending: false }),
    supabase.from("audit").select("status"),
  ]);

  const { data: senarai, error: ralatSenarai } = senaraiRes;
  const { data: semuaAudit, error: ralatKiraan } = kiraanRes;

  // Kira pecahan status untuk dipaparkan dalam empty-state
  const pecahanStatus: Record<string, number> = {};
  for (const a of semuaAudit ?? []) {
    const s = (a as { status: string }).status;
    pecahanStatus[s] = (pecahanStatus[s] ?? 0) + 1;
  }
  const jumlahAudit = (semuaAudit ?? []).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Laporan Audit</h2>
        <p className="text-sm text-muted-foreground">
          Senarai laporan audit yang sedang dijalankan, menunggu semakan, atau
          selesai.
        </p>
      </div>

      {ralatSenarai && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <div className="font-semibold">Gagal muat senarai laporan</div>
          <div className="mt-1 text-xs">{ralatSenarai.message}</div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Senarai Laporan</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!senarai || senarai.length === 0 ? (
            <div className="space-y-3 px-6 py-10 text-sm">
              <div className="text-center text-muted-foreground">
                Tiada laporan tersedia.
              </div>
              {!ralatKiraan && (
                <div className="mx-auto max-w-md rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900">
                  <div className="text-xs font-semibold">Diagnosis</div>
                  <div className="mt-1 text-xs">
                    Jumlah audit dalam pangkalan data:{" "}
                    <span className="font-mono font-semibold">
                      {jumlahAudit}
                    </span>
                  </div>
                  {jumlahAudit === 0 ? (
                    <div className="mt-2 text-xs">
                      Tiada audit langsung. Cipta audit baru di tab{" "}
                      <Link href="/audit/baru" className="underline">
                        Audit → Baru
                      </Link>
                      . Kalau awak rasa ada audit yang sepatutnya kelihatan,
                      semak peranan pengguna anda dalam jadual{" "}
                      <span className="font-mono">pengguna</span> (RLS akan
                      sembunyikan rekod kalau profil tiada).
                    </div>
                  ) : (
                    <>
                      <div className="mt-2 text-xs">Pecahan status:</div>
                      <ul className="ml-4 mt-1 list-disc text-xs">
                        {Object.entries(pecahanStatus)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([s, n]) => (
                            <li key={s}>
                              <span className="font-mono">{s}</span>: {n}
                            </li>
                          ))}
                      </ul>
                      <div className="mt-2 text-xs">
                        Hanya audit dengan status{" "}
                        <span className="font-mono">dijadual</span>,{" "}
                        <span className="font-mono">sedang_dijalankan</span>,{" "}
                        <span className="font-mono">menunggu_semakan</span>,
                        atau <span className="font-mono">selesai</span> akan
                        muncul di sini.
                      </div>
                    </>
                  )}
                  <div className="mt-2 text-xs">
                    Awak masih boleh buka laporan secara terus dari halaman{" "}
                    <Link href="/audit" className="underline">
                      senarai audit
                    </Link>
                    .
                  </div>
                </div>
              )}
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
