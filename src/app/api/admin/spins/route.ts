import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/store'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const spins = db.getSpinRecords()
  return NextResponse.json({ spins })
}

export async function PUT(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { id, status } = body
    if (!id || !status) return NextResponse.json({ error: 'ID dan status diperlukan' }, { status: 400 })

    if (!['pending', 'claimed', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 })
    }

    const updated = db.updateSpinClaimStatus(id, status)
    if (!updated) return NextResponse.json({ error: 'Rekod tidak dijumpai' }, { status: 404 })
    return NextResponse.json({ ok: true, record: updated })
  } catch {
    return NextResponse.json({ error: 'Ralat server' }, { status: 500 })
  }
}
