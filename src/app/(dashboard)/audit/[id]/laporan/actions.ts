"use server";

// Server Actions untuk urus token perkongsian laporan.
// Semua tindakan ini MEMERLUKAN sesi auth yang sah (lead_auditor / admin).
// Token dijana menggunakan crypto.randomUUID() — 122 bit entropi, tidak boleh diteka.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// ─── Jenis Pemulangan ─────────────────────────────────────────────────────────

type HasilTindakan =
  | { berjaya: true; token?: string; aktif?: boolean }
  | { berjaya: false; mesej: string };

// ─── Pembantu: semak kebenaran ────────────────────────────────────────────────

async function semakKebenaran(auditId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { dibenar: false as const, supabase, mesej: "Tidak diauthentikasi" };

  // Semak sama ada pengguna ialah lead_auditor / admin atau auditor dalam audit ini
  const { data: audit } = await supabase
    .from("audit")
    .select("id, lead_auditor_id, auditor_ids")
    .eq("id", auditId)
    .single();

  if (!audit) return { dibenar: false as const, supabase, mesej: "Audit tidak dijumpai" };

  const { data: profil } = await supabase
    .from("pengguna")
    .select("rol")
    .eq("id", user.id)
    .single();

  const rol = profil?.rol ?? "";
  const ialahLeadAtauAdmin =
    rol === "admin" || rol === "lead_auditor";

  if (!ialahLeadAtauAdmin) {
    return {
      dibenar: false as const,
      supabase,
      mesej: "Hanya lead auditor atau admin boleh urus pautan kongsi",
    };
  }

  return { dibenar: true as const, supabase };
}

// ─── Tindakan 1: Aktifkan perkongsian ─────────────────────────────────────────
// Jana token baharu jika tiada, kemudian set kongsi_aktif = true.

export async function aktifkanKongsi(auditId: string): Promise<HasilTindakan> {
  const { dibenar, supabase, mesej } = await semakKebenaran(auditId);
  if (!dibenar) return { berjaya: false, mesej: mesej! };

  // Dapatkan laporan semasa untuk audit ini
  const { data: laporanSedia } = await supabase
    .from("laporan")
    .select("id, token_kongsi")
    .eq("audit_id", auditId)
    .single();

  if (!laporanSedia) {
    return {
      berjaya: false,
      mesej: "Laporan belum dijana untuk audit ini. Jana laporan dahulu.",
    };
  }

  // Jana token baharu jika belum ada
  const token = laporanSedia.token_kongsi ?? crypto.randomUUID();

  const { error } = await supabase
    .from("laporan")
    .update({ token_kongsi: token, kongsi_aktif: true })
    .eq("id", laporanSedia.id);

  if (error) {
    return { berjaya: false, mesej: `Gagal aktifkan: ${error.message}` };
  }

  revalidatePath(`/audit/${auditId}/laporan`);
  return { berjaya: true, token, aktif: true };
}

// ─── Tindakan 2: Nyahaktifkan perkongsian ─────────────────────────────────────
// Set kongsi_aktif = false. Token dikekalkan supaya boleh diaktifkan semula.

export async function nyahaktifkanKongsi(auditId: string): Promise<HasilTindakan> {
  const { dibenar, supabase, mesej } = await semakKebenaran(auditId);
  if (!dibenar) return { berjaya: false, mesej: mesej! };

  const { error } = await supabase
    .from("laporan")
    .update({ kongsi_aktif: false })
    .eq("audit_id", auditId);

  if (error) {
    return { berjaya: false, mesej: `Gagal nyahaktifkan: ${error.message}` };
  }

  revalidatePath(`/audit/${auditId}/laporan`);
  return { berjaya: true, aktif: false };
}

// ─── Tindakan 3: Jana semula token (revoke) ───────────────────────────────────
// Jana token BAHARU — pautan lama terus tidak sah serta-merta.

export async function janaSemulaTautan(auditId: string): Promise<HasilTindakan> {
  const { dibenar, supabase, mesej } = await semakKebenaran(auditId);
  if (!dibenar) return { berjaya: false, mesej: mesej! };

  const tokenBaharu = crypto.randomUUID();

  const { error } = await supabase
    .from("laporan")
    .update({ token_kongsi: tokenBaharu, kongsi_aktif: true })
    .eq("audit_id", auditId);

  if (error) {
    return { berjaya: false, mesej: `Gagal jana semula: ${error.message}` };
  }

  revalidatePath(`/audit/${auditId}/laporan`);
  return { berjaya: true, token: tokenBaharu, aktif: true };
}
