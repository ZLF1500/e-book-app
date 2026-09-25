import { NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import { queryOne, execute } from "@/lib/db"

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const { id } = await params
    const tagId = parseInt(id, 10)
    if (!tagId) {
      return NextResponse.json({ success: false, error: "ID tag tidak valid." }, { status: 400 })
    }

    const body = await req.json()
    const { name } = body
    let { slug } = body

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ success: false, error: "Nama tag tidak boleh kosong." }, { status: 400 })
    }

    if (!slug || typeof slug !== "string" || !slug.trim()) {
      slug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .trim()
    }

    const existing = await queryOne<{ id: number }>(
      "SELECT id FROM tags WHERE (slug = ? OR name = ?) AND id != ? LIMIT 1",
      [slug, name.trim(), tagId]
    )
    if (existing) {
      return NextResponse.json({ success: false, error: "Tag dengan nama atau slug ini sudah digunakan." }, { status: 409 })
    }

    await execute(
      "UPDATE tags SET name = ?, slug = ? WHERE id = ?",
      [name.trim(), slug.trim(), tagId]
    )

    return NextResponse.json({ success: true, message: "Tag berhasil diperbarui!" })
  } catch (err) {
    console.error("Failed to update tag:", err)
    return NextResponse.json({ success: false, error: "Gagal memperbarui tag." }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const { id } = await params
    const tagId = parseInt(id, 10)
    if (!tagId) {
      return NextResponse.json({ success: false, error: "ID tag tidak valid." }, { status: 400 })
    }

    const tag = await queryOne<{ id: number; name: string }>(
      "SELECT id, name FROM tags WHERE id = ? LIMIT 1",
      [tagId]
    )
    if (!tag) {
      return NextResponse.json({ success: false, error: "Tag tidak ditemukan." }, { status: 404 })
    }

    // Cascade delete handles book_tags automatically
    await execute("DELETE FROM tags WHERE id = ?", [tagId])

    return NextResponse.json({ success: true, message: `Tag '${tag.name}' berhasil dihapus.` })
  } catch (err) {
    console.error("Failed to delete tag:", err)
    return NextResponse.json({ success: false, error: "Gagal menghapus tag." }, { status: 500 })
  }
}
