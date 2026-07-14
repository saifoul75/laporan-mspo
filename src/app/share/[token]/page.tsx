import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { BadgeStatus } from "@/components/ui/badge-status";
import { formatTarikh } from "@/lib/utils";
import type { StatusDapatan, GredNC } from "@/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[a-zA-Z0-9_-]{8,}$/.test(token)) {
    return { title: "Laporan Tidak Dijumpai" };
  }
  const supabase = createPublicClient();

  const { data: laporan } = await supabase.rpc("dapatkan_laporan_dengan_token", {
    p_token: token,
  });

  if (!laporan || (Array.isArray(laporan) && laporan.length === 0)) {
    return { title: "Laporan Tidak Dijumpai" };
  }

  const first = Array.isArray(laporan) ? laporan[0] : laporan;

  const { data: auditData } = await supabase.rpc("dapatkan_audit_dengan_token", {
    p_token: token,
  });

  const auditInfo = Array.isArray(auditData) ? auditData[0] : auditData;

  if (!auditInfo) return { title: "Laporan Tidak Dijumpai" };

  const { data: poData } = await supabase.rpc("dapatkan_po_dengan_token", {
    p_token: token,
  });
  const poInfo = Array.isArray(poData) ? poData[0] : poData;

  return {
    title: `Laporan Audit ${auditInfo.no_rujukan ?? ""} — ${poInfo?.nama ?? ""}`,
  };
}

export default async function HalamanKongsiLaporan({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!/^[a-zA-Z0-9_-]{8,}$/.test(token)) notFound();

  const supabase = createPublicClient();

  const { data: laporanData } = await supabase.rpc("dapatkan_laporan_dengan_token", {
    p_token: token,
  });

  if (!laporanData || (Array.isArray(laporanData) && laporanData.length === 0)) {
    notFound();
  }

  const laporan = Array.isArray(laporanData) ? laporanData[0] : laporanData;

  if (!laporan || !laporan.audit_id) notFound();

  const auditId = laporan.audit_id as string;

  const [
    { data: auditRpc },
    { data: poData },
    { data: penggunaData },
    { data: dapatanData },
  ] = await Promise.all([
    supabase.rpc("dapatkan_audit_dengan_token", { p_token: token }),
    supabase.rpc("dapatkan_po_dengan_token", { p_token: token }),
    supabase.rpc("dapatkan_pengguna_dengan_token", { p_token: token }),
    supabase.rpc("dapatkan_dapatan_dengan_token", { p_token: token }),
  ]);

  const auditInfo = Array.isArray(auditRpc) ? auditRpc[0] : auditRpc;
  if (!auditInfo) notFound();

  const po = (Array.isArray(poData) ? poData[0] : poData) ?? {};
  const penggunaList = (Array.isArray(penggunaData) ? penggunaData : penggunaData ? [penggunaData] : []) as {
    id: string;
    nama_penuh: string;
  }[];

  const leadId = auditInfo.lead_auditor_id as string | undefined;
  const auditorIds = (auditInfo.auditor_ids as string[]) ?? [];

  const namaLead = leadId ? penggunaList.find((p) => p.id === leadId)?.nama_penuh ?? "" : "";
  const pembantuId = auditorIds.find((uid) => uid !== leadId);
  const namaAuditorLain = pembantuId
    ? penggunaList.find((p) => p.id === pembantuId)?.nama_penuh ?? ""
    : "";

  let dapatanList: Array<{
    id: string;
    status: string;
    gred_nc: string | null;
    catatan: string | null;
    cadangan_tindakan: string | null;
    pic: string | null;
    tarikh_siap_target: string | null;
  }> = [];

  if (dapatanData) {
    const raw = Array.isArray(dapatanData) ? dapatanData : [dapatanData];
    dapatanList = raw as typeof dapatanList;
  }

  if (!dapatanList || dapatanList.length === 0) {
    const { data: fallback } = await supabase
      .from("dapatan")
      .select("id, status, gred_nc, catatan, cadangan_tindakan, pic, tarikh_siap_target")
      .eq("audit_id", auditId);
    if (fallback) {
      dapatanList = fallback as typeof dapatanList;
    }
  }

  const stats = {
    Y: laporan.jumlah_y,
    N: laporan.jumlah_n,
    NCMaj: laporan.jumlah_nc_major,
    NCMin: laporan.jumlah_nc_minor,
    NC: (laporan.jumlah_nc_major ?? 0) + (laporan.jumlah_nc_minor ?? 0),
    OFI: laporan.jumlah_ofi,
    NA: laporan.jumlah_na,
    Pending: laporan.jumlah_pending,
  };

  const auditDisplay = {
    no_rujukan: auditInfo.no_rujukan,
    jenis_audit: auditInfo.jenis_audit,
    status: auditInfo.status,
    tarikh_audit: (auditInfo as { tarikh_audit?: string }).tarikh_audit,
    tarikh_tamat: (auditInfo as { tarikh_tamat?: string }).tarikh_tamat,
  };

  const ncList = dapatanList.filter((d) => d.status === "NC") as unknown as BarisDapatan[];
  const ofiList = dapatanList.filter((d) => d.status === "OFI") as unknown as BarisDapatan[];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm">
              M
            </div>
            <div>
              <div className="text-xs text-muted-foreground">RISDA Plantation Sdn Bhd</div>
              <div className="font-semibold text-sm">Laporan Audit MSPO — Paparan Awam (Baca Sahaja)</div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
        <div className="rounded-lg border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-xl font-bold sm:text-2xl">{auditDisplay.no_rujukan}</h1>
              <p className="text-sm text-muted-foreground">
                {(po as { nama?: string }).nama ?? ""}{" "}
                {(po as { wilayah?: string }).wilayah ? `· Wilayah ${(po as { wilayah?: string }).wilayah}` : ""}
                {(po as { daerah?: string }).daerah ? ` · ${(po as { daerah?: string }).daerah}` : ""}
                {(po as { negeri?: string }).negeri ? `, ${(po as { negeri?: string }).negeri}` : ""}
              </p>
              <p className="text-sm text-muted-foreground">
                {auditDisplay.tarikh_audit ? formatTarikh(auditDisplay.tarikh_audit) : ""}
                {auditDisplay.tarikh_tamat ? ` – ${formatTarikh(auditDisplay.tarikh_tamat)}` : ""}
              </p>
            </div>
            <a
              href={`/api/laporan/kongsi/${encodeURIComponent(token)}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Muat Turun PDF
            </a>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-4 text-sm sm:grid-cols-3">
            <MaklumatItem label="Jenis Audit" nilai={formatJenisAudit(String(auditDisplay.jenis_audit ?? ""))} />
            <MaklumatItem label="Status" nilai={formatStatusAudit(String(auditDisplay.status ?? ""))} />
            {(po as { keluasan_hektar?: number }).keluasan_hektar && (
              <MaklumatItem
                label="Keluasan"
                nilai={`${Number((po as { keluasan_hektar?: number }).keluasan_hektar).toLocaleString("ms-MY")} hek`}
              />
            )}
            {namaLead && <MaklumatItem label="Lead Auditor" nilai={namaLead} />}
            {namaAuditorLain && <MaklumatItem label="Auditor" nilai={namaAuditorLain} />}
            <MaklumatItem label="Standard" nilai="MS2530-2-2:2022" />
          </dl>
        </div>

        <div className="rounded-lg border bg-card p-5">
          <h2 className="mb-4 font-semibold">Ringkasan Dapatan</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {(
              [
                { label: "Y", nilai: stats.Y },
                { label: "N", nilai: stats.N },
                { label: "NC", nilai: stats.NC },
                { label: "OFI", nilai: stats.OFI },
                { label: "NA", nilai: stats.NA },
                { label: "Pending", nilai: stats.Pending },
              ] as const
            ).map(({ label, nilai }) => (
              <div key={label} className="rounded-md border p-3 text-center">
                <BadgeStatus status={label as StatusDapatan} />
                <div className="mt-2 text-2xl font-bold">{nilai}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-3 text-sm">
            <div>
              <div className="text-xs uppercase text-muted-foreground">NC Major</div>
              <div className="text-xl font-bold">{stats.NCMaj}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">NC Minor</div>
              <div className="text-xl font-bold">{stats.NCMin}</div>
            </div>
          </div>
        </div>

        {ncList.length > 0 && (
          <div className="rounded-lg border bg-card p-5">
            <h2 className="mb-4 font-semibold">
              Senarai Non-Conformity (NC){" "}
              <span className="text-sm font-normal text-muted-foreground">— {ncList.length} item</span>
            </h2>
            <JadualDapatan rows={ncList} />
          </div>
        )}

        {ofiList.length > 0 && (
          <div className="rounded-lg border bg-card p-5">
            <h2 className="mb-4 font-semibold">
              Peluang Penambahbaikan (OFI){" "}
              <span className="text-sm font-normal text-muted-foreground">— {ofiList.length} item</span>
            </h2>
            <JadualDapatan rows={ofiList} />
          </div>
        )}

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>Nota:</strong> Ini laporan baca sahaja yang dikongsi oleh juruaudit RISDA Plantation Sdn Bhd. Untuk
          pertanyaan, sila hubungi Jabatan Perladangan secara terus.
        </div>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        MSPO Audit | MS2530-2-2:2022 | RISDA Plantation Sdn Bhd
      </footer>
    </div>
  );
}

function MaklumatItem({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div>
      <dt className="text-xs uppercase text-muted-foreground">{label}</dt>
      <dd className="font-medium">{nilai}</dd>
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
  tarikh_siap_target: string | null;
  item_semakan?: {
    kod: string;
    tajuk: string;
    fail_rujukan: number | null;
  } | null;
};

function JadualDapatan({ rows }: { rows: BarisDapatan[] }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full min-w-[540px] text-sm">
        <thead className="border-b text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="p-2">Klausa</th>
            <th className="p-2">Item Semakan</th>
            <th className="p-2 whitespace-nowrap">Fail Rujukan</th>
            <th className="p-2">Status</th>
            <th className="p-2">Catatan / Dapatan</th>
            <th className="p-2">PIC</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.id} className="align-top">
              <td className="p-2 font-mono text-xs whitespace-nowrap">{r.item_semakan?.kod ?? "-"}</td>
              <td className="p-2 text-xs leading-relaxed">{r.item_semakan?.tajuk ?? "-"}</td>
              <td className="p-2 text-xs">
                {r.item_semakan?.fail_rujukan ? `Fail ${r.item_semakan.fail_rujukan}` : "-"}
              </td>
              <td className="p-2">
                <BadgeStatus status={r.status} />
                {r.gred_nc && (
                  <span className="ml-1 text-xs uppercase text-muted-foreground">({r.gred_nc})</span>
                )}
              </td>
              <td className="p-2 text-xs leading-relaxed">
                {r.catatan ?? "-"}
                {r.cadangan_tindakan && (
                  <div className="mt-1 text-muted-foreground">
                    <span className="font-medium">Cadangan:</span> {r.cadangan_tindakan}
                  </div>
                )}
                {r.tarikh_siap_target && (
                  <div className="mt-0.5 text-muted-foreground">
                    <span className="font-medium">Sasaran:</span> {formatTarikh(r.tarikh_siap_target)}
                  </div>
                )}
              </td>
              <td className="p-2 text-xs">{r.pic ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatJenisAudit(jenis: string): string {
  const map: Record<string, string> = {
    audit_dalaman: "Audit Dalaman",
    audit_pensijilan: "Audit Pensijilan",
    audit_pengawasan: "Audit Pengawasan",
    audit_persijilan_semula: "Audit Persijilan Semula",
  };
  return map[jenis] ?? jenis;
}

function formatStatusAudit(status: string): string {
  const map: Record<string, string> = {
    draf: "Draf",
    dijadual: "Dijadual",
    sedang_dijalankan: "Sedang Dijalankan",
    menunggu_semakan: "Menunggu Semakan",
    selesai: "Selesai",
    dibatalkan: "Dibatalkan",
  };
  return map[status] ?? status;
}
