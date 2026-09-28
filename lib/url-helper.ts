/**
 * Helper untuk menentukan Base URL / Origin aplikasi secara dinamis dan akurat,
 * baik saat diakses lewat localhost, LAN IP (192.168.x.x), Cloudflare Tunnel (*.trycloudflare.com),
 * Ngrok, maupun reverse proxy lainnya.
 */

let cachedTunnelUrl: string | null = null
let lastTunnelFetch = 0

/**
 * Mendeteksi URL Cloudflare Tunnel (*.trycloudflare.com) yang sedang berjalan
 * secara langsung dari cloudflared metrics internal (port 20241).
 */
export async function getActiveTunnelUrl(): Promise<string | null> {
  const now = Date.now()
  if (cachedTunnelUrl && now - lastTunnelFetch < 15000) {
    return cachedTunnelUrl
  }

  try {
    const res = await fetch("http://127.0.0.1:20241/metrics", {
      signal: AbortSignal.timeout(600),
    })
    if (res.ok) {
      const text = await res.text()
      const match = text.match(/userHostname="([^"]+)"/)
      if (match && match[1]) {
        cachedTunnelUrl = match[1]
        lastTunnelFetch = now
        return match[1]
      }
    }
  } catch {
    // Cloudflared metrics tidak aktif / tidak ada tunnel
  }

  return cachedTunnelUrl
}

export function getAppBaseUrl(request?: Request): string {
  if (request) {
    // 1. Cek header X-Forwarded-Host (diberikan oleh Cloudflare Tunnel, Ngrok, Nginx, Traefik, dll.)
    const forwardedHost = request.headers.get("x-forwarded-host")
    const forwardedProto = request.headers.get("x-forwarded-proto")

    if (forwardedHost) {
      // Ambil entri pertama jika terdapat multiple comma-separated proxy
      const cleanHost = forwardedHost.split(",")[0].trim()
      const proto =
        forwardedProto ||
        (cleanHost.includes("localhost") || cleanHost.startsWith("127.0.0.1") ? "http" : "https")
      return `${proto}://${cleanHost}`
    }

    // 2. Cek Host header langsung
    const hostHeader = request.headers.get("host")
    if (hostHeader) {
      const cleanHost = hostHeader.split(",")[0].trim()
      const proto =
        forwardedProto ||
        (cleanHost.includes("localhost") || cleanHost.startsWith("127.0.0.1") ? "http" : "https")
      return `${proto}://${cleanHost}`
    }

    // 3. Cek Origin atau Referer header dari client request
    const origin = request.headers.get("origin")
    if (origin && !origin.includes("localhost") && !origin.includes("127.0.0.1")) {
      return origin.replace(/\/$/, "")
    }

    const referer = request.headers.get("referer")
    if (referer) {
      try {
        const refUrl = new URL(referer)
        return refUrl.origin
      } catch {
        // ignore
      }
    }
  }

  // 4. Jika NEXT_PUBLIC_APP_URL diatur spesifik di environment (bukan default localhost:3000)
  if (
    process.env.NEXT_PUBLIC_APP_URL &&
    process.env.NEXT_PUBLIC_APP_URL.trim() !== "" &&
    !process.env.NEXT_PUBLIC_APP_URL.includes("localhost")
  ) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
  }

  // 5. Fallback ke request.url jika ada
  if (request) {
    try {
      const parsed = new URL(request.url)
      return parsed.origin
    } catch {
      // ignore
    }
  }

  // 6. Default fallback
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000"
}

/**
 * Membangun URL redirect absolut yang aman, memastikan pengguna diarahkan kembali
 * ke origin/domain tunnel mereka saat ini dan tidak mental ke localhost:3000.
 */
export function getSafeRedirectUrl(
  targetPath: string,
  request?: Request,
  forcedOrigin?: string
): URL {
  const origin = forcedOrigin || getAppBaseUrl(request)
  const cleanPath = targetPath.startsWith("/") ? targetPath : `/${targetPath}`
  return new URL(cleanPath, origin)
}
