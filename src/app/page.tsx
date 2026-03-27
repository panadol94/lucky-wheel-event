'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ===== TYPES =====
type Prize = {
  id: string
  name: string
  probability: number
  colorPrimary: string
  colorSecondary: string
}

type SpinResult = {
  prize: string
  claimId: string
  spunAt: string
  message: string
}

// ===== FINGERPRINT UTILS =====
async function getFingerprint(): Promise<string> {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (ctx) {
    canvas.width = 200
    canvas.height = 50
    ctx.textBaseline = 'top'
    ctx.font = "14px Arial"
    ctx.fillStyle = '#f60'
    ctx.fillRect(125, 1, 62, 20)
    ctx.fillStyle = '#069'
    ctx.fillText('Lucky Wheel 🎰', 2, 15)
  }
  const fp = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height + 'x' + screen.colorDepth,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
  ].join('|')
  let hash = 0
  for (let i = 0; i < fp.length; i++) {
    const char = fp.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

// ===== CONFETTI =====
interface Particle {
  x: number; y: number; vx: number; vy: number
  size: number; color: string; rotation: number; rotSpeed: number
  life: number; maxLife: number; shape: number
}

function spawnConfetti(cx: number, cy: number, count = 100): Particle[] {
  const colors = ['#ffd700', '#ff6b6b', '#4facfe', '#00c6ff', '#fff', '#ffb347', '#c471ed']
  const particles: Particle[] = []
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 3 + Math.random() * 8
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 5,
      size: 4 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 15,
      life: 0,
      maxLife: 60 + Math.random() * 60,
      shape: Math.floor(Math.random() * 3),
    })
  }
  return particles
}

function ConfettiCanvas({ particles }: { particles: Particle[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const particlesRef = useRef(particles)
  particlesRef.current = particles

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const animate = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let alive = false
      for (const p of particlesRef.current) {
        p.life++
        if (p.life > p.maxLife) continue
        alive = true
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.2
        p.vx *= 0.99
        p.rotation += p.rotSpeed
        const alpha = 1 - p.life / p.maxLife
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.globalAlpha = alpha
        ctx.fillStyle = p.color
        if (p.shape === 0) ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        else if (p.shape === 1) { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill() }
        else {
          ctx.beginPath()
          ctx.moveTo(0, -p.size / 2)
          ctx.lineTo(p.size / 3, 0)
          ctx.lineTo(0, p.size / 2)
          ctx.lineTo(-p.size / 3, 0)
          ctx.closePath()
          ctx.fill()
        }
        ctx.restore()
      }
      if (alive) animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  return <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 9999 }} />
}

// ===== WHEEL COMPONENT =====
const NUM_SEGMENTS = 8

function WheelComponent({ angle, prizes }: { angle: number; prizes: Prize[] }) {
  const SEG_DEG = 360 / NUM_SEGMENTS
  const segmentColors = prizes.length >= 5 
    ? [prizes[0], prizes[0], prizes[1], prizes[2], prizes[0], prizes[3], prizes[0], prizes[4]]
    : Array(NUM_SEGMENTS).fill(prizes[0] || { colorPrimary: '#FFD700', colorSecondary: '#FFA500' })

  return (
    <div style={{ position: 'relative', width: 'min(75vw, 440px)', aspectRatio: '1' }}>
      {/* Decorative glow rings */}
      <div style={{ position: 'absolute', inset: '-4%', borderRadius: '50%', border: '2px solid rgba(255,215,0,0.08)', animation: 'spin 25s linear infinite' }} />
      <div style={{ position: 'absolute', inset: '-8%', borderRadius: '50%', border: '2px solid rgba(255,215,0,0.05)', animation: 'spin 35s linear infinite reverse' }} />

      {/* Pointer */}
      <div style={{
        position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', zIndex: 10,
        width: 0, height: 0,
        borderLeft: '18px solid transparent', borderRight: '18px solid transparent',
        borderTop: '36px solid #ffd700',
        filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.5))',
      }} />

      {/* Wheel */}
      <div style={{
        width: '100%', height: '100%', borderRadius: '50%',
        border: '16px solid rgba(255,215,0,0.9)',
        boxShadow: '0 0 0 8px rgba(255,255,255,0.04), 0 0 50px rgba(255,215,0,0.2), inset 0 0 50px rgba(0,0,0,0.2), 0 20px 60px rgba(0,0,0,0.5)',
        overflow: 'hidden', position: 'relative',
        transform: `rotate(${angle}deg)`,
        transition: 'transform 5s cubic-bezier(0.16, 1, 0.3, 1)',
        background: '#111',
      }}>
        {segmentColors.map((prize, i) => {
          const rot = i * SEG_DEG
          return (
            <div key={i} style={{
              position: 'absolute', width: '50%', height: '50%', left: '50%', top: 0,
              transformOrigin: 'left bottom',
              transform: `rotate(${rot}deg)`,
              clipPath: 'polygon(0 100%, 100% 0, 100% 100%)',
              background: `linear-gradient(135deg, ${prize.colorPrimary}, ${prize.colorSecondary})`,
            }}>
              <span style={{
                position: 'absolute', left: '58%', top: '45%',
                transform: 'rotate(68deg)',
                fontSize: 'clamp(10px, 2vw, 15px)', fontWeight: 900,
                color: prize.name === '5G GOLD' ? '#1a0000' : '#fff',
                textShadow: '0 2px 8px rgba(0,0,0,0.4)',
                whiteSpace: 'nowrap',
              }}>{prize.name}</span>
            </div>
          )
        })}

        {/* Center hub */}
        <div style={{
          position: 'absolute', inset: '50%', width: '90px', height: '90px',
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 30%, #fff3b0, #ff9800 70%, #d46a00 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '8px solid rgba(255,255,255,0.8)',
          boxShadow: '0 0 24px rgba(255,196,0,0.3)',
          zIndex: 3,
        }}>
          <span style={{ fontSize: '18px', fontWeight: 900, color: '#371500', letterSpacing: '0.05em' }}>SPIN</span>
        </div>
      </div>
    </div>
  )
}

// ===== MAIN PAGE =====
export default function LuckyWheelPage() {
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [eventTitle, setEventTitle] = useState('🎡 Lucky Wheel Event')
  const [isLoading, setIsLoading] = useState(true)

  const [whatsapp, setWhatsapp] = useState('')
  const [agentId, setAgentId] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [isSpinning, setIsSpinning] = useState(false)
  const [hasSpun, setHasSpun] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<SpinResult | null>(null)
  const [wheelAngle, setWheelAngle] = useState(0)
  const [fingerprint, setFingerprint] = useState('')
  const [confettiParticles, setConfettiParticles] = useState<Particle[]>([])
  const [showConfetti, setShowConfetti] = useState(false)

  // Load prizes + fingerprint
  useEffect(() => {
    getFingerprint().then(setFingerprint)
    fetch('/api/prizes')
      .then(r => r.json())
      .then(data => {
        setPrizes(data.prizes || [])
        setEventTitle(data.eventTitle || '🎡 Lucky Wheel Event')
      })
      .catch(() => setError('Gagal load data event'))
      .finally(() => setIsLoading(false))
  }, [])

  const handleLogin = async () => {
    if (!whatsapp.trim() || !agentId.trim()) {
      setError('Sila isi semua ruangan')
      return
    }
    setIsChecking(true)
    setError('')
    try {
      const res = await fetch('/api/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsappNumber: whatsapp.trim(), agentId: agentId.trim(), deviceFingerprint: fingerprint }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Ralat berlaku')
        return
      }
      // Success - show result
      setHasSpun(true)
      setResult({ prize: data.prize, claimId: data.claimId, spunAt: data.spunAt, message: data.message })
      // Animate wheel
      const targetPrizeIdx = prizes.findIndex(p => p.name === data.prize)
      const segDeg = 360 / NUM_SEGMENTS
      const segCenter = targetPrizeIdx * segDeg + segDeg / 2
      const extraTurns = 6 * 360
      const offset = 360 - segCenter
      setWheelAngle(prev => prev + extraTurns + offset + 720)
      // Confetti
      if (data.prize !== '5G GOLD') {
        setTimeout(() => {
          setConfettiParticles(spawnConfetti(window.innerWidth / 2, window.innerHeight / 3, 120))
          setShowConfetti(true)
        }, 5000)
      }
    } catch {
      setError('Ralat sambungan. Sila cuba lagi.')
    } finally {
      setIsChecking(false)
    }
  }

  const claimWhatsApp = () => {
    if (!result) return
    const msg = `Hi admin, saya menang ${result.prize}. Nama/No WhatsApp saya: ${whatsapp}, ID Agent: ${agentId}. Saya sertakan screenshot sebagai bukti.`
    window.open(`https://wa.me/601133388859?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <main style={{ minHeight: '100vh', padding: '20px 16px 100px', position: 'relative' }}>
      {showConfetti && <ConfettiCanvas particles={confettiParticles} />}

      {/* Background decorations */}
      <div style={{ position: 'fixed', top: '-150px', right: '-150px', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,215,0,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-100px', left: '-100px', width: '350px', height: '350px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(230,53,32,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: '520px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '24px', animation: 'slideUp 0.6s ease' }}>
          <div style={{ display: 'inline-block', padding: '6px 16px', borderRadius: '999px', background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.25)', color: '#ffd700', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
            <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: '#ffd700', marginRight: '8px', animation: 'pulse 1.5s ease-in-out infinite' }} />
            LIVE EVENT
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 7vw, 42px)', fontWeight: 900, lineHeight: 1.1, marginBottom: '10px', background: 'linear-gradient(135deg, #ffd700 0%, #ff9800 50%, #ffd700 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {eventTitle}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px', lineHeight: 1.6 }}>
            Isi ruangan di bawah, tekan SPIN, dan uji nasib anda! 🎰
          </p>
        </div>

        {/* Login / Spin Form */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,215,0,0.12)', borderRadius: '24px', padding: '24px', marginBottom: '20px', backdropFilter: 'blur(16px)', animation: 'slideUp 0.7s ease' }}>
          {!hasSpun ? (
            <>
              <h2 style={{ color: '#ffd700', fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>🔐 Sila Isi Ruangan</h2>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', marginBottom: '7px', fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>No WhatsApp</label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value)}
                  placeholder="Contoh: 01133388859"
                  style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', marginBottom: '7px', fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ID Agent</label>
                <input
                  type="text"
                  value={agentId}
                  onChange={e => setAgentId(e.target.value)}
                  placeholder="Contoh: Garry01"
                  autoCapitalize="off"
                  style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              {error && <div style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,68,68,0.12)', border: '1px solid rgba(255,68,68,0.2)', color: '#ff9999', fontSize: '14px', marginBottom: '14px' }}>{error}</div>}
              <button
                className="btn-red"
                onClick={handleLogin}
                disabled={isChecking || isLoading}
                style={{ width: '100%', fontSize: '17px', padding: '16px' }}
              >
                {isChecking ? <><span className="spinner spinner-white" /> Sila tunggu...</> : '🎰 SPIN SEKARANG!'}
              </button>
              <p style={{ textAlign: 'center', marginTop: '12px', fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
                * Hanya agent dalam senarai layak boleh spin
              </p>
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎉</div>
              <h2 style={{ color: '#ffd700', fontSize: '22px', fontWeight: 900, marginBottom: '8px' }}>Anda Sudah Spin!</h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>Setiap agent hanya layak 1 kali spin.</p>
            </div>
          )}
        </div>

        {/* Wheel */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', animation: 'slideUp 0.8s ease' }}>
          <WheelComponent angle={wheelAngle} prizes={prizes} />
        </div>

        {/* Spin Button below wheel */}
        {!hasSpun && (
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <button
              className="btn-red"
              onClick={handleLogin}
              disabled={isChecking || isLoading || !whatsapp.trim() || !agentId.trim()}
              style={{ fontSize: '20px', padding: '18px 48px', animation: hasSpun ? 'none' : 'bounce 2s ease-in-out infinite' }}
            >
              {isChecking ? <><span className="spinner spinner-white" /> Processing...</> : '🎰 PUTAR SEKARANG!'}
            </button>
            <p style={{ marginTop: '10px', fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
              {whatsapp.trim() && agentId.trim() ? 'Tekan untuk spin!' : 'Isi ruangan di atas dulu'}
            </p>
          </div>
        )}

        {/* Result Card */}
        {result && (
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: '24px', padding: '28px 24px', textAlign: 'center', animation: 'scaleIn 0.5s ease', marginBottom: '20px' }}>
            <div style={{ fontSize: '72px', marginBottom: '8px' }}>{result.prize === '5G GOLD' ? '😅' : '🎊'}</div>
            <div style={{ display: 'inline-block', padding: '5px 14px', borderRadius: '999px', background: 'rgba(255,215,0,0.12)', color: '#ffd700', fontSize: '12px', fontWeight: 700, marginBottom: '12px' }}>
              {result.prize === '5G GOLD' ? '😅 Tiada Hadiah' : '🏆 ANDA MENANG!'}
            </div>
            <h2 style={{ fontSize: '36px', fontWeight: 900, color: '#ffd700', marginBottom: '8px' }}>{result.prize}</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '20px', lineHeight: 1.6 }}>
              {result.message}
            </p>
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '14px', padding: '14px', marginBottom: '18px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Claim ID</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#4facfe', fontFamily: 'monospace' }}>{result.claimId}</div>
            </div>
            {result.prize !== '5G GOLD' && (
              <>
                <p style={{ color: '#ff9999', fontSize: '13px', marginBottom: '16px', lineHeight: 1.5 }}>
                  ⏳ Sila screenshot gambar kemenangan dan hantar ke WhatsApp 01133388859.
                </p>
                <button
                  onClick={claimWhatsApp}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 28px', borderRadius: '999px', background: '#25D366', color: '#fff', fontSize: '16px', fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(37,211,102,0.3)' }}
                >
                  📱 WhatsApp Claim
                </button>
              </>
            )}
          </div>
        )}

        {/* Prizes Legend */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,215,0,0.08)', borderRadius: '18px', padding: '20px', animation: 'slideUp 0.9s ease' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffd700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>🏆 Senarai Hadiah & Odds</div>
          <div style={{ display: 'grid', gap: '8px' }}>
            {prizes.map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: `linear-gradient(135deg, ${p.colorPrimary}, ${p.colorSecondary})` }} />
                <span style={{ flex: 1, fontSize: '14px', fontWeight: 700 }}>{p.name}</span>
                <div style={{ flex: 1, height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${p.probability}%`, height: '100%', background: `linear-gradient(90deg, ${p.colorPrimary}, ${p.colorSecondary})`, borderRadius: '3px' }} />
                </div>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffd700', minWidth: '35px', textAlign: 'right' }}>{p.probability}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* T&C */}
        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: 'rgba(255,255,255,0.2)', lineHeight: 1.6 }}>
          * Setiap participant hanya layak 1 spin. Keputusan adalah muktamad.
        </p>
      </div>
    </main>
  )
}
