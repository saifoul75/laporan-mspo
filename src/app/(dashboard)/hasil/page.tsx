"use client"
import { useState, useMemo } from "react"
import rawData from "@/data/hasil-bulanan.json"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

type PS = { pol_pn: string; bil: number; nama: string; luas_hek: number; luas_dituai: number; peserta: number; hasil_mt: number; mtan_hek: number; matlamat_setahun: number; pct_setahun: number; pendapatan: number; kos: number; untung_rugi: number }
type PG = { pol_pn: string; bil: number; nama: string; luas_hek: number; luas_ditoreh: number; peserta: number; hasil_kg: number; kg_hek: number; matlamat_setahun: number; pct_setahun: number; pendapatan: number; kos: number; untung_rugi: number }
type BulanData = { kod: string; nama: string; sawit: PS[]; getah: PG[] }

const dataBulanan = (rawData.bulan as BulanData[])

function fmt(n: number | undefined | null, d = 0): string {
  if (n == null || isNaN(n)) return "—"
  return n.toLocaleString("ms-MY", { minimumFractionDigits: d, maximumFractionDigits: d })
}

// Dapatkan senarai nama projek unik ikut jenis
function getProjekList(jenis: "sawit" | "getah"): string[] {
  const names = new Set<string>()
  dataBulanan.forEach(b => {
    if (jenis === "sawit") b.sawit.forEach(p => names.add(p.nama))
    else b.getah.forEach(p => names.add(p.nama))
  })
  return Array.from(names).sort()
}

function findSawitByNama(nama: string) {
  return dataBulanan.map(b => {
    const proj = b.sawit.find(p => p.nama === nama)
    return { bulan: b.nama.split(" ")[0].substring(0, 3), ...(proj || {}) }
  }) as ({ bulan: string } & Partial<PS>)[]
}

function findGetahByNama(nama: string) {
  return dataBulanan.map(b => {
    const proj = b.getah.find(p => p.nama === nama)
    return { bulan: b.nama.split(" ")[0].substring(0, 3), ...(proj || {}) }
  }) as ({ bulan: string } & Partial<PG>)[]
}

export default function HasilPage() {
  const [pilihProjek, setPilihProjek] = useState("")
  const [jenisProjek, setJenisProjek] = useState<"sawit" | "getah">("sawit")
  const projekList = useMemo(() => getProjekList(jenisProjek), [jenisProjek])

  // Ringkasan bulan terkini
  const latest = dataBulanan[dataBulanan.length - 1]
  const sawit = latest.sawit
  const getah = latest.getah

  const ts_hasil  = sawit.reduce((a, p) => a + (p.hasil_mt ?? 0), 0)
  const ts_pend   = sawit.reduce((a, p) => a + (p.pendapatan ?? 0), 0)
  const ts_ur     = sawit.reduce((a, p) => a + (p.untung_rugi ?? 0), 0)
  const valid     = sawit.filter(p => (p.pct_setahun ?? 0) > 0)
  const avg_pct   = valid.length ? valid.reduce((a, p) => a + p.pct_setahun, 0) / valid.length : 0
  const tg_hasil  = getah.reduce((a, p) => a + (p.hasil_kg ?? 0), 0)
  const tg_ur     = getah.reduce((a, p) => a + (p.untung_rugi ?? 0), 0)

  // Data projek dipilih
  const projekSawit = pilihProjek ? findSawitByNama(pilihProjek) : []
  const projekGetah = pilihProjek ? findGetahByNama(pilihProjek) : []
  // Trend bar chart for selected project
  const chartData = jenisProjek === "sawit"
    ? projekSawit.filter(p => p.hasil_mt != null).map(p => ({ bulan: p.bulan, hasil: p.hasil_mt, untung: p.untung_rugi }))
    : projekGetah.filter(p => p.hasil_kg != null).map(p => ({ bulan: p.bulan, hasil: p.hasil_kg, untung: p.untung_rugi }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ringkasan Prestasi Hasil</h1>
          <p className="text-muted-foreground text-sm mt-1">Semua projek sawit &amp; getah — setakat {latest.nama}</p>
        </div>
        <span className="bg-[#D4A017] text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full">{latest.nama.toUpperCase()}</span>
      </div>

      {/* Cards Ringkasan */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Hasil Sawit BTB", val: fmt(ts_hasil,1)+" MT", sub: sawit.length+" projek sawit", border: "border-[#C0182A]", vc: "" },
          { label: "% Capai Setahun", val: fmt(avg_pct,1)+"%", sub: "Purata semua projek", border: "border-blue-500", vc: avg_pct >= 25 ? "text-blue-600" : avg_pct >= 20 ? "text-green-600" : "text-red-600" },
          { label: "U/R Sawit", val: "RM "+fmt(ts_ur), sub: "Pendapatan RM "+fmt(ts_pend), border: "border-green-600", vc: ts_ur >= 0 ? "text-green-600" : "text-red-600" },
          { label: "Hasil Getah", val: fmt(tg_hasil)+" KG", sub: "U/R: RM "+fmt(tg_ur), border: "border-[#D4A017]", vc: tg_ur >= 0 ? "text-green-600" : "text-red-600" },
        ].map((c, i) => (
          <div key={i} className={`bg-card border-l-4 ${c.border} rounded-xl p-4 shadow-sm`}>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{c.label}</div>
            <div className={`text-2xl font-bold mt-1 mb-1 ${c.vc}`}>{c.val}</div>
            <div className="text-[11px] text-muted-foreground">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Dropdown Pilih Projek */}
      <div className="bg-card rounded-xl border p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">📋 Pilih Projek — Lihat Hasil Mengikut Bulan</h2>
        <div className="flex gap-3 items-center flex-wrap">
          <select
            value={pilihProjek}
            onChange={e => setPilihProjek(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-background min-w-[300px]"
          >
            <option value="">— Pilih Nama Projek —</option>
            {projekList.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <div className="flex gap-2">
            <button
              onClick={() => { setJenisProjek("sawit"); setPilihProjek("") }}
              className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-colors ${jenisProjek === "sawit" ? "bg-[#C0182A] text-white border-[#C0182A]" : "bg-background text-muted-foreground border-border hover:text-foreground"}`}
            >
              Sawit
            </button>
            <button
              onClick={() => { setJenisProjek("getah"); setPilihProjek("") }}
              className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-colors ${jenisProjek === "getah" ? "bg-[#D4A017] text-slate-900 border-[#D4A017]" : "bg-background text-muted-foreground border-border hover:text-foreground"}`}
            >
              Getah
            </button>
          </div>
        </div>
      </div>

      {/* Jadual Hasil Projek Dipilih */}
      {pilihProjek && (
        <div className="bg-card rounded-xl border p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">{pilihProjek}</h3>
              <p className="text-sm text-muted-foreground">Prestasi mengikut bulan — {jenisProjek === "sawit" ? "Hasil BTB (MT)" : "Hasil (KG)"}</p>
            </div>
          </div>

          {jenisProjek === "sawit" ? (
            <>
              {/* Jadual Sawit Bulanan */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800 text-white">
                    <tr>
                      {["Bulan","POL/PN","Luas (Hek)","Luas Dituai","Peserta","Hasil BTB (MT)","mtan/hek","Matlamat Setahun","% Capai","Pendapatan (RM)","Kos (RM)","U/R (RM)"].map((h,i) => (
                        <th key={i} className={`py-2.5 px-3 text-[11px] font-semibold uppercase whitespace-nowrap ${i > 1 ? "text-right" : "text-left"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {projekSawit.map((p, i) => {
                      const ur = p.untung_rugi ?? 0
                      return (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="px-3 py-2 font-semibold">{p.bulan}</td>
                          <td className="px-3 py-2 text-xs">{p.pol_pn ?? "—"}</td>
                          <td className="px-3 py-2 text-right">{p.luas_hek != null ? fmt(p.luas_hek,2) : "—"}</td>
                          <td className="px-3 py-2 text-right">{p.luas_dituai != null ? fmt(p.luas_dituai,2) : "—"}</td>
                          <td className="px-3 py-2 text-right">{p.peserta ?? "—"}</td>
                          <td className="px-3 py-2 text-right font-bold text-[#C0182A]">{p.hasil_mt != null ? fmt(p.hasil_mt,2) : "—"}</td>
                          <td className="px-3 py-2 text-right font-semibold text-blue-700">{p.mtan_hek != null ? fmt(p.mtan_hek,2) : "—"}</td>
                          <td className="px-3 py-2 text-right">{p.matlamat_setahun != null ? fmt(p.matlamat_setahun,1) : "—"}</td>
                          <td className="px-3 py-2 text-right">
                            {p.pct_setahun != null ? (
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.pct_setahun >= 25 ? "bg-blue-100 text-blue-800" : p.pct_setahun >= 20 ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                                {fmt(p.pct_setahun,1)}%
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-3 py-2 text-right">{p.pendapatan != null ? fmt(p.pendapatan) : "—"}</td>
                          <td className="px-3 py-2 text-right">{p.kos != null ? fmt(p.kos) : "—"}</td>
                          <td className={`px-3 py-2 text-right font-bold ${ur >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {ur !== 0 ? "RM "+fmt(ur) : "—"}
                          </td>
                        </tr>
                      )
                    })}
                    {/* Baris Jumlah */}
                    {projekSawit.filter(p => p.hasil_mt != null).length > 1 && (
                      <tr className="bg-muted/80 font-bold">
                        <td className="px-3 py-2">JUMLAH</td>
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2 text-right">{fmt(projekSawit.reduce((a,p) => a + (p.luas_hek ?? 0), 0),2)}</td>
                        <td className="px-3 py-2 text-right">{fmt(projekSawit.reduce((a,p) => a + (p.luas_dituai ?? 0), 0),2)}</td>
                        <td className="px-3 py-2 text-right"></td>
                        <td className="px-3 py-2 text-right text-[#C0182A]">{fmt(projekSawit.reduce((a,p) => a + (p.hasil_mt ?? 0), 0),2)}</td>
                        <td className="px-3 py-2 text-right"></td>
                        <td className="px-3 py-2 text-right">{fmt(projekSawit.reduce((a,p) => a + (p.matlamat_setahun ?? 0), 0),1)}</td>
                        <td className="px-3 py-2 text-right"></td>
                        <td className="px-3 py-2 text-right">{fmt(projekSawit.reduce((a,p) => a + (p.pendapatan ?? 0), 0))}</td>
                        <td className="px-3 py-2 text-right">{fmt(projekSawit.reduce((a,p) => a + (p.kos ?? 0), 0))}</td>
                        <td className="px-3 py-2 text-right text-green-600">RM {fmt(projekSawit.reduce((a,p) => a + (p.untung_rugi ?? 0), 0))}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Carta Trend */}
              {chartData.length > 0 && (
                <div className="grid grid-cols-2 gap-5 mt-4">
                  <div className="bg-muted/30 rounded-lg p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Trend Hasil BTB (MT)</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={chartData}>
                        <XAxis dataKey="bulan" tick={{fontSize:12}}/>
                        <YAxis tick={{fontSize:10}}/>
                        <Tooltip formatter={(v)=>Number(v ?? 0).toLocaleString("ms-MY",{maximumFractionDigits:2})+" MT"}/>
                        <Bar dataKey="hasil" fill="#C0182A" radius={[4,4,0,0]} name="Hasil MT"/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Trend Untung/Rugi (RM)</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={chartData}>
                        <XAxis dataKey="bulan" tick={{fontSize:12}}/>
                        <YAxis tick={{fontSize:10}}/>
                        <Tooltip formatter={(v)=>"RM "+Number(v ?? 0).toLocaleString("ms-MY",{maximumFractionDigits:0})}/>
                        <Bar dataKey="untung" name="U/R (RM)">
                          {chartData.map((d,i)=><Cell key={i} fill={(d.untung ?? 0) >= 0 ? "#16a34a" : "#dc2626"}/>)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Jadual Getah Bulanan */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800 text-white">
                    <tr>
                      {["Bulan","POL/PN","Luas (Hek)","Luas Ditoreh","Peserta","Hasil (KG)","kg/hek","Matlamat Setahun","% Capai","Pendapatan (RM)","Kos (RM)","U/R (RM)"].map((h,i) => (
                        <th key={i} className={`py-2.5 px-3 text-[11px] font-semibold uppercase whitespace-nowrap ${i > 1 ? "text-right" : "text-left"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {projekGetah.map((p, i) => {
                      const ur = p.untung_rugi ?? 0
                      return (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="px-3 py-2 font-semibold">{p.bulan}</td>
                          <td className="px-3 py-2 text-xs">{p.pol_pn ?? "—"}</td>
                          <td className="px-3 py-2 text-right">{p.luas_hek != null ? fmt(p.luas_hek,2) : "—"}</td>
                          <td className="px-3 py-2 text-right">{p.luas_ditoreh != null ? fmt(p.luas_ditoreh,2) : "—"}</td>
                          <td className="px-3 py-2 text-right">{p.peserta ?? "—"}</td>
                          <td className="px-3 py-2 text-right font-bold text-[#D4A017]">{p.hasil_kg != null ? fmt(p.hasil_kg) : "—"}</td>
                          <td className="px-3 py-2 text-right font-semibold text-blue-700">{p.kg_hek != null ? fmt(p.kg_hek,2) : "—"}</td>
                          <td className="px-3 py-2 text-right">{p.matlamat_setahun != null ? fmt(p.matlamat_setahun) : "—"}</td>
                          <td className="px-3 py-2 text-right">
                            {p.pct_setahun != null ? (
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.pct_setahun >= 25 ? "bg-blue-100 text-blue-800" : p.pct_setahun >= 20 ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                                {fmt(p.pct_setahun,1)}%
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-3 py-2 text-right">{p.pendapatan != null ? fmt(p.pendapatan) : "—"}</td>
                          <td className="px-3 py-2 text-right">{p.kos != null ? fmt(p.kos) : "—"}</td>
                          <td className={`px-3 py-2 text-right font-bold ${ur >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {ur !== 0 ? "RM "+fmt(ur) : "—"}
                          </td>
                        </tr>
                      )
                    })}
                    {projekGetah.filter(p => p.hasil_kg != null).length > 1 && (
                      <tr className="bg-muted/80 font-bold">
                        <td className="px-3 py-2">JUMLAH</td>
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2 text-right">{fmt(projekGetah.reduce((a,p) => a + (p.luas_hek ?? 0), 0),2)}</td>
                        <td className="px-3 py-2 text-right">{fmt(projekGetah.reduce((a,p) => a + (p.luas_ditoreh ?? 0), 0),2)}</td>
                        <td className="px-3 py-2 text-right"></td>
                        <td className="px-3 py-2 text-right text-[#D4A017]">{fmt(projekGetah.reduce((a,p) => a + (p.hasil_kg ?? 0), 0))}</td>
                        <td className="px-3 py-2 text-right"></td>
                        <td className="px-3 py-2 text-right">{fmt(projekGetah.reduce((a,p) => a + (p.matlamat_setahun ?? 0), 0))}</td>
                        <td className="px-3 py-2 text-right"></td>
                        <td className="px-3 py-2 text-right">{fmt(projekGetah.reduce((a,p) => a + (p.pendapatan ?? 0), 0))}</td>
                        <td className="px-3 py-2 text-right">{fmt(projekGetah.reduce((a,p) => a + (p.kos ?? 0), 0))}</td>
                        <td className="px-3 py-2 text-right text-green-600">RM {fmt(projekGetah.reduce((a,p) => a + (p.untung_rugi ?? 0), 0))}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {chartData.length > 0 && (
                <div className="grid grid-cols-2 gap-5 mt-4">
                  <div className="bg-muted/30 rounded-lg p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Trend Hasil Getah (KG)</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={chartData}>
                        <XAxis dataKey="bulan" tick={{fontSize:12}}/>
                        <YAxis tick={{fontSize:10}}/>
                        <Tooltip formatter={(v)=>Number(v ?? 0).toLocaleString("ms-MY",{maximumFractionDigits:0})+" KG"}/>
                        <Bar dataKey="hasil" fill="#D4A017" radius={[4,4,0,0]} name="Hasil KG"/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Trend Untung/Rugi (RM)</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={chartData}>
                        <XAxis dataKey="bulan" tick={{fontSize:12}}/>
                        <YAxis tick={{fontSize:10}}/>
                        <Tooltip formatter={(v)=>"RM "+Number(v ?? 0).toLocaleString("ms-MY",{maximumFractionDigits:0})}/>
                        <Bar dataKey="untung" name="U/R (RM)">
                          {chartData.map((d,i)=><Cell key={i} fill={(d.untung ?? 0) >= 0 ? "#16a34a" : "#dc2626"}/>)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
