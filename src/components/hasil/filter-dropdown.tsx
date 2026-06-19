"use client"

import { useState, useEffect } from "react"

interface FilterDropdownProps {
  onPOChange: (po: string) => void
  onModeChange: (mode: "bulan" | "setakat") => void
  selectedPO: string
  selectedMode: "bulan" | "setakat"
}

export function FilterDropdown({
  onPOChange,
  onModeChange,
  selectedPO,
  selectedMode,
}: FilterDropdownProps) {
  const [pustaOperasi, setPustaOperasi] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPustakOperasi = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/hasil/pusat-operasi")
      const result = await response.json()

      if (result.success) {
        setPustaOperasi(result.data)
      } else {
        setError(result.error || "Gagal memuat pusat operasi")
      }
    } catch (err) {
      console.error("Error fetching pusat operasi:", err)
      setError("Ralat rangkaian")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPustakOperasi()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="bg-card rounded-xl border p-4">
        <p className="text-sm text-muted-foreground">Memuat pusat operasi...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-card rounded-xl border p-4">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-xl border p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pusat Operasi Dropdown */}
        <div>
          <label className="block text-sm font-medium mb-2">Pusat Operasi</label>
          <select
            value={selectedPO}
            onChange={(e) => onPOChange(e.target.value)}
            className="w-full bg-background border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">— Pilih Pusat Operasi —</option>
            {pustaOperasi.map((po) => (
              <option key={po} value={po}>
                {po}
              </option>
            ))}
          </select>
        </div>

        {/* Mode Toggle */}
        <div>
          <label className="block text-sm font-medium mb-2">Tampilan Data</label>
          <div className="flex rounded-lg border bg-background overflow-hidden">
            <button
              onClick={() => onModeChange("bulan")}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                selectedMode === "bulan"
                  ? "bg-[#D4A017] text-black"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Bulanan
            </button>
            <button
              onClick={() => onModeChange("setakat")}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                selectedMode === "setakat"
                  ? "bg-[#D4A017] text-black"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Setakat
            </button>
          </div>
        </div>
      </div>

      {selectedPO && (
        <div className="text-xs text-muted-foreground">
          Menampilkan data {selectedMode === "bulan" ? "bulanan" : "kumulatif"} untuk{" "}
          <span className="font-semibold">{selectedPO}</span>
        </div>
      )}
    </div>
  )
}
