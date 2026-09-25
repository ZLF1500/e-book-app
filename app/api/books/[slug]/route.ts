import { NextResponse } from "next/server"
import { queryOne, query } from "@/lib/db"

interface BookDetailRow {
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
  pdfAvailable: number
  epubAvailable: number
  createdAt: string
  authorBio?: string | null
  authorPhoto?: string | null
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const isNumeric = /^\d+$/.test(slug)
    const sql = `
      SELECT b.*, a.bio as authorBio, a.photoUrl as authorPhoto,
             (SELECT filePath FROM book_files WHERE bookId = b.id AND format = 'PDF' LIMIT 1) as pdfFilePath,
             (SELECT filePath FROM book_files WHERE bookId = b.id AND format = 'EPUB' LIMIT 1) as epubFilePath
      FROM books b
      LEFT JOIN authors a ON b.authorId = a.id
      WHERE ${isNumeric ? "b.id = ? OR b.slug = ?" : "b.slug = ?"}
      LIMIT 1
    `
    const queryParams = isNumeric ? [parseInt(slug, 10), slug] : [slug]

    const book = await queryOne<BookDetailRow>(sql, queryParams)
    if (!book) {
      return NextResponse.json({ success: false, error: "Buku tidak ditemukan." }, { status: 404 })
    }

    const tags = await query<{ name: string }>(
      "SELECT t.name FROM tags t JOIN book_tags bt ON t.id = bt.tagId WHERE bt.bookId = ?",
      [book.id]
    )

    let reviews: Array<{
      id: number
      userId: number
      rating: number
      comment: string | null
      adminReply: string | null
      adminReplyAt: string | null
      createdAt: string
      userName: string
      userAvatar: string | null
    }> = []

    try {
      reviews = await query<{
        id: number
        userId: number
        rating: number
        comment: string | null
        adminReply: string | null
        adminReplyAt: string | null
        createdAt: string
        userName: string
        userAvatar: string | null
      }>(
        `SELECT r.id, r.userId, r.rating, r.comment, r.adminReply, r.adminReplyAt, r.createdAt,
                u.name as userName, u.avatarUrl as userAvatar
         FROM reviews r
         JOIN users u ON r.userId = u.id
         WHERE r.bookId = ?
         ORDER BY r.createdAt DESC`,
        [book.id]
      )
    } catch {
      reviews = []
    }

    const reviewCount = reviews.length
    const averageRating =
      reviewCount > 0
        ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / reviewCount).toFixed(1))
        : 0

    const formattedReviews = reviews.map((r) => ({
      id: String(r.id),
      userName: r.userName || "Pembaca Terdaftar",
      userAvatar: r.userAvatar || "/placeholder-avatar.png",
      rating: r.rating,
      comment: r.comment || "",
      createdAt: new Date(r.createdAt).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      adminReply: r.adminReply || undefined,
      adminReplyAt: r.adminReplyAt
        ? new Date(r.adminReplyAt).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : undefined,
    }))

    const formatted = {
      id: String(book.id),
      title: book.title,
      slug: book.slug,
      synopsis: book.synopsis || "",
      coverUrl: book.coverUrl || "/placeholder.jpg",
      authorId: book.authorId ? `a${book.authorId}` : "a1",
      authorName: book.authorName || "Pustakawan RSJD",
      authorPhoto: book.authorPhoto || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      publisherId: book.publisherId ? `p${book.publisherId}` : "p1",
      publisherName: book.publisherName || "Penerbit RSJD",
      categoryId: book.categoryId ? String(book.categoryId) : "1",
      categoryName: book.categoryName || "Umum",
      isbn: book.isbn || "-",
      publishYear: book.publishYear || 2026,
      language: book.language || "Indonesia",
      pageCount: book.pageCount || 200,
      status: book.status,
      isFeatured: Boolean(book.isFeatured),
      loanCount: book.loanCount || 0,
      averageRating: averageRating,
      reviewCount: reviewCount,
      reviews: formattedReviews,
      tags: tags.map((t) => t.name),
      formats: {
        pdf: { available: Boolean(book.pdfAvailable), status: "aktif" },
        epub: { available: Boolean(book.epubAvailable), status: "aktif" },
      },
      pdfUrl: (book as unknown as { pdfFilePath?: string }).pdfFilePath || null,
      epubUrl: (book as unknown as { epubFilePath?: string }).epubFilePath || null,
      fileUrl: (book as unknown as { pdfFilePath?: string; epubFilePath?: string }).pdfFilePath || (book as unknown as { pdfFilePath?: string; epubFilePath?: string }).epubFilePath || null,
    }

    return NextResponse.json({ success: true, book: formatted })
  } catch (err) {
    console.error("Failed to load book detail:", err)
    return NextResponse.json({ success: false, error: "Gagal memuat detail buku." }, { status: 500 })
  }
}
