import { NextResponse } from "next/server"
import { queryOne, execute } from "@/lib/db"
import {
  verifyPassword,
  hashPassword,
  isPasswordHashed,
  createSignedToken,
} from "@/lib/auth-crypto"
import { verifyTurnstileToken } from "@/lib/turnstile"
import { checkRateLimit } from "@/lib/rate-limit"
import { isSecureCookie } from "@/lib/cookie-helper"

interface UserRow {
  id: number
  name: string
  email: string
  password: string | null
  nik: string | null
  phone: string | null
  institution: string | null
  isVerified: number | boolean
  role: "member" | "admin" | "super_admin"
  avatarUrl: string | null
  isActive: number | boolean
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, turnstileToken } = body

    // 1. Verifikasi Anti-Bot Cloudflare Turnstile
    const turnstileCheck = await verifyTurnstileToken(turnstileToken)
    if (!turnstileCheck.success) {
      return NextResponse.json(
        { success: false, error: turnstileCheck.error || "Verifikasi anti-bot gagal." },
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

    // 2. Proteksi Brute Force: Maksimal 5 percobaan salah per 5 menit per email
    const rateLimitKey = `login-fail:${cleanEmail}`

    // 3. Cek apakah user ada di database MySQL (Native Query)
    const user = await queryOne<UserRow>(
      "SELECT id, name, email, password, nik, phone, institution, isVerified, role, avatarUrl, isActive FROM users WHERE email = ? LIMIT 1",
      [cleanEmail]
    )

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Alamat email ini belum terdaftar. Silakan buat akun baru terlebih dahulu melalui menu 'Daftar Sekarang'.",
        },
        { status: 404 }
      )
    }

    // 4. Verifikasi status akun aktif (Bukan akun yang dinonaktifkan/ditangguhkan)
    if (user.isActive === 0 || user.isActive === false) {
      return NextResponse.json(
        {
          success: false,
          error: "Akun Anda telah dinonaktifkan oleh Administrator. Silakan hubungi tim pengelola perpustakaan RSJD.",
        },
        { status: 403 }
      )
    }

    // Jika user terdaftar via Google OAuth dan belum memiliki kata sandi mandiri
    if (!user.password) {
      return NextResponse.json(
        {
          success: false,
          error: "Akun ini terdaftar menggunakan Google Sign-In. Silakan klik tombol 'Masuk dengan Google' di bawah, atau atur kata sandi melalui menu 'Lupa Kata Sandi?'.",
        },
        { status: 400 }
      )
    }

    if (!password) {
      return NextResponse.json(
        { success: false, error: "Kata sandi wajib diisi." },
        { status: 400 }
      )
    }

    const isMatch = verifyPassword(password, user.password)
    if (!isMatch) {
      const rateCheck = checkRateLimit(rateLimitKey, 5, 300)
      if (!rateCheck.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: `Terlalu banyak percobaan masuk yang salah. Silakan coba kembali dalam ${rateCheck.resetSeconds} detik atau gunakan menu Lupa Kata Sandi.`,
          },
          { status: 429 }
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: "Kata sandi yang Anda masukkan salah. Silakan periksa kembali kata sandi Anda.",
        },
        { status: 401 }
      )
    }

    // Seamless Security Migration: Jika kata sandi pengguna masih dalam format plaintext,
    // otomatis re-hash ke format scrypt modern di database tanpa mengganggu sesi pengguna
    if (!isPasswordHashed(user.password)) {
      try {
        await execute("UPDATE users SET password = ? WHERE id = ?", [hashPassword(password), user.id])
      } catch (err) {
        console.warn("Could not upgrade user password hash:", err)
      }
    }

    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      nik: user.nik,
      phone: user.phone,
      institution: user.institution,
      isVerified: user.role === "admin" || user.role === "super_admin" ? true : Boolean(user.isVerified),
      role: user.role,
      avatarUrl: user.avatarUrl,
    }

    // Buat token sesi bertanda tangan kriptografis HMAC-SHA256
    const sessionToken = createSignedToken({
      id: user.id,
      email: user.email,
      role: user.role,
    })

    const userPayloadJson = JSON.stringify(userPayload)
    const response = NextResponse.json({
      success: true,
      user: userPayload,
      message: `Selamat datang kembali, ${user.name}!`,
    })

    const secureFlag = isSecureCookie(request)

    // 1. Sesi aman HttpOnly untuk autentikasi server-side
    response.cookies.set("rsjd_session_token", sessionToken, {
      httpOnly: true,
      secure: secureFlag,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 hari
      path: "/",
    })

    // 2. Cache profil untuk client render
    response.cookies.set("rsjd_auth_user", encodeURIComponent(userPayloadJson), {
      httpOnly: false,
      secure: secureFlag,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    })

    return response
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { success: false, error: `Gagal memproses masuk: ${errorMsg}` },
      { status: 500 }
    )
  }
}
