import { NextResponse } from "next/server"
import { execute } from "@/lib/db"
import { sendPasswordResetEmail } from "@/lib/email-service"
import { verifyTurnstileToken } from "@/lib/turnstile"
import { checkRateLimit } from "@/lib/rate-limit"
import { getAppBaseUrl } from "@/lib/url-helper"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, turnstileToken } = body

    // 1. Verifikasi Anti-Bot Turnstile
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

    // 2. Rate Limiting: Maksimal 3 permintaan per 5 menit per email
    const rateCheck = checkRateLimit(`forgot-pw:${cleanEmail}`, 3, 300)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Terlalu banyak permintaan reset kata sandi. Silakan tunggu ${rateCheck.resetSeconds} detik sebelum mencoba kembali.`,
        },
        { status: 429 }
      )
    }

    const token = "magic-" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
    const origin = getAppBaseUrl(request)

    const relativeLink = `/reset-password?token=${token}&email=${encodeURIComponent(cleanEmail)}`
    const fullResetUrl = `${origin}${relativeLink}`

    // Simpan token ke database dengan masa berlaku 15 menit (MySQL Native)
    await execute("DELETE FROM password_reset_tokens WHERE email = ?", [cleanEmail])
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
    await execute(
      "INSERT INTO password_reset_tokens (email, token, expiresAt) VALUES (?, ?, ?)",
      [cleanEmail, token, expiresAt]
    )

    // Kirim email nyata berisi tautan reset
    const emailResult = await sendPasswordResetEmail({
      to: cleanEmail,
      resetUrl: fullResetUrl,
      expiresInMinutes: 15,
    })

    if (!emailResult.success && emailResult.error) {
      return NextResponse.json(
        {
          success: false,
          error: emailResult.error,
          delivered: false,
          method: "smtp",
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      delivered: emailResult.delivered,
      method: emailResult.method,
      sender: emailResult.sender || "perpusahm@gmail.com",
      senderName: "Perpustakaan Digital RSJD Atma Husada Mahakam",
      recipient: cleanEmail,
      subject: "Atur Ulang Kata Sandi Akun PerpusAHM",
      token,
      magicLink: relativeLink,
      fullResetUrl,
      previewUrl: emailResult.previewUrl,
      expiresInMinutes: 15,
      message: emailResult.delivered
        ? `Email nyata berhasil dikirim langsung ke ${cleanEmail}!`
        : `Tautan reset berhasil dibuat dan dikirim ke ${cleanEmail}.`,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { success: false, error: `Terjadi kesalahan server: ${message}` },
      { status: 500 }
    )
  }
}
