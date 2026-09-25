import { NextResponse } from "next/server"
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

function formatIndonesianDate(dateStr: string | Date): string {
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return String(dateStr)
    const months = [
      "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
      "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
    ]
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
  } catch {
    return String(dateStr)
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get("slug")
    const category = searchParams.get("category")
    const limit = searchParams.get("limit")

    if (slug) {
      const article = await queryOne<ArticleRow>(
        "SELECT * FROM articles WHERE slug = ? LIMIT 1",
        [slug]
      )

      if (!article) {
        return NextResponse.json({ success: false, error: "Artikel tidak ditemukan." }, { status: 404 })
      }

      const contentParagraphs = article.content
        ? article.content.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
        : [article.excerpt]

      return NextResponse.json({
        success: true,
        article: {
          id: String(article.id),
          title: article.title,
          slug: article.slug,
          thumbnailUrl: article.thumbnailUrl || "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&auto=format&fit=crop&q=80",
          excerpt: article.excerpt,
          content: contentParagraphs,
          rawContent: article.content || "",
          authorName: article.authorName,
          readTime: article.readTime,
          category: article.category,
          publishedAt: formatIndonesianDate(article.publishedAt),
          publishedAtRaw: article.publishedAt,
        },
      })
    }

    let sql = "SELECT * FROM articles WHERE 1=1"
    const params: unknown[] = []

    if (category && category !== "Semua") {
      sql += " AND category = ?"
      params.push(category)
    }

    sql += " ORDER BY publishedAt DESC, id DESC"

    if (limit && !isNaN(Number(limit))) {
      sql += " LIMIT ?"
      params.push(Number(limit))
    }

    const rows = await query<ArticleRow>(sql, params)

    const articles = rows.map((article) => {
      const contentParagraphs = article.content
        ? article.content.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
        : [article.excerpt]

      return {
        id: String(article.id),
        title: article.title,
        slug: article.slug,
        thumbnailUrl: article.thumbnailUrl || "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&auto=format&fit=crop&q=80",
        excerpt: article.excerpt,
        content: contentParagraphs,
        rawContent: article.content || "",
        authorName: article.authorName,
        readTime: article.readTime,
        category: article.category,
        publishedAt: formatIndonesianDate(article.publishedAt),
        publishedAtRaw: article.publishedAt,
      }
    })

    return NextResponse.json({ success: true, articles })
  } catch (err) {
    console.error("Failed to fetch public articles:", err)
    return NextResponse.json(
      { success: false, error: "Gagal memuat artikel edukasi." },
      { status: 500 }
    )
  }
}
