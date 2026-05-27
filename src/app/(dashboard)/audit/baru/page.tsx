import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BorangAuditBaru } from "@/components/audit/borang-audit-baru";

export default async function HalamanAuditBaru() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");

  const [{ data: senaraiPO }, { data: senaraiAuditor }] = await Promise.all([
    supabase.from("pusat_operasi").select("id, kod, nama, wilayah").order("kod"),
    supabase
      .from("pengguna")
      .select("id, nama_penuh, rol")
      .in("rol", ["lead_auditor", "auditor"])
      .order("nama_penuh"),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Audit Baru</h2>
        <p className="text-sm text-muted-foreground">
          Cipta sesi audit baru untuk satu Pusat Operasi.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Maklumat Audit</CardTitle>
        </CardHeader>
        <CardContent>
          <BorangAuditBaru
            senaraiPO={senaraiPO ?? []}
            senaraiAuditor={senaraiAuditor ?? []}
            penggunaSemasa={{ id: user.id }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
