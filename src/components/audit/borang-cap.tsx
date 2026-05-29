"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Butang } from "@/components/ui/butang";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { hantarCap, sahCap } from "@/app/(dashboard)/audit/actions";

interface Props {
  ncId: string;
  auditId: string;
  statusSemasa: string;
  tindakanSediaAda: string | null;
  adalahLead: boolean;
}

export function BorangCap({
  ncId,
  auditId,
  statusSemasa,
  tindakanSediaAda,
  adalahLead,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tindakan, setTindakan] = useState(tindakanSediaAda ?? "");
  const [ralat, setRalat] = useState<string | null>(null);
  const [mesejBerjaya, setMesejBerjaya] = useState<string | null>(null);

  if (statusSemasa === "in_progress" && !(tindakanSediaAda ?? "").trim()) {
    return (
      <div className="space-y-3">
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Tindakan pembetulan sedang disemak oleh Lead Auditor.
        </div>
        {adalahLead && (
          <div className="flex gap-2">
            <Butang
              type="button"
              className="bg-blue-600 text-white hover:bg-blue-700"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const hasil = await sahCap(ncId, auditId);
                  if (!hasil.ok) { setRalat(hasil.ralat ?? "Ralat"); return; }
                  setMesejBerjaya("CAP disahkan (Closed).");
                  router.refresh();
                });
              }}
            >
              Sahkan CAP (Close)
            </Butang>
          </div>
        )}
      </div>
    );
  }

  function handleHantar() {
    setRalat(null);
    setMesejBerjaya(null);
    if (tindakan.trim().length < 10) {
      setRalat("Tindakan pembetulan mesti sekurang-kurangnya 10 aksara.");
      return;
    }
    startTransition(async () => {
      const hasil = await hantarCap({ ncId, tindakanPembetulan: tindakan });
      if (!hasil.ok) { setRalat(hasil.ralat ?? "Ralat tidak diketahui"); return; }
      setMesejBerjaya("CAP dihantar dan sedang menunggu semakan Lead Auditor.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-semibold">
          Tindakan Pembetulan <span className="text-destructive">*</span>
        </label>
        <Textarea
          value={tindakan}
          onChange={(e) => setTindakan(e.target.value)}
          placeholder="Huraikan tindakan pembetulan yang diambil (min 10 aksara)..."
          rows={4}
          maxLength={2000}
          disabled={statusSemasa !== "open"}
        />
        <div className="mt-1 text-xs text-muted-foreground">
          {tindakan.length}/2000 aksara
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold">
          Bukti Pembetulan (opsyenal)
        </label>
        <Input type="file" accept="image/*,.pdf" disabled={statusSemasa !== "open"} />
        <div className="mt-1 text-xs text-muted-foreground">
          Upload gambar atau PDF sebagai bukti pembetulan.
        </div>
      </div>

      {ralat && (
        <div className="rounded border border-red-300 bg-red-50 p-2 text-xs text-red-900">
          {ralat}
        </div>
      )}
      {mesejBerjaya && (
        <div className="rounded border border-emerald-300 bg-emerald-50 p-2 text-xs text-emerald-900">
          {mesejBerjaya}
        </div>
      )}

      <div className="flex gap-2">
        {statusSemasa === "open" && (
          <Butang
            type="button"
            onClick={handleHantar}
            disabled={pending}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {pending ? "Menghantar..." : "Hantar CAP"}
          </Butang>
        )}
        {statusSemasa === "in_progress" && adalahLead && (
          <>
            <Butang
              type="button"
              className="bg-blue-600 text-white hover:bg-blue-700"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const hasil = await sahCap(ncId, auditId);
                  if (!hasil.ok) { setRalat(hasil.ralat ?? "Ralat"); return; }
                  setMesejBerjaya("CAP disahkan (Closed).");
                  router.refresh();
                });
              }}
            >
              Sahkan CAP (Close)
            </Butang>
          </>
        )}
      </div>
    </div>
  );
}
