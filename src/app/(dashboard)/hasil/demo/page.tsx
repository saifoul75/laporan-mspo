"use client"
import { useState } from "react"
import { KPICardsFizikal, DEMO_SAWIT_KPI, DEMO_GETAH_KPI } from "@/components/hasil/kpi-cards-fizikal"

export default function DemoKPIPage() {
  const [jenis, setJenis] = useState<"sawit" | "getah">("sawit")
  
  const kpiData = jenis === "sawit" ? DEMO_SAWIT_KPI : DEMO_GETAH_KPI

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Demo Laporan Fizikal - KPI Cards</h1>
        <p className="text-muted-foreground mt-2">Contoh struktur KPI Cards untuk laporan hasil</p>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setJenis("sawit")}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            jenis === "sawit"
              ? "bg-[#C0182A] text-white"
              : "bg-gray-200 text-gray-800 hover:bg-gray-300"
          }`}
        >
          Projek Sawit
        </button>
        <button
          onClick={() => setJenis("getah")}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            jenis === "getah"
              ? "bg-[#D4A017] text-black"
              : "bg-gray-200 text-gray-800 hover:bg-gray-300"
          }`}
        >
          Projek Getah
        </button>
      </div>

      {/* KPI Cards */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold mb-4">
          {jenis === "sawit" ? "Ringkasan Prestasi Sawit" : "Ringkasan Prestasi Getah"} — Setakat Jun 2026
        </h2>
        <KPICardsFizikal data={kpiData} />
      </div>

      {/* Features Explanation */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-6 space-y-4">
        <h3 className="font-semibold text-blue-900">Fitur KPI Cards:</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>✅ <strong>Color-coded borders</strong> - Setiap card ada warna yang berbeza</li>
          <li>✅ <strong>Trend indicators</strong> - Anak panah naik/turun menunjukkan trend</li>
          <li>✅ <strong>Percentage change</strong> - Perubahan vs bulan lalu</li>
          <li>✅ <strong>Responsive grid</strong> - 1 kolom mobile, 2 tablet, 4 desktop</li>
          <li>✅ <strong>Unit labels</strong> - MT, Ha, KG, etc</li>
        </ul>
      </div>

      {/* Implementation Guide */}
      <div className="bg-amber-50 rounded-xl border border-amber-200 p-6 space-y-4">
        <h3 className="font-semibold text-amber-900">Cara Implement dalam Aplikasi:</h3>
        <div className="space-y-3 text-sm text-amber-800">
          <p><strong>1. Import component:</strong></p>
          <code className="block bg-white p-2 rounded border border-amber-200 text-xs">
            {`import { KPICardsFizikal } from '@/components/hasil/kpi-cards-fizikal'`}
          </code>

          <p className="mt-3"><strong>2. Prepare data dari database/API:</strong></p>
          <code className="block bg-white p-2 rounded border border-amber-200 text-xs overflow-x-auto">
            {`const kpiData = [{
  label: "Total Hasil",
  value: "2,450",
  unit: "MT",
  color: "blue",
  trend: "up",
  trendValue: 12.5
}]`}
          </code>

          <p className="mt-3"><strong>3. Render component:</strong></p>
          <code className="block bg-white p-2 rounded border border-amber-200 text-xs">
            {`<KPICardsFizikal data={kpiData} />`}
          </code>
        </div>
      </div>

      {/* File Location */}
      <div className="bg-gray-50 rounded-xl border p-4">
        <p className="text-sm text-gray-600">
          📁 Component: <code className="bg-white px-2 py-1 rounded">src/components/hasil/kpi-cards-fizikal.tsx</code>
        </p>
      </div>
    </div>
  )
}
