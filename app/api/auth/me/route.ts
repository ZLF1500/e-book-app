import { NextResponse } from "next/server"
import { cookies, headers } from "next/headers"
import { queryOne } from "@/lib/db"
import { verifySignedToken, createSignedToken } from "@/lib/auth-crypto"
import { isSecureCookie } from "@/lib/cookie-helper"

interface SessionPayload {
  id: number
  email: string
  role: string
}

interface UserRow {
  id: number
  name: string
  email: string
  nik: string | null
  phone: string | null
  institution: string | null
  isVerified: number | boolean
  role: "member" | "admin" | "super_admin"
  avatarUrl: string | null
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const headerStore = await headers()

    let verifiedUserId: number | null = null

    // 1. Cek session token di cookie atau header Authorization
    const sessionToken =
      cookieStore.get("rsjd_session_token")?.value ||
      headerStore.get("authorization")?.replace(/^Bearer\s+/i, "")

    if (sessionToken) {
      const decodedPayload = verifySignedToken<SessionPayload>(sessionToken)
      if (decodedPayload?.id) {
        verifiedUserId = decodedPayload.id
      }
    }

    // 2. Fallback: jika sessionToken tidak ada (misal di drop browser di HTTP IP VPS/sslip.io),
    // periksa cookie rsjd_auth_user yang diset aplikasi
    if (!verifiedUserId) {
      const authUserCookie = cookieStore.get("rsjd_auth_user")?.value
      if (authUserCookie) {
        try {
          const raw = decodeURIComponent(authUserCookie)
          const parsed = JSON.parse(raw.startsWith("%") ? decodeURIComponent(raw) : raw)
          if (parsed && typeof parsed === "object" && parsed.id) {
            verifiedUserId = Number(parsed.id)
          }
        } catch {}
      }
    }

    // 3. Fallback: periksa header identitas x-user-id
    if (!verifiedUserId) {
      const headerUserId = headerStore.get("x-user-id")
      if (headerUserId) {
        const parsed = parseInt(headerUserId, 10)
        if (!isNaN(parsed) && parsed > 0) verifiedUserId = parsed
      }
    }

    if (!verifiedUserId) {
      return NextResponse.json({ success: false, user: null })
    }

    // 2. Ambil data pengguna otoritatif langsung dari database MySQL (Native Query)
    const dbUser = await queryOne<UserRow>(
      "SELECT id, name, email, nik, phone, institution, isVerified, role, avatarUrl FROM users WHERE id = ? AND isActive = 1 LIMIT 1",
      [verifiedUserId]
    )

    if (!dbUser) {
      const response = NextResponse.json({ success: false, user: null })
      response.cookies.delete("rsjd_session_token")
      response.cookies.delete("rsjd_auth_user")
      return response
    }

    // Data aman - hak akses/role strictly berasal dari database MySQL, BUKAN dari cookie client
    const safeUser = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      nik: dbUser.nik,
      phone: dbUser.phone,
      institution: dbUser.institution,
      isVerified: dbUser.role === "admin" || dbUser.role === "super_admin" ? true : Boolean(dbUser.isVerified),
      role: dbUser.role,
      avatarUrl: dbUser.avatarUrl,
    }

    // Buat/perbarui signed token sesi
    const newSessionToken = createSignedToken({
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
    })

    const response = NextResponse.json({ success: true, user: safeUser })
    const secureFlag = isSecureCookie(request)

    // Perbarui cookie session HttpOnly
    response.cookies.set("rsjd_session_token", newSessionToken, {
      httpOnly: true,
      secure: secureFlag,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 hari
      path: "/",
    })

    // Perbarui cache profil client
    response.cookies.set("rsjd_auth_user", encodeURIComponent(JSON.stringify(safeUser)), {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
      secure: secureFlag,
      httpOnly: false,
    })

    return response
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { success: false, error: `Gagal memverifikasi sesi: ${errorMsg}` },
      { status: 500 }
    )
  }
}
