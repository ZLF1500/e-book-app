import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const redirectUri = `${appUrl}/api/auth/google/callback`

  // If Google OAuth credentials are not configured yet in .env
  if (!clientId || clientId.trim() === "" || clientId.includes("your-")) {
    return NextResponse.redirect(new URL("/masuk?error=google_not_configured", request.url))
  }

  // Generate random CSRF state
  const state = Math.random().toString(36).substring(2, 15)

  // Construct Google OAuth 2.0 Authorization URL
  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  googleAuthUrl.searchParams.set("client_id", clientId)
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri)
  googleAuthUrl.searchParams.set("response_type", "code")
  googleAuthUrl.searchParams.set("scope", "openid email profile")
  googleAuthUrl.searchParams.set("access_type", "offline")
  googleAuthUrl.searchParams.set("prompt", "consent")
  googleAuthUrl.searchParams.set("state", state)

  const response = NextResponse.redirect(googleAuthUrl.toString())
  
  // Set state cookie for CSRF verification
  response.cookies.set("rsjd_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  })

  return response
}
