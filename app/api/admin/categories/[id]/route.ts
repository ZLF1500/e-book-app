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
    const categoryId = parseInt(id, 10)
    if (!categoryId) {
      return NextResponse.json({ success: false, error: "ID kategori tidak valid." }, { status: 400 })
    }

    const body = await req.json()
    const { name, iconName, description } = body
    let { slug } = body

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ success: false, error: "Nama kategori tidak boleh kosong." }, { status: 400 })
    }

    if (!slug || typeof slug !== "string" || !slug.trim()) {
      slug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .trim()
    }

    // Check slug conflict with other categories
    const existing = await queryOne<{ id: number }>(
      "SELECT id FROM categories WHERE slug = ? AND id != ? LIMIT 1",
      [slug, categoryId]
    )
    if (existing) {
      return NextResponse.json({ success: false, error: "Slug kategori sudah digunakan oleh kategori lain." }, { status: 409 })
    }

    await execute(
      "UPDATE categories SET name = ?, slug = ?, iconName = ?, description = ? WHERE id = ?",
      [name.trim(), slug.trim(), iconName?.trim() || "BookOpen", description?.trim() || "", categoryId]
    )

    // Update categoryName in books denormalized column as well for instant consistency
    await execute("UPDATE books SET categoryName = ? WHERE categoryId = ?", [name.trim(), categoryId])

    return NextResponse.json({ success: true, message: "Kategori berhasil diperbarui!" })
  } catch (err) {
    console.error("Failed to update category:", err)
    return NextResponse.json({ success: false, error: "Gagal memperbarui kategori." }, { status: 500 })
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
    const categoryId = parseInt(id, 10)
    if (!categoryId) {
      return NextResponse.json({ success: false, error: "ID kategori tidak valid." }, { status: 400 })
    }

    // Check if category exists
    const cat = await queryOne<{ id: number; name: string }>(
      "SELECT id, name FROM categories WHERE id = ? LIMIT 1",
      [categoryId]
    )
    if (!cat) {
      return NextResponse.json({ success: false, error: "Kategori tidak ditemukan." }, { status: 404 })
    }

    // Set books with this category to NULL so books are not orphaned
    await execute("UPDATE books SET categoryId = NULL, categoryName = 'Umum' WHERE categoryId = ?", [categoryId])

    // Delete category
    await execute("DELETE FROM categories WHERE id = ?", [categoryId])

    return NextResponse.json({ success: true, message: `Kategori '${cat.name}' berhasil dihapus.` })
  } catch (err) {
    console.error("Failed to delete category:", err)
    return NextResponse.json({ success: false, error: "Gagal menghapus kategori." }, { status: 500 })
  }
}
