import { NextResponse } from "next/server"
import { queryOne, execute } from "@/lib/db"
import { hashPassword } from "@/lib/auth-crypto"

interface ResetTokenRow {
  id: number
  email: string
  token: string
  expiresAt: string | Date
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, token, password } = body

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Identitas email tidak valid." },
        { status: 400 }
      )
    }

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { success: false, error: "Token otorisasi reset kata sandi tidak valid atau hilang." },
        { status: 400 }
      )
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Kata sandi baru minimal harus 8 karakter." },
        { status: 400 }
      )
    }

    const cleanEmail = email.trim().toLowerCase()
    const cleanToken = token.trim()

    // 1. Cari token reset di database MySQL (Native Query)
    const tokenRecord = await queryOne<ResetTokenRow>(
      "SELECT id, email, token, expiresAt FROM password_reset_tokens WHERE token = ? LIMIT 1",
      [cleanToken]
    )

    if (!tokenRecord || tokenRecord.email.toLowerCase() !== cleanEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "Tautan reset kata sandi tidak valid atau telah digunakan sebelumnya.",
        },
        { status: 400 }
      )
    }

    // 2. Periksa masa kedaluwarsa token (15 menit)
    const expiresDate = new Date(tokenRecord.expiresAt)
    if (new Date() > expiresDate) {
      await execute("DELETE FROM password_reset_tokens WHERE id = ?", [tokenRecord.id])
      return NextResponse.json(
        {
          success: false,
          error: "Tautan reset kata sandi telah kedaluwarsa. Silakan ajukan permohonan reset baru.",
        },
        { status: 400 }
      )
    }

    // 3. Hash kata sandi baru dengan scrypt
    const hashedPassword = hashPassword(password)

    // 4. Perbarui kata sandi pengguna di database MySQL (Native Query)
    const user = await queryOne<{ id: number }>(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [cleanEmail]
    )

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Akun pengguna tidak ditemukan di sistem." },
        { status: 404 }
      )
    }

    await execute("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, user.id])

    // 5. Hapus token agar tidak bisa digunakan kembali (single-use)
    await execute("DELETE FROM password_reset_tokens WHERE email = ?", [cleanEmail])

    return NextResponse.json({
      success: true,
      message: "Kata sandi akun Anda berhasil diperbarui! Silakan masuk dengan kata sandi baru.",
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { success: false, error: `Gagal memperbarui kata sandi: ${errorMsg}` },
      { status: 500 }
    )
  }
}
