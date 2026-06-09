import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BorangCap } from "@/components/audit/borang-cap";
import { ButangVerifyCap } from "@/components/audit/butang-verify-cap";

const LABEL_STATUS_NC: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  closed: "Closed",
  verified: "Verified",
};

export default async function HalamanCap({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");

  const { data: profil } = await supabase
    .from("pengguna")
    .select("rol")
    .eq("id", user.id)
    .single();

  const { data: audit } = await supabase
    .from("audit")
    .select("id, no_rujukan, status, cap_due_date, cap_due_days, cap_grade_basis, lead_auditor_id")
    .eq("id", id)
    .single();
  if (!audit) notFound();

  const { data: ncList } = await supabase
    .from("nc")
    .select("*")
     .eq("audit_id", id)
    .order("no_nc");

  const { data: dapatanList } = await supabase
    .from("dapatan")
    .select("id, item_semakan_id, status, gred_nc")
     .eq("audit_id", id)
    .eq("status", "NC");

  const { data: itemList } = await supabase
    .from("item_semakan")
    .select("id, kod, tajuk, fail_rujukan");

  const itemMap = new Map((itemList ?? []).map((i) => [i.id, i]));
  const dapatanMap = new Map((dapatanList ?? []).map((d) => [d.id, d]));

  const ncDenganKonteks = (ncList ?? []).map((nc) => {
    const dapatan = dapatanMap.get(nc.dapatan_id);
    const item = dapatan ? itemMap.get(dapatan.item_semakan_id) : null;
    return { ...nc, item };
  });

  const adalahLead = profil?.rol && ["admin", "lead_auditor"].includes(profil.rol);
  const auditStatusMenunggu = audit.status === "menunggu_semakan";
  const auditSelesai = audit.status === "selesai";

  let bakiHari: number | null = null;
  if (audit.cap_due_date) {
    const dueMs = new Date(audit.cap_due_date + "T23:59:59").getTime();
    bakiHari = Math.ceil((dueMs - Date.now()) / 86_400_000);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/audit/${audit.id}`} className="text-sm text-muted-foreground hover:underline">
          ← Kembali ke Audit
        </Link>
        <h2 className="mt-2 text-2xl font-bold">CAP Submission</h2>
        <div className="mt-1 text-sm text-muted-foreground">
          {audit.no_rujukan}
          {audit.cap_grade_basis && (
            <span className="ml-3 font-semibold">
              Gred {audit.cap_grade_basis.toUpperCase()} · CAP +{audit.cap_due_days} hari
            </span>
          )}
        </div>
        {audit.cap_due_date && bakiHari !== null && (
          <div className="mt-2">
            <span className={`rounded px-2 py-0.5 text-xs font-semibold ${
              bakiHari < 0 ? "bg-red-100 text-red-800" :
              bakiHari <= 5 ? "bg-red-50 text-red-700" :
              bakiHari <= 15 ? "bg-amber-50 text-amber-700" :
              "bg-emerald-50 text-emerald-700"
            }`}>
              Tarikh Akhir: {new Date(audit.cap_due_date).toLocaleDateString("ms-MY")}
              {" "}({bakiHari < 0 ? `LEWAT ${Math.abs(bakiHari)} hari` : `${bakiHari} hari lagi`})
            </span>
          </div>
        )}
      </div>

      {!auditStatusMenunggu && !auditSelesai && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Audit belum dimuktamadkan. CAP submission akan tersedia selepas Lead Auditor muktamadkan keputusan.
        </div>
      )}

      {auditSelesai && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
          Semua CAP telah diverifikasi. Audit ini telah selesai.
        </div>
      )}

      {(ncDenganKonteks.length === 0) && auditStatusMenunggu && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Tiada NC untuk audit ini. CAP tidak diperlukan.
          </CardContent>
        </Card>
      )}

      {ncDenganKonteks.map((nc) => (
        <Card key={nc.id}>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">
                {nc.no_nc} — {nc.item?.kod ?? nc.klausa_kod}
              </CardTitle>
              <Badge variant="outline">
                {LABEL_STATUS_NC[nc.status] ?? nc.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 space-y-2 rounded border bg-muted/30 p-3 text-sm">
              <div>
                <span className="font-semibold">Klausa:</span>{" "}
                {nc.klausa_kod} (Prinsip {nc.prinsip_kod})
              </div>
              {nc.item?.tajuk && (
                <div>
                  <span className="font-semibold">Item:</span>{" "}
                  {nc.item.tajuk}
                </div>
              )}
              <div>
                <span className="font-semibold">Dapatan:</span>{" "}
                {nc.dapatan}
              </div>
              <div>
                <span className="font-semibold">Gred:</span>{" "}
                <span className={nc.gred === "major" ? "font-bold text-red-700" : "font-bold text-orange-700"}>
                  {nc.gred.toUpperCase()}
                </span>
              </div>
              {nc.punca_akar && (
                <div>
                  <span className="font-semibold">Punca Akar:</span>{" "}
                  {nc.punca_akar}
                </div>
              )}
              {nc.bukti && (
                <div>
                  <span className="font-semibold">Bukti:</span>{" "}
                  {nc.bukti}
                </div>
              )}
            </div>

            {(nc.status === "open" || nc.status === "in_progress") && (
              <BorangCap
                ncId={nc.id}
                auditId={audit.id}
                statusSemasa={nc.status}
                tindakanSediaAda={nc.tindakan_pembetulan}
                adalahLead={adalahLead}
              />
            )}

            {(nc.status === "closed" || nc.status === "verified") && (
              <div className="space-y-2">
                {nc.tindakan_pembetulan && (
                  <div className="rounded border border-blue-200 bg-blue-50 p-3">
                    <div className="text-xs font-semibold uppercase text-blue-800">
                      Tindakan Pembetulan
                    </div>
                    <div className="mt-1 text-sm text-blue-900">
                      {nc.tindakan_pembetulan}
                    </div>
                  </div>
                )}
                {nc.status === "closed" && adalahLead && auditStatusMenunggu && (
                  <div className="flex justify-end">
                    <ButangVerifyCap ncId={nc.id} auditId={audit.id} />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
