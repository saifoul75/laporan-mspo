import {
  fetchRankingPO,
  fetchSenaraiTahun,
  fetchSenaraiWilayah,
  fetchWilayah,
} from "@/lib/supabase/queries-laporan";
import { PenapisLaporan } from "@/components/laporan/penapis-laporan";
import { TabWilayahCanvas } from "@/components/laporan/tab-wilayah-canvas";
import { ButangCetak } from "@/components/laporan/butang-cetak";

export const dynamic = "force-dynamic";

export default async function TabWilayahPage({
  searchParams,
}: {
  searchParams: Promise<{
    tahun?: string;
    wilayah?: string;
    jenis?: string;
    bulan?: string;
  }>;
}) {
  const sp = await searchParams;
  const tahunList = await fetchSenaraiTahun();
  const wilayahList = await fetchSenaraiWilayah();
  const tahun = sp.tahun ? parseInt(sp.tahun) : (tahunList[0] ?? new Date().getFullYear());
  const wilayah = sp.wilayah || undefined;

  const [ringkasan, ranking] = await Promise.all([
    fetchWilayah({
      tahun,
      wilayah,
      jenis: (sp.jenis as "SAWIT" | "GETAH" | undefined) || undefined,
      bulan: sp.bulan ? parseInt(sp.bulan) : undefined,
    }),
    fetchRankingPO({
      tahun,
      wilayah,
      jenis: (sp.jenis as "SAWIT" | "GETAH" | undefined) || undefined,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Laporan Hasil — Tahap Wilayah</h1>
          <p className="text-sm text-muted-foreground">
            Roll-up semua PO dalam wilayah dan ranking pencapaian.
          </p>
        </div>
        <ButangCetak />
      </div>

      <PenapisLaporan
        senarai={{ tahun: tahunList, wilayah: wilayahList, po: [] }}
        paparkanPO={false}
      />

      <TabWilayahCanvas ringkasan={ringkasan} ranking={ranking} tahun={tahun} />
    </div>
  );
}