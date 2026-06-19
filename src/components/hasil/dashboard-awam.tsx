"use client"
import { useState, useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"
import type { BulanData, PS, PG } from "@/lib/supabase/useHasil"
import { getNegeri, getWilayah } from "@/lib/supabase/useHasil"

const AXIS_TICK_STYLE = { fontSize: 12 }
const TOOLTIP_STYLE = { borderRadius: 8 }

function fmt(n: number | undefined | null, d = 0): string {
  if (n == null || isNaN(n)) return "—"
  return n.toLocaleString("ms-MY", { minimumFractionDigits: d, maximumFractionDigits: d })
}

interface FilterState {
  wilayah: string
  negeri: string
  po: string
  projek: string
  bulan: string
}

export function DashboardAwam({ data: dataBulanan }: { data: BulanData[] }) {
  const [filters, setFilters] = useState<FilterState>({
    wilayah: "Semua",
    negeri: "Semua",
    po: "Semua",
    projek: "Semua",
    bulan: "Semua",
  })

  // Disable copy, cut, paste
  const handleCopyPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
  }

  // Flatten all rows for filtering
  const allRows = useMemo(() => {
    const rows: (HasilRowWithBulan)[] = []
    dataBulanan.forEach(b => {
      b.sawit.forEach(s => rows.push({ ...s, kod_bulan: b.kod, nama_bulan: b.nama, jenis: "sawit" }))
      b.getah.forEach(g => rows.push({ ...g, kod_bulan: b.kod, nama_bulan: b.nama, jenis: "getah" }))
    })
    return rows
  }, [dataBulanan])

  // Get unique values for each filter level
  const wilayahList = useMemo(
    () => ["Semua", ...new Set(allRows.map(r => getWilayah(r as any)))].filter(Boolean),
    [allRows]
  )

  const negeriList = useMemo(() => {
    if (filters.wilayah === "Semua") return ["Semua", ...new Set(allRows.map(r => getNegeri(r as any)))]
    const filtered = allRows.filter(r => getWilayah(r as any) === filters.wilayah)
    return ["Semua", ...new Set(filtered.map(r => getNegeri(r as any)))]
  }, [filters.wilayah, allRows])

  const poList = useMemo(() => {
    let filtered = allRows
    if (filters.wilayah !== "Semua") filtered = filtered.filter(r => getWilayah(r as any) === filters.wilayah)
    if (filters.negeri !== "Semua") filtered = filtered.filter(r => getNegeri(r as any) === filters.negeri)
    return ["Semua", ...new Set(filtered.map(r => r.pol_pn))]
  }, [filters.wilayah, filters.negeri, allRows])

  const projekList = useMemo(() => {
    let filtered = allRows
    if (filters.wilayah !== "Semua") filtered = filtered.filter(r => getWilayah(r as any) === filters.wilayah)
    if (filters.negeri !== "Semua") filtered = filtered.filter(r => getNegeri(r as any) === filters.negeri)
    if (filters.po !== "Semua") filtered = filtered.filter(r => r.pol_pn === filters.po)
    return ["Semua", ...new Set(filtered.map(r => r.nama))]
  }, [filters.wilayah, filters.negeri, filters.po, allRows])

  const bulanList = useMemo(
    () => ["Semua", ...dataBulanan.map(b => b.nama)],
    [dataBulanan]
  )

  // Apply filters to data
  const filteredRows = useMemo(() => {
    let result = allRows
    if (filters.wilayah !== "Semua") result = result.filter(r => getWilayah(r as any) === filters.wilayah)
    if (filters.negeri !== "Semua") result = result.filter(r => getNegeri(r as any) === filters.negeri)
    if (filters.po !== "Semua") result = result.filter(r => r.pol_pn === filters.po)
    if (filters.projek !== "Semua") result = result.filter(r => r.nama === filters.projek)
    if (filters.bulan !== "Semua") result = result.filter(r => r.nama_bulan === filters.bulan)
    return result
  }, [allRows, filters])

  // Calculate KPI for Sawit
  const sawitRows = filteredRows.filter(r => r.jenis === "sawit") as any[]
  const sawitHasil = sawitRows.reduce((a, r) => a + (r.hasil_mt ?? 0), 0)
  const sawitLuas = sawitRows.reduce((a, r) => a + (r.luas_dituai ?? 0), 0)
  const sawitPerHek = sawitLuas > 0 ? sawitHasil / sawitLuas : 0

  // Calculate KPI for Getah
  const getahRows = filteredRows.filter(r => r.jenis === "getah") as any[]
  const getahHasil = getahRows.reduce((a, r) => a + (r.hasil_kg ?? 0), 0)
  const getahLuas = getahRows.reduce((a, r) => a + (r.luas_ditoreh ?? 0), 0)
  const getahPerHek = getahLuas > 0 ? getahHasil / getahLuas : 0

  // Monthly trend data (ignore bulan filter for chart)
  const chartData = useMemo(() => {
    let rows = allRows
    if (filters.wilayah !== "Semua") rows = rows.filter(r => getWilayah(r as any) === filters.wilayah)
    if (filters.negeri !== "Semua") rows = rows.filter(r => getNegeri(r as any) === filters.negeri)
    if (filters.po !== "Semua") rows = rows.filter(r => r.pol_pn === filters.po)
    if (filters.projek !== "Semua") rows = rows.filter(r => r.nama === filters.projek)

    const map = new Map<string, { sawit: number; getah: number }>()
    rows.forEach(r => {
      if (!map.has(r.nama_bulan)) map.set(r.nama_bulan, { sawit: 0, getah: 0 })
      const entry = map.get(r.nama_bulan)!
      if (r.jenis === "sawit") {
        const ps = r as PS & { nama_bulan: string }
        entry.sawit += ps.hasil_mt ?? 0
      } else {
        const pg = r as PG & { nama_bulan: string }
        entry.getah += pg.hasil_kg ?? 0
      }
    })
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([bulan, data]) => ({
        bulan: bulan.split(" ")[0].substring(0, 3),
        "Hasil Sawit (MT)": data.sawit,
        "Hasil Getah (kg)": data.getah,
      }))
  }, [allRows, filters.wilayah, filters.negeri, filters.po, filters.projek])

  // Adaptive breakdown table
  const breakdownData = useMemo(() => {
    const rows = filteredRows
    const groupByField = getGroupingField(filters)

    const map = new Map<string, { sawit: number; sawitLuas: number; getah: number; getahLuas: number }>()
    rows.forEach(r => {
      const key = getGroupingValue(r, groupByField)
      if (!map.has(key)) map.set(key, { sawit: 0, sawitLuas: 0, getah: 0, getahLuas: 0 })
      const entry = map.get(key)!
      if (r.jenis === "sawit") {
        const ps = r as PS
        entry.sawit += ps.hasil_mt ?? 0
        entry.sawitLuas += ps.luas_dituai ?? 0
      } else {
        const pg = r as PG
        entry.getah += pg.hasil_kg ?? 0
        entry.getahLuas += pg.luas_ditoreh ?? 0
      }
    })

    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, data]) => ({
        key,
        sawitHasil: data.sawit,
        sawitPerHek: data.sawitLuas > 0 ? data.sawit / data.sawitLuas : 0,
        getahHasil: data.getah,
        getahPerHek: data.getahLuas > 0 ? data.getah / data.getahLuas : 0,
      }))
  }, [filteredRows, filters])

  const groupingField = getGroupingField(filters)
  const groupingLabel = getGroupingLabel(groupingField)

  const handleFilterChange = (field: keyof FilterState, value: string) => {
    setFilters(prev => {
      const newFilters = { ...prev, [field]: value }
      // Reset child filters when parent changes
      if (field === "wilayah") newFilters.negeri = "Semua"
      if (field === "wilayah" || field === "negeri") newFilters.po = "Semua"
      if (field === "wilayah" || field === "negeri" || field === "po") newFilters.projek = "Semua"
      return newFilters
    })
  }

  const bulanLabel = filters.bulan === "Semua" ? "Setakat (semua bulan)" : filters.bulan

  return (
    <div
      className="space-y-6"
      onCopy={handleCopyPaste}
      onCut={handleCopyPaste}
      onPaste={handleCopyPaste}
    >
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
        <h3 className="text-xs uppercase tracking-wide text-gray-600 font-semibold">Tapisan</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <FilterSelect
            label="Wilayah"
            value={filters.wilayah}
            options={wilayahList}
            onChange={v => handleFilterChange("wilayah", v)}
          />
          <FilterSelect
            label="Negeri"
            value={filters.negeri}
            options={negeriList}
            onChange={v => handleFilterChange("negeri", v)}
          />
          <FilterSelect
            label="PO"
            value={filters.po}
            options={poList}
            onChange={v => handleFilterChange("po", v)}
          />
          <FilterSelect
            label="Projek"
            value={filters.projek}
            options={projekList}
            onChange={v => handleFilterChange("projek", v)}
          />
          <FilterSelect
            label="Bulan"
            value={filters.bulan}
            options={bulanList}
            onChange={v => handleFilterChange("bulan", v)}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KPICard
          title="Hasil Sawit"
          value={fmt(sawitHasil)}
          unit="MT"
          subLabel="MT/hek"
          subValue={fmt(sawitPerHek, 2)}
          color="bg-amber-50"
          borderColor="border-amber-200"
        />
        <KPICard
          title="Hasil Getah"
          value={fmt(getahHasil)}
          unit="kg"
          subLabel="kg/hek"
          subValue={fmt(getahPerHek, 2)}
          color="bg-green-50"
          borderColor="border-green-200"
        />
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <h3 className="text-xs uppercase tracking-wide text-gray-600 font-semibold mb-4">Trend Bulanan</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="bulan" tick={AXIS_TICK_STYLE} />
              <YAxis tick={AXIS_TICK_STYLE} />
              <Tooltip
                formatter={v => (typeof v === "number" ? v.toLocaleString("ms-MY") : v)}
                contentStyle={TOOLTIP_STYLE}
              />
              <Legend />
              <Bar dataKey="Hasil Sawit (MT)" fill="#ea580c" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Hasil Getah (kg)" fill="#b45309" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breakdown Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-gray-600 font-semibold">{groupingLabel}</th>
                <th className="px-4 py-3 text-right text-xs uppercase tracking-wide text-gray-600 font-semibold">Sawit (MT)</th>
                <th className="px-4 py-3 text-right text-xs uppercase tracking-wide text-gray-600 font-semibold">MT/hek</th>
                <th className="px-4 py-3 text-right text-xs uppercase tracking-wide text-gray-600 font-semibold">Getah (kg)</th>
                <th className="px-4 py-3 text-right text-xs uppercase tracking-wide text-gray-600 font-semibold">kg/hek</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {breakdownData.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{row.key}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{fmt(row.sawitHasil)}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{fmt(row.sawitPerHek, 2)}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{fmt(row.getahHasil)}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{fmt(row.getahPerHek, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs uppercase tracking-wide text-gray-600 font-semibold">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {options.map(opt => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  )
}

function KPICard({
  title,
  value,
  unit,
  subLabel,
  subValue,
  color,
  borderColor,
}: {
  title: string
  value: string
  unit: string
  subLabel: string
  subValue: string
  color: string
  borderColor: string
}) {
  return (
    <div className={`${color} rounded-xl shadow-sm border ${borderColor} p-4 space-y-3`}>
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-600 font-semibold">{title}</p>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
        <span className="text-sm text-gray-600">{unit}</span>
      </div>
      <div className="flex items-baseline gap-2 pt-2 border-t border-gray-300/50">
        <span className="text-xs text-gray-600">{subLabel}:</span>
        <span className="text-lg font-semibold text-gray-900">{subValue}</span>
      </div>
    </div>
  )
}

type HasilRowWithBulan = (PS | PG) & {
  kod_bulan: string
  nama_bulan: string
  jenis: "sawit" | "getah"
}

function getGroupingField(filters: FilterState): string {
  if (filters.projek !== "Semua") return "projek"
  if (filters.po !== "Semua") return "po"
  if (filters.negeri !== "Semua") return "negeri"
  if (filters.wilayah !== "Semua") return "wilayah"
  return "wilayah"
}

function getGroupingLabel(field: string): string {
  const labels: Record<string, string> = {
    wilayah: "Wilayah",
    negeri: "Negeri",
    po: "PO",
    projek: "Projek",
  }
  return labels[field] || "Wilayah"
}

function getGroupingValue(row: HasilRowWithBulan, field: string): string {
  if (field === "wilayah") return getWilayah(row as any)
  if (field === "negeri") return getNegeri(row as any)
  if (field === "po") return row.pol_pn
  if (field === "projek") return row.nama
  return getWilayah(row as any)
}
