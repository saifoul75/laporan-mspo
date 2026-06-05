"use client"
import { useState, useMemo } from "react"
import rawData from "@/data/hasil-bulanan.json"

type P = {
  pol_pn: string; bil: number; nama: string
  luas_hek: number; luas_dituai: number; peserta: number
  hasil_mt: number; mtan_hek: number; mtan_hek_dituai: number
  matlamat_setahun: number; pct_setahun: number
  pendapatan: number; kos: number; untung_rugi: number
}

const dataBulanan = rawData.bulan
const bulanTerkini = dataBulanan[dataBulanan.length - 1]
const sawit = bulanTerkini.sawit as P[]
const polList = ["", ...Array.from(new Set(sawit.map(p => p.pol_pn))).sort()]

function fmt(n: number, d = 0) { return n.toLocaleString("ms-MY", { minimumFractionDigits: d, maximumFractionDigits: d }) }

function PctBadge({ v }: { v: number }) {
  const cls = v >= 25 ? "bg-blue-100 text-blue-800" : v >= 20 ? "bg-green-100 text-green-800" : v >= 10 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold min-w-[52px] text-center ${cls}`}>{fmt(v, 1)}%</span>
}

type Sort = "pol" | "pct_setahun_desc" | "pct_setahun_asc" | "hasil_desc" | "ur_desc"
type Tab = "fizikal" | "kewangan"

export default function SawitPage() {
  const [tab, setTab]   = useState<Tab>("fizikal")
  const [pol, setPol]   = useState("")
  const [q, setQ]       = useState("")
  const [sort, setSort] = useState<Sort>("pol")

  const rows = useMemo(() => {
    let r = sawit.filter(p => (!pol || p.pol_pn === pol) && (!q || p.nama.toLowerCase().includes(q.toLowerCase())))
    if (sort === "pct_setahun_desc") r = [...r].sort((a, b) => b.pct_setahun - a.pct_setahun)
    else if (sort === "pct_setahun_asc") r = [...r].sort((a, b) => a.pct_setahun - b.pct_setahun)
    else if (sort === "hasil_desc") r = [...r].sort((a, b) => b.hasil_mt - a.hasil_mt)
    else if (sort === "ur_desc") r = [...r].sort((a, b) => b.untung_rugi - a.untung_rugi)
    else r = [...r].sort((a, b) => a.pol_pn.localeCompare(b.pol_pn) || a.bil - b.bil)
    return r
  }, [pol, q, sort])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projek Sawit</h1>
          <p className="text-muted-foreground text-sm">{bulanTerkini.nama} — {rows.length} projek</p>
        </div>
        <span className="bg-[#C0182A] text-white text-xs font-bold px-3 py-1.5 rounded-full">{rows.length} projek</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(["fizikal","kewangan"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 text-sm font-semibold border-b-2 transition-colors capitalize ${tab===t ? "border-[#C0182A] text-[#C0182A]" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "fizikal" ? "📋 Laporan Fizikal" : "💰 Laporan Kewangan"}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex gap-3 flex-wrap items-center">
        <select value={pol} onChange={e => setPol(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-background">
          {polList.map(p => <option key={p} value={p}>{p || "Semua POL/PN"}</option>)}
        </select>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari projek..." className="border rounded-lg px-3 py-2 text-sm bg-background w-52" />
        <select value={sort} onChange={e => setSort(e.target.value as Sort)} className="border rounded-lg px-3 py-2 text-sm bg-background">
          <option value="pol">POL/PN</option>
          <option value="pct_setahun_desc">% Capai Setahun (Tinggi)</option>
          <option value="pct_setahun_asc">% Capai Setahun (Rendah)</option>
          <option value="hasil_desc">Hasil MT (Tinggi)</option>
          {tab === "kewangan" && <option value="ur_desc">Untung/Rugi (Tinggi)</option>}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 text-white">
            {tab === "fizikal" ? (
              <tr>{["POL/PN","Bil","Nama Projek","Luas Kaw (Hek)","Luas Dituai (Hek)","Peserta","Hasil BTS (MT)","mtan/hek","Matlamat Setahun (MT)","% Capai Setahun"].map((h,i)=>(
                <th key={i} className={`py-2.5 px-3 text-[11px] font-semibold uppercase whitespace-nowrap ${i>2?"text-right":"text-left"}`}>{h}</th>
              ))}</tr>
            ) : (
              <tr>{["POL/PN","Bil","Nama Projek","Hasil BTS (MT)","Pendapatan (RM)","Kos Pengeluaran (RM)","Untung/Rugi (RM)","Margin (%)"].map((h,i)=>(
                <th key={i} className={`py-2.5 px-3 text-[11px] font-semibold uppercase whitespace-nowrap ${i>2?"text-right":"text-left"}`}>{h}</th>
              ))}</tr>
            )}
          </thead>
          <tbody>
            {rows.map((p, i) => {
              const showGroup = sort === "pol" && (i === 0 || rows[i-1].pol_pn !== p.pol_pn)
              const grp = sort === "pol" ? rows.filter(r => r.pol_pn === p.pol_pn) : []
              const grpHasil = grp.reduce((a,r)=>a+r.hasil_mt,0)
              const margin = p.pendapatan > 0 ? (p.untung_rugi / p.pendapatan * 100) : 0
              const colSpan = tab === "fizikal" ? 10 : 8

              return (
                <>
                  {showGroup && (
                    <tr key={`g${i}`} className="bg-muted/50">
                      <td colSpan={colSpan} className="px-3 py-1.5 text-xs font-bold text-muted-foreground">
                        📍 {p.pol_pn} — {grp.length} projek | Hasil BTS: {fmt(grpHasil,1)} MT
                      </td>
                    </tr>
                  )}
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                    {tab === "fizikal" ? <>
                      <td className="px-3 py-2 text-xs">{p.pol_pn}</td>
                      <td className="px-3 py-2">{p.bil}</td>
                      <td className="px-3 py-2 font-medium">{p.nama}</td>
                      <td className="px-3 py-2 text-right">{fmt(p.luas_hek,2)}</td>
                      <td className="px-3 py-2 text-right">{fmt(p.luas_dituai,2)}</td>
                      <td className="px-3 py-2 text-right">{p.peserta}</td>
                      <td className="px-3 py-2 text-right font-semibold">{fmt(p.hasil_mt,2)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-blue-700">{fmt(p.mtan_hek,2)}</td>
                      <td className="px-3 py-2 text-right">{fmt(p.matlamat_setahun,2)}</td>
                      <td className="px-3 py-2 text-right"><PctBadge v={p.pct_setahun}/></td>
                    </> : <>
                      <td className="px-3 py-2 text-xs">{p.pol_pn}</td>
                      <td className="px-3 py-2">{p.bil}</td>
                      <td className="px-3 py-2 font-medium">{p.nama}</td>
                      <td className="px-3 py-2 text-right font-semibold">{fmt(p.hasil_mt,2)}</td>
                      <td className="px-3 py-2 text-right">{fmt(p.pendapatan)}</td>
                      <td className="px-3 py-2 text-right">{fmt(p.kos)}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${p.untung_rugi>=0?"text-green-600":"text-red-600"}`}>{fmt(p.untung_rugi)}</td>
                      <td className={`px-3 py-2 text-right text-xs font-semibold ${margin>=0?"text-green-600":"text-red-600"}`}>{fmt(margin,1)}%</td>
                    </>}
                  </tr>
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
