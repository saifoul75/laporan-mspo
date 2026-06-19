"use client"

import { useState, useEffect } from "react"
import { FilterDropdown } from "@/components/hasil/filter-dropdown"

interface HasilData {
  kod: string
  nama: string
  sawit: any[]
  getah: any[]
}

interface SetakatData {
  sawit: any[]
  getah: any[]
}

export default function HasilPustakOperasiPage() {
  const [selectedPO, setSelectedPO] = useState("")
  const [selectedMode, setSelectedMode] = useState<"bulan" | "setakat">("bulan")
  const [data, setData] = useState<HasilData[] | SetakatData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({
        po: selectedPO,
        mode: selectedMode,
      })
      const response = await fetch(`/api/hasil/data?${params}`)
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || "Gagal memuat data")
      }
    } catch (err) {
      console.error("Error fetching data:", err)
      setError("Ralat rangkaian")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedPO) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPO, selectedMode])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Prestasi Hasil Pusat Operasi</h1>
        <p className="text-gray-500 text-sm mt-1">
          {selectedMode === "bulan"
            ? "Lihat prestasi bulanan mengikut pusat operasi"
            : "Lihat prestasi kumulatif setakat bulan terpilih"}
        </p>
      </div>

      <FilterDropdown
        selectedPO={selectedPO}
        selectedMode={selectedMode}
        onPOChange={setSelectedPO}
        onModeChange={setSelectedMode}
      />

      {loading && (
        <div className="bg-card rounded-xl border p-8 text-center">
          <p className="text-muted-foreground">Memuat data...</p>
        </div>
      )}

      {error && (
        <div className="bg-card rounded-xl border p-4 bg-red-50 border-red-200">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && data && selectedPO && (
        <div className="space-y-6">
          {selectedMode === "bulan" ? (
            <MonthlyView data={data as HasilData[]} po={selectedPO} />
          ) : (
            <CumulativeView data={data as SetakatData} po={selectedPO} />
          )}
        </div>
      )}

      {!loading && !error && !data && selectedPO && (
        <div className="bg-card rounded-xl border p-8 text-center">
          <p className="text-muted-foreground">Tiada data untuk pusat operasi ini</p>
        </div>
      )}
    </div>
  )
}

function MonthlyView({ data, po }: { data: HasilData[]; po: string }) {
  return (
    <div className="space-y-4">
      {data.map((month) => (
        <div key={month.kod} className="bg-card rounded-xl border overflow-hidden">
          <div className="bg-[#D4A017] text-black px-4 py-3 font-semibold">
            {month.nama}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Nama Projek</th>
                  <th className="px-4 py-2 text-right font-semibold">Jenis</th>
                  <th className="px-4 py-2 text-right font-semibold">Hasil</th>
                  <th className="px-4 py-2 text-right font-semibold">Pendapatan (RM)</th>
                  <th className="px-4 py-2 text-right font-semibold">Kos (RM)</th>
                  <th className="px-4 py-2 text-right font-semibold">Untung/Rugi (RM)</th>
                </tr>
              </thead>
              <tbody>
                {month.sawit.map((item, idx) => (
                  <tr key={`s-${idx}`} className="border-t">
                    <td className="px-4 py-2">{item.nama}</td>
                    <td className="px-4 py-2 text-right">Sawit</td>
                    <td className="px-4 py-2 text-right">
                      {fmt(item.hasil_mt)} MT
                    </td>
                    <td className="px-4 py-2 text-right">
                      {fmt(item.pendapatan, 2)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {fmt(item.kos, 2)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {fmt(item.untung_rugi, 2)}
                    </td>
                  </tr>
                ))}
                {month.getah.map((item, idx) => (
                  <tr key={`g-${idx}`} className="border-t">
                    <td className="px-4 py-2">{item.nama}</td>
                    <td className="px-4 py-2 text-right">Getah</td>
                    <td className="px-4 py-2 text-right">
                      {fmt(item.hasil_kg)} KG
                    </td>
                    <td className="px-4 py-2 text-right">
                      {fmt(item.pendapatan, 2)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {fmt(item.kos, 2)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {fmt(item.untung_rugi, 2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

function CumulativeView({ data, po }: { data: SetakatData; po: string }) {
  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="bg-[#D4A017] text-black px-4 py-3 font-semibold">
          Hasil Kumulatif Sawit
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">Nama Projek</th>
                <th className="px-4 py-2 text-right font-semibold">Hasil (MT)</th>
                <th className="px-4 py-2 text-right font-semibold">Pendapatan (RM)</th>
                <th className="px-4 py-2 text-right font-semibold">Kos (RM)</th>
                <th className="px-4 py-2 text-right font-semibold">Untung/Rugi (RM)</th>
              </tr>
            </thead>
            <tbody>
              {data.sawit.map((item, idx) => (
                <tr key={idx} className="border-t">
                  <td className="px-4 py-2">{item.nama}</td>
                  <td className="px-4 py-2 text-right">{fmt(item.hasil_mt)}</td>
                  <td className="px-4 py-2 text-right">{fmt(item.pendapatan, 2)}</td>
                  <td className="px-4 py-2 text-right">{fmt(item.kos, 2)}</td>
                  <td className="px-4 py-2 text-right">{fmt(item.untung_rugi, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {data.getah.length > 0 && (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="bg-[#2E8B57] text-white px-4 py-3 font-semibold">
            Hasil Kumulatif Getah
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Nama Projek</th>
                  <th className="px-4 py-2 text-right font-semibold">Hasil (KG)</th>
                  <th className="px-4 py-2 text-right font-semibold">Pendapatan (RM)</th>
                  <th className="px-4 py-2 text-right font-semibold">Kos (RM)</th>
                  <th className="px-4 py-2 text-right font-semibold">Untung/Rugi (RM)</th>
                </tr>
              </thead>
              <tbody>
                {data.getah.map((item, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-4 py-2">{item.nama}</td>
                    <td className="px-4 py-2 text-right">{fmt(item.hasil_kg)}</td>
                    <td className="px-4 py-2 text-right">{fmt(item.pendapatan, 2)}</td>
                    <td className="px-4 py-2 text-right">{fmt(item.kos, 2)}</td>
                    <td className="px-4 py-2 text-right">{fmt(item.untung_rugi, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function fmt(n: number | undefined | null, d = 0): string {
  if (n == null || isNaN(n)) return "—"
  return n.toLocaleString("ms-MY", { minimumFractionDigits: d, maximumFractionDigits: d })
}
