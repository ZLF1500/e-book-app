import { NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import { query, queryOne, execute } from "@/lib/db"
import { hashPassword } from "@/lib/auth-crypto"

interface UserListRow {
  id: number
  name: string
  email: string
  nik: string | null
  phone: string | null
  institution: string | null
  isVerified: number
  role: "member" | "admin" | "super_admin"
  avatarUrl: string | null
  isActive: number
  createdAt: string
  borrowCount: number
}

export async function GET(req: Request) {
  const auth = await verifyAdminSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get("q") || ""
    const role = searchParams.get("role") || ""
    const verified = searchParams.get("verified") || ""

    let sql = `
      SELECT u.id, u.name, u.email, u.nik, u.phone, u.institution,
             u.isVerified, u.role, u.avatarUrl, u.isActive, u.createdAt,
             (SELECT COUNT(*) FROM loans l WHERE l.userId = u.id) as borrowCount
      FROM users u
      WHERE 1=1
    `
    const params: (string | number)[] = []

    if (search.trim()) {
      sql += " AND (u.name LIKE ? OR u.email LIKE ? OR u.nik LIKE ? OR u.phone LIKE ? OR u.institution LIKE ?)"
      const wild = `%${search.trim()}%`
      params.push(wild, wild, wild, wild, wild)
    }

    if (role && role !== "all") {
      sql += " AND u.role = ?"
      params.push(role)
    }

    if (verified && verified !== "all") {
      sql += " AND u.isVerified = ?"
      params.push(verified === "1" ? 1 : 0)
    }

    sql += " ORDER BY u.createdAt DESC"

    const rows = await query<UserListRow>(sql, params)

    const users = rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      nik: u.nik,
      phone: u.phone,
      institution: u.institution,
      isVerified: Boolean(u.isVerified),
      role: u.role,
      avatarUrl: u.avatarUrl,
      isActive: Boolean(u.isActive),
      createdAt: u.createdAt,
      borrowCount: u.borrowCount || 0,
    }))

    return NextResponse.json({
      success: true,
      users,
      total: users.length,
      isSuperAdmin: auth.isSuperAdmin,
      currentUserId: auth.user.id,
    })
  } catch (err) {
    console.error("Failed to load users for admin:", err)
    return NextResponse.json({ success: false, error: "Gagal memuat daftar pengguna." }, { status: 500 })
  }
}

export async function POST(req: Request) {
  // Hanya Super Administrator yang dapat membuat akun admin / user baru secara langsung
  const auth = await verifyAdminSession(true)
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = await req.json()
    const {
      name,
      email,
      password,
      role = "admin",
      nik,
      phone,
      institution = "Pustakawan RSJD",
      isVerified = true,
    } = body

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Nama lengkap wajib diisi." },
        { status: 400 }
      )
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Format alamat email tidak valid." },
        { status: 400 }
      )
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Kata sandi minimal 6 karakter." },
        { status: 400 }
      )
    }

    const validRoles = ["member", "admin", "super_admin"]
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: "Peran akun tidak valid." },
        { status: 400 }
      )
    }

    if (role === "super_admin") {
      const existingSuperAdmin = await queryOne<{ id: number; name: string }>(
        "SELECT id, name FROM users WHERE role = 'super_admin' LIMIT 1"
      )
      if (existingSuperAdmin) {
        return NextResponse.json(
          {
            success: false,
            error: `Super Administrator (Owner) bersifat tunggal dan sudah dipegang oleh ${existingSuperAdmin.name}. Pengelola baru hanya dapat didaftarkan sebagai Admin Pustakawan.`,
          },
          { status: 400 }
        )
      }
    }

    const cleanEmail = email.trim().toLowerCase()
    const cleanName = name.trim()

    // Cek apakah email sudah terdaftar
    const existing = await queryOne<{ id: number }>(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [cleanEmail]
    )
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Email '${cleanEmail}' sudah terdaftar dalam sistem.` },
        { status: 409 }
      )
    }

    // Hash password secara aman
    const hashedPassword = hashPassword(password)
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}`

    const insertResult = await execute(
      `INSERT INTO users (name, email, password, role, isVerified, nik, phone, institution, avatarUrl, isActive)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        cleanName,
        cleanEmail,
        hashedPassword,
        role,
        isVerified ? 1 : 0,
        nik?.trim() || null,
        phone?.trim() || null,
        institution?.trim() || null,
        avatarUrl,
      ]
    )

    const newUserId = insertResult.insertId

    return NextResponse.json({
      success: true,
      message: `Akun ${cleanName} (${role === "super_admin" ? "Super Admin" : role === "admin" ? "Admin" : "Member"}) berhasil dibuat!`,
      user: {
        id: newUserId,
        name: cleanName,
        email: cleanEmail,
        role,
        isVerified: Boolean(isVerified),
        nik: nik?.trim() || null,
        phone: phone?.trim() || null,
        institution: institution?.trim() || null,
        avatarUrl,
        isActive: true,
        createdAt: new Date().toISOString(),
        borrowCount: 0,
      },
    })
  } catch (err) {
    console.error("Failed to create admin/user:", err)
    return NextResponse.json(
      { success: false, error: "Gagal membuat akun pengelola baru." },
      { status: 500 }
    )
  }
}
