import { cookies } from "next/headers"
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

    const user = await queryOne<AdminUser>(
      "SELECT id, name, email, role, isVerified, avatarUrl FROM users WHERE id = ? AND isActive = 1 LIMIT 1",
      [decoded.id]
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
