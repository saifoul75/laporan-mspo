import { createClient } from "@/lib/supabase/server";

export async function getHasilBulanan() {
  const supabase = await createClient();
  const PAGE = 1000;
  const allRows: any[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("hasil_bulanan")
      .select("*")
      .order("tahun", { ascending: true })
      .order("bulan", { ascending: true })
      .range(from, from + PAGE - 1);

    if (error || !data) return [];
    if (data.length === 0) {
      hasMore = false;
    } else {
      allRows.push(...data);
      from += PAGE;
      if (data.length < PAGE) hasMore = false;
    }
  }

  const bulanMap = new Map<string, any>();
  for (const row of allRows) {
    const key = `${row.tahun}-${String(row.bulan).padStart(2, "0")}`;
    if (!bulanMap.has(key)) {
      bulanMap.set(key, {
        kod: key,
        nama: row.bulan_nama,
        sawit: [],
        getah: [],
      });
    }
    const month = bulanMap.get(key);
    const base = {
      pol_pn: row.pusat_operasi,
      bil: 0,
      nama: row.nama_projek,
      luas_hek: Number(row.luas_kawasan_hek) || 0,
      luas_dituai: Number(row.luas_produktif_hek) || 0,
      peserta: Number(row.bilangan_peserta) || 0,
      matlamat_setahun: 0,
      pct_setahun: 0,
      pendapatan: 0,
      kos: 0,
      untung_rugi: 0,
      wilayah: row.wilayah,
    };
    if (row.jenis === "SAWIT") {
      month.sawit.push({
        ...base,
        luas_dituai: Number(row.luas_produktif_hek) || 0,
        hasil_mt: Number(row.hasil) || 0,
        mtan_hek: Number(row.luas_produktif_hek) > 0 ? Number(row.hasil) / Number(row.luas_produktif_hek) : 0,
      });
    } else {
      month.getah.push({
        ...base,
        luas_ditoreh: Number(row.luas_produktif_hek) || 0,
        hasil_kg: Number(row.hasil) || 0,
        kg_hek: Number(row.luas_produktif_hek) > 0 ? Number(row.hasil) / Number(row.luas_produktif_hek) : 0,
      });
    }
  }

  for (const month of Array.from(bulanMap.values())) {
    const sawitCount: Record<string, number> = {};
    const getahCount: Record<string, number> = {};
    month.sawit.forEach((p: any) => { sawitCount[p.pol_pn] = (sawitCount[p.pol_pn] || 0) + 1; p.bil = sawitCount[p.pol_pn]; });
    month.getah.forEach((p: any) => { getahCount[p.pol_pn] = (getahCount[p.pol_pn] || 0) + 1; p.bil = getahCount[p.pol_pn]; });
  }

  return Array.from(bulanMap.values());
}

export async function getLatestMonthWithData() {
  const data = await getHasilBulanan();
  if (data.length === 0) return null;

  for (let i = data.length - 1; i >= 0; i--) {
    const hasSawit = data[i].sawit.some((p: any) => (p.hasil_mt ?? 0) > 0);
    const hasGetah = data[i].getah.some((p: any) => (p.hasil_kg ?? 0) > 0);
    if (hasSawit || hasGetah) {
      return data[i];
    }
  }

  return data[data.length - 1];
}
