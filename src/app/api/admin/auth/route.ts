import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/store'
import { verifyPassword, createToken, setSessionCookie, clearSession, getSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()
    
    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password diperlukan' }, { status: 400 })
    }

    const admin = db.getAdmin(username)
    if (!admin) {
      return NextResponse.json({ error: 'Credential tidak sah' }, { status: 401 })
    }

    const valid = await verifyPassword(password, admin.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Credential tidak sah' }, { status: 401 })
    }

    const token = await createToken({ id: admin.id, username: admin.username, name: admin.name })
    await setSessionCookie(token)

    return NextResponse.json({ ok: true, name: admin.name })
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json({ error: 'Ralat server' }, { status: 500 })
  }
}

export async function DELETE() {
  await clearSession()
  return NextResponse.json({ ok: true })
}

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
  return NextResponse.json({ authenticated: true, name: session.name })
}
