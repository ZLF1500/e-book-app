/**
 * Helper Verifikasi Cloudflare Turnstile Server-Side
 * Memvalidasi token Turnstile ke API resmi Cloudflare.
 */

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

export interface TurnstileVerificationResult {
  success: boolean
  error?: string
}

export async function verifyTurnstileToken(
  token?: string | null,
  remoteIp?: string
): Promise<TurnstileVerificationResult> {
  const secretKey =
    process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || "1x0000000000000000000000000000000AA"

  // 1. Pada mode development, izinkan bypass jika token dummy/dilewati untuk pengujian lokal yang lancar
  const isDev = process.env.NODE_ENV !== "production"
  if (isDev && (!token || token === "dummy-token" || token.startsWith("1x") || token === "test-bypass")) {
    return { success: true }
  }

  if (!token || typeof token !== "string" || !token.trim()) {
    // Jika di development dan tidak ada token, tetap berikan toleransi jika secret key adalah dummy test key
    if (secretKey.startsWith("1x") || secretKey.startsWith("2x")) {
      return { success: true }
    }
    return {
      success: false,
      error: "Verifikasi keamanan anti-bot (Cloudflare Turnstile) belum selesai.",
    }
  }

  try {
    const formData = new URLSearchParams()
    formData.append("secret", secretKey)
    formData.append("response", token.trim())
    if (remoteIp) {
      formData.append("remoteip", remoteIp)
    }

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    })

    if (!response.ok) {
      console.warn("Turnstile verification HTTP error:", response.status)
      // Jika secret key dummy (misal test key resmi Cloudflare 1x0000000000000000000000000000000AA), izinkan lolos di dev
      if (isDev) return { success: true }
      return {
        success: false,
        error: "Gagal memverifikasi respon keamanan Cloudflare. Silakan coba kembali.",
      }
    }

    const data = await response.json()

    if (data.success) {
      return { success: true }
    }

    console.warn("Cloudflare Turnstile verification failed:", data["error-codes"])
    // Pada mode development, jika validasi gagal karena domain mismatch (misal pengujian via LAN 192.168.x.x atau localhost),
    // berikan izin lolos agar pengembang dan tester tidak terblokir
    if (isDev) {
      console.info("Turnstile domain check bypassed for local development/LAN testing.")
      return { success: true }
    }

    return {
      success: false,
      error: "Verifikasi anti-bot gagal. Silakan muat ulang halaman dan coba kembali.",
    }
  } catch (err) {
    console.error("Error connecting to Cloudflare Turnstile:", err)
    if (isDev) return { success: true }
    return {
      success: false,
      error: "Terjadi kendala koneksi saat verifikasi keamanan anti-bot.",
    }
  }
}
