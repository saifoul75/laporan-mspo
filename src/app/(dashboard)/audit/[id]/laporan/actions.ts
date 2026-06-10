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

  const { data: profil } = await supabase
    .from("pengguna")
    .select("rol")
    .eq("id", user.id)
    .single();

  const rol = profil?.rol ?? "";
  if (rol !== "admin" && rol !== "lead_auditor") {
    return {
      dibenar: false as const,
      supabase,
      mesej: "Hanya lead auditor atau admin boleh urus pautan kongsi",
    };
  }

  return { dibenar: true as const, supabase };
}

// ─── Tindakan 1: Aktifkan perkongsian ─────────────────────────────────────────
// Jana token baharu jika tiada, cipta row laporan jika belum wujud.

export async function aktifkanKongsi(auditId: string): Promise<HasilTindakan> {
  const { dibenar, supabase, mesej } = await semakKebenaran(auditId);
  if (!dibenar) return { berjaya: false, mesej: mesej! };

  // Cuba dapatkan row laporan sedia ada
  const { data: laporanSedia } = await supabase
    .from("laporan")
    .select("id, token_kongsi")
    .eq("audit_id", auditId)
    .maybeSingle();

  const token = laporanSedia?.token_kongsi ?? crypto.randomUUID();

  if (!laporanSedia) {
    // Row laporan belum ada — kira dari dapatan dan cipta baru
    const { data: dapatanData } = await supabase
      .from("dapatan")
      .select("status, gred_nc")
      .eq("audit_id", auditId);

    const counts = {
      y: 0, n: 0, nc_major: 0, nc_minor: 0, ofi: 0, na: 0, pending: 0,
    };
    for (const d of dapatanData ?? []) {
      if (d.status === "Y") counts.y++;
      else if (d.status === "N") counts.n++;
      else if (d.status === "NC") {
        if (d.gred_nc === "major") counts.nc_major++;
        else counts.nc_minor++;
      } else if (d.status === "OFI") counts.ofi++;
      else if (d.status === "NA") counts.na++;
      else counts.pending++;
    }

    const { error } = await supabase.from("laporan").insert({
      audit_id: auditId,
      jumlah_y: counts.y,
      jumlah_n: counts.n,
      jumlah_nc_major: counts.nc_major,
      jumlah_nc_minor: counts.nc_minor,
      jumlah_ofi: counts.ofi,
      jumlah_na: counts.na,
      jumlah_pending: counts.pending,
      token_kongsi: token,
      kongsi_aktif: true,
      dijana_pada: new Date().toISOString(),
    });

    if (error) return { berjaya: false, mesej: `Gagal cipta laporan: ${error.message}` };
  } else {
    const { error } = await supabase
      .from("laporan")
      .update({ token_kongsi: token, kongsi_aktif: true })
      .eq("id", laporanSedia.id);

    if (error) return { berjaya: false, mesej: `Gagal aktifkan: ${error.message}` };
  }

  revalidatePath(`/audit/${auditId}/laporan`);
  return { berjaya: true, token, aktif: true };
}

// ─── Tindakan 2: Nyahaktifkan perkongsian ─────────────────────────────────────

export async function nyahaktifkanKongsi(auditId: string): Promise<HasilTindakan> {
  const { dibenar, supabase, mesej } = await semakKebenaran(auditId);
  if (!dibenar) return { berjaya: false, mesej: mesej! };

  const { error } = await supabase
    .from("laporan")
    .update({ kongsi_aktif: false })
    .eq("audit_id", auditId);

  if (error) return { berjaya: false, mesej: `Gagal nyahaktifkan: ${error.message}` };

  revalidatePath(`/audit/${auditId}/laporan`);
  return { berjaya: true, aktif: false };
}

// ─── Tindakan 3: Jana semula token (revoke) ───────────────────────────────────

export async function janaSemulaTautan(auditId: string): Promise<HasilTindakan> {
  const { dibenar, supabase, mesej } = await semakKebenaran(auditId);
  if (!dibenar) return { berjaya: false, mesej: mesej! };

  const tokenBaharu = crypto.randomUUID();

  const { error } = await supabase
    .from("laporan")
    .update({ token_kongsi: tokenBaharu, kongsi_aktif: true })
    .eq("audit_id", auditId);

  if (error) return { berjaya: false, mesej: `Gagal jana semula: ${error.message}` };

  revalidatePath(`/audit/${auditId}/laporan`);
  return { berjaya: true, token: tokenBaharu, aktif: true };
}
