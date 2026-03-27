/**
 * In-Memory Database Store
 * Production would use PostgreSQL/MySQL via Prisma
 * This provides the same anti-abuse logic as a real database
 */

export interface Prize {
  id: string
  name: string
  probability: number
  colorPrimary: string
  colorSecondary: string
  isActive: boolean
}

export interface WhitelistEntry {
  id: string
  name: string
  whatsappNumber: string
  agentId: string
  isActive: boolean
}

export interface SpinRecord {
  id: string
  whatsappNumber: string
  agentId: string
  prizeId: string
  prizeName: string
  deviceFingerprint: string
  ipAddress: string
  userAgent: string
  spunAt: Date
  claimStatus: 'pending' | 'claimed' | 'rejected'
  claimedAt?: Date
}

export interface EventSettings {
  eventTitle: string
  claimInstructions: string
  claimWhatsapp: string
  isActive: boolean
}

export interface Admin {
  id: string
  username: string
  passwordHash: string
  name: string
}

// Seed data
const DEFAULT_PRIZES: Prize[] = [
  { id: '1', name: 'RM100', probability: 93, colorPrimary: '#FFD700', colorSecondary: '#FFA500', isActive: true },
  { id: '2', name: 'RM288', probability: 5, colorPrimary: '#FF6B6B', colorSecondary: '#FF8E53', isActive: true },
  { id: '3', name: 'RM388', probability: 1, colorPrimary: '#8E2DE2', colorSecondary: '#FF6FD8', isActive: true },
  { id: '4', name: 'RM588', probability: 1, colorPrimary: '#00C6FF', colorSecondary: '#0072FF', isActive: true },
  { id: '5', name: '5G GOLD', probability: 0, colorPrimary: '#F7971E', colorSecondary: '#FFD200', isActive: true },
]

const DEFAULT_SETTINGS: EventSettings = {
  eventTitle: '🎡 CM8 Lucky Wheel Event',
  claimInstructions: 'Sila screenshot gambar kemenangan anda dan hantar ke WhatsApp 01133388859.',
  claimWhatsapp: '601133388859',
  isActive: true,
}

// Default admin: admin / admin123
const DEFAULT_ADMIN: Admin = {
  id: 'admin-1',
  username: 'admin',
  // bcrypt hash of 'admin123'
  passwordHash: '$2a$10$izNGSSgdSuP0jytbCcV4R.ceTt7DsL3x3rPb3z.h8Cnn78PUdsyJm',
  name: 'Super Admin',
}

// In-memory store
class Database {
  private prizes: Map<string, Prize> = new Map()
  private whitelist: Map<string, WhitelistEntry> = new Map()
  private spinRecords: Map<string, SpinRecord> = new Map()
  private settings: EventSettings = { ...DEFAULT_SETTINGS }
  private admins: Map<string, Admin> = new Map([[DEFAULT_ADMIN.id, DEFAULT_ADMIN]])

  constructor() {
    // Initialize with seed prizes
    DEFAULT_PRIZES.forEach(p => this.prizes.set(p.id, p))
    // Add some sample whitelist entries
    this.addWhitelistEntry('Garry', '60178182320', 'Garry01')
    this.addWhitelistEntry('Ahmad', '60121234567', 'Ahmad123')
    this.addWhitelistEntry('CyberJR', '60113338859', 'CyberSlotAdmin')
  }

  // ===== PRIZES =====
  getPrizes(): Prize[] {
    return Array.from(this.prizes.values()).filter(p => p.isActive)
  }

  getPrizeById(id: string): Prize | undefined {
    return this.prizes.get(id)
  }

  updatePrize(id: string, data: Partial<Prize>): Prize | null {
    const prize = this.prizes.get(id)
    if (!prize) return null
    const updated = { ...prize, ...data }
    this.prizes.set(id, updated)
    return updated
  }

  // ===== WHITELIST =====
  getWhitelist(): WhitelistEntry[] {
    return Array.from(this.whitelist.values())
  }

  getActiveWhitelist(): WhitelistEntry[] {
    return Array.from(this.whitelist.values()).filter(w => w.isActive)
  }

  isInWhitelist(whatsapp: string, agentId: string): WhitelistEntry | null {
    const entry = Array.from(this.whitelist.values()).find(
      w => w.whatsappNumber === whatsapp && w.agentId === agentId && w.isActive
    )
    return entry || null
  }

  addWhitelistEntry(name: string, whatsappNumber: string, agentId: string): WhitelistEntry {
    const id = `wl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const entry: WhitelistEntry = { id, name, whatsappNumber, agentId, isActive: true }
    this.whitelist.set(id, entry)
    return entry
  }

  updateWhitelistEntry(id: string, data: Partial<WhitelistEntry>): WhitelistEntry | null {
    const entry = this.whitelist.get(id)
    if (!entry) return null
    const updated = { ...entry, ...data }
    this.whitelist.set(id, updated)
    return updated
  }

  deleteWhitelistEntry(id: string): boolean {
    return this.whitelist.delete(id)
  }

  // ===== SPIN RECORDS (Anti-Abuse) =====
  hasSpun(whatsappNumber: string, agentId: string): boolean {
    return Array.from(this.spinRecords.values()).some(
      r => r.whatsappNumber === whatsappNumber && r.agentId === agentId
    )
  }

  addSpinRecord(
    whatsappNumber: string,
    agentId: string,
    prizeId: string,
    prizeName: string,
    deviceFingerprint: string,
    ipAddress: string,
    userAgent: string
  ): SpinRecord {
    const id = `spin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const record: SpinRecord = {
      id,
      whatsappNumber,
      agentId,
      prizeId,
      prizeName,
      deviceFingerprint,
      ipAddress,
      userAgent,
      spunAt: new Date(),
      claimStatus: 'pending',
    }
    this.spinRecords.set(id, record)
    return record
  }

  getSpinRecords(): SpinRecord[] {
    return Array.from(this.spinRecords.values()).sort(
      (a, b) => b.spunAt.getTime() - a.spunAt.getTime()
    )
  }

  getSpinRecordsByPrize(): Record<string, SpinRecord[]> {
    const grouped: Record<string, SpinRecord[]> = {}
    this.spinRecords.forEach(r => {
      if (!grouped[r.prizeName]) grouped[r.prizeName] = []
      grouped[r.prizeName].push(r)
    })
    return grouped
  }

  updateSpinClaimStatus(id: string, status: 'pending' | 'claimed' | 'rejected'): SpinRecord | null {
    const record = this.spinRecords.get(id)
    if (!record) return null
    record.claimStatus = status
    if (status === 'claimed') record.claimedAt = new Date()
    this.spinRecords.set(id, record)
    return record
  }

  // ===== STATS =====
  getStats(): { totalEligible: number; totalSpun: number; byPrize: Record<string, number>; pendingClaims: number } {
    const spun = this.getSpinRecords()
    const byPrize: Record<string, number> = {}
    spun.forEach(r => { byPrize[r.prizeName] = (byPrize[r.prizeName] || 0) + 1 })
    return {
      totalEligible: this.getActiveWhitelist().length,
      totalSpun: spun.length,
      byPrize,
      pendingClaims: spun.filter(r => r.claimStatus === 'pending').length,
    }
  }

  // ===== SETTINGS =====
  getSettings(): EventSettings {
    return { ...this.settings }
  }

  updateSettings(data: Partial<EventSettings>): EventSettings {
    this.settings = { ...this.settings, ...data }
    return this.getSettings()
  }

  // ===== ADMIN =====
  getAdmin(username: string): Admin | undefined {
    return Array.from(this.admins.values()).find(a => a.username === username)
  }

  // ===== SPIN LOGIC (Server-side weighted random) =====
  determinePrize(): { prizeId: string; prizeName: string } {
    const prizes = this.getPrizes()
    const total = prizes.reduce((sum, p) => sum + p.probability, 0)
    if (total === 0) {
      // Default to RM100 if no prizes have probability
      return { prizeId: prizes[0].id, prizeName: prizes[0].name }
    }
    let random = Math.random() * total
    for (const prize of prizes) {
      random -= prize.probability
      if (random <= 0) {
        return { prizeId: prize.id, prizeName: prize.name }
      }
    }
    // Fallback to last prize
    const last = prizes[prizes.length - 1]
    return { prizeId: last.id, prizeName: last.name }
  }
}

// Singleton instance
export const db = new Database()
