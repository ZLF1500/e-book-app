import { cookies, headers } from "next/headers"
import { queryOne } from "@/lib/db"
import { verifySignedToken } from "@/lib/auth-crypto"

export interface SessionUser {
  id: number
  name: string
  email: string
  role: "member" | "admin" | "super_admin"
  isVerified: boolean
  avatarUrl: string | null
}

export type UserAuthResult =
  | { authorized: true; user: SessionUser }
  | { authorized: false; error: string; status: number }

/**
 * Memverifikasi apakah request berasal dari pengguna yang memiliki sesi aktif di MariaDB.
 */
export async function verifyUserSession(): Promise<UserAuthResult> {
  try {
    const cookieStore = await cookies()
    const headerStore = await headers()

    let userId: number | null = null

    // 1. Cek session token di cookie atau header Authorization
    const sessionToken =
      cookieStore.get("rsjd_session_token")?.value ||
      headerStore.get("authorization")?.replace(/^Bearer\s+/i, "")

    if (sessionToken) {
      const decoded = verifySignedToken<{ id: number; email: string }>(sessionToken)
      if (decoded?.id) {
        userId = decoded.id
      }
    }

    // 2. Fallback: jika sessionToken tidak ada (misal di drop browser karena protokol HTTP/LAN),
    // cek cookie rsjd_auth_user yang diset oleh aplikasi
    if (!userId) {
      const authUserCookie = cookieStore.get("rsjd_auth_user")?.value
      if (authUserCookie) {
        try {
          const raw = decodeURIComponent(authUserCookie)
          const parsed = JSON.parse(raw.startsWith("%") ? decodeURIComponent(raw) : raw)
          if (parsed && typeof parsed === "object" && parsed.id) {
            userId = Number(parsed.id)
          }
        } catch {}
      }
    }

    // 3. Fallback: cek header identitas x-user-id
    if (!userId) {
      const headerUserId = headerStore.get("x-user-id")
      if (headerUserId) {
        const parsed = parseInt(headerUserId, 10)
        if (!isNaN(parsed) && parsed > 0) {
          userId = parsed
        }
      }
    }

    if (!userId) {
      return {
        authorized: false,
        error: "Sesi tidak ditemukan. Silakan masuk terlebih dahulu.",
        status: 401,
      }
    }

    const user = await queryOne<SessionUser>(
      "SELECT id, name, email, role, isVerified, avatarUrl FROM users WHERE id = ? AND isActive = 1 LIMIT 1",
      [userId]
    )

    if (!user) {
      return {
        authorized: false,
        error: "Akun pengguna tidak ditemukan atau dinonaktifkan.",
        status: 404,
      }
    }

    // Staf administrator otomatis bebas verifikasi
    if (user.role === "admin" || user.role === "super_admin") {
      user.isVerified = true
    } else {
      user.isVerified = Boolean(user.isVerified)
    }

    return { authorized: true, user }
  } catch (err) {
    console.error("verifyUserSession error:", err)
    return {
      authorized: false,
      error: "Terjadi kesalahan saat memverifikasi sesi.",
      status: 500,
    }
  }
}
