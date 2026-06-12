import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import bulananData from '@/data/hasil-bulanan.json'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const po = searchParams.get('po')
    const mode = searchParams.get('mode') || 'bulan' // 'bulan' or 'setakat'

    if (!po) {
      return NextResponse.json(
        { success: false, error: 'Parameter po (pusat operasi) diperlukan' },
        { status: 400 }
      )
    }

    const result = bulananData.bulan.map(bulan => {
      const sawitFiltered = bulan.sawit.filter(item => item.pol_pn === po)
      const getahFiltered = bulan.getah?.filter(item => item.pol_pn === po) || []

      return {
        kod: bulan.kod,
        nama: bulan.nama,
        sawit: sawitFiltered,
        getah: getahFiltered,
      }
    })

    // Filter out empty months
    const filtered = result.filter(b => b.sawit.length > 0 || b.getah.length > 0)

    // If mode is 'setakat', calculate cumulative data
    if (mode === 'setakat') {
      const cumulativeSawit = new Map<string, any>()
      const cumulativeGetah = new Map<string, any>()

      filtered.forEach(bulan => {
        bulan.sawit.forEach(item => {
          const key = item.nama
          if (!cumulativeSawit.has(key)) {
            cumulativeSawit.set(key, { ...item })
          } else {
            const existing = cumulativeSawit.get(key)
            existing.hasil_mt = (existing.hasil_mt || 0) + (item.hasil_mt || 0)
            existing.pendapatan = (existing.pendapatan || 0) + (item.pendapatan || 0)
            existing.kos = (existing.kos || 0) + (item.kos || 0)
            existing.untung_rugi = (existing.untung_rugi || 0) + (item.untung_rugi || 0)
          }
        })

        bulan.getah.forEach(item => {
          const key = item.nama
          if (!cumulativeGetah.has(key)) {
            cumulativeGetah.set(key, { ...item })
          } else {
            const existing = cumulativeGetah.get(key)
            existing.hasil_kg = (existing.hasil_kg || 0) + (item.hasil_kg || 0)
            existing.pendapatan = (existing.pendapatan || 0) + (item.pendapatan || 0)
            existing.kos = (existing.kos || 0) + (item.kos || 0)
            existing.untung_rugi = (existing.untung_rugi || 0) + (item.untung_rugi || 0)
          }
        })
      })

      return NextResponse.json({
        success: true,
        mode: 'setakat',
        po,
        data: {
          sawit: Array.from(cumulativeSawit.values()),
          getah: Array.from(cumulativeGetah.values()),
        },
        months: filtered.map(b => b.nama),
      })
    }

    // Default: return monthly data
    return NextResponse.json({
      success: true,
      mode: 'bulan',
      po,
      data: filtered,
    })
  } catch (error) {
    console.error('Error fetching hasil data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch hasil data' },
      { status: 500 }
    )
  }
}
