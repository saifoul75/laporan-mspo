"use client"
import rawData from "@/data/april2026.json"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts"

type PS = { pol_pn: string; hasil_mt: number; pct_bulan: number; untung_rugi: number }
type PG = { pol_pn: string; nama: string; hasil_kg: number; pct_bulan: number; pct_tahun: number }
const sawit = rawData.sawit as PS[]
const getah = rawData.getah as PG[]

function byPol(data: PS[], fn: (arr: PS[]) => number) {
  const m: Record<string, PS[]> = {}
  data.forEach(p => { (m[p.pol_pn] = m[p.pol_pn] || []).push(p) })
  return Object.entries(m).sort((a,b)=>a[0].localeCompare(b[0])).map(([pol, arr]) => ({ pol, value: fn(arr) }))
}

const pctData = byPol(sawit, arr => { const v = arr.filter(p=>p.pct_bulan>0); return v.length ? v.reduce((a,p)=>a+p.pct_bulan,0)/v.length : 0 })
const urData  = byPol(sawit, arr => arr.reduce((a,p)=>a+p.untung_rugi,0))
const top15   = [...sawit].sort((a,b)=>b.hasil_mt-a.hasil_mt).slice(0,15).map(p=>({ nama: (p as any).nama?.slice(0,20)||"", hasil: p.hasil_mt }))
const getahPct = getah.map(p => ({ nama: p.nama.slice(0,22), bulan: p.pct_bulan, tahun: p.pct_tahun }))

export default function CartaPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Carta Prestasi</h1><p className="text-muted-foreground text-sm">Analisis visual projek sawit &amp; getah — April 2026</p></div>
      <div className="grid grid-cols-2 gap-5">
        {[
          { title: "% Capai Bulan — Sawit (POL/PN)", content: (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={pctData} margin={{bottom:30}}>
                <XAxis dataKey="pol" tick={{fontSize:10}} angle={-35} textAnchor="end" interval={0}/>
                <YAxis tickFormatter={v=>v+"%"} tick={{fontSize:10}}/>
                <Tooltip formatter={(v:number)=>v.toFixed(1)+"%"}/>
                <Bar dataKey="value" radius={[4,4,0,0]}>
                  {pctData.map((d,i)=><Cell key={i} fill={d.value>=100?"#1d4ed8":d.value>=80?"#16a34a":d.value>=50?"#ca8a04":"#dc2626"}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )},
          { title: "Top 15 Hasil BTB (MT) — Sawit", content: (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={top15} layout="vertical">
                <XAxis type="number" tick={{fontSize:10}}/>
                <YAxis dataKey="nama" type="category" tick={{fontSize:9}} width={130}/>
                <Tooltip/>
                <Bar dataKey="hasil" fill="#C0182A" radius={[0,4,4,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )},
          { title: "Untung/Rugi mengikut POL/PN — Sawit", content: (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={urData} margin={{bottom:30}}>
                <XAxis dataKey="pol" tick={{fontSize:10}} angle={-35} textAnchor="end" interval={0}/>
                <YAxis tickFormatter={v=>"RM "+(v/1000).toFixed(0)+"k"} tick={{fontSize:10}}/>
                <Tooltip formatter={(v:number)=>"RM "+v.toLocaleString("ms-MY",{maximumFractionDigits:0})}/>
                <Bar dataKey="value" radius={[4,4,0,0]}>
                  {urData.map((d,i)=><Cell key={i} fill={d.value>=0?"#16a34a":"#dc2626"}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )},
          { title: "% Capai Getah — Bulan & Tahun", content: (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={getahPct} layout="vertical">
                <XAxis type="number" tickFormatter={v=>v+"%"} tick={{fontSize:10}}/>
                <YAxis dataKey="nama" type="category" tick={{fontSize:9}} width={140}/>
                <Tooltip formatter={(v:number)=>v.toFixed(1)+"%"}/>
                <Legend/>
                <Bar dataKey="bulan" name="% Bulan" fill="#D4A017" radius={[0,4,4,0]}/>
                <Bar dataKey="tahun" name="% Tahun" fill="#92400e" radius={[0,4,4,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )},
        ].map((c,i) => (
          <div key={i} className="bg-card rounded-xl border p-5">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-4">{c.title}</h3>
            {c.content}
          </div>
        ))}
      </div>
    </div>
  )
}
