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

  const [{ data: senaraiPOMentah }, { data: senaraiAuditor }] = await Promise.all([
    supabase.from("pusat_operasi").select("id, kod, nama, wilayah"),
    supabase
      .from("pengguna")
      .select("id, nama_penuh, rol")
      .in("rol", ["admin", "lead_auditor", "auditor"])
      .order("nama_penuh"),
  ]);

  // Sort PO numerik (PO1, PO2, ..., PO12) bukan lexicographic (PO1, PO10, PO11, ..., PO2)
  const senaraiPO = (senaraiPOMentah ?? []).slice().sort((a, b) => {
    const numA = parseInt(a.kod.replace(/\D/g, ""), 10) || 0;
    const numB = parseInt(b.kod.replace(/\D/g, ""), 10) || 0;
    return numA - numB;
  });

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
            senaraiPO={senaraiPO}
            senaraiAuditor={senaraiAuditor ?? []}
            penggunaSemasa={{ id: user.id }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
