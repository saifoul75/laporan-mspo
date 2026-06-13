import { notFound } from "next/navigation"
import { PaparHasil } from "@/components/hasil/papar-hasil"
import { createServiceClient } from "@/lib/supabase-admin"
import { groupByMonth } from "@/lib/supabase/useHasil"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const expected = process.env.LAPORAN_HASIL_TOKEN

  if (!expected || token !== expected) {
    notFound()
  }

  const sb = createServiceClient()
  const { data, error } = await sb
    .from("hasil_bulanan")
    .select("*")
    .order("kod_bulan", { ascending: true })

  if (error) {
    console.error("Failed to fetch hasil_bulanan:", error)
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Ralat masa fetch data. Sila hubungi pentadbir.</p>
      </div>
    )
  }

  const bulanData = groupByMonth(data || [])

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Laporan Hasil Bulanan</h1>
        <p className="text-muted-foreground text-sm mt-1">Dashboard Awam — Paparan Baca Sahaja</p>
      </div>
      <PaparHasil data={bulanData} />
    </div>
  )
}
