"use client"
import { ArrowUp, ArrowDown, Minus } from "lucide-react"

type KPIData = {
  label: string
  value: string | number
  unit?: string
  trend?: "up" | "down" | "stable"
  trendValue?: number
  color?: "blue" | "green" | "amber" | "red"
}

function getTrendIcon(trend?: "up" | "down" | "stable") {
  if (trend === "up") return <ArrowUp className="w-4 h-4" />
  if (trend === "down") return <ArrowDown className="w-4 h-4" />
  return <Minus className="w-4 h-4" />
}

function getColorClasses(color?: string) {
  const colors: Record<string, string> = {
    blue: "border-l-4 border-blue-500 bg-blue-50",
    green: "border-l-4 border-green-500 bg-green-50",
    amber: "border-l-4 border-amber-500 bg-amber-50",
    red: "border-l-4 border-red-500 bg-red-50",
  }
  return colors[color || "blue"] || colors.blue
}

function getTrendColorClasses(trend?: "up" | "down" | "stable") {
  if (trend === "up") return "text-green-600 bg-green-100"
  if (trend === "down") return "text-red-600 bg-red-100"
  return "text-gray-600 bg-gray-100"
}

export function KPICardsFizikal({ data }: { data: KPIData[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {data.map((kpi, idx) => (
        <div key={idx} className={`${getColorClasses(kpi.color)} rounded-lg p-4 shadow-sm`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">{kpi.label}</p>
              <div className="mt-2 flex items-baseline gap-1">
                <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                {kpi.unit && <span className="text-sm text-gray-600">{kpi.unit}</span>}
              </div>
            </div>
            {kpi.trend && (
              <div className={`${getTrendColorClasses(kpi.trend)} rounded-full p-2`}>
                {getTrendIcon(kpi.trend)}
              </div>
            )}
          </div>
          {kpi.trendValue !== undefined && (
            <p className={`mt-2 text-xs font-medium ${kpi.trend === "up" ? "text-green-600" : kpi.trend === "down" ? "text-red-600" : "text-gray-600"}`}>
              {kpi.trend === "up" ? "+" : ""}{kpi.trendValue}% vs bulan lalu
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

// Demo data untuk Sawit
export const DEMO_SAWIT_KPI: KPIData[] = [
  {
    label: "Total Hasil BTS",
    value: "2,450",
    unit: "MT",
    color: "blue",
    trend: "up",
    trendValue: 12.5,
  },
  {
    label: "Luas Dituai",
    value: "1,280",
    unit: "Ha",
    color: "green",
    trend: "up",
    trendValue: 8.3,
  },
  {
    label: "Purata mtan/hek",
    value: "1.91",
    unit: "MT",
    color: "amber",
    trend: "stable",
    trendValue: 0,
  },
  {
    label: "Bil. Projek Aktif",
    value: "24",
    unit: "projek",
    color: "green",
    trend: "up",
    trendValue: 4.2,
  },
]

// Demo data untuk Getah
export const DEMO_GETAH_KPI: KPIData[] = [
  {
    label: "Total Hasil",
    value: "58,920",
    unit: "KG",
    color: "blue",
    trend: "up",
    trendValue: 15.6,
  },
  {
    label: "Luas Ditoreh",
    value: "945",
    unit: "Ha",
    color: "green",
    trend: "stable",
    trendValue: 0,
  },
  {
    label: "Purata kg/hek",
    value: "62.3",
    unit: "kg",
    color: "amber",
    trend: "down",
    trendValue: -3.2,
  },
  {
    label: "Bil. Projek Aktif",
    value: "18",
    unit: "projek",
    color: "green",
    trend: "up",
    trendValue: 5.6,
  },
]
