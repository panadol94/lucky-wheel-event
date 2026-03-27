/**
 * Simple in-memory rate limiter
 * For production, use Redis or similar
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const limits = new Map<string, RateLimitEntry>()

export function rateLimit(
  key: string,
  options: { max: number; windowMs: number }
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = limits.get(key)

  if (!entry || now > entry.resetAt) {
    limits.set(key, { count: 1, resetAt: now + options.windowMs })
    return { success: true, remaining: options.max - 1, resetAt: now + options.windowMs }
  }

  if (entry.count >= options.max) {
    return { success: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { success: true, remaining: options.max - entry.count, resetAt: entry.resetAt }
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of limits.entries()) {
    if (now > entry.resetAt) limits.delete(key)
  }
}, 60000)
