import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Butang } from "@/components/ui/butang";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

type BarisSenaraiAudit = {
  id: string;
  no_rujukan: string;
  tarikh_audit: string;
  tarikh_tamat: string | null;
  status: string;
  jenis_audit: string;
  catatan: string | null;
  pusat_operasi: { kod: string; nama: string; wilayah: string } | null;
};

export default async function HalamanSenaraiAudit() {
  const supabase = createClient();
  const { data: senarai } = await supabase
    .from("audit")
    .select(
      "id, no_rujukan, tarikh_audit, tarikh_tamat, status, jenis_audit, catatan, pusat_operasi:pusat_operasi_id (kod, nama, wilayah)"
    )
    .order("tarikh_audit", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Senarai Audit</h2>
          <p className="text-sm text-muted-foreground">
            Semua sesi audit MSPO mengikut Pusat Operasi.
          </p>
        </div>
        <Link href="/audit/baru">
          <Butang>+ Audit Baru</Butang>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {!senarai || senarai.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Belum ada audit didaftar. Klik &quot;Audit Baru&quot; untuk mula.
            </div>
          ) : (
            <div className="divide-y">
              {(senarai as unknown as BarisSenaraiAudit[]).map((a) => (
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
                      {a.pusat_operasi?.nama ?? "(PO tidak diset)"} ·{" "}
                      {a.pusat_operasi?.wilayah ?? "-"} ·{" "}
                      {formatTarikh(a.tarikh_audit)}
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
