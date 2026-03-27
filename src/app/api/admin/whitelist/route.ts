import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/store'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

const WhitelistSchema = z.object({
  name: z.string().max(200).optional(),
  whatsappNumber: z.string().min(5).max(20),
  agentId: z.string().min(1).max(100),
  isActive: z.boolean().optional(),
})

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const whitelist = db.getWhitelist()
  return NextResponse.json({ whitelist })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const parsed = WhitelistSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Data tidak valid', details: parsed.error.flatten() }, { status: 400 })
    }

    const { name, whatsappNumber, agentId } = parsed.data
    const entry = db.addWhitelistEntry(name || '', whatsappNumber, agentId)
    return NextResponse.json({ ok: true, entry })
  } catch {
    return NextResponse.json({ error: 'Ralat server' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 })

    const updated = db.updateWhitelistEntry(id, data)
    if (!updated) return NextResponse.json({ error: 'Entry tidak dijumpai' }, { status: 404 })
    return NextResponse.json({ ok: true, entry: updated })
  } catch {
    return NextResponse.json({ error: 'Ralat server' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID diperlukan' }, { status: 400 })

  const deleted = db.deleteWhitelistEntry(id)
  return NextResponse.json({ ok: deleted })
}
