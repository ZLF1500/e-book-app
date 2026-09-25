import { NextResponse } from "next/server"
import { query } from "@/lib/db"

interface CategoryRow {
  id: number
  name: string
  slug: string
  iconName: string | null
  description: string | null
  bookCount: number
}

export async function GET() {
  try {
    const rows = await query<CategoryRow>(`
      SELECT c.id, c.name, c.slug, c.iconName, c.description,
             (SELECT COUNT(*) FROM books b WHERE b.categoryId = c.id AND b.status = 'aktif') as bookCount
      FROM categories c
      ORDER BY c.name ASC
    `)

    const categories = rows.map((r) => ({
      id: String(r.id),
      name: r.name,
      slug: r.slug,
      iconName: r.iconName || "BookOpen",
      description: r.description || "",
      bookCount: Number(r.bookCount) || 0,
    }))

    return NextResponse.json({ success: true, categories })
  } catch (err) {
    console.error("Failed to load public categories:", err)
    return NextResponse.json({ success: false, error: "Gagal memuat kategori." }, { status: 500 })
  }
}
