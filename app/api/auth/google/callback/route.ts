import { NextResponse } from "next/server"
import https from "https"
import { queryOne, execute } from "@/lib/db"
import { createSignedToken } from "@/lib/auth-crypto"

interface UserRow {
  id: number
  name: string
  email: string
  nik: string | null
  phone: string | null
  institution: string | null
  isVerified: number | boolean
  role: "member" | "admin"
  avatarUrl: string | null
}

function postFormHttps(url: string, params: Record<string, string>): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams(params).toString()
    const parsed = new URL(url)
    const req = https.request(
      {
        hostname: parsed.hostname,
        port: 443,
        path: parsed.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(postData),
        },
        timeout: 10000,
      },
      (res) => {
        let body = ""
        res.on("data", (chunk) => (body += chunk))
        res.on("end", () => resolve({ status: res.statusCode || 200, text: body }))
      }
    )
    req.on("error", reject)
    req.on("timeout", () => {
      req.destroy()
      reject(new Error("Request timed out"))
    })
    req.write(postData)
    req.end()
  })
}

function getJsonHttps(url: string, bearerToken: string): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const req = https.request(
      {
        hostname: parsed.hostname,
        port: 443,
        path: parsed.pathname,
        method: "GET",
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          Accept: "application/json",
        },
        timeout: 10000,
      },
      (res) => {
        let body = ""
        res.on("data", (chunk) => (body += chunk))
        res.on("end", () => resolve({ status: res.statusCode || 200, text: body }))
      }
    )
    req.on("error", reject)
    req.on("timeout", () => {
      req.destroy()
      reject(new Error("Request timed out"))
    })
    req.end()
  })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/masuk?error=${encodeURIComponent(error || "google_code_missing")}`, request.url)
    )
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const redirectUri = `${appUrl}/api/auth/google/callback`

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/masuk?error=google_not_configured", request.url))
  }

  try {
    // 1. Exchange authorization code for tokens (with https fallback)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let tokenData: any = null
    try {
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      })

      if (!tokenResponse.ok) {
        const errBody = await tokenResponse.text().catch(() => "")
        console.warn("Google token exchange error:", tokenResponse.status, errBody)
        return NextResponse.redirect(new URL("/masuk?error=google_token_failed", request.url))
      }

      tokenData = await tokenResponse.json()
    } catch (fetchErr) {
      console.warn("Fetch failed on token exchange, falling back to https.request:", fetchErr)
      const res = await postFormHttps("https://oauth2.googleapis.com/token", {
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      })
      if (res.status !== 200) {
        console.warn("Google token fallback error:", res.status, res.text)
        return NextResponse.redirect(new URL("/masuk?error=google_token_failed", request.url))
      }
      tokenData = JSON.parse(res.text)
    }

    const { access_token, refresh_token, expires_in } = tokenData

    // 2. Fetch user profile from Google UserInfo endpoint (with https fallback)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let profile: any = null
    try {
      const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${access_token}` },
      })

      if (!profileResponse.ok) {
        const errBody = await profileResponse.text().catch(() => "")
        console.warn("Google userinfo error:", profileResponse.status, errBody)
        return NextResponse.redirect(new URL("/masuk?error=google_userinfo_failed", request.url))
      }

      profile = await profileResponse.json()
    } catch (profileFetchErr) {
      console.warn("Fetch failed on userinfo, falling back to https.request:", profileFetchErr)
      const res = await getJsonHttps("https://www.googleapis.com/oauth2/v3/userinfo", access_token)
      if (res.status !== 200) {
        return NextResponse.redirect(new URL("/masuk?error=google_userinfo_failed", request.url))
      }
      profile = JSON.parse(res.text)
    }

    const { sub: googleId, name, email, picture } = profile

    if (!email) {
      return NextResponse.redirect(new URL("/masuk?error=google_email_missing", request.url))
    }

    // 3. Upsert User in MySQL database (Native Query)
    let user = await queryOne<UserRow>(
      "SELECT id, name, email, nik, phone, institution, isVerified, role, avatarUrl FROM users WHERE email = ? LIMIT 1",
      [email]
    )

    const oauthExpires = expires_in ? new Date(Date.now() + expires_in * 1000) : null

    if (!user) {
      // Create new user (unverified by default - user verifies NIK before borrowing)
      const newName = name || "Pengguna Google"
      const newAvatar = picture || null
      const insertResult = await execute(
        "INSERT INTO users (name, email, avatarUrl, role, isVerified) VALUES (?, ?, ?, 'member', 0)",
        [newName, email, newAvatar]
      )

      user = {
        id: insertResult.insertId,
        name: newName,
        email,
        nik: null,
        phone: null,
        institution: null,
        isVerified: 0,
        role: "member",
        avatarUrl: newAvatar,
      }

      await execute(
        "INSERT INTO oauth_accounts (userId, provider, providerAccountId, accessToken, refreshToken, expiresAt) VALUES (?, 'google', ?, ?, ?, ?)",
        [user.id, googleId, access_token, refresh_token || null, oauthExpires]
      )
    } else {
      // Link Google OAuth account if not already linked
      const existingOAuth = await queryOne<{ id: number }>(
        "SELECT id FROM oauth_accounts WHERE provider = 'google' AND providerAccountId = ? LIMIT 1",
        [googleId]
      )

      if (!existingOAuth) {
        await execute(
          "INSERT INTO oauth_accounts (userId, provider, providerAccountId, accessToken, refreshToken, expiresAt) VALUES (?, 'google', ?, ?, ?, ?)",
          [user.id, googleId, access_token, refresh_token || null, oauthExpires]
        )
      } else {
        await execute(
          "UPDATE oauth_accounts SET accessToken = ?, refreshToken = COALESCE(?, refreshToken), expiresAt = ? WHERE id = ?",
          [access_token, refresh_token || null, oauthExpires, existingOAuth.id]
        )
      }

      // Update avatar if not set
      if (!user.avatarUrl && picture) {
        await execute("UPDATE users SET avatarUrl = ? WHERE id = ?", [picture, user.id])
        user.avatarUrl = picture
      }
    }

    // 4. Create redirect response and set secure session cookie
    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      nik: user.nik,
      phone: user.phone,
      institution: user.institution,
      isVerified: Boolean(user.isVerified),
      role: user.role,
      avatarUrl: user.avatarUrl,
    }

    const userPayloadJson = JSON.stringify(userPayload)
    const encodedUser = Buffer.from(userPayloadJson).toString("base64")

    const sessionToken = createSignedToken({
      id: user.id,
      email: user.email,
      role: user.role,
    })

    const redirectUrl = new URL("/?google_success=1", request.url)
    redirectUrl.searchParams.set("auth_data", encodedUser)

    const response = NextResponse.redirect(redirectUrl)

    // Sesi aman HttpOnly untuk autentikasi server-side
    response.cookies.set("rsjd_session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    })

    response.cookies.set("rsjd_auth_user", encodeURIComponent(userPayloadJson), {
      httpOnly: false, // Accessible by client auth-context
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    })

    return response
  } catch (err: unknown) {
    const error = err as Error & { cause?: { code?: string; message?: string } }
    const causeMsg = error.cause?.message || error.cause?.code || ""
    const fullReason = causeMsg ? `${error.message}: ${causeMsg}` : error.message || String(err)
    console.error("[Google OAuth Error]:", error, "Cause:", error.cause)
    const encodedReason = encodeURIComponent(fullReason.slice(0, 120))
    return NextResponse.redirect(
      new URL(`/masuk?error=internal_oauth_error&details=${encodedReason}`, request.url)
    )
  }
}
