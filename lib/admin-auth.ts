import { cookies, headers } from "next/headers"
import { queryOne } from "@/lib/db"
import { verifySignedToken } from "@/lib/auth-crypto"

export interface AdminUser {
  id: number
  name: string
  email: string
  role: "admin" | "super_admin"
  isVerified: boolean
  avatarUrl: string | null
}

export type AdminAuthResult =
  | { authorized: true; user: AdminUser; isSuperAdmin: boolean }
  | { authorized: false; error: string; status: number }

/**
 * Memverifikasi apakah request berasal dari sesi admin atau super_admin yang valid di MariaDB.
 */
export async function verifyAdminSession(
  requireSuperAdmin = false
): Promise<AdminAuthResult> {
  try {
    const cookieStore = await cookies()
    const headerStore = await headers()

    let userId: number | null = null

    // 1. Cek token sesi kriptografis dari cookie atau header Authorization
    const sessionToken =
      cookieStore.get("rsjd_session_token")?.value ||
      headerStore.get("authorization")?.replace(/^Bearer\s+/i, "")

    if (sessionToken) {
      const decoded = verifySignedToken<{ id: number; email: string }>(sessionToken)
      if (decoded?.id) {
        userId = decoded.id
      }
    }

    // 2. Fallback: jika sessionToken tidak ada (misal di drop browser di HTTP IP VPS/sslip.io),
    // periksa cookie rsjd_auth_user yang diset aplikasi
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

    // 3. Fallback: periksa header identitas x-user-id dari frontend admin
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

    const user = await queryOne<AdminUser>(
      "SELECT id, name, email, role, isVerified, avatarUrl FROM users WHERE id = ? AND isActive = 1 LIMIT 1",
      [userId]
    )

    if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
      return {
        authorized: false,
        error: "Akses ditolak. Fitur ini hanya dapat diakses oleh Administrator resmi perpustakaan.",
        status: 403,
      }
    }

    if (requireSuperAdmin && user.role !== "super_admin") {
      return {
        authorized: false,
        error: "Akses ditolak. Tindakan ini hanya dapat dilakukan oleh Super Administrator.",
        status: 403,
      }
    }

    return {
      authorized: true,
      user,
      isSuperAdmin: user.role === "super_admin",
    }
  } catch (err) {
    console.error("Admin session verification error:", err)
    return {
      authorized: false,
      error: "Terjadi kesalahan saat memvalidasi sesi keamanan.",
      status: 500,
    }
  }
}
