"use client"
import { useEffect } from "react"
import { useHasil } from "@/lib/supabase/useHasil"
import { DashboardAwam } from "@/components/hasil/dashboard-awam"

export default function HasilPage() {
  const { data: dataBulanan, loading } = useHasil()

  useEffect(() => {
    // Disable right-click
    const handleContextMenu = (e: MouseEvent) => e.preventDefault()
    // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) ||
        (e.ctrlKey && e.key === "u")
      ) {
        e.preventDefault()
      }
    }
    document.addEventListener("contextmenu", handleContextMenu)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Ringkasan Prestasi Hasil</h1>
          <p className="text-gray-500 text-sm mt-1">Memuat data...</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="h-3 bg-gray-200 animate-pulse rounded w-3/4 mb-2" />
              <div className="h-8 bg-gray-200 animate-pulse rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-200 animate-pulse rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ringkasan Prestasi Hasil</h1>
        <p className="text-gray-500 text-sm mt-1">Semua projek sawit &amp; getah</p>
      </div>
      {dataBulanan.length > 0 ? (
        <DashboardAwam data={dataBulanan} />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-500">Tiada data hasil buat masa ini.</p>
        </div>
      )}
    </div>
  )
}
