// /share/[token] — Paparan laporan audit AWAM (tanpa log masuk)
// Laluan ini tersenarai dalam laluanAwam (middleware.ts) dan tidak memerlukan auth.
// Token diselesaikan → laporan → audit + dapatan. Token tidak sah → 404.

import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { BadgeStatus } from "@/components/ui/badge-status";
import { formatTarikh } from "@/lib/utils";
import type { StatusDapatan, GredNC } from "@/types";

// ─── Metadata ────────────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createPublicClient();

  const { data: laporan } = await supabase
    .from("laporan")
    .select("audit:audit_id (no_rujukan, pusat_operasi:pusat_operasi_id (nama))")
    .eq("token_kongsi", token)
    .eq("kongsi_aktif", true)
    .single();

  if (!laporan) return { title: "Laporan Tidak Dijumpai" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const audit = laporan.audit as any;
  return {
    title: `Laporan Audit ${audit?.no_rujukan ?? ""} — ${audit?.pusat_operasi?.nama ?? ""}`,
  };
}

// ─── Halaman ─────────────────────────────────────────────────────────────────
export default async function HalamanKongsiLaporan({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Sanitasi asas: token mestilah alphanumeric/dash/underscore sahaja
  if (!/^[a-zA-Z0-9_-]{8,}$/.test(token)) notFound();

  const supabase = createPublicClient();

  // 1. Selesaikan token → laporan + ringkasan statistik
  const { data: laporan } = await supabase
    .from("laporan")
    .select(
      "audit_id, jumlah_y, jumlah_n, jumlah_nc_major, jumlah_nc_minor, jumlah_ofi, jumlah_na, jumlah_pending"
    )
    .eq("token_kongsi", token)
    .eq("kongsi_aktif", true)
    .single();

  // Token tidak wujud atau dikahwinkan (disabled) → 404
  if (!laporan) notFound();

  const auditId = laporan.audit_id as string;

  // 2. Muat audit + pusat operasi secara selari dengan dapatan
  const [auditRes, dapatanRes] = await Promise.all([
    supabase
      .from("audit")
      .select(
        "id, no_rujukan, tarikh_audit, tarikh_tamat, jenis_audit, status, catatan, lead_auditor_id, auditor_ids, pusat_operasi:pusat_operasi_id (kod, nama, wilayah, daerah, negeri, keluasan_hektar)"
      )
      .eq("id", auditId)
      .single(),

    supabase
      .from("dapatan")
      .select(
        "id, status, gred_nc, catatan, cadangan_tindakan, pic, tarikh_siap_target, item_semakan:item_semakan_id (kod, tajuk, fail_rujukan, kriteria:kriteria_id (kod, prinsip:prinsip_id (kod, tajuk)))"
      )
      .eq("audit_id", auditId),
  ]);

  if (!auditRes.data) notFound();

  const audit = auditRes.data;
  const dapatanList = dapatanRes.data ?? [];

  // 3. Nama auditor (optional — kegagalan tidak sekat paparan)
  let namaLead = "";
  let namaAuditorLain = "";

  if (audit.lead_auditor_id) {
    const { data: p } = await supabase
      .from("pengguna")
      .select("nama_penuh")
      .eq("id", audit.lead_auditor_id)
      .single();
    namaLead = p?.nama_penuh ?? "";
  }

  const auditorIds: string[] = (audit.auditor_ids as string[]) ?? [];
  const pembantuId = auditorIds.find((uid) => uid !== audit.lead_auditor_id);
  if (pembantuId) {
    const { data: p } = await supabase
      .from("pengguna")
      .select("nama_penuh")
      .eq("id", pembantuId)
      .single();
    namaAuditorLain = p?.nama_penuh ?? "";
  }

  // 4. Pisahkan dapatan mengikut status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const po = (audit.pusat_operasi as any) ?? {};

  const ncList = dapatanList.filter(
    (d) => d.status === "NC"
  ) as unknown as BarisDapatan[];
  const ofiList = dapatanList.filter(
    (d) => d.status === "OFI"
  ) as unknown as BarisDapatan[];

  // Statistik langsung dari jadual laporan (lebih dipercayai)
  const stats = {
    Y: laporan.jumlah_y,
    N: laporan.jumlah_n,
    NCMaj: laporan.jumlah_nc_major,
    NCMin: laporan.jumlah_nc_minor,
    NC: laporan.jumlah_nc_major + laporan.jumlah_nc_minor,
    OFI: laporan.jumlah_ofi,
    NA: laporan.jumlah_na,
    Pending: laporan.jumlah_pending,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="border-b bg-card px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm">
              M
            </div>
            <div>
              <div className="text-xs text-muted-foreground">
                RISDA Plantation Sdn Bhd
              </div>
              <div className="font-semibold text-sm">
                Laporan Audit MSPO — Paparan Awam (Baca Sahaja)
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
        {/* ── Maklumat Audit ── */}
        <div className="rounded-lg border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-xl font-bold sm:text-2xl">
                {audit.no_rujukan}
              </h1>
              <p className="text-sm text-muted-foreground">
                {po.nama} {po.wilayah ? `· Wilayah ${po.wilayah}` : ""}
                {po.daerah ? ` · ${po.daerah}` : ""}
                {po.negeri ? `, ${po.negeri}` : ""}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatTarikh(audit.tarikh_audit)}
                {audit.tarikh_tamat
                  ? ` – ${formatTarikh(audit.tarikh_tamat)}`
                  : ""}
              </p>
            </div>
            {/* Butang Muat Turun PDF */}
            <a
              href={`/api/laporan/kongsi/${token}/pdf`}
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

          {/* Grid maklumat tambahan */}
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-4 text-sm sm:grid-cols-3">
            <MaklumatItem label="Jenis Audit" nilai={formatJenisAudit(audit.jenis_audit)} />
            <MaklumatItem label="Status" nilai={formatStatusAudit(audit.status)} />
            {po.keluasan_hektar && (
              <MaklumatItem
                label="Keluasan"
                nilai={`${Number(po.keluasan_hektar).toLocaleString("ms-MY")} hek`}
              />
            )}
            {namaLead && <MaklumatItem label="Lead Auditor" nilai={namaLead} />}
            {namaAuditorLain && (
              <MaklumatItem label="Auditor" nilai={namaAuditorLain} />
            )}
            <MaklumatItem label="Standard" nilai="MS2530-2-2:2022" />
          </dl>
        </div>

        {/* ── Ringkasan Statistik ── */}
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

        {/* ── Senarai NC ── */}
        {ncList.length > 0 && (
          <div className="rounded-lg border bg-card p-5">
            <h2 className="mb-4 font-semibold">
              Senarai Non-Conformity (NC){" "}
              <span className="text-sm font-normal text-muted-foreground">
                — {ncList.length} item
              </span>
            </h2>
            <JadualDapatan rows={ncList} />
          </div>
        )}

        {/* ── Senarai OFI ── */}
        {ofiList.length > 0 && (
          <div className="rounded-lg border bg-card p-5">
            <h2 className="mb-4 font-semibold">
              Peluang Penambahbaikan (OFI){" "}
              <span className="text-sm font-normal text-muted-foreground">
                — {ofiList.length} item
              </span>
            </h2>
            <JadualDapatan rows={ofiList} />
          </div>
        )}

        {/* Nota bawah */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>Nota:</strong> Ini laporan baca sahaja yang dikongsi oleh
          juruaudit RISDA Plantation Sdn Bhd. Untuk pertanyaan, sila hubungi
          Jabatan Perladangan secara terus.
        </div>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        MSPO Audit | MS2530-2-2:2022 | RISDA Plantation Sdn Bhd
      </footer>
    </div>
  );
}

// ─── Komponen Dalaman ─────────────────────────────────────────────────────────

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
  item_semakan: {
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
              <td className="p-2 font-mono text-xs whitespace-nowrap">
                {r.item_semakan?.kod ?? "-"}
              </td>
              <td className="p-2 text-xs leading-relaxed">
                {r.item_semakan?.tajuk ?? "-"}
              </td>
              <td className="p-2 text-xs">
                {r.item_semakan?.fail_rujukan
                  ? `Fail ${r.item_semakan.fail_rujukan}`
                  : "-"}
              </td>
              <td className="p-2">
                <BadgeStatus status={r.status} />
                {r.gred_nc && (
                  <span className="ml-1 text-xs uppercase text-muted-foreground">
                    ({r.gred_nc})
                  </span>
                )}
              </td>
              <td className="p-2 text-xs leading-relaxed">
                {r.catatan ?? "-"}
                {r.cadangan_tindakan && (
                  <div className="mt-1 text-muted-foreground">
                    <span className="font-medium">Cadangan:</span>{" "}
                    {r.cadangan_tindakan}
                  </div>
                )}
                {r.tarikh_siap_target && (
                  <div className="mt-0.5 text-muted-foreground">
                    <span className="font-medium">Sasaran:</span>{" "}
                    {formatTarikh(r.tarikh_siap_target)}
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

// ─── Pembantu Format ──────────────────────────────────────────────────────────

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
