import { NextResponse } from "next/server"
import crypto from "crypto"
import { execute } from "@/lib/db"
import { sendOtpVerificationEmail } from "@/lib/email-service"
import { verifyTurnstileToken } from "@/lib/turnstile"
import { checkOtpCooldown } from "@/lib/rate-limit"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { identifier, channel = "email", purpose = "reset_password", turnstileToken } = body

    // 1. Verifikasi Anti-Bot Cloudflare Turnstile
    const turnstileCheck = await verifyTurnstileToken(turnstileToken)
    if (!turnstileCheck.success) {
      return NextResponse.json(
        { success: false, error: turnstileCheck.error || "Verifikasi anti-bot gagal." },
        { status: 400 }
      )
    }

    if (!identifier || typeof identifier !== "string") {
      return NextResponse.json(
        { success: false, error: "Tujuan pengiriman (email/nomor kontak) wajib diisi." },
        { status: 400 }
      )
    }

    const cleanIdentifier = identifier.trim().toLowerCase()

    // Kanal WhatsApp disiapkan dan dapat dipilih, namun diarahkan ke email saat ini
    if (channel === "whatsapp") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Kanal WhatsApp resmi RSJD Atma Husada Mahakam sedang dalam persiapan integrasi API. Silakan pilih kanal Email untuk menerima kode OTP saat ini.",
        },
        { status: 400 }
      )
    }

    if (!cleanIdentifier.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Silakan masukkan alamat email yang valid." },
        { status: 400 }
      )
    }

    // 2. Rate Limiting: Cooldown 60 detik antar permintaan ke email yang sama
    const cooldown = checkOtpCooldown(cleanIdentifier, 60)
    if (!cooldown.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Mohon tunggu ${cooldown.waitSeconds} detik sebelum meminta kode OTP berikutnya ke email ini.`,
        },
        { status: 429 }
      )
    }

    // 3. Generate kode OTP 6-digit angka menggunakan CSPRNG (Cryptographically Secure Pseudo-Random Number Generator)
    const otpCode = crypto.randomInt(100000, 1000000).toString()
    const expiresInMinutes = 10
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000)

    // Hapus OTP lama untuk identifier ini agar tidak terjadi tumpang tindih (MySQL Native)
    await execute("DELETE FROM verification_otps WHERE identifier = ?", [cleanIdentifier])

    // Simpan OTP baru ke database (MySQL Native)
    await execute(
      "INSERT INTO verification_otps (identifier, otpCode, expiresAt) VALUES (?, ?, ?)",
      [cleanIdentifier, otpCode, expiresAt]
    )

    // Kirim email nyata berisi OTP
    const emailResult = await sendOtpVerificationEmail({
      to: cleanIdentifier,
      otpCode,
      purpose,
      expiresInMinutes,
    })

    if (!emailResult.success && emailResult.error) {
      return NextResponse.json(
        {
          success: false,
          error: emailResult.error,
          delivered: false,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      delivered: emailResult.delivered,
      method: emailResult.method,
      channel: "email",
      identifier: cleanIdentifier,
      expiresInSeconds: expiresInMinutes * 60,
      sender: emailResult.sender,
      message: `Kode verifikasi OTP 6 digit berhasil dikirim langsung ke ${cleanIdentifier}!`,
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { success: false, error: `Gagal mengirim kode OTP: ${errorMsg}` },
      { status: 500 }
    )
  }
}
