"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Butang } from "@/components/ui/butang";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const skema = z.object({
  kod: z.string().min(2, "Kod PO diperlukan"),
  nama: z.string().min(3, "Nama PO diperlukan"),
  wilayah: z.string().min(1, "Pilih wilayah"),
  daerah: z.string().optional(),
  negeri: z.string().optional(),
  keluasan_hektar: z.string().optional(),
});

type DataPO = z.infer<typeof skema>;

const WILAYAH = ["Utara 1", "Utara 2", "Tengah 1", "Tengah 2", "Selatan 1", "Selatan 2", "Timur 1", "Timur 2"];

export function BorangPusatOperasi() {
  const router = useRouter();
  const [memuat, setMemuat] = useState(false);
  const [ralat, setRalat] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DataPO>({ resolver: zodResolver(skema) });

  async function onSubmit(data: DataPO) {
    setMemuat(true);
    setRalat(null);
    const supabase = createClient();
    const keluasan = data.keluasan_hektar
      ? parseFloat(data.keluasan_hektar)
      : null;
    const { error } = await supabase.from("pusat_operasi").insert({
      kod: data.kod,
      nama: data.nama,
      wilayah: data.wilayah,
      daerah: data.daerah || null,
      negeri: data.negeri || null,
      keluasan_hektar: keluasan && !Number.isNaN(keluasan) ? keluasan : null,
    });
    if (error) {
      setRalat(error.message);
      setMemuat(false);
      return;
    }
    reset();
    setMemuat(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="kod">Kod PO</Label>
          <Input id="kod" placeholder="PO1" {...register("kod")} />
          {errors.kod && <p className="text-xs text-destructive">{errors.kod.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="wilayah">Wilayah</Label>
          <Select id="wilayah" {...register("wilayah")}>
            <option value="">-- Pilih --</option>
            {WILAYAH.map((w) => (
              <option key={w} value={w}>
                Wilayah {w}
              </option>
            ))}
          </Select>
          {errors.wilayah && (
            <p className="text-xs text-destructive">{errors.wilayah.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="nama">Nama Pusat Operasi</Label>
        <Input id="nama" placeholder="RISDA Wilayah Utara 1" {...register("nama")} />
        {errors.nama && <p className="text-xs text-destructive">{errors.nama.message}</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="daerah">Daerah</Label>
          <Input id="daerah" {...register("daerah")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="negeri">Negeri</Label>
          <Input id="negeri" {...register("negeri")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="keluasan_hektar">Keluasan (ha)</Label>
          <Input id="keluasan_hektar" type="number" step="0.01" {...register("keluasan_hektar")} />
        </div>
      </div>

      {ralat && (
        <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
          {ralat}
        </p>
      )}

      <Butang type="submit" disabled={memuat}>
        {memuat ? "Menyimpan..." : "Daftar PO"}
      </Butang>
    </form>
  );
}
