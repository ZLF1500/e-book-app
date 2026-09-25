import { NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import { query, execute, queryOne } from "@/lib/db"

export async function GET() {
  const auth = await verifyAdminSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const tags = await query(
      `SELECT t.id, t.name, t.slug,
              (SELECT COUNT(*) FROM book_tags bt WHERE bt.tagId = t.id) as usageCount
       FROM tags t
       ORDER BY usageCount DESC, t.name ASC`
    )

    return NextResponse.json({ success: true, tags })
  } catch (err) {
    console.error("Failed to fetch tags:", err)
    return NextResponse.json({ success: false, error: "Gagal memuat daftar tag." }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await verifyAdminSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = await req.json()
    const { name } = body
    let { slug } = body

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ success: false, error: "Nama tag wajib diisi." }, { status: 400 })
    }

    if (!slug || typeof slug !== "string" || !slug.trim()) {
      slug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .trim()
    }

    const existing = await queryOne("SELECT id FROM tags WHERE slug = ? OR name = ? LIMIT 1", [slug, name.trim()])
    if (existing) {
      return NextResponse.json({ success: false, error: "Tag ini sudah ada." }, { status: 409 })
    }

    const result = await execute(
      "INSERT INTO tags (name, slug, usageCount) VALUES (?, ?, 0)",
      [name.trim(), slug.trim()]
    )

    return NextResponse.json({
      success: true,
      message: "Tag baru berhasil ditambahkan!",
      id: result.insertId,
    })
  } catch (err) {
    console.error("Failed to create tag:", err)
    return NextResponse.json({ success: false, error: "Gagal menambahkan tag baru." }, { status: 500 })
  }
}
