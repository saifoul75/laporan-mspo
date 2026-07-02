import {
  fetchCapaiMatlamat,
  fetchSenaraiPO,
  fetchSenaraiTahun,
  fetchSenaraiWilayah,
} from "@/lib/supabase/queries-laporan";
import { PenapisLaporan } from "@/components/laporan/penapis-laporan";
import { TabPOCanvas } from "@/components/laporan/tab-po-canvas";
import { ButangCetak } from "@/components/laporan/butang-cetak";

export const dynamic = "force-dynamic";

export default async function TabPOPage({
  searchParams,
}: {
  searchParams: Promise<{
    tahun?: string;
    wilayah?: string;
    po?: string;
    jenis?: string;
    bulan?: string;
  }>;
}) {
  const sp = await searchParams;
  const tahunList = await fetchSenaraiTahun();
  const wilayahList = await fetchSenaraiWilayah();
  const tahun = sp.tahun ? parseInt(sp.tahun) : (tahunList[0] ?? new Date().getFullYear());
  const wilayah = sp.wilayah || undefined;
  const poList = await fetchSenaraiPO(tahun, wilayah);

  const data = await fetchCapaiMatlamat({
    tahun,
    wilayah,
    po: sp.po || undefined,
    jenis: (sp.jenis as "SAWIT" | "GETAH" | undefined) || undefined,
    bulan: sp.bulan ? parseInt(sp.bulan) : undefined,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Laporan Hasil — Tahap Pusat Operasi</h1>
          <p className="text-sm text-muted-foreground">
            Hasil bulanan, YTD dan pencapaian vs matlamat setiap projek di PO.
          </p>
        </div>
        <ButangCetak />
      </div>

      <PenapisLaporan
        senarai={{ tahun: tahunList, wilayah: wilayahList, po: poList }}
      />

      <TabPOCanvas data={data} tahun={tahun} />
    </div>
  );
}