"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Butang } from "@/components/ui/butang";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { sahkanKehadiran, sahkanKehadiranBatch, mulakanAuditDaripadaOpening } from "@/app/(dashboard)/audit/actions";

interface Props {
  auditId: string;
  status: string;
  adalahLead: boolean;
  senaraiKehadiran: { id: string; nama: string; jawatan: string; ditandatangan_pada: string }[];
}

export function BorangKehadiranOpening({
  auditId,
  status,
  adalahLead,
  senaraiKehadiran,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [nama, setNama] = useState("");
  const [jawatan, setJawatan] = useState("");
  const [ralat, setRalat] = useState<string | null>(null);
  const [mesej, setMesej] = useState<string | null>(null);
  const [modeBatch, setModeBatch] = useState(false);
  const [batchText, setBatchText] = useState("");

  function handleDaftar() {
    setRalat(null);
    setMesej(null);
    startTransition(async () => {
      const hasil = await sahkanKehadiran({ auditId, nama, jawatan });
      if (!hasil.ok) { setRalat(hasil.ralat ?? "Ralat"); return; }
      setMesej("Kehadiran direkodkan.");
      setNama("");
      setJawatan("");
      router.refresh();
    });
  }

  function handleDaftarBatch() {
    setRalat(null);
    setMesej(null);
    const lines = batchText.split("\n").filter((l) => l.trim());
    const senarai: { nama: string; jawatan: string }[] = [];
    for (const line of lines) {
      const parts = line.split(/ [-–,] /);
      if (parts.length >= 2) {
        senarai.push({ nama: parts[0].trim(), jawatan: parts.slice(1).join(" ").trim() });
      } else {
        senarai.push({ nama: line.trim(), jawatan: "-" });
      }
    }
    if (senarai.length === 0) { setRalat("Tiada data untuk didaftar."); return; }
    startTransition(async () => {
      const hasil = await sahkanKehadiranBatch({ auditId, senarai });
      if (!hasil.ok) { setRalat(hasil.ralat ?? "Ralat"); return; }
      setMesej(`${hasil.count} kehadiran direkodkan.`);
      setBatchText("");
      router.refresh();
    });
  }

  function handleMulakan() {
    setRalat(null);
    setMesej(null);
    startTransition(async () => {
      const hasil = await mulakanAuditDaripadaOpening(auditId);
      if (!hasil.ok) { setRalat(hasil.ralat ?? "Ralat"); return; }
      setMesej("Audit dimulakan. Status kini: Sedang Dijalankan.");
      router.refresh();
    });
  }

  const formatMasa = (iso: string) =>
    new Date(iso).toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-4 rounded-md border border-blue-300 bg-blue-50/50 p-4 text-sm">
      <div>
        <div className="text-base font-semibold text-blue-900">Opening Meeting — Kehadiran</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Sahkan kehadiran auditee sebelum audit dimulakan.
        </div>
      </div>

      {/* Senarai kehadiran */}
      {senaraiKehadiran.length > 0 && (
        <div className="rounded border bg-white">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-semibold">Nama</th>
                <th className="px-3 py-2 text-left font-semibold">Jawatan</th>
                <th className="px-3 py-2 text-left font-semibold">Masa</th>
              </tr>
            </thead>
            <tbody>
              {senaraiKehadiran.map((k) => (
                <tr key={k.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{k.nama}</td>
                  <td className="px-3 py-2">{k.jawatan}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatMasa(k.ditandatangan_pada)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Toggle mode */}
      <div className="flex gap-2 text-xs">
        <button type="button" onClick={() => setModeBatch(false)} className={`rounded px-3 py-1 ${!modeBatch ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground"}`}>Satu-satu</button>
        <button type="button" onClick={() => setModeBatch(true)} className={`rounded px-3 py-1 ${modeBatch ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground"}`}>Batch (ramai)</button>
      </div>

      {/* Form daftar hadir */}
      {!modeBatch ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold">Nama <span className="text-destructive">*</span></label>
            <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama penuh" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">Jawatan <span className="text-destructive">*</span></label>
            <Input value={jawatan} onChange={(e) => setJawatan(e.target.value)} placeholder="Jawatan" />
          </div>
        </div>
      ) : (
        <div>
          <label className="mb-1 block text-xs font-semibold">Senarai Nama <span className="text-destructive">*</span></label>
          <Textarea
            value={batchText}
            onChange={(e) => setBatchText(e.target.value)}
            placeholder={'Satu nama per baris. Format: Nama - Jawatan\n\nAli bin Abu - Pengurus Ladang\nSiti binti Ahmad - Kerani\nMuthu a/l Ramasamy - Mandor'}
            rows={6}
          />
          <div className="mt-1 text-xs text-muted-foreground">Pisahkan nama dan jawatan dengan &quot;-&quot; atau &quot;,&quot;. Satu baris = satu orang.</div>
        </div>
      )}

      {ralat && (
        <div className="rounded border border-red-300 bg-red-50 p-2 text-xs text-red-900">
          {ralat}
        </div>
      )}
      {mesej && (
        <div className="rounded border border-emerald-300 bg-emerald-50 p-2 text-xs text-emerald-900">
          {mesej}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!modeBatch ? (
          <Butang type="button" onClick={handleDaftar} disabled={pending} variant="outline">
            {pending ? "Mendaftar..." : "Daftar Hadir"}
          </Butang>
        ) : (
          <Butang type="button" onClick={handleDaftarBatch} disabled={pending} className="bg-green-600 text-white hover:bg-green-700">
            {pending ? "Mendaftar..." : `Daftar Semua`}
          </Butang>
        )}
        {adalahLead && status === "dijadual" && senaraiKehadiran.length > 0 && (
          <Butang
            type="button"
            onClick={handleMulakan}
            disabled={pending}
            className="bg-blue-700 text-white hover:bg-blue-800"
          >
            {pending ? "Memulakan..." : "Mula Audit (Opening Selesai)"}
          </Butang>
        )}
      </div>
    </div>
  );
}
