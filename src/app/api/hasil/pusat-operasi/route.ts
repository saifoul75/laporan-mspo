import { NextResponse } from 'next/server'
import bulananData from '@/data/hasil-bulanan.json'

export async function GET() {
  try {
    const pustakOperasi = new Set<string>()
    
    bulananData.bulan.forEach(bulan => {
      bulan.sawit.forEach(item => {
        pustakOperasi.add(item.pol_pn)
      })
      bulan.getah?.forEach(item => {
        pustakOperasi.add(item.pol_pn)
      })
    })

    const sorted = Array.from(pustakOperasi).sort()
    
    return NextResponse.json({
      success: true,
      data: sorted,
      count: sorted.length
    })
  } catch (error) {
    console.error('Error fetching pusat operasi:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pusat operasi' },
      { status: 500 }
    )
  }
}
