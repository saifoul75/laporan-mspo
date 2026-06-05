"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

const BULAN_MS = [
  "Januari", "Februari", "Mac", "April", "Mei", "Jun",
  "Julai", "Ogos", "September", "Oktober", "November", "Disember",
]

type SawitRow = { [key: string]: any }
type GetahRow = { [key: string]: any }

export default function HasilUploadPage() {
  const [loading, setLoading] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const [bulan, setBulan] = useState("2026-05")

  const addLog = (msg: string) => setLog((prev) => [...prev, msg])

  const handleUpload = async () => {
    const fileInput = document.getElementById("excel-input") as HTMLInputElement
    const file = fileInput.files?.[0]
    if (!file) return addLog("❌ Tiada fail dipilih")

    setLoading(true)
    setLog([])

    try {
      const XLSX = await import("xlsx")
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: "array" })

      addLog(`📂 Membaca fail: ${file.name}`)

      // Baca Sawit sheet
      const sawitRows: SawitRow[] = []
      const wsSawit = wb.Sheets["Sawit"]
      if (wsSawit) {
        const json = XLSX.utils.sheet_to_json<SawitRow>(wsSawit, { defval: 0 })
        sawitRows.push(...json.map((row) => normalizeRow("sawit", row)))
        addLog(`  Sawit: ${sawitRows.length} baris`)
      } else {
        addLog("  ⚠ Sheet Sawit tidak ditemui")
      }

      // Baca Getah sheet
      const getahRows: GetahRow[] = []
      const wsGetah = wb.Sheets["Getah"]
      if (wsGetah) {
        const json = XLSX.utils.sheet_to_json<GetahRow>(wsGetah, { defval: 0 })
        getahRows.push(...json.map((row) => normalizeRow("getah", row)))
        addLog(`  Getah: ${getahRows.length} baris`)
      } else {
        addLog("  ⚠ Sheet Getah tidak ditemui")
      }

      if (sawitRows.length === 0 && getahRows.length === 0) {
        addLog("❌ Tiada data")
        setLoading(false)
        return
      }

      const [tahunStr, bulanStr] = bulan.split("-")
      const namaBulan = `${BULAN_MS[parseInt(bulanStr) - 1]} ${tahunStr}`

      addLog(`📤 Hantar ke Supabase (${namaBulan})...`)

      const res = await fetch("/api/hasil/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kod_bulan: bulan,
          nama_bulan: namaBulan,
          sawit: sawitRows,
          getah: getahRows,
        }),
      })

      const data = await res.json()

      if (data.success) {
        addLog(`✅ ${data.message}`)
      } else {
        addLog(`❌ Gagal: ${data.error}`)
      }
    } catch (err: any) {
      addLog(`❌ Error: ${err.message || err}`)
    }

    setLoading(false)
  }

  const handleDeleteMonth = async () => {
    if (!confirm(`Padam semua data untuk ${bulan}?`)) return
    setLoading(true)
    setLog([])

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("hasil_bulanan")
        .delete()
        .eq("kod_bulan", bulan)

      if (error) {
        addLog(`❌ Gagal padam: ${error.message}`)
      } else {
        addLog(`✅ Data ${bulan} berjaya dipadam`)
      }
    } catch (err: any) {
      addLog(`❌ Error: ${err.message || err}`)
    }

    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload Hasil Bulanan</h1>
        <p className="text-muted-foreground text-sm mt-1">Import Excel terus ke Supabase — data terus live</p>
      </div>

      <div className="bg-card rounded-xl border p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Bulan</label>
            <select
              value={bulan}
              onChange={(e) => setBulan(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm bg-background w-full mt-1"
            >
              {Array.from({ length: 12 }, (_, i) => {
                const m = String(i + 1).padStart(2, "0")
                return (
                  <option key={m} value={`2026-${m}`}>
                    {BULAN_MS[i]} 2026
                  </option>
                )
              })}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Fail Excel (.xlsx)</label>
            <input
              id="excel-input"
              type="file"
              accept=".xlsx,.xls"
              className="border rounded-lg px-3 py-2 text-sm bg-background w-full mt-1"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleUpload}
            disabled={loading}
            className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-primary/90"
          >
            {loading ? "Memproses..." : "📤 Import & Simpan"}
          </button>
          <button
            onClick={handleDeleteMonth}
            disabled={loading}
            className="bg-red-600 text-white px-6 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-red-700"
          >
            🗑️ Padam Bulan
          </button>
        </div>
      </div>

      {log.length > 0 && (
        <div className="bg-muted rounded-xl border p-4 font-mono text-sm space-y-1">
          {log.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      )}
    </div>
  )
}

function normalizeRow(jenis: "sawit" | "getah", raw: any): any {
  const row: any = {}
  const fields = jenis === "sawit"
    ? ["pol_pn", "bil", "nama", "luas_hek", "luas_dituai", "peserta", "hasil_mt", "mtan_hek", "matlamat_setahun", "pct_setahun", "pendapatan", "kos", "untung_rugi"]
    : ["pol_pn", "bil", "nama", "luas_hek", "luas_ditoreh", "peserta", "hasil_kg", "kg_hek", "matlamat_setahun", "pct_setahun", "pendapatan", "kos", "untung_rugi"]

  const headers = Object.keys(raw)
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i]
    const header = headers[i]
    let v = raw[header]
    if (typeof v === "string") v = v.trim()
    row[field] = v ?? (field === "pol_pn" || field === "nama" ? "" : 0)
  }
  return row
}
