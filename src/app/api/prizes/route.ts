import { NextResponse } from 'next/server'
import { db } from '@/lib/store'

export async function GET() {
  const prizes = db.getPrizes()
  const settings = db.getSettings()
  
  return NextResponse.json({
    prizes: prizes.map(p => ({
      id: p.id,
      name: p.name,
      probability: p.probability,
      colorPrimary: p.colorPrimary,
      colorSecondary: p.colorSecondary,
    })),
    eventTitle: settings.eventTitle,
    isActive: settings.isActive,
  })
}
