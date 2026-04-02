import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/store'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

const PrizeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(100),
  quantity: z.number().min(0).max(10000),
  remaining: z.number().min(0).max(10000).optional(),
  colorPrimary: z.string(),
  colorSecondary: z.string(),
})

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const prizes = db.getPrizes()
  // Include remaining info so admin can see pool status
  const prizesWithRemaining = prizes.map(p => ({
    ...p,
    remaining: p.remaining,
    distributed: p.quantity - p.remaining,
  }))
  return NextResponse.json({ prizes: prizesWithRemaining })
}

export async function PUT(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const parsed = PrizeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Data tidak valid', details: parsed.error.flatten() }, { status: 400 })
    }

    const { id, remaining, ...data } = parsed.data
    
    if (!id) {
      return NextResponse.json({ error: 'Prize ID diperlukan' }, { status: 400 })
    }
    
    // Build update data - only update fields that are provided
    const updateData: any = { ...data }
    
    // If remaining is explicitly provided, use it (for admin adjustments)
    if (remaining !== undefined) {
      updateData.remaining = Math.min(remaining, data.quantity)
    }
    
    const updated = db.updatePrize(id, updateData)
    if (!updated) {
      return NextResponse.json({ error: 'Prize tidak dijumpai' }, { status: 404 })
    }
    
    return NextResponse.json({ 
      ok: true, 
      prize: {
        ...updated,
        distributed: updated.quantity - updated.remaining,
      }
    })
  } catch {
    return NextResponse.json({ error: 'Ralat server' }, { status: 500 })
  }
}

// Reset pool to initial quantities
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    
    if (body.action === 'reset') {
      db.resetPool()
      const prizes = db.getPrizes()
      return NextResponse.json({ 
        ok: true, 
        message: 'Pool telah direset',
        prizes 
      })
    }
    
    return NextResponse.json({ error: 'Action tidak valid' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Ralat server' }, { status: 500 })
  }
}
