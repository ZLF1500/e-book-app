import { cookies } from "next/headers"
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
    const sessionToken = cookieStore.get("rsjd_session_token")?.value

    if (!sessionToken) {
      return {
        authorized: false,
        error: "Sesi tidak ditemukan. Silakan masuk terlebih dahulu.",
        status: 401,
      }
    }

    const decoded = verifySignedToken<{ id: number; email: string }>(sessionToken)
    if (!decoded?.id) {
      return {
        authorized: false,
        error: "Token sesi tidak valid atau telah kedaluwarsa.",
        status: 401,
      }
    }

    const user = await queryOne<SessionUser>(
      "SELECT id, name, email, role, isVerified, avatarUrl FROM users WHERE id = ? AND isActive = 1 LIMIT 1",
      [decoded.id]
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
