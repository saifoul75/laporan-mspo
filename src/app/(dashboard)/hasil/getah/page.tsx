"use client"
import { useState, useMemo } from "react"
import rawData from "@/data/april2026.json"

type P = {
  pol_pn: string; bil: number; nama: string
  luas_hek: number; luas_ditoreh: number; peserta: number
  hasil_kg: number; kg_hek: number; kg_hek_ditoreh: number
  matlamat_setakat: number; matlamat_setahun: number
  pct_setakat: number; pct_setahun: number
  pendapatan: number; kos: number; untung_rugi: number
}

const getah = rawData.getah as P[]

function fmt(n: number, d = 0) { return n.toLocaleString("ms-MY", { minimumFractionDigits: d, maximumFractionDigits: d }) }

function PctBadge({ v }: { v: number }) {
  const cls = v >= 100 ? "bg-blue-100 text-blue-800" : v >= 80 ? "bg-green-100 text-green-800" : v >= 50 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold min-w-[52px] text-center ${cls}`}>{fmt(v,1)}%</span>
}

type Tab = "fizikal" | "kewangan"

export default function GetahPage() {
  const [tab, setTab] = useState<Tab>("fizikal")
  const [q, setQ]     = useState("")
  const rows = useMemo(() => getah.filter(p => !q || p.nama.toLowerCase().includes(q.toLowerCase()) || p.pol_pn.toLowerCase().includes(q.toLowerCase())), [q])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projek Getah</h1>
          <p className="text-muted-foreground text-sm">April 2026 — {rows.length} projek</p>
        </div>
        <span className="bg-[#D4A017] text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full">{rows.length} projek</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(["fizikal","kewangan"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 text-sm font-semibold border-b-2 transition-colors ${tab===t ? "border-[#C0182A] text-[#C0182A]" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "fizikal" ? "📋 Laporan Fizikal" : "💰 Laporan Kewangan"}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari projek..." className="border rounded-lg px-3 py-2 text-sm bg-background w-52" />
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 text-white">
            {tab === "fizikal" ? (
              <tr>{["POL/PN","Bil","Nama Projek","Luas Kaw (Hek)","Luas Ditoreh (Hek)","Peserta","Hasil (KG)","kg/hek","Matlamat Setakat (KG)","Matlamat Setahun (KG)","% Capai Setakat","% Capai Setahun"].map((h,i)=>(
                <th key={i} className={`py-2.5 px-3 text-[11px] font-semibold uppercase whitespace-nowrap ${i>2?"text-right":"text-left"}`}>{h}</th>
              ))}</tr>
            ) : (
              <tr>{["POL/PN","Bil","Nama Projek","Hasil (KG)","Pendapatan (RM)","Kos Pengeluaran (RM)","Untung/Rugi (RM)","Margin (%)"].map((h,i)=>(
                <th key={i} className={`py-2.5 px-3 text-[11px] font-semibold uppercase whitespace-nowrap ${i>2?"text-right":"text-left"}`}>{h}</th>
              ))}</tr>
            )}
          </thead>
          <tbody>
            {rows.map((p, i) => {
              const margin = p.pendapatan > 0 ? (p.untung_rugi / p.pendapatan * 100) : 0
              return (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                  {tab === "fizikal" ? <>
                    <td className="px-3 py-2 text-xs">{p.pol_pn}</td>
                    <td className="px-3 py-2">{p.bil}</td>
                    <td className="px-3 py-2 font-medium">{p.nama}</td>
                    <td className="px-3 py-2 text-right">{fmt(p.luas_hek,2)}</td>
                    <td className="px-3 py-2 text-right">{fmt(p.luas_ditoreh,2)}</td>
                    <td className="px-3 py-2 text-right">{p.peserta}</td>
                    <td className="px-3 py-2 text-right font-semibold">{fmt(p.hasil_kg)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-blue-700">{fmt(p.kg_hek,2)}</td>
                    <td className="px-3 py-2 text-right">{fmt(p.matlamat_setakat)}</td>
                    <td className="px-3 py-2 text-right">{fmt(p.matlamat_setahun)}</td>
                    <td className="px-3 py-2 text-right"><PctBadge v={p.pct_setakat}/></td>
                    <td className="px-3 py-2 text-right"><PctBadge v={p.pct_setahun}/></td>
                  </> : <>
                    <td className="px-3 py-2 text-xs">{p.pol_pn}</td>
                    <td className="px-3 py-2">{p.bil}</td>
                    <td className="px-3 py-2 font-medium">{p.nama}</td>
                    <td className="px-3 py-2 text-right font-semibold">{fmt(p.hasil_kg)}</td>
                    <td className="px-3 py-2 text-right">{fmt(p.pendapatan)}</td>
                    <td className="px-3 py-2 text-right">{fmt(p.kos)}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${p.untung_rugi>=0?"text-green-600":"text-red-600"}`}>{fmt(p.untung_rugi)}</td>
                    <td className={`px-3 py-2 text-right text-xs font-semibold ${margin>=0?"text-green-600":"text-red-600"}`}>{fmt(margin,1)}%</td>
                  </>}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
