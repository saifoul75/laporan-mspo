"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Butang } from "@/components/ui/butang";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface BuktiSedia {
  id: string;
  url_storan: string;
  nama_fail: string;
  url_paparan?: string;
}

interface Props {
  dapatanId: string;
  buktiSedia?: BuktiSedia[];
  onUpload?: (bukti: BuktiSedia) => void;
  onPadam?: (id: string) => void;
}

const MAKSIMUM_SAIZ = 10 * 1024 * 1024; // 10MB
const JENIS_DIBENARKAN = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export function MuatNaikBukti({
  dapatanId,
  buktiSedia = [],
  onUpload,
  onPadam,
}: Props) {
  const [memuat, setMemuat] = useState(false);
  const [ralat, setRalat] = useState<string | null>(null);
  const [progres, setProgres] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function dapatkanLokasi(): Promise<{ lat?: number; lon?: number }> {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      return {};
    }
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          }),
        () => resolve({}),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    });
  }

  async function muatNaik(fail: File) {
    setRalat(null);

    if (fail.size > MAKSIMUM_SAIZ) {
      setRalat(`Saiz fail melebihi 10 MB.`);
      return;
    }
    if (!JENIS_DIBENARKAN.includes(fail.type)) {
      setRalat("Hanya gambar (JPG/PNG/WEBP) atau PDF dibenarkan.");
      return;
    }

    setMemuat(true);
    setProgres("Mendapatkan lokasi...");
    const { lat, lon } = await dapatkanLokasi();

    setProgres("Memuat naik fail...");
    const supabase = createClient();
    const sambungan = fail.name.split(".").pop() ?? "bin";
    const namaFailStor = `${dapatanId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${sambungan}`;

    const { error: ralatNaik } = await supabase.storage
      .from("bukti-audit")
      .upload(namaFailStor, fail, { contentType: fail.type, upsert: false });

    if (ralatNaik) {
      setRalat("Gagal muat naik: " + ralatNaik.message);
      setMemuat(false);
      setProgres(null);
      return;
    }

    setProgres("Menyimpan rekod...");
    const jenis = fail.type === "application/pdf" ? "dokumen" : "gambar";
    const { data, error: ralatInsert } = await supabase
      .from("bukti")
      .insert({
        dapatan_id: dapatanId,
        jenis,
        url_storan: namaFailStor,
        nama_fail: fail.name,
        saiz_bait: fail.size,
        latitud: lat ?? null,
        longitud: lon ?? null,
      })
      .select("id, url_storan, nama_fail")
      .single();

    if (ralatInsert || !data) {
      setRalat("Gagal simpan rekod: " + (ralatInsert?.message ?? "tidak diketahui"));
      setMemuat(false);
      setProgres(null);
      return;
    }

    // Dapatkan signed URL untuk preview
    const { data: urlData } = await supabase.storage
      .from("bukti-audit")
      .createSignedUrl(namaFailStor, 3600);

    onUpload?.({
      id: data.id,
      url_storan: data.url_storan,
      nama_fail: data.nama_fail,
      url_paparan: urlData?.signedUrl,
    });

    setMemuat(false);
    setProgres(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function padam(bukti: BuktiSedia) {
    if (!confirm(`Padam bukti "${bukti.nama_fail}"?`)) return;
    const supabase = createClient();
    await supabase.storage.from("bukti-audit").remove([bukti.url_storan]);
    await supabase.from("bukti").delete().eq("id", bukti.id);
    onPadam?.(bukti.id);
  }

  return (
    <div className="space-y-2">
      <Label>Bukti Audit (gambar / PDF)</Label>

      <div
        className={cn(
          "rounded-md border-2 border-dashed p-3 text-center transition-colors",
          memuat ? "border-primary bg-primary/5" : "border-input hover:bg-accent/30"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={JENIS_DIBENARKAN.join(",")}
          capture="environment"
          disabled={memuat}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) muatNaik(f);
          }}
          className="hidden"
          id={`fail-${dapatanId}`}
        />
        <label
          htmlFor={`fail-${dapatanId}`}
          className={cn(
            "inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90",
            memuat && "cursor-not-allowed opacity-50"
          )}
        >
          {memuat ? progres ?? "Memuat naik..." : "Pilih / Ambil Gambar"}
        </label>
        <p className="mt-2 text-xs text-muted-foreground">
          Maks 10 MB. JPG, PNG, WEBP, atau PDF.
        </p>
      </div>

      {ralat && (
        <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          {ralat}
        </p>
      )}

      {buktiSedia.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {buktiSedia.map((b) => (
            <div key={b.id} className="group relative rounded-md border bg-card p-2">
              {b.url_paparan && b.nama_fail.match(/\.(jpe?g|png|webp)$/i) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={b.url_paparan}
                  alt={b.nama_fail}
                  className="aspect-square w-full rounded object-cover"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center rounded bg-muted text-xs">
                  PDF
                </div>
              )}
              <div className="mt-1 truncate text-xs" title={b.nama_fail}>
                {b.nama_fail}
              </div>
              <Butang
                type="button"
                size="sm"
                variant="destructive"
                className="mt-1 h-6 w-full text-xs"
                onClick={() => padam(b)}
              >
                Padam
              </Butang>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
