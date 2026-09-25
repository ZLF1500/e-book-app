import { NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import { queryOne, execute } from "@/lib/db"
import { verifyPassword } from "@/lib/auth-crypto"

export async function POST(request: Request) {
  try {
    // 1. Otorisasi ketat: hanya Super Admin (Owner saat ini) yang berhak mentransfer
    const auth = await verifyAdminSession(true)
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const currentSuperAdmin = auth.user
    const body = await request.json()
    const { targetUserId, password } = body

    if (!targetUserId || typeof targetUserId !== "number") {
      return NextResponse.json(
        { success: false, error: "ID target administrator tidak valid." },
        { status: 400 }
      )
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Kata sandi konfirmasi akun Anda wajib diisi untuk verifikasi keamanan." },
        { status: 400 }
      )
    }

    // 2. Cegah transfer ke diri sendiri
    if (targetUserId === currentSuperAdmin.id) {
      return NextResponse.json(
        { success: false, error: "Anda tidak dapat mentransfer kepemilikan ke akun Anda sendiri." },
        { status: 400 }
      )
    }

    // 3. Verifikasi kata sandi Super Admin saat ini
    const currentAdminData = await queryOne<{ id: number; password?: string }>(
      "SELECT id, password FROM users WHERE id = ? LIMIT 1",
      [currentSuperAdmin.id]
    )

    if (!currentAdminData?.password || !verifyPassword(password, currentAdminData.password)) {
      return NextResponse.json(
        { success: false, error: "Kata sandi yang Anda masukkan salah. Transfer kepemilikan dibatalkan." },
        { status: 401 }
      )
    }

    // 4. Verifikasi target user
    const targetUser = await queryOne<{
      id: number
      name: string
      email: string
      role: string
      isActive: number
    }>("SELECT id, name, email, role, isActive FROM users WHERE id = ? LIMIT 1", [targetUserId])

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "Calon penerima kepemilikan tidak ditemukan dalam basis data." },
        { status: 404 }
      )
    }

    if (!targetUser.isActive) {
      return NextResponse.json(
        { success: false, error: "Tidak dapat mentransfer kepemilikan ke akun yang berstatus ditangguhkan." },
        { status: 400 }
      )
    }

    // 5. Eksekusi transfer kepemilikan
    // Turunkan Super Admin saat ini menjadi Admin Pustakawan
    await execute("UPDATE users SET role = 'admin' WHERE id = ?", [currentSuperAdmin.id])

    // Angkat target user menjadi Super Administrator baru
    await execute("UPDATE users SET role = 'super_admin' WHERE id = ?", [targetUserId])

    return NextResponse.json({
      success: true,
      message: `Kepemilikan Super Administrator (Owner) berhasil dialihkan kepada ${targetUser.name} (${targetUser.email}). Akun Anda kini menjadi Admin Pustakawan.`,
      newOwner: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
      },
    })
  } catch (error) {
    console.error("Transfer ownership error:", error)
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan internal saat memproses transfer kepemilikan." },
      { status: 500 }
    )
  }
}
