import { NextResponse } from "next/server"
import { queryOne, execute } from "@/lib/db"
import { hashPassword } from "@/lib/auth-crypto"
import { verifyTurnstileToken } from "@/lib/turnstile"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, password, turnstileToken } = body

    // 1. Verifikasi Anti-Bot Cloudflare Turnstile
    const turnstileCheck = await verifyTurnstileToken(turnstileToken)
    if (!turnstileCheck.success) {
      return NextResponse.json(
        { success: false, error: turnstileCheck.error || "Verifikasi anti-bot gagal." },
        { status: 400 }
      )
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Nama lengkap wajib diisi." },
        { status: 400 }
      )
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Alamat email tidak valid." },
        { status: 400 }
      )
    }

    const cleanEmail = email.trim().toLowerCase()
    const cleanName = name.trim()

    // Cek apakah email sudah terdaftar (MySQL Native)
    const existingUser = await queryOne<{ id: number }>(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [cleanEmail]
    )

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "Alamat email ini sudah terdaftar. Silakan gunakan menu Masuk.",
        },
        { status: 409 }
      )
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Kata sandi wajib diisi minimal 6 karakter." },
        { status: 400 }
      )
    }

    // Hash kata sandi menggunakan scrypt dengan salt acak 16 byte
    const hashedPassword = hashPassword(password)
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}`

    // Buat akun baru di database dengan role member (MySQL Native)
    const insertResult = await execute(
      "INSERT INTO users (name, email, password, role, isVerified, avatarUrl) VALUES (?, ?, ?, 'member', 0, ?)",
      [cleanName, cleanEmail, hashedPassword, avatarUrl]
    )

    const userPayload = {
      id: insertResult.insertId,
      name: cleanName,
      email: cleanEmail,
      nik: null,
      phone: null,
      institution: null,
      isVerified: false,
      role: "member" as const,
      avatarUrl,
    }

    return NextResponse.json({
      success: true,
      user: userPayload,
      message: `Pendaftaran berhasil! Silakan masuk dengan email dan kata sandi Anda.`,
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { success: false, error: `Gagal mendaftarkan akun: ${errorMsg}` },
      { status: 500 }
    )
  }
}
