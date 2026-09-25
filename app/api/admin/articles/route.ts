import { NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import { query, queryOne } from "@/lib/db"

interface ArticleRow {
  id: number
  title: string
  slug: string
  thumbnailUrl: string | null
  excerpt: string
  content: string | null
  authorName: string
  readTime: string
  category: string
  publishedAt: string
  createdAt: string
  updatedAt: string
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

// GET: Ambil daftar seluruh artikel / blog untuk panel admin
export async function GET() {
  const auth = await verifyAdminSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const rows = await query<ArticleRow>(
      "SELECT * FROM articles ORDER BY publishedAt DESC, id DESC"
    )

    const articles = rows.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      thumbnailUrl: r.thumbnailUrl || "",
      excerpt: r.excerpt,
      content: r.content || "",
      authorName: r.authorName,
      readTime: r.readTime || "5 menit baca",
      category: r.category || "Tips Kesehatan Jiwa",
      publishedAt: r.publishedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }))

    return NextResponse.json({ success: true, articles })
  } catch (err) {
    console.error("Admin GET /api/admin/articles error:", err)
    return NextResponse.json(
      { success: false, error: "Gagal memuat daftar artikel." },
      { status: 500 }
    )
  }
}

// POST: Buat artikel / blog baru
export async function POST(request: Request) {
  const auth = await verifyAdminSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json()
    const {
      title,
      slug: customSlug,
      thumbnailUrl,
      excerpt,
      content,
      authorName,
      readTime,
      category,
    } = body

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: "Judul artikel wajib diisi." },
        { status: 400 }
      )
    }

    if (!excerpt || !excerpt.trim()) {
      return NextResponse.json(
        { success: false, error: "Ringkasan / excerpt artikel wajib diisi." },
        { status: 400 }
      )
    }

    // Slug generation
    let slug = customSlug ? generateSlug(customSlug) : generateSlug(title)
    if (!slug) {
      slug = `artikel-${Date.now()}`
    }

    // Check duplicate slug
    const existing = await queryOne<{ id: number }>(
      "SELECT id FROM articles WHERE slug = ? LIMIT 1",
      [slug]
    )
    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`
    }

    const cleanAuthor = (authorName && authorName.trim()) || auth.user.name || "Pustakawan RSJD"
    const cleanReadTime = (readTime && readTime.trim()) || "4 menit baca"
    const cleanCategory = (category && category.trim()) || "Tips Kesehatan Jiwa"
    const cleanThumbnail = (thumbnailUrl && thumbnailUrl.trim()) || "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&auto=format&fit=crop&q=80"
    const cleanContent = content ? content.trim() : excerpt.trim()

    const result = await query<{ insertId: number }>(
      `INSERT INTO articles (title, slug, thumbnailUrl, excerpt, content, authorName, readTime, category, publishedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        title.trim(),
        slug,
        cleanThumbnail,
        excerpt.trim(),
        cleanContent,
        cleanAuthor,
        cleanReadTime,
        cleanCategory,
      ]
    )

    const insertId = (result as any).insertId || result[0]?.insertId

    const newArticle = await queryOne<ArticleRow>(
      "SELECT * FROM articles WHERE id = ? LIMIT 1",
      [insertId]
    )

    return NextResponse.json({
      success: true,
      message: "Artikel edukasi berhasil diterbitkan!",
      article: newArticle,
    })
  } catch (err: any) {
    console.error("Admin POST /api/admin/articles error:", err)
    return NextResponse.json(
      { success: false, error: err.message || "Gagal menerbitkan artikel baru." },
      { status: 500 }
    )
  }
}
