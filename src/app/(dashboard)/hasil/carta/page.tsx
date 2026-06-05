"use client"
import { useMemo } from "react"
import { useHasil, getLatestMonth } from "@/lib/supabase/useHasil"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend, LineChart, Line } from "recharts"

function fmt(n: number) { return n.toLocaleString("ms-MY", { maximumFractionDigits: 0 }) }

export default function CartaPage() {
  const { data: dataBulanan, loading } = useHasil()
  const latest = useMemo(() => getLatestMonth(dataBulanan), [dataBulanan])

  const bulanLabels = dataBulanan.map(b => b.nama.split(" ")[0].substring(0, 3))

  const trendSawit = dataBulanan.map((b, i) => ({
    bulan: bulanLabels[i],
    hasil: b.sawit.reduce((a, p) => a + (p.hasil_mt ?? 0), 0),
    untung: b.sawit.reduce((a, p) => a + (p.untung_rugi ?? 0), 0),
  }))

  const trendGetah = dataBulanan.map((b, i) => ({
    bulan: bulanLabels[i],
    hasil: b.getah.reduce((a, p) => a + (p.hasil_kg ?? 0), 0),
    untung: b.getah.reduce((a, p) => a + (p.untung_rugi ?? 0), 0),
  }))

  const top15 = useMemo(() => {
    if (!latest) return []
    return [...latest.sawit].sort((a,b) => b.hasil_mt - a.hasil_mt).slice(0,15).map(p => ({ nama: p.nama.slice(0,20), hasil: p.hasil_mt }))
  }, [latest])

  const getahByPol = useMemo(() => {
    if (!latest) return []
    return latest.getah.map(p => ({ nama: p.nama.slice(0,22), setahun: p.pct_setahun }))
  }, [latest])

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Carta Prestasi</h1>
        <p className="text-muted-foreground text-sm">Memuat data...</p>
      </div>
    )
  }

  if (!latest || dataBulanan.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Carta Prestasi</h1>
        <div className="bg-card rounded-xl border p-8 text-center">
          <p className="text-muted-foreground">Tiada data hasil.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Carta Prestasi</h1>
        <p className="text-muted-foreground text-sm">Analisis visual projek sawit &amp; getah — Januari hingga {latest.nama}</p>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="bg-card rounded-xl border p-5">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-4">Trend Hasil Sawit BTS (MT)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendSawit}>
              <XAxis dataKey="bulan" tick={{fontSize:12}}/>
              <YAxis tick={{fontSize:10}}/>
              <Tooltip formatter={(v)=>fmt(Number(v ?? 0))+" MT"}/>
              <Line type="monotone" dataKey="hasil" stroke="#C0182A" strokeWidth={3} dot={{r:6}} name="Hasil BTS"/>
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-xl border p-5">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-4">Trend Hasil Getah (KG)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendGetah}>
              <XAxis dataKey="bulan" tick={{fontSize:12}}/>
              <YAxis tick={{fontSize:10}}/>
              <Tooltip formatter={(v)=>fmt(Number(v ?? 0))+" KG"}/>
              <Line type="monotone" dataKey="hasil" stroke="#D4A017" strokeWidth={3} dot={{r:6}} name="Hasil KG"/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card rounded-xl border p-5">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-4">Perbandingan Hasil Sawit Bulanan</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={trendSawit} margin={{bottom:10}}>
            <XAxis dataKey="bulan" tick={{fontSize:12}}/>
            <YAxis tick={{fontSize:10}}/>
            <Tooltip formatter={(v)=>fmt(Number(v ?? 0))+" MT"}/>
            <Bar dataKey="hasil" fill="#C0182A" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card rounded-xl border p-5">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-4">Untung/Rugi Sawit Bulanan (RM)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={trendSawit} margin={{bottom:10}}>
            <XAxis dataKey="bulan" tick={{fontSize:12}}/>
            <YAxis tickFormatter={v=>"RM "+(v/1000).toFixed(0)+"k"} tick={{fontSize:10}}/>
            <Tooltip formatter={(v)=>"RM "+fmt(Number(v ?? 0))}/>
            <Bar dataKey="untung" radius={[4,4,0,0]}>
              {trendSawit.map((d,i)=><Cell key={i} fill={d.untung>=0?"#16a34a":"#dc2626"}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="bg-card rounded-xl border p-5">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-4">Top 15 Hasil BTS (MT) — {latest.nama}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={top15} layout="vertical">
              <XAxis type="number" tick={{fontSize:10}}/>
              <YAxis dataKey="nama" type="category" tick={{fontSize:9}} width={130}/>
              <Tooltip formatter={(v)=>fmt(Number(v ?? 0))+" MT"}/>
              <Bar dataKey="hasil" fill="#C0182A" radius={[0,4,4,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-xl border p-5">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-4">% Capai Setahun Getah — {latest.nama}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getahByPol} layout="vertical">
              <XAxis type="number" tickFormatter={v=>v+"%"} tick={{fontSize:10}}/>
              <YAxis dataKey="nama" type="category" tick={{fontSize:9}} width={140}/>
              <Tooltip formatter={(v)=>Number(v ?? 0).toFixed(1)+"%"}/>
              <Legend/>
              <Bar dataKey="setahun" name="% Setahun" fill="#D4A017" radius={[0,4,4,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
