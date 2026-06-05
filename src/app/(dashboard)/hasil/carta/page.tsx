"use client"
import rawData from "@/data/hasil-bulanan.json"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend, LineChart, Line } from "recharts"

type PS = { pol_pn: string; nama: string; hasil_mt: number; pct_setahun: number; untung_rugi: number; pendapatan: number }
type PG = { pol_pn: string; nama: string; hasil_kg: number; pct_setahun: number; untung_rugi: number; pendapatan: number }
type BulanData = { kod: string; nama: string; sawit: PS[]; getah: PG[] }

const dataBulanan = rawData.bulan as BulanData[]
const bulanLabels = dataBulanan.map(b => b.nama.split(" ")[0].substring(0, 3)) // Jan, Feb, Mac, Apr

// Trend data
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

// Per POL/PN data (latest month)
const latestBulan = dataBulanan[dataBulanan.length - 1]

function byPol(data: PS[], fn: (arr: PS[]) => number) {
  const m: Record<string, PS[]> = {}
  data.forEach(p => { (m[p.pol_pn] = m[p.pol_pn] || []).push(p) })
  return Object.entries(m).sort((a,b)=>a[0].localeCompare(b[0])).map(([pol, arr]) => ({ pol, value: fn(arr) }))
}

const urData  = byPol(latestBulan.sawit, arr => arr.reduce((a,p)=>a+p.untung_rugi,0))
const top15   = [...latestBulan.sawit].sort((a,b)=>b.hasil_mt-a.hasil_mt).slice(0,15).map(p=>({ nama: p.nama.slice(0,20), hasil: p.hasil_mt }))
const getahByPol = latestBulan.getah.map(p => ({ nama: p.nama.slice(0,22), setahun: p.pct_setahun }))

export default function CartaPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Carta Prestasi</h1><p className="text-muted-foreground text-sm">Analisis visual projek sawit &amp; getah — Januari hingga {latestBulan.nama}</p></div>
      
      {/* Trend Charts */}
      <div className="grid grid-cols-2 gap-5">
        <div className="bg-card rounded-xl border p-5">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-4">Trend Hasil Sawit BTS (MT)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendSawit}>
              <XAxis dataKey="bulan" tick={{fontSize:12}}/>
              <YAxis tick={{fontSize:10}}/>
              <Tooltip formatter={(v)=>Number(v ?? 0).toLocaleString("ms-MY",{maximumFractionDigits:0})+" MT"}/>
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
              <Tooltip formatter={(v)=>Number(v ?? 0).toLocaleString("ms-MY",{maximumFractionDigits:0})+" KG"}/>
              <Line type="monotone" dataKey="hasil" stroke="#D4A017" strokeWidth={3} dot={{r:6}} name="Hasil KG"/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Per Bulan Bar Charts */}
      <div className="bg-card rounded-xl border p-5">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-4">Perbandingan Hasil Sawit Bulanan</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={trendSawit} margin={{bottom:10}}>
            <XAxis dataKey="bulan" tick={{fontSize:12}}/>
            <YAxis tick={{fontSize:10}}/>
            <Tooltip formatter={(v)=>Number(v ?? 0).toLocaleString("ms-MY",{maximumFractionDigits:0})+" MT"}/>
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
            <Tooltip formatter={(v)=>"RM "+Number(v ?? 0).toLocaleString("ms-MY",{maximumFractionDigits:0})}/>
            <Bar dataKey="untung" radius={[4,4,0,0]}>
              {trendSawit.map((d,i)=><Cell key={i} fill={d.untung>=0?"#16a34a":"#dc2626"}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top 15 + Getah */}
      <div className="grid grid-cols-2 gap-5">
        <div className="bg-card rounded-xl border p-5">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-4">Top 15 Hasil BTS (MT) — {latestBulan.nama}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={top15} layout="vertical">
              <XAxis type="number" tick={{fontSize:10}}/>
              <YAxis dataKey="nama" type="category" tick={{fontSize:9}} width={130}/>
              <Tooltip formatter={(v)=>Number(v ?? 0).toLocaleString("ms-MY",{maximumFractionDigits:0})+" MT"}/>
              <Bar dataKey="hasil" fill="#C0182A" radius={[0,4,4,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-xl border p-5">
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-4">% Capai Setahun Getah — {latestBulan.nama}</h3>
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
