"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

// Geographic mapping: PO -> Negeri
const PO_NEGERI: Record<string, string> = {
  BESUT: "Terengganu",
  DUNGUN: "Terengganu",
  "KUALA BERANG": "Terengganu",
  GERIK: "Perak",
  "KG GAJAH": "Perak",
  "KUALA KANGSAR": "Perak",
  MANJUNG: "Perak",
  SELAMA: "Perak",
  KUANTAN: "Pahang",
  LIPIS: "Pahang",
  PEKAN: "Pahang",
  RAUB: "Pahang",
  ROMPIN: "Pahang",
  MACHANG: "Kelantan",
  KEDAH: "Kedah",
  JOHOR: "Johor",
  MELAKA: "Melaka",
  "N SEMBILAN": "Negeri Sembilan",
  SELANGOR: "Selangor",
}

// Geographic mapping: Negeri -> Wilayah
const NEGERI_WILAYAH: Record<string, string> = {
  Perak: "Utara",
  Kedah: "Utara",
  Selangor: "Utara",
  Terengganu: "Timur",
  Kelantan: "Timur",
  Pahang: "Tengah",
  "Negeri Sembilan": "Selatan",
  Melaka: "Selatan",
  Johor: "Selatan",
}

export function getNegeri(row: HasilRow): string {
  return row.negeri || PO_NEGERI[row.pol_pn] || "Lain-lain"
}

export function getWilayah(row: HasilRow): string {
  const negeri = getNegeri(row)
  return row.wilayah || NEGERI_WILAYAH[negeri] || "Lain-lain"
}

export type HasilRow = {
  id: string
  kod_bulan: string
  nama_bulan: string
  jenis: "sawit" | "getah"
  pol_pn: string
  bil: number
  nama: string
  peserta: number
  luas_hek: number
  luas_operasi: number
  hasil: number
  hasil_per_hek: number
  matlamat_setahun: number
  pct_setahun: number
  pendapatan: number
  kos: number
  untung_rugi: number
  negeri?: string | null
  wilayah?: string | null
}

export type PS = {
  pol_pn: string; bil: number; nama: string
  luas_hek: number; luas_dituai: number; peserta: number
  hasil_mt: number; mtan_hek: number; matlamat_setahun: number
  pct_setahun: number; pendapatan: number; kos: number; untung_rugi: number
  negeri?: string | null; wilayah?: string | null
}

export type PG = {
  pol_pn: string; bil: number; nama: string
  luas_hek: number; luas_ditoreh: number; peserta: number
  hasil_kg: number; kg_hek: number; matlamat_setahun: number
  pct_setahun: number; pendapatan: number; kos: number; untung_rugi: number
  negeri?: string | null; wilayah?: string | null
}

export type BulanData = { kod: string; nama: string; sawit: PS[]; getah: PG[] }

function rowToPS(r: HasilRow): PS {
  return {
    pol_pn: r.pol_pn,
    bil: r.bil,
    nama: r.nama,
    luas_hek: r.luas_hek,
    luas_dituai: r.luas_operasi,
    peserta: r.peserta,
    hasil_mt: r.hasil,
    mtan_hek: r.hasil_per_hek,
    matlamat_setahun: r.matlamat_setahun,
    pct_setahun: r.pct_setahun,
    pendapatan: r.pendapatan,
    kos: r.kos,
    untung_rugi: r.untung_rugi,
    negeri: r.negeri,
    wilayah: r.wilayah,
  }
}

function rowToPG(r: HasilRow): PG {
  return {
    pol_pn: r.pol_pn,
    bil: r.bil,
    nama: r.nama,
    luas_hek: r.luas_hek,
    luas_ditoreh: r.luas_operasi,
    peserta: r.peserta,
    hasil_kg: r.hasil,
    kg_hek: r.hasil_per_hek,
    matlamat_setahun: r.matlamat_setahun,
    pct_setahun: r.pct_setahun,
    pendapatan: r.pendapatan,
    kos: r.kos,
    untung_rugi: r.untung_rugi,
    negeri: r.negeri,
    wilayah: r.wilayah,
  }
}

export function groupByMonth(rows: HasilRow[]): BulanData[] {
  const map = new Map<string, BulanData>()
  for (const row of rows) {
    if (!map.has(row.kod_bulan)) {
      map.set(row.kod_bulan, {
        kod: row.kod_bulan,
        nama: row.nama_bulan,
        sawit: [],
        getah: [],
      })
    }
    const month = map.get(row.kod_bulan)!
    if (row.jenis === "sawit") month.sawit.push(rowToPS(row))
    else month.getah.push(rowToPG(row))
  }
  return Array.from(map.values()).sort((a, b) => a.kod.localeCompare(b.kod))
}

export function getProjekList(data: BulanData[], jenis: "sawit" | "getah"): string[] {
  const names = new Set<string>()
  data.forEach(b => {
    if (jenis === "sawit") b.sawit.forEach(p => names.add(p.nama))
    else b.getah.forEach(p => names.add(p.nama))
  })
  return Array.from(names).sort()
}

export function findSawitByNama(data: BulanData[], nama: string) {
  return data.map(b => ({
    bulan: b.nama.split(" ")[0].substring(0, 3),
    ...(b.sawit.find(p => p.nama === nama) || {}),
  })) as ({ bulan: string } & Partial<PS>)[]
}

export function findGetahByNama(data: BulanData[], nama: string) {
  return data.map(b => ({
    bulan: b.nama.split(" ")[0].substring(0, 3),
    ...(b.getah.find(p => p.nama === nama) || {}),
  })) as ({ bulan: string } & Partial<PG>)[]
}

export function useHasil(opts?: { token?: string }) {
  const [data, setData] = useState<BulanData[]>([])
  const [loading, setLoading] = useState(true)

  const reload = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      
      if (opts?.token) {
        // Token mode: validate token server-side, but we can't do that from client hook
        // So token mode should only be used server-side. This is a client hook limitation.
        console.warn("Token mode called from client hook — this should be server-side only")
        return
      }
      
      const { data: rows, error } = await supabase
        .from("hasil_bulanan")
        .select("*")
        .order("kod_bulan", { ascending: true })

      if (error) throw error
      setData(groupByMonth(rows || []))
    } catch (err) {
      console.error("useHasil error:", err)
    }
    setLoading(false)
  }

   useEffect(() => {
     // eslint-disable-next-line react-hooks/set-state-in-effect
     reload()
   }, [])

  return { data, loading, reload }
}

export function getLatestMonth(data: BulanData[]): BulanData | null {
  if (data.length === 0) return null
  const latest = [...data].reverse().find(b =>
    b.sawit.some(p => (p.hasil_mt ?? 0) > 0) ||
    b.getah.some(p => (p.hasil_kg ?? 0) > 0)
  )
  return latest ?? data[data.length - 1]
}
