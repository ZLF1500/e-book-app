import { NextResponse } from "next/server"
import { queryOne, execute } from "@/lib/db"
import { verifyUserSession } from "@/lib/user-auth"

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

export async function POST(request: Request) {
  try {
    const auth = await verifyUserSession()
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: "Silakan masuk terlebih dahulu untuk mengubah foto profil." },
        { status: 401 }
      )
    }

    const userId = auth.user.id

    const body = await request.json()
    const { avatarUrl } = body

    if (!avatarUrl || typeof avatarUrl !== "string") {
      return NextResponse.json(
        { success: false, error: "Data berkas foto profil tidak valid." },
        { status: 400 }
      )
    }

    const cleanAvatar = avatarUrl.trim()

    // Batasi ukuran maksimal base64 (maksimal ~5MB)
    if (cleanAvatar.length > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "Ukuran foto terlalu besar. Maksimal 5MB." },
        { status: 400 }
      )
    }

    // Update avatarUrl di database MySQL (Native Query)
    await execute("UPDATE users SET avatarUrl = ? WHERE id = ?", [cleanAvatar, userId])

    // Ambil data user terbaru
    const dbUser = await queryOne<UserRow>(
      "SELECT id, name, email, nik, phone, institution, isVerified, role, avatarUrl FROM users WHERE id = ? LIMIT 1",
      [userId]
    )

    if (!dbUser) {
      return NextResponse.json(
        { success: false, error: "Akun pengguna tidak ditemukan di database." },
        { status: 404 }
      )
    }

    const safeUser = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      nik: dbUser.nik,
      phone: dbUser.phone,
      institution: dbUser.institution,
      isVerified: Boolean(dbUser.isVerified),
      role: dbUser.role,
      avatarUrl: dbUser.avatarUrl,
    }

    const response = NextResponse.json({
      success: true,
      message: "Foto profil berhasil diperbarui.",
      user: safeUser,
    })

    // Perbarui cache profil client di cookie
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
      { success: false, error: `Gagal memperbarui foto profil: ${errorMsg}` },
      { status: 500 }
    )
  }
}
