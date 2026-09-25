/**
 * In-Memory Sliding Window Rate Limiter
 * Melindungi endpoint publik (Login & Pengiriman OTP) dari serangan brute force dan flood.
 */

interface RateLimitRecord {
  timestamps: number[]
}

const rateLimitStore = new Map<string, RateLimitRecord>()

// Pembersihan rutin entri yang kedaluwarsa setiap 5 menit
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, record] of rateLimitStore.entries()) {
      // Hapus timestamp lebih dari 15 menit lalu
      const active = record.timestamps.filter((ts) => now - ts < 15 * 60 * 1000)
      if (active.length === 0) {
        rateLimitStore.delete(key)
      } else {
        rateLimitStore.set(key, { timestamps: active })
      }
    }
  }, 5 * 60 * 1000)
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetSeconds: number
}

/**
 * Memeriksa apakah suatu aksi diizinkan berdasarkan batas frekuensi.
 * @param key Identifier unik (misal: "otp:user@email.com" atau "login:192.168.1.1")
 * @param limit Jumlah maksimal request dalam jangka waktu
 * @param windowSeconds Jendela waktu dalam detik
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now()
  const windowMs = windowSeconds * 1000
  const record = rateLimitStore.get(key) || { timestamps: [] }

  // Filter hanya timestamp dalam jendela aktif
  const validTimestamps = record.timestamps.filter((ts) => now - ts < windowMs)

  if (validTimestamps.length >= limit) {
    const oldestTimestamp = validTimestamps[0]
    const resetSeconds = Math.max(1, Math.ceil((oldestTimestamp + windowMs - now) / 1000))
    return {
      allowed: false,
      remaining: 0,
      resetSeconds,
    }
  }

  validTimestamps.push(now)
  rateLimitStore.set(key, { timestamps: validTimestamps })

  return {
    allowed: true,
    remaining: limit - validTimestamps.length,
    resetSeconds: windowSeconds,
  }
}

/**
 * Memeriksa cooldown pengiriman OTP (minimal 60 detik antar pengiriman).
 */
export function checkOtpCooldown(
  identifier: string,
  cooldownSeconds = 60
): { allowed: boolean; waitSeconds: number } {
  const result = checkRateLimit(`otp-cooldown:${identifier.toLowerCase().trim()}`, 1, cooldownSeconds)
  return {
    allowed: result.allowed,
    waitSeconds: result.resetSeconds,
  }
}
