import "server-only";
import { createClient } from "@/lib/supabase/server";

export type CapaiMatlamatRow = {
  tahun: number;
  bulan: number;
  bulan_nama: string | null;
  kod_bulan: string | null;
  jenis: "SAWIT" | "GETAH";
  unit: "MT" | "KG";
  wilayah: string | null;
  po: string;
  projek: string;
  luas_kawasan: number | null;
  luas_berhasil: number | null;
  bil_peserta: number | null;
  hasil: number;
  in_master_2026: boolean | null;
  sasaran_tahunan: number | null;
  peratus_agihan: number | null;
  matlamat_bulanan: number | null;
  pct_capai: number | null;
  hasil_per_hek: number | null;
  projek_ref_id: number | null;
};

export type WilayahRow = {
  tahun: number;
  bulan: number;
  bulan_nama: string | null;
  kod_bulan: string | null;
  wilayah: string;
  jenis: "SAWIT" | "GETAH";
  unit: "MT" | "KG";
  bil_po: number;
  bil_projek: number;
  jumlah_luas_berhasil: number | null;
  jumlah_hasil: number;
  jumlah_matlamat: number | null;
  pct_capai: number | null;
  hasil_per_hek: number | null;
};

export type HQRow = {
  tahun: number;
  bulan: number;
  bulan_nama: string | null;
  kod_bulan: string | null;
  jenis: "SAWIT" | "GETAH";
  unit: "MT" | "KG";
  wilayah: "KESELURUHAN";
  bil_po: number;
  bil_projek: number;
  jumlah_luas_berhasil: number | null;
  jumlah_hasil: number;
  jumlah_matlamat: number | null;
  pct_capai: number | null;
  hasil_per_hek: number | null;
};

export type RankingPORow = {
  tahun: number;
  wilayah: string | null;
  po: string;
  jenis: "SAWIT" | "GETAH";
  unit: "MT" | "KG";
  bil_projek: number;
  jumlah_luas_berhasil: number | null;
  jumlah_hasil: number;
  jumlah_matlamat: number | null;
  pct_capai: number | null;
  hasil_per_hek: number | null;
};

export interface Penapis {
  tahun: number;
  wilayah?: string;
  po?: string;
  jenis?: "SAWIT" | "GETAH";
  bulan?: number;
}

export async function fetchSenaraiTahun(): Promise<number[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hasil_bulanan_src")
    .select("tahun")
    .order("tahun", { ascending: false });
  if (error) throw error;
  const set = new Set<number>();
  (data ?? []).forEach((r) => set.add(r.tahun));
  return Array.from(set).sort((a, b) => b - a);
}

export async function fetchSenaraiWilayah(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projek_ref")
    .select("wilayah")
    .not("wilayah", "is", null);
  if (error) throw error;
  const set = new Set<string>();
  (data ?? []).forEach((r) => set.add((r.wilayah ?? "").trim()));
  return Array.from(set).filter(Boolean).sort();
}

export async function fetchSenaraiPO(
  tahun: number,
  wilayah?: string,
): Promise<string[]> {
  const supabase = await createClient();
  let q = supabase
    .from("projek_ref")
    .select("po, wilayah")
    .eq("tahun", tahun)
    .not("po", "is", null);
  if (wilayah) q = q.eq("wilayah", wilayah);
  const { data, error } = await q;
  if (error) throw error;
  const set = new Set<string>();
  (data ?? []).forEach((r) => set.add((r.po ?? "").trim()));
  return Array.from(set).filter(Boolean).sort();
}

export async function fetchCapaiMatlamat(
  penapis: Penapis,
): Promise<CapaiMatlamatRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("v_capai_matlamat")
    .select("*")
    .eq("tahun", penapis.tahun);
  if (penapis.wilayah) q = q.eq("wilayah", penapis.wilayah);
  if (penapis.po) q = q.eq("po", penapis.po);
  if (penapis.jenis) q = q.eq("jenis", penapis.jenis);
  if (penapis.bulan) q = q.eq("bulan", penapis.bulan);
  q = q
    .order("po", { ascending: true })
    .order("projek", { ascending: true })
    .order("jenis", { ascending: true })
    .order("bulan", { ascending: true });
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as CapaiMatlamatRow[];
}

export async function fetchWilayah(
  penapis: Penapis,
): Promise<WilayahRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("v_wilayah")
    .select("*")
    .eq("tahun", penapis.tahun);
  if (penapis.wilayah) q = q.eq("wilayah", penapis.wilayah);
  if (penapis.jenis) q = q.eq("jenis", penapis.jenis);
  if (penapis.bulan) q = q.eq("bulan", penapis.bulan);
  q = q
    .order("wilayah", { ascending: true })
    .order("jenis", { ascending: true })
    .order("bulan", { ascending: true });
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as WilayahRow[];
}

export async function fetchHQ(penapis: Penapis): Promise<HQRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("v_hq")
    .select("*")
    .eq("tahun", penapis.tahun);
  if (penapis.jenis) q = q.eq("jenis", penapis.jenis);
  if (penapis.bulan) q = q.eq("bulan", penapis.bulan);
  q = q.order("jenis").order("bulan");
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as HQRow[];
}

export async function fetchRankingPO(
  penapis: Penapis,
): Promise<RankingPORow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("v_ranking_po")
    .select("*")
    .eq("tahun", penapis.tahun);
  if (penapis.wilayah) q = q.eq("wilayah", penapis.wilayah);
  if (penapis.po) q = q.eq("po", penapis.po);
  if (penapis.jenis) q = q.eq("jenis", penapis.jenis);
  q = q
    .order("pct_capai", { ascending: false, nullsFirst: false })
    .order("jumlah_hasil", { ascending: false });
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as RankingPORow[];
}