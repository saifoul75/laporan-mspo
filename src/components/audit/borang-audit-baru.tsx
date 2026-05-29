"use client";

import { useState, useEffect } from "react";
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
  lead_auditor_id: z.string().uuid("Pilih Lead Auditor"),
  sesi_id: z.string().uuid("Pilih Sesi Audit").optional().or(z.literal("")),
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

type SesiItem = {
  id: string;
  nama_sesi: string;
  wilayah: string;
  tarikh_mula: string;
  tarikh_tamat: string;
};

interface Props {
  senaraiPO: { id: string; kod: string; nama: string; wilayah: string }[];
  senaraiAuditor: { id: string; nama_penuh: string; rol: string }[];
  senaraiSesi: SesiItem[];
  penggunaSemasa: { id: string };
}

function janaNoRujukan() {
  const tarikh = new Date();
  const yyyy = tarikh.getFullYear();
  const mm = String(tarikh.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `MSPO-${yyyy}${mm}-${random}`;
}

export function BorangAuditBaru({
  senaraiPO,
  senaraiAuditor,
  senaraiSesi,
  penggunaSemasa,
}: Props) {
  const router = useRouter();
  const [memuat, setMemuat] = useState(false);
  const [ralat, setRalat] = useState<string | null>(null);
  const [auditorIds, setAuditorIds] = useState<string[]>([]);

  const senaraiLead = senaraiAuditor.filter(
    (a) => a.rol === "lead_auditor" || a.rol === "admin"
  );
  const senaraiPembantu = senaraiAuditor;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DataAudit>({
    resolver: zodResolver(skema),
    defaultValues: {
      jenis_audit: "audit_dalaman",
      lead_auditor_id: penggunaSemasa.id,
    },
  });

  const leadDipilih = watch("lead_auditor_id");
  const poDipilih = watch("pusat_operasi_id");
  const sesiDipilih = watch("sesi_id");

  const poTerseleksi = senaraiPO.find((p) => p.id === poDipilih);
  const wilayahPO = poTerseleksi?.wilayah ?? "";

  const sesiTepat = senaraiSesi.find(
    (s) => s.nama_sesi.toLowerCase() === wilayahPO.toLowerCase()
  );

  const sesiMengikutWilayah = !sesiTepat && wilayahPO
    ? senaraiSesi.filter(
        (s) =>
          s.wilayah.toLowerCase() === wilayahPO.toLowerCase() ||
          wilayahPO.toLowerCase().includes(s.wilayah.toLowerCase())
      )
    : [];

  useEffect(() => {
    if (!wilayahPO) {
      setValue("sesi_id", "");
      setValue("tarikh_audit", "");
      setValue("tarikh_tamat", "");
      return;
    }
    const tepat = senaraiSesi.find(
      (s) => s.nama_sesi.toLowerCase() === wilayahPO.toLowerCase()
    );
    if (tepat) {
      setValue("sesi_id", tepat.id);
      setValue("tarikh_audit", tepat.tarikh_mula);
      setValue("tarikh_tamat", tepat.tarikh_tamat);
      return;
    }
    const matchWilayah = senaraiSesi.filter(
      (s) =>
        s.wilayah.toLowerCase() === wilayahPO.toLowerCase() ||
        wilayahPO.toLowerCase().includes(s.wilayah.toLowerCase())
    );
    if (matchWilayah.length === 1) {
      const s = matchWilayah[0];
      setValue("sesi_id", s.id);
      setValue("tarikh_audit", s.tarikh_mula);
      setValue("tarikh_tamat", s.tarikh_tamat);
    } else {
      setValue("sesi_id", "");
      setValue("tarikh_audit", "");
      setValue("tarikh_tamat", "");
    }
  }, [poDipilih, wilayahPO, senaraiSesi, setValue]);

  useEffect(() => {
    if (!sesiDipilih) return;
    const s = senaraiSesi.find((sesi) => sesi.id === sesiDipilih);
    if (s) {
      setValue("tarikh_audit", s.tarikh_mula);
      setValue("tarikh_tamat", s.tarikh_tamat);
    }
  }, [sesiDipilih, senaraiSesi, setValue]);

  function toggleAuditor(id: string) {
    setAuditorIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function onSubmit(data: DataAudit) {
    setMemuat(true);
    setRalat(null);
    const supabase = createClient();
    const noRujukan = janaNoRujukan();

    // Pastikan auditor_ids tidak duplikasi dengan lead_auditor
    const auditorIdsBersih = auditorIds.filter(
      (id) => id !== data.lead_auditor_id
    );

    const { data: audit, error } = await supabase
      .from("audit")
      .insert({
        no_rujukan: noRujukan,
        pusat_operasi_id: data.pusat_operasi_id,
        lead_auditor_id: data.lead_auditor_id,
        auditor_ids: auditorIdsBersih,
        sesi_id: data.sesi_id || null,
        tarikh_audit: data.tarikh_audit,
        tarikh_tamat: data.tarikh_tamat || null,
        planned_start_date: data.tarikh_audit,
        planned_end_date: data.tarikh_tamat || null,
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

      {poTerseleksi && sesiTepat && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          Sesi: <strong>{sesiTepat.nama_sesi}</strong> — tarikh automatik
          diisi ({sesiTepat.tarikh_mula} hingga {sesiTepat.tarikh_tamat}).
        </p>
      )}

      {poTerseleksi && !sesiTepat && sesiMengikutWilayah.length === 0 && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Tiada sesi audit dijumpai untuk wilayah "{poTerseleksi.wilayah}".
          Sila jalankan "Seed Sesi 2026" di halaman Audit dahulu
          (jumlah sesi dalam sistem: {senaraiSesi.length}).
        </p>
      )}

      {poTerseleksi && !sesiTepat && sesiMengikutWilayah.length > 0 && (
        <div className="space-y-2 rounded-md border border-blue-200 bg-blue-50/50 p-3">
          <Label htmlFor="sesi_id">
            Sesi Audit ({poTerseleksi.wilayah})
          </Label>
          <Select id="sesi_id" {...register("sesi_id")}>
            <option value="">
              -- Pilih Sesi ({poTerseleksi.wilayah}) --
            </option>
            {sesiMengikutWilayah.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nama_sesi} — {new Intl.DateTimeFormat("ms-MY", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }).format(new Date(s.tarikh_mula))}{" "}
                hingga{" "}
                {new Intl.DateTimeFormat("ms-MY", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }).format(new Date(s.tarikh_tamat))}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="lead_auditor_id">
          Lead Auditor <span className="text-destructive">*</span>
        </Label>
        <Select id="lead_auditor_id" {...register("lead_auditor_id")}>
          <option value="">-- Pilih Lead Auditor --</option>
          {senaraiLead.map((l) => {
            const adalahAnda = l.id === penggunaSemasa.id;
            const labelRol = l.rol === "admin" ? "Admin" : "Lead Auditor";
            return (
              <option key={l.id} value={l.id}>
                {l.nama_penuh} ({labelRol}){adalahAnda ? " — Anda" : ""}
              </option>
            );
          })}
        </Select>
        {errors.lead_auditor_id && (
          <p className="text-xs text-destructive">
            {errors.lead_auditor_id.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Lead Auditor bertanggungjawab muktamadkan keputusan audit (Modul 3.4).
        </p>
      </div>

      <div className="space-y-2">
        <Label>Auditor Pembantu (opsyenal)</Label>
        <div className="space-y-1 rounded-md border border-input p-2">
          {senaraiPembantu.length === 0 ? (
            <p className="p-2 text-xs text-muted-foreground">
              Tiada auditor lain didaftar.
            </p>
          ) : (
            senaraiPembantu.map((a) => {
              const adalahLead = a.id === leadDipilih;
              const dipilih = auditorIds.includes(a.id);
              return (
                <label
                  key={a.id}
                  className={`flex cursor-pointer items-center gap-2 rounded p-2 text-sm transition-colors ${
                    adalahLead
                      ? "cursor-not-allowed bg-muted/50 text-muted-foreground"
                      : dipilih
                        ? "bg-primary/10"
                        : "hover:bg-accent"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={dipilih && !adalahLead}
                    disabled={adalahLead}
                    onChange={() => toggleAuditor(a.id)}
                  />
                  <span className="flex-1">
                    {a.nama_penuh}{" "}
                    <span className="text-xs text-muted-foreground">
                      (
                      {a.rol === "admin"
                        ? "Admin"
                        : a.rol === "lead_auditor"
                          ? "Lead Auditor"
                          : "Auditor"}
                      {a.id === penggunaSemasa.id ? " — Anda" : ""})
                    </span>
                    {adalahLead && (
                      <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-blue-800">
                        Sudah jadi Lead
                      </span>
                    )}
                  </span>
                </label>
              );
            })
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Pilih ahli pasukan audit lain (selain Lead). Mereka akan dapat akses
          isi checklist.
        </p>
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
          placeholder="Skop, nota khas..."
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
