"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

const PO_NEGERI: Record<string, string> = {
  BESUT: "Terengganu", DUNGUN: "Terengganu", "KUALA BERANG": "Terengganu",
  GERIK: "Perak", "KG.GAJAH": "Perak", "KUALA KANGSAR": "Perak", MANJUNG: "Perak", SELAMA: "Perak",
  KUANTAN: "Pahang", LIPIS: "Pahang", PEKAN: "Pahang", RAUB: "Pahang", ROMPIN: "Pahang",
  MACHANG: "Kelantan",
  KEDAH: "Kedah", SIK: "Kedah",
  JOHOR: "Johor", "BUKIT KEPONG": "Johor", MUAR: "Johor",
  MELAKA: "Melaka", JASIN: "Melaka", "ALOR GAJAH": "Melaka", "MASJID TANAH": "Melaka",
  "N.SEMBILAN": "Negeri Sembilan", GEMENCEH: "Negeri Sembilan", REMBAU: "Negeri Sembilan",
  SELANGOR: "Selangor",
  BENTONG: "Pahang", JERANTUT: "Pahang", TEMERLOH: "Pahang",
  LENGGONG: "Perak", TAPAH: "Perak",
}

const NEGERI_WILAYAH: Record<string, string> = {
  Perak: "Utara", Kedah: "Utara", Selangor: "Utara",
  Terengganu: "Timur", Kelantan: "Timur",
  Pahang: "Tengah",
  "Negeri Sembilan": "Selatan", Melaka: "Selatan", Johor: "Selatan",
}

export function getNegeri(row: HasilRow): string {
  return PO_NEGERI[row.pol_pn] || "Lain-lain"
}

export function getWilayah(row: HasilRow): string {
  if (row.wilayah) return row.wilayah.charAt(0).toUpperCase() + row.wilayah.slice(1).toLowerCase()
  const n = getNegeri(row)
  const w = NEGERI_WILAYAH[n]
  if (w) return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  return "Lain-lain"
}

export type HasilRow = {
  id: number
  tahun: number
  bulan: number
  jenis: "sawit" | "getah"
  pol_pn: string
  nama: string
  peserta: number
  luas_hek: number
  luas_operasi: number
  unit: string
  kod_bulan: string
  nama_bulan: string
  wilayah: string | null
  hasil: number
}

export type PS = {
  pol_pn: string; bil: number; nama: string
  luas_hek: number; luas_dituai: number; peserta: number
  hasil_mt: number; mtan_hek: number; matlamat_setahun: number
  pct_setahun: number; pendapatan: number; kos: number; untung_rugi: number
  wilayah?: string | null
}

export type PG = {
  pol_pn: string; bil: number; nama: string
  luas_hek: number; luas_ditoreh: number; peserta: number
  hasil_kg: number; kg_hek: number; matlamat_setahun: number
  pct_setahun: number; pendapatan: number; kos: number; untung_rugi: number
  wilayah?: string | null
}

export type BulanData = { kod: string; nama: string; sawit: PS[]; getah: PG[] }

function rowToPS(r: HasilRow): PS {
  return {
    pol_pn: r.pol_pn,
    bil: 0,
    nama: r.nama,
    luas_hek: Number(r.luas_hek) || 0,
    luas_dituai: Number(r.luas_operasi) || 0,
    peserta: Number(r.peserta) || 0,
    hasil_mt: Number(r.hasil) || 0,
    mtan_hek: Number(r.luas_operasi) > 0 ? Number(r.hasil) / Number(r.luas_operasi) : 0,
    matlamat_setahun: 0,
    pct_setahun: 0,
    pendapatan: 0,
    kos: 0,
    untung_rugi: 0,
    wilayah: r.wilayah,
  }
}

function rowToPG(r: HasilRow): PG {
  return {
    pol_pn: r.pol_pn,
    bil: 0,
    nama: r.nama,
    luas_hek: Number(r.luas_hek) || 0,
    luas_ditoreh: Number(r.luas_operasi) || 0,
    peserta: Number(r.peserta) || 0,
    hasil_kg: Number(r.hasil) || 0,
    kg_hek: Number(r.luas_operasi) > 0 ? Number(r.hasil) / Number(r.luas_operasi) : 0,
    matlamat_setahun: 0,
    pct_setahun: 0,
    pendapatan: 0,
    kos: 0,
    untung_rugi: 0,
    wilayah: r.wilayah,
  }
}

export function groupByMonth(rows: HasilRow[]): BulanData[] {
  const map = new Map<string, BulanData>()
  for (const row of rows) {
    const key = row.kod_bulan || `${row.tahun}-${String(row.bulan).padStart(2, "0")}`
    if (!map.has(key)) {
      map.set(key, { kod: key, nama: row.nama_bulan || key, sawit: [], getah: [] })
    }
    const month = map.get(key)!
    if (row.jenis === "sawit") month.sawit.push(rowToPS(row))
    else month.getah.push(rowToPG(row))
  }

  for (const month of Array.from(map.values())) {
    const sawitCount: Record<string, number> = {}
    const getahCount: Record<string, number> = {}
    month.sawit.forEach(p => { sawitCount[p.pol_pn] = (sawitCount[p.pol_pn] || 0) + 1; p.bil = sawitCount[p.pol_pn] })
    month.getah.forEach(p => { getahCount[p.pol_pn] = (getahCount[p.pol_pn] || 0) + 1; p.bil = getahCount[p.pol_pn] })
  }

  return Array.from(map.values()).sort((a, b) => a.kod.localeCompare(b.kod))
}

function bulanSingkat(nama: string | null | undefined): string {
  if (!nama) return ""
  return nama.split(" ")[0]?.substring(0, 3) ?? ""
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
    bulan: bulanSingkat(b.nama),
    ...(b.sawit.find(p => p.nama === nama) || {}),
  })) as ({ bulan: string } & Partial<PS>)[]
}

export function findGetahByNama(data: BulanData[], nama: string) {
  return data.map(b => ({
    bulan: bulanSingkat(b.nama),
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
        console.warn("Token mode called from client hook — this should be server-side only")
        return
      }

      const PAGE = 1000
      const allRows: HasilRow[] = []
      let from = 0
      let hasMore = true

      while (hasMore) {
        const { data: rows, error } = await supabase
          .from("hasil_bulanan")
          .select("*")
          .order("tahun", { ascending: true })
          .order("bulan", { ascending: true })
          .range(from, from + PAGE - 1)

        if (error) throw error
        if (!rows || rows.length === 0) {
          hasMore = false
        } else {
          allRows.push(...(rows as HasilRow[]))
          from += PAGE
          if (rows.length < PAGE) hasMore = false
        }
      }

      setData(groupByMonth(allRows))
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
