import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/store'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

const PrizeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(100),
  probability: z.number().min(0).max(100),
  colorPrimary: z.string(),
  colorSecondary: z.string(),
})

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const prizes = db.getPrizes()
  return NextResponse.json({ prizes })
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

    const { id, ...data } = parsed.data
    if (id) {
      const updated = db.updatePrize(id, data)
      return NextResponse.json({ ok: true, prize: updated })
    }
    return NextResponse.json({ error: 'Prize ID diperlukan' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Ralat server' }, { status: 500 })
  }
}
