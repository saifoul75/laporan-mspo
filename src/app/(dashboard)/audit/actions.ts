"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
