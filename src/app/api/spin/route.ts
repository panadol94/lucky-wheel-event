import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/store'
import { rateLimit } from '@/lib/ratelimit'
import { z } from 'zod'

const SpinSchema = z.object({
  whatsappNumber: z.string().min(5).max(20),
  agentId: z.string().min(1).max(100),
  deviceFingerprint: z.string().min(1).max(255),
})

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 5 spin attempts per IP per minute
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown'
    
    const rateKey = `spin:${ip}`
    const rate = rateLimit(rateKey, { max: 5, windowMs: 60000 })
    if (!rate.success) {
      return NextResponse.json(
        { error: 'Terlalu banyak percubaan. Sila cuba sebentar lagi.', retryAfter: rate.resetAt },
        { status: 429 }
      )
    }

    const body = await request.json()
    const parsed = SpinSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Data tidak valid.', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { whatsappNumber, agentId, deviceFingerprint } = parsed.data

    // Normalize - remove non-digits for comparison
    const normalizedWA = whatsappNumber.replace(/\D/g, '')
    const normalizedAgent = agentId.trim()

    // Check event is active
    const settings = db.getSettings()
    if (!settings.isActive) {
      return NextResponse.json(
        { error: 'Event telah ditutup. Sila cuba lagi lain kali.' },
        { status: 403 }
      )
    }

    // Check whitelist
    const whitelistEntry = db.isInWhitelist(whatsappNumber, agentId)
    if (!whitelistEntry) {
      return NextResponse.json(
        { error: 'Maaf, anda tidak layak untuk menyertai lucky wheel ini.' },
        { status: 403 }
      )
    }

    // Check if already spun (anti-abuse)
    if (db.hasSpun(whatsappNumber, agentId)) {
      return NextResponse.json(
        { error: 'Anda telah menggunakan peluang putaran anda.' },
        { status: 403 }
      )
    }

    // Check if pool is exhausted
    const poolRemaining = db.getTotalRemaining()
    if (poolRemaining <= 0) {
      return NextResponse.json(
        { error: 'Maaf, semua hadiah telah habis diagihkan. Terima kasih atas penyertaan anda!' },
        { status: 403 }
      )
    }

    // SERVER-SIDE SPIN LOGIC - Fixed Pool Selection
    const result = db.determinePrize()
    
    if (!result) {
      return NextResponse.json(
        { error: 'Maaf, semua hadiah telah habis diagihkan. Terima kasih atas penyertaan anda!' },
        { status: 403 }
      )
    }

    const { prizeId, prizeName } = result

    // Log the spin with all anti-abuse data
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const record = db.addSpinRecord(
      whatsappNumber,
      agentId,
      prizeId,
      prizeName,
      deviceFingerprint,
      ip,
      userAgent
    )

    // Generate claim ID
    const claimId = `CW${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`

    // Get updated pool status
    const updatedPool = db.getTotalRemaining()

    return NextResponse.json({
      ok: true,
      prize: prizeName,
      prizeId,
      claimId,
      spunAt: record.spunAt.toISOString(),
      poolRemaining: updatedPool,
      message: prizeName === '5G GOLD' 
        ? 'Tidak ada hadiah kali ini. Cuba lagi lain kali!' 
        : `Tahniah! Anda menang ${prizeName}! Sila tuntut hadiah anda.`,
    })
  } catch (error) {
    console.error('Spin error:', error)
    return NextResponse.json(
      { error: 'Ralat server. Sila cuba lagi.' },
      { status: 500 }
    )
  }
}

export async function GET() {
  // Check if user has already spun (for resuming session)
  // This would require session data passed via headers/cookies
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
