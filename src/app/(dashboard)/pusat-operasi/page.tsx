import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BorangPusatOperasi } from "@/components/audit/borang-pusat-operasi";

export default async function HalamanPusatOperasi() {
  const supabase = createClient();
  const { data: senarai } = await supabase
    .from("pusat_operasi")
    .select("*")
    .order("kod");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Pusat Operasi</h2>
        <p className="text-sm text-muted-foreground">
          Daftar Pusat Operasi (PO) untuk setiap wilayah.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Pusat Operasi Baru</CardTitle>
        </CardHeader>
        <CardContent>
          <BorangPusatOperasi />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Senarai PO ({senarai?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!senarai || senarai.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Tiada PO didaftar lagi.
            </div>
          ) : (
            <div className="divide-y">
              {senarai.map((po) => (
                <Link
                  key={po.id}
                  href={`/pusat-operasi/${po.id}`}
                  className="flex items-center justify-between p-4 hover:bg-accent/50"
                >
                  <div>
                    <div className="font-semibold">
                      {po.kod} - {po.nama}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {po.wilayah} · {po.daerah ?? "-"}, {po.negeri ?? "-"} ·{" "}
                      {po.keluasan_hektar ?? 0} ha
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">›</span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
