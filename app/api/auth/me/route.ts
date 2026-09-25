import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { queryOne } from "@/lib/db"
import { verifySignedToken, createSignedToken } from "@/lib/auth-crypto"

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

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("rsjd_session_token")?.value

    // 1. Verifikasi tanda tangan kriptografis dari cookie HttpOnly "rsjd_session_token"
    if (!sessionToken) {
      return NextResponse.json({ success: false, user: null })
    }

    const decodedPayload = verifySignedToken<SessionPayload>(sessionToken)
    if (!decodedPayload?.id || !decodedPayload?.email) {
      const response = NextResponse.json({ success: false, user: null })
      response.cookies.delete("rsjd_session_token")
      response.cookies.delete("rsjd_auth_user")
      return response
    }

    const verifiedUserId = decodedPayload.id

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

    // Perbarui cookie session HttpOnly
    response.cookies.set("rsjd_session_token", newSessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 hari
      path: "/",
    })

    // Perbarui cache profil client
    response.cookies.set("rsjd_auth_user", encodeURIComponent(JSON.stringify(safeUser)), {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
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
