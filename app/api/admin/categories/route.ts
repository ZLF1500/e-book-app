import { NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import { query, execute, queryOne } from "@/lib/db"

export async function GET() {
  const auth = await verifyAdminSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const categories = await query(
      `SELECT c.id, c.name, c.slug, c.iconName, c.description,
              (SELECT COUNT(*) FROM books b WHERE b.categoryId = c.id) as bookCount
       FROM categories c
       ORDER BY c.name ASC`
    )

    return NextResponse.json({ success: true, categories })
  } catch (err) {
    console.error("Failed to fetch categories:", err)
    return NextResponse.json({ success: false, error: "Gagal memuat daftar kategori." }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await verifyAdminSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = await req.json()
    const { name, iconName, description } = body
    let { slug } = body

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ success: false, error: "Nama kategori wajib diisi." }, { status: 400 })
    }

    if (!slug || typeof slug !== "string" || !slug.trim()) {
      slug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .trim()
    }

    // Check slug uniqueness
    const existing = await queryOne("SELECT id FROM categories WHERE slug = ? LIMIT 1", [slug])
    if (existing) {
      return NextResponse.json({ success: false, error: "Slug kategori ini sudah digunakan." }, { status: 409 })
    }

    const result = await execute(
      "INSERT INTO categories (name, slug, iconName, description) VALUES (?, ?, ?, ?)",
      [name.trim(), slug.trim(), iconName?.trim() || "BookOpen", description?.trim() || ""]
    )

    return NextResponse.json({
      success: true,
      message: "Kategori baru berhasil ditambahkan!",
      id: result.insertId,
    })
  } catch (err) {
    console.error("Failed to create category:", err)
    return NextResponse.json({ success: false, error: "Gagal menambahkan kategori baru." }, { status: 500 })
  }
}
