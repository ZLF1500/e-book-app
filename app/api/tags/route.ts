import { NextResponse } from "next/server"
import { query } from "@/lib/db"

interface TagRow {
  id: number
  name: string
  slug: string
  usageCount: number
}

export async function GET() {
  try {
    const rows = await query<TagRow>(`
      SELECT t.id, t.name, t.slug,
             (SELECT COUNT(*) FROM book_tags bt WHERE bt.tagId = t.id) as usageCount
      FROM tags t
      ORDER BY usageCount DESC, t.id DESC
    `)

    const tags = rows.map((r) => ({
      id: String(r.id),
      name: r.name,
      slug: r.slug,
      usageCount: Number(r.usageCount) || 0,
    }))

    return NextResponse.json({ success: true, tags, total: tags.length })
  } catch (err) {
    console.error("Failed to load public tags:", err)
    return NextResponse.json({ success: false, error: "Gagal memuat daftar tag." }, { status: 500 })
  }
}
