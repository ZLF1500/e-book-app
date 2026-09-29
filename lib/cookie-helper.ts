/**
 * Helper Konfigurasi Cookie Sesi
 * Menentukan apakah cookie harus diberi flag 'secure: true' atau 'secure: false'.
 * 
 * KRITIS:
 * Pada server produksi yang diakses via HTTP biasa (misal IP VPS atau domain sslip.io tanpa SSL),
 * browser modern (Chrome/Edge/Firefox) akan MENOLAK / MEMBUANG Set-Cookie jika 'secure: true'.
 * Hal ini menyebabkan 'Sesi tidak ditemukan' pada setiap request berikutnya.
 */

export function isSecureCookie(req?: Request): boolean {
  // 1. Prioritas tertinggi: konfigurasi eksplisit di .env
  if (process.env.COOKIE_SECURE === "false") return false
  if (process.env.COOKIE_SECURE === "true") return true

  // 2. Jika request diteruskan via reverse proxy (Nginx, Cloudflare, Caddy), cek header x-forwarded-proto
  if (req) {
    const proto = req.headers.get("x-forwarded-proto")?.toLowerCase()
    if (proto === "https") return true
    if (proto === "http") return false

    // Cek host header: jika localhost / IP lokal / sslip.io via HTTP, matikan secure
    const host = req.headers.get("host")?.toLowerCase() || ""
    if (
      host.includes("localhost") ||
      host.startsWith("127.0.0.1") ||
      host.startsWith("192.168.") ||
      host.startsWith("10.") ||
      host.endsWith(".local")
    ) {
      return false
    }

    try {
      const url = new URL(req.url)
      if (url.protocol === "https:") return true
      if (url.protocol === "http:") return false
    } catch {}
  }

  // 3. Fallback aman default: false agar kompatibel di HTTP IP VPS dan localhost
  return false
}
