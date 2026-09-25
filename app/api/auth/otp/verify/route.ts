import { NextResponse } from "next/server"
import { queryOne, execute } from "@/lib/db"

interface OtpRow {
  id: number
  identifier: string
  otpCode: string
  expiresAt: string | Date
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { identifier, otpCode, purpose = "reset_password" } = body

    if (!identifier || typeof identifier !== "string") {
      return NextResponse.json(
        { success: false, error: "Identitas email/kontak tidak valid." },
        { status: 400 }
      )
    }

    if (!otpCode || typeof otpCode !== "string") {
      return NextResponse.json(
        { success: false, error: "Masukkan 6 digit kode OTP." },
        { status: 400 }
      )
    }

    const cleanIdentifier = identifier.trim().toLowerCase()
    const cleanOtp = otpCode.trim()

    // Cari kode OTP di database MySQL (Native Query)
    const record = await queryOne<OtpRow>(
      "SELECT id, identifier, otpCode, expiresAt FROM verification_otps WHERE identifier = ? AND otpCode = ? ORDER BY id DESC LIMIT 1",
      [cleanIdentifier, cleanOtp]
    )

    if (!record) {
      return NextResponse.json(
        {
          success: false,
          error: "Kode OTP tidak cocok atau salah. Pastikan 6 digit kode dimasukkan dengan benar.",
        },
        { status: 400 }
      )
    }

    // Periksa kedaluwarsa
    const expiresDate = new Date(record.expiresAt)
    if (new Date() > expiresDate) {
      // Hapus OTP yang sudah kedaluwarsa
      await execute("DELETE FROM verification_otps WHERE identifier = ?", [cleanIdentifier])
      return NextResponse.json(
        {
          success: false,
          error: "Kode OTP ini telah kedaluwarsa (melewati batas waktu 10 menit). Silakan minta kode baru.",
        },
        { status: 400 }
      )
    }

    // OTP Valid! Hapus dari database agar tidak bisa digunakan berulang kali (MySQL Native)
    await execute("DELETE FROM verification_otps WHERE identifier = ?", [cleanIdentifier])


    // Buat token verifikasi sukses untuk melanjutkan aksi berikutnya
    const verifiedToken =
      "otp-verified-" +
      Math.random().toString(36).substring(2, 10) +
      Date.now().toString(36)

    if (purpose === "reset_password") {
      await execute("DELETE FROM password_reset_tokens WHERE email = ?", [cleanIdentifier])
      const resetExpiresAt = new Date(Date.now() + 15 * 60 * 1000)
      await execute(
        "INSERT INTO password_reset_tokens (email, token, expiresAt) VALUES (?, ?, ?)",
        [cleanIdentifier, verifiedToken, resetExpiresAt]
      )
    }

    // Buat tautan reset sandi jika purpose adalah reset_password
    const nextUrl = `/reset-password?token=${verifiedToken}&email=${encodeURIComponent(cleanIdentifier)}`

    return NextResponse.json({
      success: true,
      token: verifiedToken,
      identifier: cleanIdentifier,
      purpose,
      nextUrl,
      message: "Verifikasi kode OTP berhasil!",
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { success: false, error: `Gagal memverifikasi OTP: ${errorMsg}` },
      { status: 500 }
    )
  }
}
