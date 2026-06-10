"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Butang } from "@/components/ui/butang";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioItem } from "@/components/ui/radio-group";
import {
  muktamadkanAudit,
  previewGredCap,
  type GredNc,
  type PreviewCap,
} from "@/app/(dashboard)/audit/actions";

interface Props {
  auditId: string;
  noRujukan: string;
  bolehMuktamad: boolean; // false kalau bukan admin/lead atau status tak sesuai
  sebabTakBoleh?: string | null;
}

type ModeOverride = "none" | "tetapan_lead";
type OverrideGred = "major" | "minor" | "tiada";

export function BorangMuktamadkanAudit({
  auditId,
  noRujukan,
  bolehMuktamad,
  sebabTakBoleh,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<PreviewCap | null>(null);
  const [ralatPreview, setRalatPreview] = useState<string | null>(null);
  const [bukaSahkan, setBukaSahkan] = useState(false);
  const [mode, setMode] = useState<ModeOverride>("none");
  const [overrideGred, setOverrideGred] = useState<OverrideGred>("minor");
  const [overrideReason, setOverrideReason] = useState("");
  const [ralat, setRalat] = useState<string | null>(null);

  // Muat preview gred bila buka panel sahkan
  useEffect(() => {
    if (!bukaSahkan) return;
    let cancel = false;
    (async () => {
      setRalatPreview(null);
      const hasil = await previewGredCap(auditId);
      if (cancel) return;
      if (!hasil.ok) {
        setRalatPreview(hasil.ralat);
        setPreview(null);
      } else {
        setPreview(hasil);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [bukaSahkan, auditId]);

  if (!bolehMuktamad) {
    return (
      <div className="rounded-md border border-muted bg-muted/30 p-4 text-sm">
        <div className="font-semibold">Muktamadkan Keputusan Audit</div>
        <div className="mt-1 text-muted-foreground">
          {sebabTakBoleh ?? "Anda tiada kebenaran untuk muktamadkan audit ini."}
        </div>
      </div>
    );
  }

  if (!bukaSahkan) {
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1">
            <div className="font-semibold">Muktamadkan Keputusan Audit</div>
            <div className="mt-1 text-xs">
              Selepas dimuktamadkan, sistem akan kira tarikh akhir CAP secara
              automatik (Major: +30 hari, Minor: +90 hari) dan kunci keputusan.
              Tindakan ini tidak boleh dibatalkan tanpa rollback DB.
            </div>
          </div>
          <Butang
            type="button"
            onClick={() => setBukaSahkan(true)}
            className="bg-amber-600 text-white hover:bg-amber-700"
          >
            Mulakan Closing
          </Butang>
        </div>
      </div>
    );
  }

  function handleSubmit() {
    setRalat(null);

    const overrideAktif = mode === "tetapan_lead";
    if (overrideAktif && overrideReason.trim().length < 10) {
      setRalat("Sebab override mesti sekurang-kurangnya 10 aksara.");
      return;
    }

    startTransition(async () => {
      const hasil = await muktamadkanAudit({
        auditId,
        override: overrideAktif
          ? {
              gred:
                overrideGred === "tiada"
                  ? null
                  : (overrideGred as GredNc),
              reason: overrideReason,
            }
          : undefined,
      });
      if (!hasil.ok) {
        setRalat(hasil.ralat ?? "Ralat tidak diketahui");
        return;
      }
      router.refresh();
    });
  }

  // Gred efektif untuk preview tarikh: ikut override kalau aktif, kalau tidak ikut auto
  const gredEfektif: GredNc | null =
    mode === "tetapan_lead"
      ? overrideGred === "tiada"
        ? null
        : (overrideGred as GredNc)
      : preview?.gred_auto ?? null;
   const hariEfektif =
     gredEfektif === "major" ? 30 : gredEfektif === "minor" ? 90 : null;
   const tarikhDueEfektif = hariEfektif
     ? (() => {
         // eslint-disable-next-line react-hooks/purity -- statik display; tidak di dalam loop/interval
         return new Date(Date.now() + hariEfektif * 86_400_000);
       })()
     : null;

  return (
    <div className="space-y-4 rounded-md border border-amber-400 bg-amber-50/50 p-4 text-sm">
      <div>
        <div className="text-base font-semibold">
          Muktamadkan Keputusan: {noRujukan}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Semak gred CAP dan klik Muktamadkan untuk kunci keputusan.
        </div>
      </div>

      {/* Preview kiraan dapatan */}
      {ralatPreview ? (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-xs text-red-900">
          Ralat muat preview: {ralatPreview}
        </div>
      ) : !preview ? (
        <div className="text-xs text-muted-foreground">Memuat preview...</div>
      ) : (
        <div className="space-y-2 rounded border border-amber-200 bg-white p-3">
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            Ringkasan Dapatan
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <Sel label="NC Major" nilai={preview.bil_nc_major} warna="merah" />
            <Sel label="NC Minor" nilai={preview.bil_nc_minor} warna="oren" />
            <Sel label="OFI" nilai={preview.bil_ofi} warna="biru" />
            <Sel
              label="Pending"
              nilai={preview.bil_pending}
              warna={preview.bil_pending > 0 ? "merah" : "kelabu"}
            />
          </div>
          {preview.bil_pending > 0 && (
            <div className="rounded border border-red-300 bg-red-50 p-2 text-xs text-red-900">
              Ada {preview.bil_pending} dapatan masih Pending. Lengkapkan
              checklist sebelum muktamadkan.
            </div>
          )}
          <div className="border-t border-dashed pt-2 text-xs">
            <span className="text-muted-foreground">Auto-detect gred:</span>{" "}
            <strong>
              {preview.gred_auto === "major"
                ? "MAJOR (30 hari)"
                : preview.gred_auto === "minor"
                  ? "MINOR (90 hari)"
                  : "Tiada NC — tiada CAP wajib"}
            </strong>
          </div>
        </div>
      )}

      {/* Mode auto vs override */}
      <div>
        <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
          Sumber Gred CAP
        </div>
        <RadioGroup
          value={mode}
          onValueChange={(v) => setMode(v as ModeOverride)}
        >
          <RadioItem value="none">
            <div>
              <div className="font-medium">Auto (Highest Finding)</div>
              <div className="text-xs text-muted-foreground">
                Sistem ambil gred tertinggi dari dapatan secara automatik.
              </div>
            </div>
          </RadioItem>
          <RadioItem value="tetapan_lead">
            <div>
              <div className="font-medium">Manual Override (Lead Auditor)</div>
              <div className="text-xs text-muted-foreground">
                Untuk kes pembelaan auditee yang Lead bersetuju turunkan gred.
                Wajib isi sebab.
              </div>
            </div>
          </RadioItem>
        </RadioGroup>
      </div>

      {mode === "tetapan_lead" && (
        <div className="space-y-3 rounded border border-blue-300 bg-blue-50/50 p-3">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              Gred Override
            </div>
            <RadioGroup
              value={overrideGred}
              onValueChange={(v) => setOverrideGred(v as OverrideGred)}
            >
              <RadioItem value="major">
                <span className="font-medium">MAJOR</span>{" "}
                <span className="text-xs text-muted-foreground">
                  → CAP +30 hari
                </span>
              </RadioItem>
              <RadioItem value="minor">
                <span className="font-medium">MINOR</span>{" "}
                <span className="text-xs text-muted-foreground">
                  → CAP +90 hari
                </span>
              </RadioItem>
              <RadioItem value="tiada">
                <span className="font-medium">TIADA CAP</span>{" "}
                <span className="text-xs text-muted-foreground">
                  → Tidak wajib (rare, untuk audit OFI sahaja)
                </span>
              </RadioItem>
            </RadioGroup>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
              Sebab Override (min 10 aksara) <span className="text-red-600">*</span>
            </label>
            <Textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Cth: Auditee bagi pembelaan dengan dokumen sokongan Fail 4. Lead Auditor bersetuju turunkan gred."
              rows={3}
              maxLength={500}
            />
            <div className="mt-1 text-xs text-muted-foreground">
              {overrideReason.length}/500 aksara — disimpan dalam audit trail
              MSPO
            </div>
          </div>
        </div>
      )}

      {/* Preview tarikh CAP due */}
      <div className="rounded border border-emerald-300 bg-emerald-50 p-3">
        <div className="text-xs font-semibold uppercase text-emerald-900">
          Tarikh Akhir CAP (Anggaran)
        </div>
        <div className="mt-1 text-sm">
          {tarikhDueEfektif ? (
            <>
              <strong>
                {tarikhDueEfektif.toLocaleDateString("ms-MY", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </strong>{" "}
              <span className="text-xs text-muted-foreground">
                ({hariEfektif} hari dari sekarang)
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">
              Tiada CAP wajib (tiada NC).
            </span>
          )}
        </div>
      </div>

      {ralat && (
        <div className="rounded border border-red-300 bg-red-50 p-2 text-xs text-red-900">
          {ralat}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t pt-3">
        <Butang
          type="button"
          onClick={handleSubmit}
          disabled={pending || (preview ? preview.bil_pending > 0 : false)}
          className="bg-amber-600 text-white hover:bg-amber-700"
        >
          {pending ? "Memuktamadkan..." : "Muktamadkan Sekarang"}
        </Butang>
        <Butang
          type="button"
          variant="outline"
          onClick={() => {
            setBukaSahkan(false);
            setMode("none");
            setOverrideReason("");
            setRalat(null);
          }}
          disabled={pending}
        >
          Batal
        </Butang>
      </div>
    </div>
  );
}

function Sel({
  label,
  nilai,
  warna,
}: {
  label: string;
  nilai: number;
  warna: "merah" | "oren" | "biru" | "kelabu";
}) {
  const kelas =
    warna === "merah"
      ? "border-red-300 bg-red-50 text-red-900"
      : warna === "oren"
        ? "border-orange-300 bg-orange-50 text-orange-900"
        : warna === "biru"
          ? "border-blue-300 bg-blue-50 text-blue-900"
          : "border-gray-300 bg-gray-50 text-gray-700";
  return (
    <div className={`rounded border p-2 ${kelas}`}>
      <div className="text-[10px] uppercase">{label}</div>
      <div className="text-lg font-bold">{nilai}</div>
    </div>
  );
}
