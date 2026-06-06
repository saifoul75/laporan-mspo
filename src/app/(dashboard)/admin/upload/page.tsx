"use client"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import * as XLSX from "xlsx"

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
  const [skipRows, setSkipRows] = useState(0)
  const [preview, setPreview] = useState<{ sawit: string[]; getah: string[]; mapped: { sawit: Record<string, string>; getah: Record<string, string> } } | null>(null)

  const addLog = (msg: string) => setLog((prev) => [...prev, msg])

  function findHeaderRow(ws: XLSX.WorkSheet): number {
    const json = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" })
    for (let i = 0; i < Math.min(30, json.length); i++) {
      const row = json[i]
      const meaningfulCells = row.filter((c) => {
        const s = String(c).toLowerCase().trim()
        return s.length > 2 && !/^\d+(\.\d+)?$/.test(s)
      }).length
      if (meaningfulCells >= 5) {
        const hasPol = row.some(c => String(c).toLowerCase().includes("pol") || String(c).toLowerCase().includes("pn"))
        const hasNama = row.some(c => String(c).toLowerCase().includes("nama"))
        if (hasPol || hasNama) return i + 1 // +1 sebab range dalam xlsx adalah 1-based
      }
    }
    return 0
  }

  function cleanJson(json: Record<string, any>[]): Record<string, any>[] {
    return json
      .filter((row) => {
        const nonEmpty = Object.entries(row).filter(([k, v]) => 
          !k.startsWith("__EMPTY") && v !== null && v !== "" && String(v).trim() !== ""
        )
        if (nonEmpty.length < 3) return false
        
        const mapped = mapHeaders(Object.fromEntries(nonEmpty))
        
        // Filter 1: Nama mesti ada dan bukan nombor sahaja
        if (!mapped.nama || /^\d+$/.test(String(mapped.nama).trim())) return false
        
        // Filter 2: Nama tak boleh sama dengan POL/PN (group header)
        if (mapped.nama && mapped.pol_pn && String(mapped.nama).trim().toUpperCase() === String(mapped.pol_pn).trim().toUpperCase()) return false
        
        // Filter 3: Nama tak boleh mengandungi "jumlah", "total", "sub" sahaja
        const namaLower = String(mapped.nama).toLowerCase()
        if (namaLower.includes("jumlah") || namaLower.includes("total") || namaLower === "sub") return false
        
        // Filter 4: Mesti ada sekurang-kurangnya satu data numerik yang bermakna
        const hasData = (mapped.luas_hek ?? 0) > 0 || (mapped.hasil_mt ?? 0) > 0 || (mapped.hasil_kg ?? 0) > 0 || (mapped.bil ?? 0) > 0
        if (!hasData) return false
        
        return true
      })
      .map((row) => {
        const cleaned: Record<string, any> = {}
        for (const [key, val] of Object.entries(row)) {
          if (key.startsWith("__EMPTY")) continue
          cleaned[key] = val
        }
        return cleaned
      })
  }

  const readWorkbook = async () => {
    const fileInput = document.getElementById("excel-input") as HTMLInputElement
    const file = fileInput.files?.[0]
    if (!file) { addLog("❌ Tiada fail dipilih"); return null }
    const buf = await file.arrayBuffer()
    return XLSX.read(buf, { type: "array" })
  }

  const handlePreview = async () => {
    const wb = await readWorkbook()
    if (!wb) return
    setLog([])
    const result: typeof preview = { sawit: [], getah: [], mapped: { sawit: {}, getah: {} } }

    for (const [sheetNames, key] of [[["databaseSwt", "Sawit"], "sawit"], [["DatabaseGth", "Getah"], "getah"]] as const) {
      let ws: XLSX.WorkSheet | undefined
      let usedSheetName = ""
      for (const sheetName of sheetNames) {
        if (wb.Sheets[sheetName]) {
          ws = wb.Sheets[sheetName]
          usedSheetName = sheetName
          break
        }
      }
      if (!ws) {
        addLog(`⚠ Tiada sheet ${key} (cuba ${sheetNames.join(" atau ")})`)
        continue
      }
      
      const autoSkip = skipRows > 0 ? skipRows : findHeaderRow(ws)
      addLog(`🔎 ${usedSheetName}: auto-detect header di baris ${autoSkip + 1}`)
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: null, range: autoSkip })
      const cleaned = cleanJson(json)
      
      if (cleaned.length > 0) {
        const headers = Object.keys(cleaned[0])
        result[key] = headers
        result.mapped[key] = Object.fromEntries(
          headers.map(h => {
            const m = mapHeaders({ [h]: cleaned[0][h] })
            const target = Object.keys(m)[0]
            return [h, target || "(tidak dimap)"]
          })
        )
        addLog(`📋 ${usedSheetName}: ${headers.length} columns, ${cleaned.length} baris bersih`)
      }
    }
    setPreview(result)
  }

  const handleUpload = async () => {
    const fileInput = document.getElementById("excel-input") as HTMLInputElement
    const file = fileInput.files?.[0]
    if (!file) return addLog("❌ Tiada fail dipilih")

    setLoading(true)
    setLog([])

    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: "array" })

      addLog(`📂 Membaca fail: ${file.name}`)

      // Baca data - guna databaseSwt/DatabaseGth (clean), fallback ke Sawit/Getah
      const sawitSheetNames = ["databaseSwt", "Sawit"]
      const getahSheetNames = ["DatabaseGth", "Getah"]

      const sawitRows: SawitRow[] = []
      for (const sheetName of sawitSheetNames) {
        const ws = wb.Sheets[sheetName]
        if (ws) {
          const autoSkip = skipRows > 0 ? skipRows : findHeaderRow(ws)
          const json = XLSX.utils.sheet_to_json<SawitRow>(ws, { defval: null, range: autoSkip })
          const cleaned = cleanJson(json)
          sawitRows.push(...cleaned.map((row) => normalizeRow("sawit", row)))
          addLog(`  ✅ Guna sheet: ${sheetName} (header baris ${autoSkip + 1}, ${sawitRows.length} baris bersih)`)
          break
        }
      }
      if (sawitRows.length === 0) addLog("  ⚠ Tiada data Sawit ditemui")

      const getahRows: GetahRow[] = []
      for (const sheetName of getahSheetNames) {
        const ws = wb.Sheets[sheetName]
        if (ws) {
          const autoSkip = skipRows > 0 ? skipRows : findHeaderRow(ws)
          const json = XLSX.utils.sheet_to_json<GetahRow>(ws, { defval: null, range: autoSkip })
          const cleaned = cleanJson(json)
          getahRows.push(...cleaned.map((row) => normalizeRow("getah", row)))
          addLog(`  ✅ Guna sheet: ${sheetName} (header baris ${autoSkip + 1}, ${getahRows.length} baris bersih)`)
          break
        }
      }
      if (getahRows.length === 0) addLog("  ⚠ Tiada data Getah ditemui")

      if (sawitRows.length === 0 && getahRows.length === 0) {
        addLog("❌ Tiada data")
        setLoading(false)
        return
      }

      const [tahunStr, bulanStr] = bulan.split("-")
      const namaBulan = `${BULAN_MS[parseInt(bulanStr) - 1]} ${tahunStr}`

      addLog(`📤 Hantar ke Supabase (${namaBulan})...`)

      // Deduplicate by project name (keep last occurrence)
      const dedupSawit = Array.from(new Map(sawitRows.map(r => [r.nama, r])).values())
      const dedupGetah = Array.from(new Map(getahRows.map(r => [r.nama, r])).values())

      if (dedupSawit.length < sawitRows.length) {
        addLog(`  ⚠ Buang ${sawitRows.length - dedupSawit.length} duplikat Sawit`)
      }
      if (dedupGetah.length < getahRows.length) {
        addLog(`  ⚠ Buang ${getahRows.length - dedupGetah.length} duplikat Getah`)
      }

      const res = await fetch("/api/hasil/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kod_bulan: bulan,
          nama_bulan: namaBulan,
          sawit: dedupSawit,
          getah: dedupGetah,
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
          <div>
            <label className="text-sm font-medium">Skip Rows</label>
            <input
              type="number"
              min="0"
              max="20"
              value={skipRows}
              onChange={(e) => setSkipRows(Number(e.target.value))}
              className="border rounded-lg px-3 py-2 text-sm bg-background w-full mt-1"
              title="Berapa baris title header sebelum row tajuk columns"
            />
            <p className="text-[11px] text-muted-foreground mt-1">Baris title header sebelum column headers (contoh: 2 = skip 2 baris pertama)</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handlePreview}
            disabled={loading}
            className="bg-slate-700 text-white px-6 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-slate-800"
          >
            🔍 Preview Header
          </button>
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

      {/* Preview Headers */}
      {preview && (
        <div className="grid grid-cols-2 gap-4">
          {(["sawit", "getah"] as const).map((key) => (
            <div key={key} className="bg-card rounded-xl border p-4">
              <h3 className="text-sm font-bold uppercase mb-3 capitalize">{key}</h3>
              {preview[key].length > 0 ? (
                <table className="w-full text-sm">
                  <thead><tr><th className="text-left py-1 px-2 text-muted-foreground">Excel Column</th><th className="text-left py-1 px-2 text-muted-foreground">Maps To</th></tr></thead>
                  <tbody>
                    {preview[key].map((h, i) => (
                      <tr key={i} className="border-b border-border/30">
                        <td className="py-1 px-2 font-mono text-xs">{h}</td>
                        <td className={`py-1 px-2 text-xs font-semibold ${preview.mapped[key][h] === "(tidak dimap)" ? "text-red-500" : "text-green-600"}`}>
                          {preview.mapped[key][h]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-muted-foreground text-sm">Sheet tidak ditemui</p>
              )}
            </div>
          ))}
        </div>
      )}

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

function cleanNum(v: any): number {
  if (typeof v === "number") return v
  if (typeof v === "string") {
    const s = v.replace(/[%\s,]/g, "").replace(/^RM/i, "")
    const n = parseFloat(s)
    return isNaN(n) ? 0 : n
  }
  return 0
}

function mapHeaders(obj: any): Record<string, any> {
  const result: Record<string, any> = {}
  for (const key of Object.keys(obj)) {
    const lk = key.toLowerCase().trim().replace(/\s+/g, "_").replace(/^_+|_+$/g, "")
    const v = obj[key]
    
    if (lk === "bil" || lk === "no.") {
      result.bil = v
    } else if (lk.includes("pol") || lk.includes("pn")) {
      result.pol_pn = v
    } else if (lk.includes("nama") && lk.includes("projek")) {
      result.nama = v
    } else if (lk.includes("luas") && (lk.includes("dituai") || lk.includes("tuai"))) {
      result.luas_dituai = v
    } else if (lk.includes("luas") && (lk.includes("ditoreh") || lk.includes("toreh"))) {
      result.luas_ditoreh = v
    } else if (lk.includes("luas") && lk.includes("kawasan")) {
      result.luas_hek = v
    } else if (lk.includes("bilangan") && lk.includes("peserta") || lk.includes("peserta")) {
      result.peserta = v
    } else if (lk.includes("jumlah") && lk.includes("hasil") && lk.includes("btb")) {
      result.hasil_mt = v
    } else if (lk.includes("jumlah") && lk.includes("hasil") && lk.includes("kg")) {
      result.hasil_kg = v
    } else if (lk.includes("%") && lk.includes("capai")) {
      result.pct_setahun = v
    } else if (lk.includes("jangkaan") && lk.includes("tahun")) {
      result.matlamat_setahun = v
    } else if (lk.includes("matlamat") && lk.includes("tahun")) {
      result.matlamat_setahun = v
    } else if (lk.includes("jumlah") && lk.includes("pendapatan")) {
      result.pendapatan = v
    } else if (lk.includes("pendapatan")) {
      result.pendapatan = v
    } else if (lk.includes("kos") && lk.includes("pengeluaran")) {
      result.kos = v
    } else if (lk.includes("untung")) {
      result.untung_rugi = v
    }
  }
  return result
}

function normalizeRow(jenis: "sawit" | "getah", raw: any): any {
  const mapped = mapHeaders(raw)
  const numFields = ["bil", "peserta", "luas_hek", "luas_dituai", "luas_ditoreh", "hasil_mt", "hasil_kg", "mtan_hek", "kg_hek", "matlamat_setahun", "pct_setahun", "pendapatan", "kos", "untung_rugi"]

  for (const field of numFields) {
    if (mapped[field] !== undefined) {
      mapped[field] = cleanNum(mapped[field])
    }
  }

  return {
    pol_pn: mapped.pol_pn ?? "",
    bil: mapped.bil ?? 0,
    nama: mapped.nama ?? "",
    luas_hek: mapped.luas_hek ?? 0,
    luas_dituai: mapped.luas_dituai ?? 0,
    luas_ditoreh: mapped.luas_ditoreh ?? 0,
    peserta: mapped.peserta ?? 0,
    hasil_mt: mapped.hasil_mt ?? 0,
    hasil_kg: mapped.hasil_kg ?? 0,
    mtan_hek: mapped.mtan_hek ?? 0,
    kg_hek: mapped.kg_hek ?? 0,
    matlamat_setahun: mapped.matlamat_setahun ?? 0,
    pct_setahun: mapped.pct_setahun ?? 0,
    pendapatan: mapped.pendapatan ?? 0,
    kos: mapped.kos ?? 0,
    untung_rugi: mapped.untung_rugi ?? 0,
  }
}
