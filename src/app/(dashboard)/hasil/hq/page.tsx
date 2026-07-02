import {
  fetchHQ,
  fetchRankingPO,
  fetchSenaraiTahun,
} from "@/lib/supabase/queries-laporan";
import { PenapisLaporan } from "@/components/laporan/penapis-laporan";
import { TabHQCanvas } from "@/components/laporan/tab-hq-canvas";
import { ButangCetak } from "@/components/laporan/butang-cetak";

export const dynamic = "force-dynamic";

export default async function TabHQPage({
  searchParams,
}: {
  searchParams: Promise<{
    tahun?: string;
    jenis?: string;
    bulan?: string;
  }>;
}) {
  const sp = await searchParams;
  const tahunList = await fetchSenaraiTahun();
  const tahun = sp.tahun ? parseInt(sp.tahun) : (tahunList[0] ?? new Date().getFullYear());

  const [hq, ranking] = await Promise.all([
    fetchHQ({
      tahun,
      jenis: (sp.jenis as "SAWIT" | "GETAH" | undefined) || undefined,
      bulan: sp.bulan ? parseInt(sp.bulan) : undefined,
    }),
    fetchRankingPO({
      tahun,
      jenis: (sp.jenis as "SAWIT" | "GETAH" | undefined) || undefined,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Laporan Hasil — Tahap Ibu Pejabat</h1>
          <p className="text-sm text-muted-foreground">
            Konsolidasi nasional semua wilayah dan ranking PO.
          </p>
        </div>
        <ButangCetak />
      </div>

      <PenapisLaporan
        senarai={{ tahun: tahunList, wilayah: [], po: [] }}
        paparkanWilayah={false}
        paparkanPO={false}
      />

      <TabHQCanvas hq={hq} ranking={ranking} tahun={tahun} />
    </div>
  );
}