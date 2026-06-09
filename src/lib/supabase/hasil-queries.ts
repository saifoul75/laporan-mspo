import { createClient } from "@/lib/supabase/server";

export async function getHasilBulanan() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hasil_bulanan")
    .select("*")
    .order("kod_bulan", { ascending: true });

  if (error || !data) return [];

  // Group by month
  const bulanMap = new Map<string, any>();
  for (const row of data) {
    if (!bulanMap.has(row.kod_bulan)) {
      bulanMap.set(row.kod_bulan, {
        kod: row.kod_bulan,
        nama: row.nama_bulan,
        sawit: [],
        getah: [],
      });
    }
    const month = bulanMap.get(row.kod_bulan);
    if (row.jenis === "sawit") {
      month.sawit.push({
        pol_pn: row.pol_pn,
        bil: row.bil,
        nama: row.nama,
        luas_hek: row.luas_hek,
        luas_dituai: row.luas_operasi,
        peserta: row.peserta,
        hasil_mt: row.hasil,
        mtan_hek: row.hasil_per_hek,
        matlamat_setahun: row.matlamat_setahun,
        pct_setahun: row.pct_setahun,
        pendapatan: row.pendapatan,
        kos: row.kos,
        untung_rugi: row.untung_rugi,
      });
    } else {
      month.getah.push({
        pol_pn: row.pol_pn,
        bil: row.bil,
        nama: row.nama,
        luas_hek: row.luas_hek,
        luas_ditoreh: row.luas_operasi,
        peserta: row.peserta,
        hasil_kg: row.hasil,
        kg_hek: row.hasil_per_hek,
        matlamat_setahun: row.matlamat_setahun,
        pct_setahun: row.pct_setahun,
        pendapatan: row.pendapatan,
        kos: row.kos,
        untung_rugi: row.untung_rugi,
      });
    }
  }

  return Array.from(bulanMap.values());
}

export async function getLatestMonthWithData() {
  const data = await getHasilBulanan();
  if (data.length === 0) return null;

  // Find last month with actual data (hasil > 0)
  for (let i = data.length - 1; i >= 0; i--) {
    const hasSawit = data[i].sawit.some((p: any) => (p.hasil_mt ?? 0) > 0);
    const hasGetah = data[i].getah.some((p: any) => (p.hasil_kg ?? 0) > 0);
    if (hasSawit || hasGetah) {
      return data[i];
    }
  }

  return data[data.length - 1];
}
