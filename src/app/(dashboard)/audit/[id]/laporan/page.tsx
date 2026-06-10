import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeStatus } from "@/components/ui/badge-status";
import { ButangCetak } from "@/components/layout/butang-cetak";
import { ButangKongsi } from "@/components/audit/butang-kongsi";
import { AmaranSyncLaporan } from "@/components/audit/amaran-sync-laporan";
import { formatTarikh } from "@/lib/utils";
import type { StatusDapatan, GredNC } from "@/types";

export default async function HalamanLaporan({
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

  // Jalankan ketiga-tiga query secara selari untuk kurangkan latency
  const [auditRes, dapatanRes, laporanRes] = await Promise.all([
    supabase
      .from("audit")
      .select(
        "*, pusat_operasi:pusat_operasi_id (kod, nama, wilayah)"
      )
      .eq("id", id)
      .single(),
    supabase
      .from("dapatan")
      .select(
        "id, status, gred_nc, catatan, bukti_audit, cadangan_tindakan, pic, tarikh_siap_target, item_semakan:item_semakan_id (kod, tajuk, fail_rujukan, kriteria:kriteria_id (kod, prinsip:prinsip_id (kod, tajuk)))"
      )
      .eq("audit_id", id),
    // Ambil status kongsi untuk ButangKongsi
    supabase
      .from("laporan")
      .select("token_kongsi, kongsi_aktif")
      .eq("audit_id", id)
      .maybeSingle(),
  ]);

  const { data: audit, error: ralatAudit } = auditRes;
  const { data: dapatan, error: ralatDapatan } = dapatanRes;
  // laporanRes boleh null (laporan belum dijana) — ButangKongsi handle kes ini
  const tokenKongsi = laporanRes.data?.token_kongsi ?? null;
  const kongsiAktif = laporanRes.data?.kongsi_aktif ?? false;

  // Bezakan antara "tiada langsung" (notFound) dan "RLS/error" (papar mesej)
  if (!audit && !ralatAudit) notFound();
  if (!audit) {
    return (
      <div className="space-y-4">
        <Link
          href={`/audit/${id}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Audit
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Gagal muat audit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <div className="font-semibold">Tidak dapat akses rekod audit</div>
              <div className="mt-1 text-xs">
                {ralatAudit?.message ?? "Ralat tidak diketahui"}
              </div>
              <div className="mt-2 text-xs">
                Audit ID: <span className="font-mono">{id}</span>
              </div>
              <div className="mt-2 text-xs">
                Jika anda tidak sepatutnya nampak audit ini, sila hubungi admin.
                Jika sepatutnya nampak, semak peranan pengguna anda dalam jadual{" "}
                <span className="font-mono">pengguna</span> (mungkin profil
                belum dicipta).
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dapatanList = dapatan ?? [];
  const stats = { Y: 0, N: 0, NC: 0, OFI: 0, NA: 0, Pending: 0 } as Record<string, number>;
  let nc_major = 0,
    nc_minor = 0,
    nc_belum_gred = 0;
  for (const d of dapatanList) {
    stats[d.status as string] = (stats[d.status as string] ?? 0) + 1;
    if (d.status === "NC") {
      if (d.gred_nc === "major") nc_major++;
      else if (d.gred_nc === "minor") nc_minor++;
      else nc_belum_gred++;
    }
  }

  const ncList = dapatanList.filter((d) => d.status === "NC") as unknown as BarisDapatan[];
  const ofiList = dapatanList.filter((d) => d.status === "OFI") as unknown as BarisDapatan[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/audit/${id}`} className="text-sm text-muted-foreground hover:underline">
            ← Audit
          </Link>
          <h2 className="mt-2 text-2xl font-bold">Laporan Audit</h2>
          <p className="text-sm text-muted-foreground">
            {audit.no_rujukan} ·{" "}
            {(audit.pusat_operasi as { nama?: string } | null)?.nama ?? "-"} ·{" "}
            {formatTarikh(audit.tarikh_audit)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <a
            href={`/api/laporan/${id}/pdf`}
            target="_blank"
            rel="noopener"
            className="inline-flex h-10 items-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent"
          >
            Muat Turun PDF
          </a>
          <a
            href={`/api/laporan/${id}/pptx`}
            target="_blank"
            rel="noopener"
            className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Muat Turun PowerPoint
          </a>
          {/* Butang kongsi — urus pautan awam tanpa auth */}
          <ButangKongsi
            auditId={id}
            tokenAsal={tokenKongsi}
            aktifAsal={kongsiAktif}
          />
          <ButangCetak />
        </div>
      </div>

      {/* Amaran kalau Dexie ada dapatan belum di-sync untuk audit ini */}
      <AmaranSyncLaporan auditId={id} />

      <Card>
        <CardHeader>
          <CardTitle>Ringkasan Eksekutif</CardTitle>
        </CardHeader>
        <CardContent>
          {ralatDapatan && (
            <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <div className="font-semibold">Gagal muat dapatan</div>
              <div className="mt-1 text-xs">{ralatDapatan.message}</div>
            </div>
          )}
          {!ralatDapatan && dapatanList.length === 0 && (
            <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <div className="font-semibold">Tiada dapatan dijumpai untuk audit ini</div>
              <div className="mt-1 text-xs">
                Kemungkinan punca:
              </div>
              <ul className="ml-4 mt-1 list-disc text-xs">
                <li>Checklist belum diisi (buka tab Checklist dahulu).</li>
                <li>
                  Data masih dalam IndexedDB dan belum di-sync ke pelayan
                  (semak penunjuk sync di kanan atas).
                </li>
                <li>
                  Profil pengguna anda dalam jadual{" "}
                  <span className="font-mono">pengguna</span> mungkin belum
                  wujud (RLS akan sembunyikan semua dapatan).
                </li>
              </ul>
              <div className="mt-2 font-mono text-[11px]">
                Audit ID: {id}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {(["Y", "N", "NC", "OFI", "NA", "Pending"] as const).map((s) => (
              <div key={s} className="rounded-md border p-3 text-center">
                <BadgeStatus status={s} />
                <div className="mt-2 text-2xl font-bold">{stats[s] ?? 0}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-3">
            <div>
              <div className="text-xs uppercase text-muted-foreground">NC Major</div>
              <div className="text-xl font-bold">{nc_major}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">NC Minor</div>
              <div className="text-xl font-bold">{nc_minor}</div>
            </div>
            {nc_belum_gred > 0 && (
              <div>
                <div className="text-xs uppercase text-muted-foreground">
                  NC Tanpa Gred
                </div>
                <div className="text-xl font-bold text-amber-600">
                  {nc_belum_gred}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {ncList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Senarai Non-Conformity (NC)</CardTitle>
          </CardHeader>
          <CardContent>
            <JadualDapatan rows={ncList} />
          </CardContent>
        </Card>
      )}

      {ofiList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Opportunity for Improvement (OFI)</CardTitle>
          </CardHeader>
          <CardContent>
            <JadualDapatan rows={ofiList} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

type BarisDapatan = {
  id: string;
  status: StatusDapatan;
  gred_nc: GredNC | null;
  catatan: string | null;
  cadangan_tindakan: string | null;
  pic: string | null;
  item_semakan: {
    kod: string;
    tajuk: string;
    fail_rujukan: number | null;
  } | null;
};

function JadualDapatan({ rows }: { rows: BarisDapatan[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="p-2">Klausa</th>
            <th className="p-2">Item</th>
            <th className="p-2">Fail</th>
            <th className="p-2">Status</th>
            <th className="p-2">Catatan</th>
            <th className="p-2">PIC</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="p-2 font-mono text-xs">{r.item_semakan?.kod}</td>
              <td className="p-2">{r.item_semakan?.tajuk}</td>
              <td className="p-2 text-xs">
                {r.item_semakan?.fail_rujukan ? `Fail ${r.item_semakan.fail_rujukan}` : "-"}
              </td>
              <td className="p-2">
                <BadgeStatus status={r.status} />
                {r.gred_nc && (
                  <span className="ml-1 text-xs uppercase">({r.gred_nc})</span>
                )}
              </td>
              <td className="p-2 text-xs">{r.catatan ?? "-"}</td>
              <td className="p-2 text-xs">{r.pic ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
