/**
 * In-Memory Database Store
 * Production would use PostgreSQL/MySQL via Prisma
 * Fixed Pool Lucky Wheel System (not probability-based)
 */

export interface Prize {
  id: string
  name: string
  quantity: number       // total available in pool
  remaining: number       // still available to be won
  colorPrimary: string
  colorSecondary: string
  isActive: boolean
}

export interface WhitelistEntry {
  id: string
  name: string
  agentId: string
  isActive: boolean
}

export interface SpinRecord {
  id: string
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

// Seed data - Fixed Pool prizes for 84 participants
// Wheel shows 6 prizes, but only 4 have stock (84 total)
// 80 RM100, 2 RM188, 1 RM288, 1 RM588 = 84 distributed prizes
// RM388 + 5G GOLD = visible on wheel but no stock (quantity 0)
const DEFAULT_PRIZES: Prize[] = [
  { id: '1', name: 'RM100', quantity: 80, remaining: 80, colorPrimary: '#FFD700', colorSecondary: '#FFA500', isActive: true },
  { id: '2', name: 'RM188', quantity: 2, remaining: 2, colorPrimary: '#FF6B6B', colorSecondary: '#FF8E53', isActive: true },
  { id: '3', name: 'RM288', quantity: 1, remaining: 1, colorPrimary: '#8E2DE2', colorSecondary: '#FF6FD8', isActive: true },
  { id: '4', name: 'RM388', quantity: 0, remaining: 0, colorPrimary: '#FF4500', colorSecondary: '#FF8C00', isActive: true },
  { id: '5', name: 'RM588', quantity: 1, remaining: 1, colorPrimary: '#00C6FF', colorSecondary: '#0072FF', isActive: true },
  { id: '6', name: '5G GOLD', quantity: 0, remaining: 0, colorPrimary: '#F7971E', colorSecondary: '#FFD200', isActive: true },
]

const DEFAULT_SETTINGS: EventSettings = {
  eventTitle: '🎡 CM8 Lucky Wheel Event',
  claimInstructions: 'Sila screenshot gambar kemenangan anda dan hantar ke WhatsApp 01133388859.',
  claimWhatsapp: '60113338859',
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
    // Add some sample whitelist entries (agentId only, no whatsapp needed)
    this.addWhitelistEntry('Garry', 'Garry01')
    this.addWhitelistEntry('Ahmad', 'Ahmad123')
    this.addWhitelistEntry('CyberJR', 'CyberSlotAdmin')
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
    // Ensure remaining doesn't exceed quantity
    if (updated.remaining > updated.quantity) {
      updated.remaining = updated.quantity
    }
    this.prizes.set(id, updated)
    return updated
  }

  // Decrement remaining count for a prize
  decrementPrizeRemaining(prizeId: string): boolean {
    const prize = this.prizes.get(prizeId)
    if (!prize || prize.remaining <= 0) return false
    prize.remaining--
    this.prizes.set(prizeId, prize)
    return true
  }

  // Get total prizes remaining in pool
  getTotalRemaining(): number {
    return Array.from(this.prizes.values())
      .filter(p => p.isActive)
      .reduce((sum, p) => sum + p.remaining, 0)
  }

  // Reset pool to initial quantities
  resetPool(): void {
    this.prizes.forEach((prize, id) => {
      const defaultPrize = DEFAULT_PRIZES.find(p => p.id === id)
      if (defaultPrize) {
        prize.remaining = prize.quantity
        this.prizes.set(id, prize)
      }
    })
  }

  // ===== WHITELIST =====
  getWhitelist(): WhitelistEntry[] {
    return Array.from(this.whitelist.values())
  }

  getActiveWhitelist(): WhitelistEntry[] {
    return Array.from(this.whitelist.values()).filter(w => w.isActive)
  }

  isInWhitelist(agentId: string): WhitelistEntry | null {
    const entry = Array.from(this.whitelist.values()).find(
      w => w.agentId.toLowerCase() === agentId.toLowerCase() && w.isActive
    )
    return entry || null
  }

  addWhitelistEntry(name: string, agentId: string): WhitelistEntry {
    const id = `wl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const entry: WhitelistEntry = { id, name, agentId, isActive: true }
    this.whitelist.set(id, entry)
    return entry
  }

  // Bulk add whitelist entries
  addBulkWhitelist(entries: { name: string; agentId: string }[]): WhitelistEntry[] {
    const added: WhitelistEntry[] = []
    entries.forEach(e => {
      // Check if already exists
      const existing = Array.from(this.whitelist.values()).find(
        w => w.agentId.toLowerCase() === e.agentId.toLowerCase()
      )
      if (!existing) {
        added.push(this.addWhitelistEntry(e.name, e.agentId))
      }
    })
    return added
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
  hasSpun(agentId: string): boolean {
    return Array.from(this.spinRecords.values()).some(
      r => r.agentId.toLowerCase() === agentId.toLowerCase()
    )
  }

  addSpinRecord(
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
  getStats(): { 
    totalEligible: number; 
    totalSpun: number; 
    byPrize: Record<string, number>; 
    pendingClaims: number;
    poolRemaining: number;
    poolTotal: number;
  } {
    const spun = this.getSpinRecords()
    const byPrize: Record<string, number> = {}
    spun.forEach(r => { byPrize[r.prizeName] = (byPrize[r.prizeName] || 0) + 1 })
    
    const prizes = Array.from(this.prizes.values()).filter(p => p.isActive)
    const poolTotal = prizes.reduce((sum, p) => sum + p.quantity, 0)
    const poolRemaining = prizes.reduce((sum, p) => sum + p.remaining, 0)
    
    return {
      totalEligible: this.getActiveWhitelist().length,
      totalSpun: spun.length,
      byPrize,
      pendingClaims: spun.filter(r => r.claimStatus === 'pending').length,
      poolRemaining,
      poolTotal,
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

  // ===== SPIN LOGIC (Fixed Pool - FIFO Random) =====
  determinePrize(): { prizeId: string; prizeName: string } | null {
    // Get prizes with remaining stock
    const availablePrizes = this.getPrizes().filter(p => p.remaining > 0)
    
    if (availablePrizes.length === 0) {
      return null // Pool exhausted
    }
    
    // Random selection from available prizes (equal probability among remaining)
    const totalRemaining = availablePrizes.reduce((sum, p) => sum + p.remaining, 0)
    let random = Math.random() * totalRemaining
    
    for (const prize of availablePrizes) {
      random -= prize.remaining
      if (random <= 0) {
        // Decrement the prize remaining count
        this.decrementPrizeRemaining(prize.id)
        return { prizeId: prize.id, prizeName: prize.name }
      }
    }
    
    // Fallback (shouldn't reach here)
    const last = availablePrizes[availablePrizes.length - 1]
    this.decrementPrizeRemaining(last.id)
    return { prizeId: last.id, prizeName: last.name }
  }
}

// Singleton instance
export const db = new Database()
