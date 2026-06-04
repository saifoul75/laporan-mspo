import data from "@/data/april2026.json"

type PS = { pol_pn: string; nama: string; hasil_mt: number; pct_setakat: number; pct_setahun: number; pendapatan: number; kos: number; untung_rugi: number }
type PG = { pol_pn: string; nama: string; hasil_kg: number; pct_setakat: number; pct_setahun: number; pendapatan: number; kos: number; untung_rugi: number }

const sawit = data.sawit as PS[]
const getah  = data.getah as PG[]

function fmt(n: number | undefined | null, d = 0): string {
  if (n == null || isNaN(n)) return "—"
  return n.toLocaleString("ms-MY", { minimumFractionDigits: d, maximumFractionDigits: d })
}

function pctClass(v: number) {
  return v >= 100 ? "text-blue-600" : v >= 80 ? "text-green-600" : "text-red-600"
}

export default function HasilPage() {
  const ts_hasil  = sawit.reduce((a, p) => a + (p.hasil_mt ?? 0), 0)
  const ts_pend   = sawit.reduce((a, p) => a + (p.pendapatan ?? 0), 0)
  const ts_ur     = sawit.reduce((a, p) => a + (p.untung_rugi ?? 0), 0)
  const valid     = sawit.filter(p => (p.pct_setakat ?? 0) > 0)
  const avg_pct   = valid.length ? valid.reduce((a, p) => a + p.pct_setakat, 0) / valid.length : 0
  const tg_hasil  = getah.reduce((a, p) => a + (p.hasil_kg ?? 0), 0)
  const tg_ur     = getah.reduce((a, p) => a + (p.untung_rugi ?? 0), 0)
  const top5      = [...sawit].sort((a, b) => b.hasil_mt - a.hasil_mt).slice(0, 5)
  const top5rugi  = [...sawit].sort((a, b) => a.untung_rugi - b.untung_rugi).slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ringkasan Prestasi Hasil</h1>
          <p className="text-muted-foreground text-sm mt-1">Semua projek sawit &amp; getah — setakat April 2026</p>
        </div>
        <span className="bg-[#D4A017] text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full">APRIL 2026</span>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Hasil Sawit BTB",     val: fmt(ts_hasil,1)+" MT",   sub: sawit.length+" projek sawit",          border: "border-[#C0182A]",  vc: "" },
          { label: "% Capai Setakat",     val: fmt(avg_pct,1)+"%",       sub: "Purata semua projek",                border: "border-blue-500",   vc: pctClass(avg_pct) },
          { label: "U/R Sawit",           val: "RM "+fmt(ts_ur),         sub: "Pendapatan RM "+fmt(ts_pend),         border: "border-green-600",  vc: ts_ur >= 0 ? "text-green-600" : "text-red-600" },
          { label: "Hasil Getah",         val: fmt(tg_hasil)+" KG",      sub: "U/R: RM "+fmt(tg_ur),                border: "border-[#D4A017]",  vc: tg_ur >= 0 ? "text-green-600" : "text-red-600" },
        ].map((c, i) => (
          <div key={i} className={`bg-card border-l-4 ${c.border} rounded-xl p-4 shadow-sm`}>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{c.label}</div>
            <div className={`text-2xl font-bold mt-1 mb-1 ${c.vc}`}>{c.val}</div>
            <div className="text-[11px] text-muted-foreground">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Tables */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-card rounded-xl shadow-sm border p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">Top 5 — Hasil Sawit (MT)</h2>
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted-foreground border-b">
              <th className="text-left pb-2">Projek</th>
              <th className="text-right pb-2">MT</th>
              <th className="text-right pb-2">% Setakat</th>
            </tr></thead>
            <tbody>
              {top5.map((p, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-2 text-sm truncate max-w-[160px]">{p.nama}</td>
                  <td className="py-2 text-right font-semibold">{fmt(p.hasil_mt,1)}</td>
                  <td className="py-2 text-right">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.pct_setakat>=100?"bg-blue-100 text-blue-800":p.pct_setakat>=80?"bg-green-100 text-green-800":"bg-yellow-100 text-yellow-800"}`}>
                      {fmt(p.pct_setakat,1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-card rounded-xl shadow-sm border p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-red-600 mb-3">⚠ Projek Rugi Tertinggi</h2>
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted-foreground border-b">
              <th className="text-left pb-2">Projek</th>
              <th className="text-right pb-2">POL/PN</th>
              <th className="text-right pb-2">U/R (RM)</th>
            </tr></thead>
            <tbody>
              {top5rugi.map((p, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-2 text-sm truncate max-w-[160px]">{p.nama}</td>
                  <td className="py-2 text-right text-xs text-muted-foreground">{p.pol_pn}</td>
                  <td className="py-2 text-right font-semibold text-red-600">{fmt(p.untung_rugi)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
