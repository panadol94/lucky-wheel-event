'use client'

import { useState, useEffect, useCallback } from 'react'

// ===== TYPES =====
type Prize = { 
  id: string; 
  name: string; 
  quantity: number; 
  remaining: number; 
  distributed: number;
  colorPrimary: string; 
  colorSecondary: string; 
  isActive?: boolean 
}
type WhitelistEntry = { id: string; name: string; agentId: string; isActive: boolean }
type SpinRecord = { id: string; agentId: string; prizeName: string; prizeId: string; spunAt: string; claimStatus: string; ipAddress: string }
type EventSettings = { eventTitle: string; claimInstructions: string; claimWhatsapp: string; isActive: boolean }
type Stats = { 
  totalEligible: number; 
  totalSpun: number; 
  byPrize: Record<string, number>; 
  pendingClaims: number;
  poolRemaining: number;
  poolTotal: number;
}

type Tab = 'dashboard' | 'prizes' | 'whitelist' | 'spins' | 'settings'

// ===== ADMIN LOGIN PAGE =====
function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setError(data.error || 'Login gagal')
        return
      }
      onLogin()
    } catch {
      setError('Ralat server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg, #0a0010 0%, #1a0520 100%)', padding: '20px' }}>
      <form onSubmit={handleSubmit} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: '24px', padding: '40px', minWidth: '340px', backdropFilter: 'blur(16px)' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🔐</div>
          <h1 style={{ color: '#ffd700', fontSize: '24px', fontWeight: 900, margin: '0 0 4px' }}>Admin Login</h1>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', margin: 0 }}>Lucky Wheel Event Panel</p>
        </div>
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Username</label>
          <input type="text" value={username} onChange={e => setUsername(e.target.value)} required style={{ width: '100%', padding: '13px 15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', padding: '13px 15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        {error && <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,68,68,0.12)', border: '1px solid rgba(255,68,68,0.2)', color: '#ff9999', fontSize: '14px', marginBottom: '14px' }}>{error}</div>}
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', borderRadius: '999px', border: 'none', background: 'linear-gradient(135deg, #ffd700, #ff9800)', color: '#1a0000', fontSize: '16px', fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? '⏳ Loading...' : 'Login →'}
        </button>
        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>Default: admin / admin123</p>
      </form>
    </div>
  )
}

// ===== STATS CARDS =====
function StatCard({ icon, label, value, color, sub }: { icon: string; label: string; value: number | string; color: string; sub?: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,215,0,0.1)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
      <div style={{ fontSize: '28px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '32px', fontWeight: 900, color }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{sub}</div>}
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>{label}</div>
    </div>
  )
}

// ===== BULK IMPORT MODAL =====
function BulkImportModal({ onClose, onImport }: { onClose: () => void; onImport: (entries: { name: string; agentId: string }[]) => void }) {
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<{ name: string; agentId: string }[]>([])

  const parseText = (t: string) => {
    const lines = t.trim().split('\n').filter(l => l.trim())
    return lines.map(line => {
      const parts = line.split(',').map(p => p.trim())
      return { name: parts[0] || '', agentId: parts[1] || '' }
    }).filter(e => e.agentId)
  }

  const handleTextChange = (t: string) => {
    setText(t)
    setPreview(parseText(t))
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#1a0025', border: '1px solid rgba(255,215,0,0.3)', borderRadius: '20px', padding: '28px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ color: '#ffd700', fontSize: '18px', fontWeight: 800, margin: '0 0 8px' }}>📋 Bulk Import Participants</h3>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: '0 0 16px' }}>
          Format: <code style={{ color: '#ffd700' }}>Nama, AgentID</code> (sat baris setiap peserta)
        </p>
        <textarea 
          value={text} 
          onChange={e => handleTextChange(e.target.value)}
          placeholder={"Garry, Garry01\nAhmad, Ahmad123\nCyberJR, CyberSlotAdmin"}
          rows={10}
          style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '13px', fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }}
        />
        {preview.length > 0 && (
          <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
            <strong style={{ color: '#4ade80' }}>{preview.length} peserta akan ditambah:</strong>
            <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
              {preview.slice(0, 5).map((p, i) => <li key={i}>{p.name || '(tiada nama)'} — {p.agentId}</li>)}
              {preview.length > 5 && <li style={{ color: 'rgba(255,255,255,0.3)' }}>...dan {preview.length - 5} lagi</li>}
            </ul>
          </div>
        )}
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '13px', cursor: 'pointer' }}>Batal</button>
          <button onClick={() => { if (preview.length > 0) { onImport(preview); onClose() } }} disabled={preview.length === 0} style={{ padding: '10px 24px', borderRadius: '999px', border: 'none', background: 'linear-gradient(135deg, #ffd700, #ff9800)', color: '#1a0000', fontSize: '14px', fontWeight: 800, cursor: preview.length === 0 ? 'not-allowed' : 'pointer', opacity: preview.length === 0 ? 0.5 : 1 }}>
            Import {preview.length} Peserta
          </button>
        </div>
      </div>
    </div>
  )
}

// ===== MAIN ADMIN PANEL =====
export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [tab, setTab] = useState<Tab>('dashboard')
  const [stats, setStats] = useState<Stats | null>(null)
  const [prizes, setPrizes] = useState<Prize[]>([])
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([])
  const [spins, setSpins] = useState<SpinRecord[]>([])
  const [settings, setSettings] = useState<EventSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showBulkImport, setShowBulkImport] = useState(false)

  // Form states
  const [newWL, setNewWL] = useState({ name: '', agentId: '' })

  // Check auth on mount
  useEffect(() => {
    fetch('/api/admin/auth')
      .then(r => r.json())
      .then(data => { if (data.authenticated) setIsAuthenticated(true) })
      .finally(() => setIsCheckingAuth(false))
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [statsRes, prizesRes, wlRes, spinsRes, settingsRes] = await Promise.all([
        fetch('/api/admin/stats').then(r => r.json()),
        fetch('/api/admin/prizes').then(r => r.json()),
        fetch('/api/admin/whitelist').then(r => r.json()),
        fetch('/api/admin/spins').then(r => r.json()),
        fetch('/api/admin/settings').then(r => r.json()),
      ])
      setStats(statsRes)
      setPrizes(prizesRes.prizes || [])
      setWhitelist(wlRes.whitelist || [])
      setSpins(spinsRes.spins || [])
      setSettings(settingsRes)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) loadData()
  }, [isAuthenticated, loadData])

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3500)
  }

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    setIsAuthenticated(false)
  }

  // Prize actions - update quantity
  const updatePrizeQuantity = async (id: string, quantity: number) => {
    const res = await fetch('/api/admin/prizes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, quantity }),
    })
    if (res.ok) { loadData(); showMsg('success', 'Kuantiti prize updated!') }
    else showMsg('error', 'Gagal update kuantiti')
  }

  const resetPool = async () => {
    if (!confirm('Reset pool? Semua prize akan return ke kuantiti asal. Rekod spin kekal.')) return
    const res = await fetch('/api/admin/prizes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset' }),
    })
    if (res.ok) { loadData(); showMsg('success', 'Pool direset!') }
    else showMsg('error', 'Gagal reset pool')
  }

  // Whitelist actions
  const addWhitelist = async () => {
    if (!newWL.agentId) return showMsg('error', 'Agent ID wajib')
    const res = await fetch('/api/admin/whitelist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newWL),
    })
    if (res.ok) { setNewWL({ name: '', agentId: '' }); loadData(); showMsg('success', 'Entry ditambah!') }
    else showMsg('error', 'Gagal tambah entry')
  }

  const handleBulkImport = async (entries: { name: string; agentId: string }[]) => {
    const res = await fetch('/api/admin/whitelist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
    })
    if (res.ok) { loadData(); const data = await res.json(); showMsg('success', `${data.added} peserta ditambah!`) }
    else showMsg('error', 'Gagal import')
  }

  const toggleWhitelist = async (id: string) => {
    const entry = whitelist.find(w => w.id === id)
    if (!entry) return
    const res = await fetch('/api/admin/whitelist', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isActive: !entry.isActive }),
    })
    if (res.ok) loadData()
    else showMsg('error', 'Gagal update')
  }

  const deleteWhitelist = async (id: string) => {
    if (!confirm('Padam entry ini?')) return
    const res = await fetch(`/api/admin/whitelist?id=${id}`, { method: 'DELETE' })
    if (res.ok) loadData()
    else showMsg('error', 'Gagal padam')
  }

  // Spin actions
  const updateClaimStatus = async (id: string, status: string) => {
    const res = await fetch('/api/admin/spins', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    if (res.ok) loadData()
    else showMsg('error', 'Gagal update status')
  }

  // Settings actions
  const saveSettings = async () => {
    if (!settings) return
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    if (res.ok) showMsg('success', 'Settings saved!')
    else showMsg('error', 'Gagal save settings')
  }

  const exportCSV = () => {
    const headers = ['#', 'Agent ID', 'Hadiah', 'Status', 'Tarikh', 'IP']
    const rows = spins.map((s, i) => [i + 1, s.agentId, s.prizeName, s.claimStatus, s.spunAt, s.ipAddress])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `spin-records-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isCheckingAuth) return null
  if (!isAuthenticated) return <AdminLogin onLogin={() => { setIsAuthenticated(true); loadData() }} />

  const poolDistributed = stats ? stats.poolTotal - stats.poolRemaining : 0

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0a0010 0%, #120208 100%)', color: '#fff', padding: '20px' }}>
      {showBulkImport && <BulkImportModal onClose={() => setShowBulkImport(false)} onImport={handleBulkImport} />}
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <div>
            <h1 style={{ color: '#ffd700', fontSize: '26px', fontWeight: 900, margin: '0 0 4px' }}>🎡 Wheel Admin Panel</h1>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', margin: 0 }}>Fixed Pool System — 84 participants</p>
          </div>
          <button onClick={handleLogout} style={{ padding: '10px 20px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: '13px', cursor: 'pointer' }}>Logout</button>
        </div>

        {/* Message */}
        {msg && (
          <div style={{ padding: '12px 16px', borderRadius: '12px', background: msg.type === 'success' ? 'rgba(37,211,102,0.15)' : 'rgba(255,68,68,0.15)', border: `1px solid ${msg.type === 'success' ? 'rgba(37,211,102,0.3)' : 'rgba(255,68,68,0.3)'}`, color: msg.type === 'success' ? '#4ade80' : '#ff9999', marginBottom: '16px', fontSize: '14px' }}>
            {msg.text}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {(['dashboard', 'prizes', 'whitelist', 'spins', 'settings'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 18px', borderRadius: '12px', border: 'none', background: tab === t ? 'linear-gradient(135deg, #ffd700, #ff9800)' : 'rgba(255,255,255,0.06)', color: tab === t ? '#1a0000' : 'rgba(255,255,255,0.5)', fontWeight: 700, cursor: 'pointer', fontSize: '13px', textTransform: 'capitalize' }}>
              {t === 'dashboard' ? '📊' : t === 'prizes' ? '🎁' : t === 'whitelist' ? '👥' : t === 'spins' ? '🎰' : '⚙️'} {t}
            </button>
          ))}
        </div>

        {/* DASHBOARD TAB */}
        {tab === 'dashboard' && stats && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              <StatCard icon="👥" label="Peserta Layak" value={stats.totalEligible} color="#4facfe" />
              <StatCard icon="🎰" label="Sudah Spin" value={stats.totalSpun} color="#ffd700" />
              <StatCard icon="📦" label="Pool Baki" value={stats.poolRemaining} color="#25D366" sub={`dari ${stats.poolTotal} hadiah`} />
              <StatCard icon="⏳" label="Pending Claim" value={stats.pendingClaims} color="#ff6b6b" />
            </div>

            {/* Pool status bar */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,215,0,0.1)', borderRadius: '18px', padding: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ color: '#ffd700', fontSize: '14px', fontWeight: 800, margin: 0 }}>🏈 Prize Pool Status</h3>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{poolDistributed} / {stats.poolTotal} diagihkan</span>
              </div>
              <div style={{ height: '12px', background: 'rgba(0,0,0,0.5)', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${stats.poolTotal > 0 ? (poolDistributed / stats.poolTotal) * 100 : 0}%`, background: 'linear-gradient(90deg, #ffd700, #ff9800)', borderRadius: '999px', transition: 'width 0.5s' }} />
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
                {prizes.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: `linear-gradient(135deg, ${p.colorPrimary}, ${p.colorSecondary})` }} />
                    <span>{p.name}:</span>
                    <strong style={{ color: '#ffd700' }}>{p.remaining}/{p.quantity}</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Prize distribution */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,215,0,0.1)', borderRadius: '18px', padding: '24px' }}>
              <h3 style={{ color: '#ffd700', fontSize: '16px', fontWeight: 800, margin: '0 0 16px' }}>📊 Keputusan Ikut Hadiah</h3>
              <div style={{ display: 'grid', gap: '10px' }}>
                {prizes.filter(p => p.quantity > 0).map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: `linear-gradient(135deg, ${p.colorPrimary}, ${p.colorSecondary})` }} />
                    <span style={{ flex: 1, fontWeight: 700 }}>{p.name}</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>{stats.byPrize[p.name] || 0}x / {p.quantity}</span>
                    <span style={{ color: '#ffd700', fontWeight: 800 }}>{stats.byPrize[p.name] || 0}x</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PRIZES TAB */}
        {tab === 'prizes' && (
          <div>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,215,0,0.1)', borderRadius: '18px', padding: '24px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ color: '#ffd700', fontSize: '16px', fontWeight: 800, margin: 0 }}>🎁 Fixed Prize Pool</h3>
                <button onClick={resetPool} style={{ padding: '8px 16px', borderRadius: '999px', border: '1px solid rgba(255,215,0,0.3)', background: 'transparent', color: '#ffd700', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>🔄 Reset Pool</button>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: '0 0 16px' }}>Sistem fixed pool — setiap prize ada kuantiti tetap. Prize diagihkan first-come-first-served sehingga habis.</p>
              <div style={{ display: 'grid', gap: '12px' }}>
                {prizes.filter(p => p.quantity > 0 || p.remaining > 0).map(p => (
                  <div key={p.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 80px 80px 60px 40px', gap: '10px', alignItems: 'center', padding: '14px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `linear-gradient(135deg, ${p.colorPrimary}, ${p.colorSecondary})`, border: '1px solid rgba(255,255,255,0.1)' }} />
                    <span style={{ fontWeight: 800, fontSize: '15px' }}>{p.name}</span>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block' }}>Kuantiti</span>
                      <input 
                        type="number" 
                        value={p.quantity} 
                        min={0} 
                        max={1000}
                        onChange={e => updatePrizeQuantity(p.id, Number(e.target.value))}
                        style={{ width: '60px', padding: '6px 8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: '14px', outline: 'none', textAlign: 'center' }} 
                      />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block' }}>Baki</span>
                      <span style={{ fontSize: '18px', fontWeight: 800, color: p.remaining > 0 ? '#4ade80' : '#ff6b6b' }}>{p.remaining}</span>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block' }}>Habis</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#ffd700' }}>{p.distributed}</span>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.remaining > 0 ? '#4ade80' : '#ff6b6b', margin: '0 auto' }} />
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ marginTop: '14px', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Tukar kuantiti akan reset prize pool semasa.</p>
            </div>
          </div>
        )}

        {/* WHITELIST TAB */}
        {tab === 'whitelist' && (
          <div>
            {/* Add form */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,215,0,0.1)', borderRadius: '18px', padding: '20px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ color: '#ffd700', fontSize: '15px', fontWeight: 800, margin: 0 }}>➕ Tambah Participant</h3>
                <button onClick={() => setShowBulkImport(true)} style={{ padding: '8px 16px', borderRadius: '999px', border: '1px solid rgba(37,211,102,0.4)', background: 'rgba(37,211,102,0.1)', color: '#4ade80', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>📋 Bulk Import</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px' }}>
                <input placeholder="Nama (optional)" value={newWL.name} onChange={e => setNewWL({ ...newWL, name: e.target.value })} style={{ padding: '10px 13px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: '14px', outline: 'none' }} />
                <input placeholder="Agent ID" value={newWL.agentId} onChange={e => setNewWL({ ...newWL, agentId: e.target.value })} style={{ padding: '10px 13px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: '14px', outline: 'none' }} />
                <button onClick={addWhitelist} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#25D366', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '16px' }}>+</button>
              </div>
            </div>

            {/* List */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,215,0,0.1)', borderRadius: '18px', padding: '20px' }}>
              <h3 style={{ color: '#ffd700', fontSize: '15px', fontWeight: 800, margin: '0 0 14px' }}>👥 Senarai Participant ({whitelist.length})</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid rgba(255,215,0,0.15)' }}>
                      <th style={{ padding: '10px 8px', textAlign: 'left', color: '#ffd700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nama</th>
                      <th style={{ padding: '10px 8px', textAlign: 'left', color: '#ffd700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agent ID</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center', color: '#ffd700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center', color: '#ffd700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {whitelist.map(w => (
                      <tr key={w.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 8px', fontSize: '14px' }}>{w.name || '-'}</td>
                        <td style={{ padding: '10px 8px', fontSize: '14px', fontWeight: 700 }}>{w.agentId}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                          <button onClick={() => toggleWhitelist(w.id)} style={{ padding: '5px 12px', borderRadius: '999px', border: 'none', background: w.isActive ? 'rgba(37,211,102,0.2)' : 'rgba(255,68,68,0.2)', color: w.isActive ? '#4ade80' : '#ff6b6b', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                            {w.isActive ? 'Aktif' : 'Nonaktif'}
                          </button>
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                          <button onClick={() => deleteWhitelist(w.id)} style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', background: '#ff4444', color: '#fff', fontSize: '11px', cursor: 'pointer' }}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                    {whitelist.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.2)' }}>Tiada participant lagi.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SPINS TAB */}
        {tab === 'spins' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
              <button onClick={exportCSV} style={{ padding: '10px 20px', borderRadius: '999px', border: '1px solid rgba(255,215,0,0.3)', background: 'transparent', color: '#ffd700', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>📥 Export CSV</button>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,215,0,0.1)', borderRadius: '18px', padding: '20px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(255,215,0,0.15)' }}>
                    <th style={{ padding: '10px 8px', textAlign: 'left', color: '#ffd700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>#</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left', color: '#ffd700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agent ID</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left', color: '#ffd700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hadiah</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left', color: '#ffd700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left', color: '#ffd700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Masa</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left', color: '#ffd700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {spins.map((s, i) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px 8px', fontSize: '13px' }}>{i + 1}</td>
                      <td style={{ padding: '10px 8px', fontSize: '13px', fontWeight: 700 }}>{s.agentId}</td>
                      <td style={{ padding: '10px 8px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '999px', background: 'rgba(255,215,0,0.12)', color: '#ffd700', fontSize: '12px', fontWeight: 700 }}>{s.prizeName}</span>
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <select value={s.claimStatus} onChange={e => updateClaimStatus(s.id, e.target.value)} style={{ padding: '5px 10px', borderRadius: '8px', border: 'none', background: s.claimStatus === 'pending' ? 'rgba(255,187,51,0.2)' : s.claimStatus === 'claimed' ? 'rgba(37,211,102,0.2)' : 'rgba(255,68,68,0.2)', color: s.claimStatus === 'pending' ? '#ffbb33' : s.claimStatus === 'claimed' ? '#4ade80' : '#ff6b6b', fontSize: '12px', fontWeight: 700, cursor: 'pointer', outline: 'none' }}>
                          <option value="pending">Pending</option>
                          <option value="claimed">Claimed</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </td>
                      <td style={{ padding: '10px 8px', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{new Date(s.spunAt).toLocaleString('ms-MY')}</td>
                      <td style={{ padding: '10px 8px', fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{s.ipAddress}</td>
                    </tr>
                  ))}
                  {spins.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.2)' }}>Tiada rekod spin lagi.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {tab === 'settings' && settings && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,215,0,0.1)', borderRadius: '18px', padding: '24px' }}>
            <h3 style={{ color: '#ffd700', fontSize: '16px', fontWeight: 800, margin: '0 0 20px' }}>⚙️ Tetapan Event</h3>
            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tajuk Event</label>
                <input value={settings.eventTitle} onChange={e => setSettings({ ...settings!, eventTitle: e.target.value })} style={{ width: '100%', padding: '12px 15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nombor WhatsApp Claim</label>
                <input value={settings.claimWhatsapp} onChange={e => setSettings({ ...settings!, claimWhatsapp: e.target.value })} style={{ width: '100%', padding: '12px 15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Instruksi Claim</label>
                <textarea value={settings.claimInstructions} onChange={e => setSettings({ ...settings!, claimInstructions: e.target.value })} rows={3} style={{ width: '100%', padding: '12px 15px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={settings.isActive} onChange={e => setSettings({ ...settings!, isActive: e.target.checked })} />
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>Event Active (user boleh spin)</span>
                </label>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={saveSettings} style={{ padding: '12px 28px', borderRadius: '999px', border: 'none', background: 'linear-gradient(135deg, #ffd700, #ff9800)', color: '#1a0000', fontSize: '15px', fontWeight: 800, cursor: 'pointer' }}>
                  💾 Save Settings
                </button>
                <button onClick={resetPool} style={{ padding: '12px 28px', borderRadius: '999px', border: '1px solid rgba(255,68,68,0.4)', background: 'transparent', color: '#ff6b6b', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>
                  🔄 Reset Pool
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
