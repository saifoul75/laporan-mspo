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
import { Textarea } from "@/components/ui/textarea";

const skema = z.object({
  pusat_operasi_id: z.string().uuid("Pilih Pusat Operasi"),
  tarikh_audit: z.string().min(1, "Pilih tarikh audit"),
  tarikh_tamat: z.string().optional(),
  jenis_audit: z.enum([
    "audit_dalaman",
    "audit_pensijilan",
    "audit_pengawasan",
    "audit_persijilan_semula",
  ]),
  catatan: z.string().optional(),
});

type DataAudit = z.infer<typeof skema>;

interface Props {
  senaraiPO: { id: string; kod: string; nama: string; wilayah: string }[];
  senaraiAuditor: { id: string; nama_penuh: string; rol: string }[];
  penggunaSemasa: { id: string };
}

function janaNoRujukan() {
  const tarikh = new Date();
  const yyyy = tarikh.getFullYear();
  const mm = String(tarikh.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `MSPO-${yyyy}${mm}-${random}`;
}

export function BorangAuditBaru({ senaraiPO, penggunaSemasa }: Props) {
  const router = useRouter();
  const [memuat, setMemuat] = useState(false);
  const [ralat, setRalat] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DataAudit>({
    resolver: zodResolver(skema),
    defaultValues: { jenis_audit: "audit_dalaman" },
  });

  async function onSubmit(data: DataAudit) {
    setMemuat(true);
    setRalat(null);
    const supabase = createClient();
    const noRujukan = janaNoRujukan();

    const { data: audit, error } = await supabase
      .from("audit")
      .insert({
        no_rujukan: noRujukan,
        pusat_operasi_id: data.pusat_operasi_id,
        lead_auditor_id: penggunaSemasa.id,
        auditor_ids: [penggunaSemasa.id],
        tarikh_audit: data.tarikh_audit,
        tarikh_tamat: data.tarikh_tamat || null,
        jenis_audit: data.jenis_audit,
        status: "draf",
        catatan: data.catatan || null,
      })
      .select("id")
      .single();

    if (error || !audit) {
      setRalat(error?.message ?? "Gagal cipta audit");
      setMemuat(false);
      return;
    }

    router.push(`/audit/${audit.id}/checklist`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="pusat_operasi_id">Pusat Operasi</Label>
        <Select id="pusat_operasi_id" {...register("pusat_operasi_id")}>
          <option value="">-- Pilih Pusat Operasi --</option>
          {senaraiPO.map((po) => (
            <option key={po.id} value={po.id}>
              {po.kod} - {po.nama} ({po.wilayah})
            </option>
          ))}
        </Select>
        {errors.pusat_operasi_id && (
          <p className="text-xs text-destructive">
            {errors.pusat_operasi_id.message}
          </p>
        )}
        {senaraiPO.length === 0 && (
          <p className="text-xs text-amber-700">
            Tiada Pusat Operasi didaftar. Sila daftar PO dahulu di menu Pusat
            Operasi.
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tarikh_audit">Tarikh Mula</Label>
          <Input
            id="tarikh_audit"
            type="date"
            {...register("tarikh_audit")}
          />
          {errors.tarikh_audit && (
            <p className="text-xs text-destructive">
              {errors.tarikh_audit.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="tarikh_tamat">Tarikh Tamat (opsyenal)</Label>
          <Input id="tarikh_tamat" type="date" {...register("tarikh_tamat")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="jenis_audit">Jenis Audit</Label>
        <Select id="jenis_audit" {...register("jenis_audit")}>
          <option value="audit_dalaman">Audit Dalaman</option>
          <option value="audit_pensijilan">Audit Pensijilan</option>
          <option value="audit_pengawasan">Audit Pengawasan</option>
          <option value="audit_persijilan_semula">Persijilan Semula</option>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="catatan">Catatan (opsyenal)</Label>
        <Textarea
          id="catatan"
          rows={3}
          placeholder="Skop, ahli auditor lain, nota khas..."
          {...register("catatan")}
        />
      </div>

      {ralat && (
        <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
          {ralat}
        </p>
      )}

      <div className="flex gap-2">
        <Butang type="submit" disabled={memuat}>
          {memuat ? "Sedang cipta..." : "Cipta & Mula Checklist"}
        </Butang>
        <Butang
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={memuat}
        >
          Batal
        </Butang>
      </div>
    </form>
  );
}
