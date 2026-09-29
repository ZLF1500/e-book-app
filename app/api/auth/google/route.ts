import { NextResponse } from "next/server"
import { getAppBaseUrl, getSafeRedirectUrl } from "@/lib/url-helper"
import { isSecureCookie } from "@/lib/cookie-helper"

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const baseUrl = getAppBaseUrl(request)
  const isHttps = isSecureCookie(request)

  const { searchParams } = new URL(request.url)
  const returnTo = searchParams.get("redirect") || "/"

  // Deteksi apakah sedang diakses via quick tunnel publik dengan subdomain acak
  const isRandomQuickTunnel =
    baseUrl.includes("trycloudflare.com") ||
    baseUrl.includes("loca.lt") ||
    baseUrl.includes("ngrok")

  // Redirect URI yang didaftarkan di Google Cloud Console
  // 1. Jika GOOGLE_REDIRECT_URI diatur di .env -> gunakan itu.
  // 2. Jika diakses via quick tunnel acak (trycloudflare.com) -> gunakan "http://localhost:3000/api/auth/google/callback"
  //    agar tidak terjadi "Error 400: redirect_uri_mismatch" di Google Console, karena domain trycloudflare
  //    selalu berubah-ubah. Origin tunnel asli tetap disimpan di dalam parameter state dan akan otomatis
  //    di-redirect balik ke tunnel setelah login berhasil!
  // 3. Jika domain biasa/tetap -> gunakan `${baseUrl}/api/auth/google/callback`.
  const defaultRedirectUri = isRandomQuickTunnel
    ? "http://localhost:3000/api/auth/google/callback"
    : `${baseUrl}/api/auth/google/callback`

  const redirectUri = process.env.GOOGLE_REDIRECT_URI || defaultRedirectUri

  // Jika Google OAuth credentials belum dikonfigurasi di .env
  if (!clientId || clientId.trim() === "" || clientId.includes("your-")) {
    return NextResponse.redirect(
      getSafeRedirectUrl("/masuk?error=google_not_configured", request, baseUrl)
    )
  }

  // State terstruktur: menyimpan nonce CSRF, origin request asli (misal URL tunnel), target halaman, dan redirectUri
  const statePayload = {
    nonce: Math.random().toString(36).substring(2, 15),
    origin: baseUrl,
    returnTo: returnTo.startsWith("/") ? returnTo : "/",
    redirectUri,
  }
  const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url")

  // Buat Google OAuth 2.0 Authorization URL
  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  googleAuthUrl.searchParams.set("client_id", clientId)
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri)
  googleAuthUrl.searchParams.set("response_type", "code")
  googleAuthUrl.searchParams.set("scope", "openid email profile")
  googleAuthUrl.searchParams.set("access_type", "offline")
  googleAuthUrl.searchParams.set("prompt", "consent")
  googleAuthUrl.searchParams.set("state", state)

  const response = NextResponse.redirect(googleAuthUrl.toString())

  // Set cookies untuk verifikasi CSRF dan pemulihan sesi callback
  response.cookies.set("rsjd_oauth_state", state, {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    maxAge: 60 * 10, // 10 menit
    path: "/",
  })

  response.cookies.set("rsjd_oauth_origin", baseUrl, {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  })

  response.cookies.set("rsjd_oauth_redirect_uri", redirectUri, {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  })

  return response
}
