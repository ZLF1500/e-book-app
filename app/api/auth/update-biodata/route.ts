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
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const { email, name, nik, phone, institution } = body

    const cleanEmail = email && typeof email === "string" ? email.trim().toLowerCase() : auth.user.email

    // Cegah IDOR: Pengguna biasa hanya boleh memperbarui biodata akun miliknya sendiri
    if (auth.user.email !== cleanEmail && auth.user.role !== "admin" && auth.user.role !== "super_admin") {
      return NextResponse.json(
        { success: false, error: "Akses ditolak. Anda hanya diizinkan memperbarui data profil akun Anda sendiri." },
        { status: 403 }
      )
    }

    const user = await queryOne<UserRow>(
      "SELECT id, name, email, nik, phone, institution, isVerified, role, avatarUrl FROM users WHERE email = ? LIMIT 1",
      [cleanEmail]
    )

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Akun pengguna tidak ditemukan di sistem." },
        { status: 404 }
      )
    }

    const cleanName = typeof name === "string" && name.trim() ? name.trim() : user.name
    const cleanNik = typeof nik === "string" ? nik.trim() : (nik === null ? null : user.nik)
    const cleanPhone = typeof phone === "string" ? phone.trim() : (phone === null ? null : user.phone)
    const cleanInstitution = typeof institution === "string" ? institution.trim() : (institution === null ? null : user.institution)

    // Jika NIK diubah dan tidak kosong, periksa apakah dipakai pengguna lain
    if (cleanNik && cleanNik !== user.nik) {
      const duplicateNik = await queryOne<{ id: number }>(
        "SELECT id FROM users WHERE nik = ? AND email != ? LIMIT 1",
        [cleanNik, cleanEmail]
      )
      if (duplicateNik) {
        return NextResponse.json(
          { success: false, error: "NIK ini sudah terdaftar pada pengguna lain." },
          { status: 400 }
        )
      }
    }

    // Status isVerified hanya dapat diaktifkan melalui alur resmi /api/auth/verify-biodata dengan OTP
    const newIsVerified = Boolean(user.isVerified)

    await execute(
      "UPDATE users SET name = ?, nik = ?, phone = ?, institution = ?, isVerified = ? WHERE email = ?",
      [cleanName, cleanNik, cleanPhone, cleanInstitution, newIsVerified ? 1 : 0, cleanEmail]
    )

    const safeUser = {
      id: user.id,
      name: cleanName,
      email: cleanEmail,
      nik: cleanNik,
      phone: cleanPhone,
      institution: cleanInstitution,
      isVerified: newIsVerified,
      role: user.role,
      avatarUrl: user.avatarUrl,
    }

    const response = NextResponse.json({
      success: true,
      message: "Biodata berhasil diperbarui di database.",
      user: safeUser,
    })

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
      { success: false, error: `Gagal memperbarui biodata: ${errorMsg}` },
      { status: 500 }
    )
  }
}
