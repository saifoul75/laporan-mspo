"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { RolPengguna } from "@/types";

const ROL_SAH: RolPengguna[] = ["admin", "lead_auditor", "auditor", "po_user"];

async function pastikanAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, ralat: "Tidak log masuk" } as const;

  const { data: profil } = await supabase
    .from("pengguna")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (profil?.rol !== "admin") {
    return { ok: false, ralat: "Hanya pentadbir dibenarkan" } as const;
  }
  return { ok: true, supabase, userId: user.id } as const;
}

export async function kemaskiniRolPengguna(input: {
  pengguna_id: string;
  rol: RolPengguna;
}) {
  const semakan = await pastikanAdmin();
  if (!semakan.ok) return { ok: false, ralat: semakan.ralat };

  if (!ROL_SAH.includes(input.rol)) {
    return { ok: false, ralat: "Rol tidak sah" };
  }

  // Halang admin downgrade rol diri sendiri
  if (input.pengguna_id === semakan.userId && input.rol !== "admin") {
    return {
      ok: false,
      ralat: "Tidak boleh tukar rol akaun sendiri dari admin.",
    };
  }

  const { error } = await semakan.supabase
    .from("pengguna")
    .update({ rol: input.rol })
    .eq("id", input.pengguna_id);

  if (error) return { ok: false, ralat: error.message };

  revalidatePath("/pengguna");
  return { ok: true };
}

export async function kemaskiniPOPengguna(input: {
  pengguna_id: string;
  pusat_operasi_id: string | null;
}) {
  const semakan = await pastikanAdmin();
  if (!semakan.ok) return { ok: false, ralat: semakan.ralat };

  const { error } = await semakan.supabase
    .from("pengguna")
    .update({ pusat_operasi_id: input.pusat_operasi_id })
    .eq("id", input.pengguna_id);

  if (error) return { ok: false, ralat: error.message };

  revalidatePath("/pengguna");
  return { ok: true };
}

export async function kemaskiniMaklumatPengguna(input: {
  pengguna_id: string;
  nama_penuh?: string;
  no_telefon?: string | null;
}) {
  const semakan = await pastikanAdmin();
  if (!semakan.ok) return { ok: false, ralat: semakan.ralat };

  const patch: Record<string, unknown> = {};
  if (input.nama_penuh !== undefined) patch.nama_penuh = input.nama_penuh;
  if (input.no_telefon !== undefined) patch.no_telefon = input.no_telefon;

  if (Object.keys(patch).length === 0) {
    return { ok: false, ralat: "Tiada perubahan" };
  }

  const { error } = await semakan.supabase
    .from("pengguna")
    .update(patch)
    .eq("id", input.pengguna_id);

  if (error) return { ok: false, ralat: error.message };

  revalidatePath("/pengguna");
  return { ok: true };
}
