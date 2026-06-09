import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Butang } from "@/components/ui/butang";
import { ChecklistAudit } from "@/components/audit/checklist-audit";
import { formatTarikh } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default async function HalamanChecklist({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ klausa?: string }>;
}) {
  const { id } = await params;
  const { klausa } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");

  // Audit + PO
  const { data: audit } = await supabase
    .from("audit")
    .select(
      "id, no_rujukan, tarikh_audit, status, jenis_audit, lead_auditor_id, auditor_ids, pusat_operasi:pusat_operasi_id (id, kod, nama, wilayah)"
    )
    .eq("id", id)
    .single();

  if (!audit) notFound();

  // Prinsip + kriteria + items
  const [{ data: prinsipList }, { data: kriteriaList }, { data: itemList }, { data: dapatanList }] =
    await Promise.all([
      supabase.from("prinsip").select("*").order("nombor"),
      supabase.from("kriteria").select("*").order("susunan"),
      supabase.from("item_semakan").select("*").order("susunan"),
      supabase.from("dapatan").select("*")    .eq("audit_id", id),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/audit" className="text-sm text-muted-foreground hover:underline">
              ← Audit
            </Link>
          </div>
          <h2 className="mt-1 text-2xl font-bold">{audit.no_rujukan}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{(audit.pusat_operasi as { nama?: string } | null)?.nama ?? "-"}</span>
            <span>·</span>
            <span>{formatTarikh(audit.tarikh_audit)}</span>
            <Badge variant="outline">{audit.status}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/audit/${audit.id}/laporan`}>
            <Butang variant="outline">Jana Laporan</Butang>
          </Link>
        </div>
      </div>

      <ChecklistAudit
        auditId={audit.id}
        prinsipList={prinsipList ?? []}
        kriteriaList={kriteriaList ?? []}
        itemList={itemList ?? []}
        dapatanAwal={dapatanList ?? []}
        penggunaId={user.id}
        klausaAwal={klausa}
      />
    </div>
  );
}
