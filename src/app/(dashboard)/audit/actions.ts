"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type GredNc = "major" | "minor";
export type CapGradeSource = "auto_highest_finding" | "manual_lead_auditor";

export interface PreviewCap {
  ok: true;
  gred_auto: GredNc | null;       // null = no NC (OFI sahaja atau tiada)
  cap_due_days: number | null;    // 30 / 90 / null
  bil_nc_major: number;
  bil_nc_minor: number;
  bil_ofi: number;
  bil_pending: number;
}

export interface PreviewCapRalat {
  ok: false;
  ralat: string;
}

/**
 * Preview gred CAP yang akan diset oleh trigger bila Lead klik Muktamadkan.
 * Tujuan: tunjuk Lead Auditor sneak-peek sebelum decision dikunci.
 *
 * - Major mengatasi Minor (sama logik dengan fn_kira_gred_basis di DB)
 * - Pulang juga kiraan ringkas dapatan untuk konteks UI
 */
export async function previewGredCap(
  auditId: string
): Promise<PreviewCap | PreviewCapRalat> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, ralat: "Tidak log masuk" };

  const { data: dapatan, error } = await supabase
    .from("dapatan")
    .select("status, gred_nc")
    .eq("audit_id", auditId);

  if (error) return { ok: false, ralat: error.message };

  let bil_nc_major = 0;
  let bil_nc_minor = 0;
  let bil_ofi = 0;
  let bil_pending = 0;

  for (const d of dapatan ?? []) {
    if (d.status === "NC") {
      if (d.gred_nc === "major") bil_nc_major++;
      else if (d.gred_nc === "minor") bil_nc_minor++;
    } else if (d.status === "OFI") {
      bil_ofi++;
    } else if (d.status === "Pending") {
      bil_pending++;
    }
  }

  const gred_auto: GredNc | null =
    bil_nc_major > 0 ? "major" : bil_nc_minor > 0 ? "minor" : null;
  const cap_due_days = gred_auto === "major" ? 30 : gred_auto === "minor" ? 90 : null;

  return {
    ok: true,
    gred_auto,
    cap_due_days,
    bil_nc_major,
    bil_nc_minor,
    bil_ofi,
    bil_pending,
  };
}

interface MuktamadkanInput {
  auditId: string;
  /**
   * Override Lead Auditor. Kalau null/undefined, source = auto.
   * Kalau diisi, source = manual_lead_auditor + reason WAJIB.
   */
  override?: {
    gred: GredNc | null; // null = paksa "tiada CAP" walaupun ada NC
    reason: string;
  };
}

/**
 * Muktamadkan keputusan audit (Modul 3.4).
 *
 * Effect (handled oleh trigger trg_audit_muktamad di DB):
 *   - Set tarikh_muktamad = now()
 *   - Auto-detect cap_grade_basis dari dapatan (atau pakai override)
 *   - Auto-kira cap_due_date = tarikh_muktamad + 30/90 hari
 *   - Lock status = 'menunggu_semakan'
 *
 * Restriction:
 *   - Hanya admin atau lead_auditor
 *   - Audit mesti belum muktamadkan (tarikh_muktamad IS NULL)
 *   - Audit tidak boleh dalam status 'selesai' / 'dibatalkan' / 'draf'
 *   - Kalau ada dapatan status='Pending', tolak (semua mesti dijawab)
 */
export async function muktamadkanAudit(input: MuktamadkanInput) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, ralat: "Tidak log masuk" };

  // Semak rol
  const { data: profil } = await supabase
    .from("pengguna")
    .select("rol")
    .eq("id", user.id)
    .single();

  const rolDibenar = ["admin", "lead_auditor"];
  if (!profil || !rolDibenar.includes(profil.rol)) {
    return {
      ok: false,
      ralat: "Hanya Admin atau Lead Auditor boleh muktamadkan keputusan audit.",
    };
  }

  // Semak audit
  const { data: audit, error: ralatAudit } = await supabase
    .from("audit")
    .select("id, status, tarikh_muktamad")
    .eq("id", input.auditId)
    .single();

  if (ralatAudit || !audit) {
    return { ok: false, ralat: "Audit tidak dijumpai." };
  }

  if (audit.tarikh_muktamad) {
    return {
      ok: false,
      ralat: "Audit ini sudah dimuktamadkan. Tidak boleh ulang.",
    };
  }

  if (audit.status === "selesai" || audit.status === "dibatalkan") {
    return {
      ok: false,
      ralat: `Audit berstatus "${audit.status}" tidak boleh dimuktamadkan.`,
    };
  }

  if (audit.status === "draf") {
    return {
      ok: false,
      ralat: "Audit masih draf. Mulakan audit dahulu sebelum muktamadkan.",
    };
  }

  // Pastikan tiada dapatan Pending
  const { count: bilPending } = await supabase
    .from("dapatan")
    .select("*", { count: "exact", head: true })
    .eq("audit_id", input.auditId)
    .eq("status", "Pending");

  if (bilPending && bilPending > 0) {
    return {
      ok: false,
      ralat: `Masih ada ${bilPending} dapatan berstatus "Pending". Lengkapkan checklist dahulu.`,
    };
  }

  // Bina payload update. Trigger DB akan handle cap_due_date + status.
  const payload: Record<string, unknown> = {
    tarikh_muktamad: new Date().toISOString(),
  };

  if (input.override) {
    if (!input.override.reason || input.override.reason.trim().length < 10) {
      return {
        ok: false,
        ralat:
          "Sebab override mesti diisi (minimum 10 aksara) untuk audit trail MSPO.",
      };
    }
    payload.cap_grade_source = "manual_lead_auditor";
    payload.cap_grade_basis = input.override.gred; // boleh null = no CAP
    payload.cap_grade_override_reason = input.override.reason.trim();
    payload.cap_grade_overridden_by = user.id;
    payload.cap_grade_overridden_at = new Date().toISOString();
  }
  // Kalau tiada override, biar trigger DB set source = 'auto_highest_finding'
  // dan basis dari fn_kira_gred_basis().

  const { error } = await supabase
    .from("audit")
    .update(payload)
    .eq("id", input.auditId);

  if (error) return { ok: false, ralat: error.message };

  revalidatePath(`/audit/${input.auditId}`);
  revalidatePath("/audit");
  return { ok: true };
}

/**
 * Padam audit — hanya dibenarkan kalau:
 * 1. Status masih "draf"
 * 2. Pengguna ialah admin atau lead_auditor
 */
export async function padamAuditDraf(auditId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, ralat: "Tidak log masuk" };

  // Semak rol
  const { data: profil } = await supabase
    .from("pengguna")
    .select("rol")
    .eq("id", user.id)
    .single();

  const rolDibenar = ["admin", "lead_auditor"];
  if (!profil || !rolDibenar.includes(profil.rol)) {
    return { ok: false, ralat: "Hanya Admin atau Lead Auditor boleh padam audit." };
  }

  // Semak status — wajib "draf"
  const { data: audit } = await supabase
    .from("audit")
    .select("status")
    .eq("id", auditId)
    .single();

  if (!audit) return { ok: false, ralat: "Audit tidak dijumpai." };
  if (audit.status !== "draf") {
    return { ok: false, ralat: `Audit berstatus "${audit.status}" tidak boleh dipadam. Hanya draf dibenarkan.` };
  }

  // Padam dapatan berkaitan dulu (foreign key)
  await supabase.from("dapatan").delete().eq("audit_id", auditId);

  // Padam audit
  const { error } = await supabase.from("audit").delete().eq("id", auditId);
  if (error) return { ok: false, ralat: error.message };

  revalidatePath("/audit");
  return { ok: true };
}
