import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/store'

const CheckSchema = {
  whatsappNumber: zod.string().min(5).max(20),
  agentId: zod.string().min(1).max(100),
}

import { z } from 'zod'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { whatsappNumber, agentId } = body

    if (!whatsappNumber || !agentId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Check whitelist
    const inWhitelist = db.isInWhitelist(whatsappNumber, agentId)
    
    // Check if already spun
    const hasSpun = db.hasSpun(whatsappNumber, agentId)

    return NextResponse.json({
      eligible: !!inWhitelist,
      alreadySpun: hasSpun,
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
