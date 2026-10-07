/**
 * In-memory sliding window rate limiter.
 * Note: For multi-instance production environments, replace with a distributed store
 * such as Redis / Upstash Redis.
 */

interface RateLimitRecord {
  timestamps: number[]
}

const rateLimitMap = new Map<string, RateLimitRecord>()

// Periodically clean up stale entries (every 5 minutes)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [ip, record] of rateLimitMap.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 60_000)
      if (record.timestamps.length === 0) {
        rateLimitMap.delete(ip)
      }
    }
  }, 300_000)
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  retryAfterSeconds: number
}

export function checkRateLimit(
  ip: string,
  limit: number = 10,
  windowMs: number = 60_000
): RateLimitResult {
  const now = Date.now()
  let record = rateLimitMap.get(ip)

  if (!record) {
    record = { timestamps: [] }
    rateLimitMap.set(ip, record)
  }

  // Filter timestamps within current window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs)

  if (record.timestamps.length >= limit) {
    const oldestTimestamp = record.timestamps[0]
    const resetTime = oldestTimestamp + windowMs
    const retryAfterSeconds = Math.max(1, Math.ceil((resetTime - now) / 1000))

    return {
      success: false,
      remaining: 0,
      retryAfterSeconds,
    }
  }

  record.timestamps.push(now)
  return {
    success: true,
    remaining: limit - record.timestamps.length,
    retryAfterSeconds: 0,
  }
}
