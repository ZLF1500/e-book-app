import { NextResponse } from "next/server"
import { query } from "@/lib/db"

interface BookRow {
  id: number
  title: string
  slug: string
  synopsis: string | null
  coverUrl: string | null
  authorId: number | null
  publisherId: number | null
  categoryId: number | null
  authorName: string | null
  publisherName: string | null
  categoryName: string | null
  isbn: string | null
  publishYear: number | null
  language: string
  pageCount: number
  status: "aktif" | "nonaktif"
  isFeatured: number
  loanCount: number
  averageRating: number
  reviewCount?: number
  realReviewCount?: number
  realAvgRating?: number | null
  pdfAvailable: number
  epubAvailable: number
  createdAt: string
  tagNames?: string | null
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get("q") || ""
    const category = searchParams.get("category") || ""
    const status = searchParams.get("status") || ""
    const featured = searchParams.get("featured") || ""
    const format = searchParams.get("format") || ""
    const language = searchParams.get("language") || ""
    const tag = searchParams.get("tag") || ""

    let sql = `
      SELECT b.*,
             (SELECT filePath FROM book_files WHERE bookId = b.id AND format = 'PDF' LIMIT 1) as pdfFilePath,
             (SELECT filePath FROM book_files WHERE bookId = b.id AND format = 'EPUB' LIMIT 1) as epubFilePath,
             (SELECT COUNT(*) FROM reviews WHERE bookId = b.id) as realReviewCount,
             (SELECT AVG(rating) FROM reviews WHERE bookId = b.id) as realAvgRating,
             (SELECT GROUP_CONCAT(t.name SEPARATOR ', ')
              FROM book_tags bt
              JOIN tags t ON bt.tagId = t.id
              WHERE bt.bookId = b.id) as tagNames
      FROM books b
      WHERE 1=1
    `
    const params: (string | number)[] = []

    if (search.trim()) {
      sql += ` AND (
        b.title LIKE ? OR 
        b.authorName LIKE ? OR 
        b.synopsis LIKE ? OR 
        b.isbn LIKE ? OR 
        b.id IN (SELECT bt2.bookId FROM book_tags bt2 JOIN tags t2 ON bt2.tagId = t2.id WHERE t2.name LIKE ? OR t2.slug LIKE ?)
      )`
      const wild = `%${search.trim()}%`
      params.push(wild, wild, wild, wild, wild, wild)
    }

    if (tag && tag !== "all") {
      sql += " AND b.id IN (SELECT bt.bookId FROM book_tags bt JOIN tags t ON bt.tagId = t.id WHERE t.slug = ? OR t.name = ?)"
      params.push(tag, tag)
    }

    if (category && category !== "all") {
      sql += " AND (b.categoryId = ? OR b.categoryName = ? OR b.categoryId IN (SELECT id FROM categories WHERE slug = ?))"
      const catNum = parseInt(category, 10) || 0
      params.push(catNum, category, category)
    }

    if (status && status !== "all") {
      sql += " AND b.status = ?"
      params.push(status)
    }

    if (featured === "1" || featured === "true") {
      sql += " AND b.isFeatured = 1"
    }

    if (format === "pdf") {
      sql += " AND b.pdfAvailable = 1"
    } else if (format === "epub") {
      sql += " AND b.epubAvailable = 1"
    }

    if (language && language !== "all") {
      sql += " AND b.language = ?"
      params.push(language)
    }

    sql += " ORDER BY b.isFeatured DESC, b.loanCount DESC, b.id DESC"

    const rows = await query<BookRow>(sql, params)

    const books = rows.map((r) => {
      const revCount = Number(r.realReviewCount ?? r.reviewCount ?? 0)
      const avgRating =
        revCount > 0 && r.realAvgRating !== null && r.realAvgRating !== undefined
          ? Number(Number(r.realAvgRating).toFixed(1))
          : revCount > 0 && r.averageRating
          ? Number(Number(r.averageRating).toFixed(1))
          : 0

      return {
        id: String(r.id),
        title: r.title,
        slug: r.slug,
        synopsis: r.synopsis || "",
        coverUrl: r.coverUrl || "/placeholder.jpg",
        authorId: r.authorId ? `a${r.authorId}` : "a1",
        authorName: r.authorName || "Pustakawan RSJD",
        publisherId: r.publisherId ? `p${r.publisherId}` : "p1",
        publisherName: r.publisherName || "Penerbit RSJD",
        categoryId: r.categoryId ? String(r.categoryId) : "1",
        categoryName: r.categoryName || "Umum",
        isbn: r.isbn || "-",
        publishYear: r.publishYear || 2026,
        language: r.language || "Indonesia",
        pageCount: r.pageCount || 200,
        status: r.status,
        isFeatured: Boolean(r.isFeatured),
        loanCount: r.loanCount || 0,
        averageRating: avgRating,
        reviewCount: revCount,
        tags: r.tagNames ? r.tagNames.split(", ").map((t) => t.trim()) : [],
        formats: {
          pdf: { available: Boolean(r.pdfAvailable), status: "aktif" },
          epub: { available: Boolean(r.epubAvailable), status: "aktif" },
        },
        pdfUrl: (r as unknown as { pdfFilePath?: string }).pdfFilePath || null,
        epubUrl: (r as unknown as { epubFilePath?: string }).epubFilePath || null,
        fileUrl: (r as unknown as { pdfFilePath?: string; epubFilePath?: string }).pdfFilePath || (r as unknown as { pdfFilePath?: string; epubFilePath?: string }).epubFilePath || null,
      }
    })

    return NextResponse.json({ success: true, books, total: books.length })
  } catch (err) {
    console.error("Failed to load public books:", err)
    return NextResponse.json({ success: false, error: "Gagal memuat katalog buku." }, { status: 500 })
  }
}
