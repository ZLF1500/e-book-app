import crypto from "crypto"

const SECRET_KEY =
  process.env.AUTH_SECRET || "rsjd-atma-husada-perpusahm-secret-key-super-secure-2026"

/**
 * Hash password menggunakan algoritma scrypt native Node.js dengan salt acak 16 byte.
 * Menghasilkan string terenkripsi aman berformat "salt:hash".
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex")
  const hash = crypto.scryptSync(password, salt, 64).toString("hex")
  return `${salt}:${hash}`
}

/**
 * Memeriksa apakah password yang tersimpan sudah dalam format hash scrypt.
 */
export function isPasswordHashed(storedPassword?: string | null): boolean {
  if (!storedPassword) return false
  const parts = storedPassword.split(":")
  return parts.length === 2 && parts[0].length === 32 && parts[1].length === 128
}

/**
 * Memverifikasi kata sandi dengan perlindungan timing-attack.
 * Mendukung backward-compatibility untuk akun lama (plaintext) agar transisi mulus.
 */
export function verifyPassword(password: string, storedPassword?: string | null): boolean {
  if (!storedPassword || !password) return false

  // 1. Cek format hash scrypt modern "salt:hash"
  if (isPasswordHashed(storedPassword)) {
    try {
      const [salt, key] = storedPassword.split(":")
      const keyBuffer = Buffer.from(key, "hex")
      const testBuffer = crypto.scryptSync(password, salt, 64)
      return crypto.timingSafeEqual(keyBuffer, testBuffer)
    } catch {
      return false
    }
  }

  // 2. Backward compatibility untuk akun legacy/seed lama yang belum ter-hash
  // Menggunakan perbandingan konstan untuk keamanan tambahan
  try {
    const a = Buffer.from(password)
    const b = Buffer.from(storedPassword)
    if (a.length !== b.length) return false
    return crypto.timingSafeEqual(a, b)
  } catch {
    return password === storedPassword
  }
}

/**
 * Membuat token sesi yang ditandatangani secara kriptografis (HMAC-SHA256).
 * Struktur token: base64url(payload).base64url(hmacSignature)
 */
export function createSignedToken<T extends object>(payload: T): string {
  const dataStr = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const signature = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(dataStr)
    .digest("base64url")

  return `${dataStr}.${signature}`
}

/**
 * Memverifikasi integritas dan keaslian token sesi.
 * Mengembalikan payload objek jika valid, atau null jika tanda tangan rusak / dimanipulasi.
 */
export function verifySignedToken<T extends object>(token?: string | null): T | null {
  if (!token || typeof token !== "string") return null

  const parts = token.split(".")
  if (parts.length !== 2) return null

  const [dataStr, signature] = parts
  if (!dataStr || !signature) return null

  try {
    const expectedSignature = crypto
      .createHmac("sha256", SECRET_KEY)
      .update(dataStr)
      .digest("base64url")

    const sigBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expectedSignature)

    if (sigBuffer.length !== expectedBuffer.length) {
      return null
    }

    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null
    }

    const jsonStr = Buffer.from(dataStr, "base64url").toString("utf-8")
    return JSON.parse(jsonStr) as T
  } catch {
    return null
  }
}
