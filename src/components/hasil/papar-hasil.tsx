"use client"
import { useState, useMemo } from "react"
import {
  type BulanData,
  type PS,
  type PG,
  getLatestMonth,
  getProjekList,
  findSawitByNama,
  findGetahByNama,
} from "@/lib/supabase/useHasil"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { KPICardsFizikal } from "./kpi-cards-fizikal"

function fmt(n: number | undefined | null, d = 0): string {
  if (n == null || isNaN(n)) return "—"
  return n.toLocaleString("ms-MY", { minimumFractionDigits: d, maximumFractionDigits: d })
}

export function PaparHasil({ data: dataBulanan }: { data: BulanData[] }) {
  const [pilihProjek, setPilihProjek] = useState("")
  const [jenisProjek, setJenisProjek] = useState<"sawit" | "getah">("sawit")

  const projekList = useMemo(() => getProjekList(dataBulanan, jenisProjek), [dataBulanan, jenisProjek])
  const latest = useMemo(() => getLatestMonth(dataBulanan), [dataBulanan])

  if (!latest || dataBulanan.length === 0) {
    return (
      <div className="bg-card rounded-xl border p-8 text-center">
        <p className="text-muted-foreground">Tiada data hasil buat masa ini.</p>
      </div>
    )
  }

  const sawit = latest.sawit
  const getah = latest.getah

  const ts_hasil = sawit.reduce((a, p) => a + (p.hasil_mt ?? 0), 0)
  const ts_pend = sawit.reduce((a, p) => a + (p.pendapatan ?? 0), 0)
  const ts_ur = sawit.reduce((a, p) => a + (p.untung_rugi ?? 0), 0)
  const valid = sawit.filter(p => (p.pct_setahun ?? 0) > 0)
  const avg_pct = valid.length ? valid.reduce((a, p) => a + p.pct_setahun, 0) / valid.length : 0
  const tg_hasil = getah.reduce((a, p) => a + (p.hasil_kg ?? 0), 0)
  const tg_ur = getah.reduce((a, p) => a + (p.untung_rugi ?? 0), 0)

  const projekSawit = pilihProjek ? findSawitByNama(dataBulanan, pilihProjek) : []
  const projekGetah = pilihProjek ? findGetahByNama(dataBulanan, pilihProjek) : []
  const projekSawitValid = projekSawit.filter(p => p.hasil_mt != null)
  const projekGetahValid = projekGetah.filter(p => p.hasil_kg != null)
  const sawitSetakatTerkini = projekSawitValid[projekSawitValid.length - 1]
  const getahSetakatTerkini = projekGetahValid[projekGetahValid.length - 1]
  const chartData = jenisProjek === "sawit"
    ? projekSawitValid.map(p => ({ bulan: p.bulan, hasil: p.hasil_mt ?? 0, untung: p.untung_rugi ?? 0 }))
    : projekGetahValid.map(p => ({ bulan: p.bulan, hasil: p.hasil_kg ?? 0, untung: p.untung_rugi ?? 0 }))

  return (
    <div className="space-y-6">
      <span className="inline-block bg-[#D4A017] text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full">
        SETAKAT {latest.nama.toUpperCase()}
      </span>

      <KadRingkasan
        ts_hasil={ts_hasil} ts_pend={ts_pend} ts_ur={ts_ur} avg_pct={avg_pct}
        tg_hasil={tg_hasil} tg_ur={tg_ur} bilSawit={sawit.length}
      />

      <JadualBulanan dataBulanan={dataBulanan} />

      <PilihProjek
        projekList={projekList}
        pilihProjek={pilihProjek}
        jenisProjek={jenisProjek}
        setPilihProjek={setPilihProjek}
        setJenisProjek={setJenisProjek}
      />

      {pilihProjek && (
        <div className="bg-card rounded-xl border p-5 space-y-5">
          <div>
            <h3 className="font-bold text-lg">{pilihProjek}</h3>
            <p className="text-sm text-muted-foreground">
              Prestasi mengikut bulan — {jenisProjek === "sawit" ? "Hasil BTS (MT)" : "Hasil (KG)"}
            </p>
          </div>
          {jenisProjek === "sawit" ? (
            <JadualProjekSawit rows={projekSawitValid as any} terkini={sawitSetakatTerkini as any} valid={projekSawitValid as any} chartData={chartData} />
          ) : (
            <JadualProjekGetah rows={projekGetahValid as any} terkini={getahSetakatTerkini as any} valid={projekGetahValid as any} chartData={chartData} />
          )}
        </div>
      )}
    </div>
  )
}

export { fmt }

function KadRingkasan({
  ts_hasil, ts_pend, ts_ur, avg_pct, tg_hasil, tg_ur, bilSawit
}: {
  ts_hasil: number
  ts_pend: number
  ts_ur: number
  avg_pct: number
  tg_hasil: number
  tg_ur: number
  bilSawit: number
}) {
  const sawitKPI = [
    {
      label: "Total Hasil BTS",
      value: fmt(ts_hasil),
      unit: "MT",
      color: "blue" as const,
    },
    {
      label: "Bil. Projek Sawit",
      value: String(bilSawit),
      unit: "projek",
      color: "green" as const,
    },
    {
      label: "Avg % Tahunan",
      value: avg_pct.toFixed(1),
      unit: "%",
      color: "amber" as const,
    },
  ]

  const getahKPI = [
    {
      label: "Total Hasil Getah",
      value: fmt(tg_hasil),
      unit: "KG",
      color: "blue" as const,
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">📋 LAPORAN FIZIKAL SAWIT</h3>
        <KPICardsFizikal data={sawitKPI} />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">📋 LAPORAN FIZIKAL GETAH</h3>
        <KPICardsFizikal data={getahKPI} />
      </div>
    </div>
  )
}



function JadualBulanan({ dataBulanan }: { dataBulanan: BulanData[] }) {
  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-[#D4A017] text-black">
            <tr>
              <th className="px-4 py-3 font-bold">Bulan</th>
              <th className="px-4 py-3 font-bold text-right">Projek Sawit</th>
              <th className="px-4 py-3 font-bold text-right">Hasil (MT)</th>
              <th className="px-4 py-3 font-bold text-right">Projek Getah</th>
              <th className="px-4 py-3 font-bold text-right">Hasil (KG)</th>
            </tr>
          </thead>
          <tbody>
            {dataBulanan.map(b => (
              <tr key={b.kod} className="border-t">
                <td className="px-4 py-3 font-medium">{b.nama}</td>
                <td className="px-4 py-3 text-right">{b.sawit.length}</td>
                <td className="px-4 py-3 text-right">
                  {b.sawit.reduce((a: number, p: PS) => a + (p.hasil_mt ?? 0), 0).toLocaleString("ms-MY")}
                </td>
                <td className="px-4 py-3 text-right">{b.getah.length}</td>
                <td className="px-4 py-3 text-right">
                  {b.getah.reduce((a: number, p: PG) => a + (p.hasil_kg ?? 0), 0).toLocaleString("ms-MY")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PilihProjek({
  projekList, pilihProjek, jenisProjek, setPilihProjek, setJenisProjek
}: {
  projekList: string[]
  pilihProjek: string
  jenisProjek: "sawit" | "getah"
  setPilihProjek: (v: string) => void
  setJenisProjek: (v: "sawit" | "getah") => void
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Jenis projek:</label>
        <div className="flex rounded-full bg-muted p-1">
          <button
            className={`px-3 py-1 rounded-full text-sm ${jenisProjek === "sawit" ? "bg-[#D4A017] text-black font-semibold" : "text-muted-foreground"}`}
            onClick={() => { setJenisProjek("sawit"); setPilihProjek("") }}
          >
            Sawit
          </button>
          <button
            className={`px-3 py-1 rounded-full text-sm ${jenisProjek === "getah" ? "bg-[#D4A017] text-black font-semibold" : "text-muted-foreground"}`}
            onClick={() => { setJenisProjek("getah"); setPilihProjek("") }}
          >
            Getah
          </button>
        </div>
      </div>
      <div className="flex-1">
        <select
          className="w-full sm:w-64 bg-background border rounded-lg px-3 py-2 text-sm"
          value={pilihProjek}
          onChange={e => setPilihProjek(e.target.value)}
        >
          <option value="">— Pilih projek —</option>
          {projekList.map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

function JadualProjekSawit({
  rows, terkini, valid, chartData
}: {
  rows: ({ bulan: string } & Partial<PS>)[]
  terkini: (PS & { bulan: string }) | undefined
  valid: (PS & { bulan: string })[]
  chartData: { bulan: string; hasil: number; untung: number }[]
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MiniCard label="Bil. Peserta" val={terkini?.peserta} />
        <MiniCard label="Luas Operasi (Ha)" val={terkini?.luas_dituai} />
        <MiniCard label="Hasil (MT)" val={terkini?.hasil_mt} />
        <MiniCard label="Pendapatan (RM)" val={terkini?.pendapatan} />
      </div>

      <Bagan chartData={chartData} color="#D4A017" />

      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2 font-semibold">Bulan</th>
                <th className="px-4 py-2 text-right">Hasil (MT)</th>
                <th className="px-4 py-2 text-right">% Matlamat</th>
                <th className="px-4 py-2 text-right">Pendapatan (RM)</th>
                <th className="px-4 py-2 text-right">Kos (RM)</th>
                <th className="px-4 py-2 text-right">Untung/Rugi (RM)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="px-4 py-2">{r.bulan}</td>
                  <td className="px-4 py-2 text-right">{fmt(r.hasil_mt)}</td>
                  <td className="px-4 py-2 text-right">{fmt(r.pct_setahun, 2)}%</td>
                  <td className="px-4 py-2 text-right">{fmt(r.pendapatan, 2)}</td>
                  <td className="px-4 py-2 text-right">{fmt(r.kos, 2)}</td>
                  <td className="px-4 py-2 text-right">{fmt(r.untung_rugi, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function JadualProjekGetah({
  rows, terkini, valid, chartData
}: {
  rows: ({ bulan: string } & Partial<PG>)[]
  terkini: (PG & { bulan: string }) | undefined
  valid: (PG & { bulan: string })[]
  chartData: { bulan: string; hasil: number; untung: number }[]
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MiniCard label="Bil. Peserta" val={terkini?.peserta} />
        <MiniCard label="Luas Operasi (Ha)" val={terkini?.luas_ditoreh} />
        <MiniCard label="Hasil (KG)" val={terkini?.hasil_kg} />
        <MiniCard label="Pendapatan (RM)" val={terkini?.pendapatan} />
      </div>

      <Bagan chartData={chartData} color="#2E8B57" />

      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2 font-semibold">Bulan</th>
                <th className="px-4 py-2 text-right">Hasil (KG)</th>
                <th className="px-4 py-2 text-right">% Matlamat</th>
                <th className="px-4 py-2 text-right">Pendapatan (RM)</th>
                <th className="px-4 py-2 text-right">Kos (RM)</th>
                <th className="px-4 py-2 text-right">Untung/Rugi (RM)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="px-4 py-2">{r.bulan}</td>
                  <td className="px-4 py-2 text-right">{fmt(r.hasil_kg)}</td>
                  <td className="px-4 py-2 text-right">{fmt(r.pct_setahun, 2)}%</td>
                  <td className="px-4 py-2 text-right">{fmt(r.pendapatan, 2)}</td>
                  <td className="px-4 py-2 text-right">{fmt(r.kos, 2)}</td>
                  <td className="px-4 py-2 text-right">{fmt(r.untung_rugi, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function MiniCard({ label, val }: { label: string; val: number | undefined }) {
  return (
    <div className="bg-card rounded-xl border p-4 text-center">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{fmt(val)}</div>
    </div>
  )
}

function Bagan({
  chartData, color
}: {
  chartData: { bulan: string; hasil: number; untung: number }[]
  color: string
}) {
  return (
    <div className="bg-card rounded-xl border p-4">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis dataKey="bulan" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(v) => (typeof v === 'number' ? v.toLocaleString("ms-MY") : v)}
              contentStyle={{ borderRadius: 8 }}
            />
            <Bar dataKey="hasil" name="Hasil" fill={color} radius={[4, 4, 0, 0]} />
            <Bar dataKey="untung" name="Untung/Rugi" fill="#888" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
