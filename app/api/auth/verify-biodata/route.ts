import { NextResponse } from "next/server"
import { queryOne, execute } from "@/lib/db"

interface OtpRow {
  id: number
  identifier: string
  otpCode: string
  expiresAt: string | Date
}

interface UserRow {
  id: number
  name: string
  email: string
  nik: string | null
  phone: string | null
  institution: string | null
  isVerified: number | boolean
  role: "member" | "admin"
  avatarUrl: string | null
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, name, nik, phone, institution, city, otpCode } = body

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Identitas email tidak valid." },
        { status: 400 }
      )
    }

    if (!phone || typeof phone !== "string" || phone.trim().length < 8) {
      return NextResponse.json(
        { success: false, error: "Nomor WhatsApp / HP aktif minimal 8-10 digit angka." },
        { status: 400 }
      )
    }

    if (!otpCode || typeof otpCode !== "string" || otpCode.trim().length !== 6) {
      return NextResponse.json(
        { success: false, error: "Masukkan 6 digit kode OTP verifikasi." },
        { status: 400 }
      )
    }

    const cleanEmail = email.trim().toLowerCase()
    const cleanNik = typeof nik === "string" && nik.trim().length > 0 ? nik.trim() : null
    const cleanPhone = phone.trim()
    const cleanCity = typeof city === "string" && city.trim().length > 0 ? city.trim() : null
    const cleanInst = typeof institution === "string" && institution.trim().length > 0 ? institution.trim() : null
    const cleanInstitution = [cleanInst, cleanCity].filter(Boolean).join(" • ") || cleanInst || null
    const cleanOtp = otpCode.trim()

    // 1. Verifikasi kode OTP di database MySQL (Native Query)
    const otpRecord = await queryOne<OtpRow>(
      "SELECT id, identifier, otpCode, expiresAt FROM verification_otps WHERE identifier = ? AND otpCode = ? ORDER BY id DESC LIMIT 1",
      [cleanEmail, cleanOtp]
    )

    if (!otpRecord) {
      return NextResponse.json(
        {
          success: false,
          error: "Kode OTP salah atau tidak cocok. Pastikan 6 digit kode yang dikirim ke email Anda dimasukkan dengan benar.",
        },
        { status: 400 }
      )
    }

    // 2. Periksa masa berlaku kode OTP (10 menit)
    const expiresDate = new Date(otpRecord.expiresAt)
    if (new Date() > expiresDate) {
      await execute("DELETE FROM verification_otps WHERE identifier = ?", [cleanEmail])
      return NextResponse.json(
        {
          success: false,
          error: "Kode OTP telah kedaluwarsa. Silakan minta kirim kode baru.",
        },
        { status: 400 }
      )
    }

    // 3. Hapus kode OTP agar tidak dapat digunakan ulang (MySQL Native)
    await execute("DELETE FROM verification_otps WHERE identifier = ?", [cleanEmail])

    // 4. Periksa apakah NIK sudah digunakan oleh akun lain jika NIK diisi
    if (cleanNik) {
      const existingNikUser = await queryOne<{ id: number }>(
        "SELECT id FROM users WHERE nik = ? AND email != ? LIMIT 1",
        [cleanNik, cleanEmail]
      )
      if (existingNikUser) {
        return NextResponse.json(
          {
            success: false,
            error: "Nomor identitas (NIK/NIP/NIM) ini sudah terdaftar pada akun peminjam lain.",
          },
          { status: 400 }
        )
      }
    }

    // 5. Update atau Insert user di database MySQL secara permanen
    const existingUser = await queryOne<UserRow>(
      "SELECT id, name, role, avatarUrl FROM users WHERE email = ? LIMIT 1",
      [cleanEmail]
    )

    const cleanName = typeof name === "string" && name.trim().length > 0 ? name.trim() : null
    let finalUserId: number
    let finalUserName: string
    let finalRole: "member" | "admin"
    let finalAvatar: string | null

    if (existingUser) {
      finalUserName = cleanName || existingUser.name
      await execute(
        "UPDATE users SET name = ?, nik = ?, phone = ?, institution = ?, isVerified = 1 WHERE email = ?",
        [finalUserName, cleanNik, cleanPhone, cleanInstitution, cleanEmail]
      )
      finalUserId = existingUser.id
      finalRole = existingUser.role
      finalAvatar = existingUser.avatarUrl
    } else {
      const defaultName = cleanName || cleanEmail.split("@")[0]
      const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanEmail)}`
      const insertResult = await execute(
        "INSERT INTO users (name, email, nik, phone, institution, isVerified, role, avatarUrl) VALUES (?, ?, ?, ?, ?, 1, 'member', ?)",
        [defaultName, cleanEmail, cleanNik, cleanPhone, cleanInstitution, avatarUrl]
      )
      finalUserId = insertResult.insertId
      finalUserName = defaultName
      finalRole = "member"
      finalAvatar = avatarUrl
    }

    const safeUser = {
      id: finalUserId,
      name: finalUserName,
      email: cleanEmail,
      nik: cleanNik,
      phone: cleanPhone,
      institution: cleanInstitution,
      isVerified: true,
      role: finalRole,
      avatarUrl: finalAvatar,
    }

    // 6. Sinkronisasi sesi cookie secara instan
    const response = NextResponse.json({
      success: true,
      message: "Identitas peminjam berhasil diverifikasi dan disimpan permanen.",
      user: safeUser,
    })

    response.cookies.set("rsjd_auth_user", encodeURIComponent(JSON.stringify(safeUser)), {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 hari
      sameSite: "lax",
      httpOnly: false,
    })

    return response
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { success: false, error: `Gagal memverifikasi biodata: ${errorMsg}` },
      { status: 500 }
    )
  }
}
