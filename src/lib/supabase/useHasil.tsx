"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

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
}

export type PS = {
  pol_pn: string; bil: number; nama: string
  luas_hek: number; luas_dituai: number; peserta: number
  hasil_mt: number; mtan_hek: number; matlamat_setahun: number
  pct_setahun: number; pendapatan: number; kos: number; untung_rugi: number
}

export type PG = {
  pol_pn: string; bil: number; nama: string
  luas_hek: number; luas_ditoreh: number; peserta: number
  hasil_kg: number; kg_hek: number; matlamat_setahun: number
  pct_setahun: number; pendapatan: number; kos: number; untung_rugi: number
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
  }
}

function groupByMonth(rows: HasilRow[]): BulanData[] {
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

export function useHasil() {
  const [data, setData] = useState<BulanData[]>([])
  const [loading, setLoading] = useState(true)

  const reload = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
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
