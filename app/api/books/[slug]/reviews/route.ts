import { NextResponse } from "next/server"
import { verifyUserSession } from "@/lib/user-auth"
import { queryOne, execute } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await verifyUserSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const { slug } = await params
    const body = await req.json()
    const { rating, comment } = body

    if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: "Rating wajib diisi dengan nilai 1 sampai 5." },
        { status: 400 }
      )
    }

    if (!comment || typeof comment !== "string" || !comment.trim()) {
      return NextResponse.json(
        { success: false, error: "Ulasan tidak boleh kosong." },
        { status: 400 }
      )
    }

    // Cari buku berdasarkan slug atau id
    const isNumeric = /^\d+$/.test(slug)
    const book = await queryOne<{ id: number; title: string }>(
      `SELECT id, title FROM books WHERE ${isNumeric ? "id = ? OR slug = ?" : "slug = ?"} LIMIT 1`,
      isNumeric ? [parseInt(slug, 10), slug] : [slug]
    )

    if (!book) {
      return NextResponse.json({ success: false, error: "Buku tidak ditemukan." }, { status: 404 })
    }

    // Cek apakah pengguna sudah pernah memberikan ulasan untuk buku ini
    const existingReview = await queryOne<{ id: number }>(
      "SELECT id FROM reviews WHERE userId = ? AND bookId = ? LIMIT 1",
      [auth.user.id, book.id]
    )

    let reviewId: number
    if (existingReview) {
      await execute(
        "UPDATE reviews SET rating = ?, comment = ?, createdAt = NOW() WHERE id = ?",
        [Math.round(rating), comment.trim(), existingReview.id]
      )
      reviewId = existingReview.id
    } else {
      const insertResult = await execute(
        "INSERT INTO reviews (userId, bookId, rating, comment, createdAt) VALUES (?, ?, ?, ?, NOW())",
        [auth.user.id, book.id, Math.round(rating), comment.trim()]
      )
      reviewId = insertResult.insertId
    }

    // Update rating buku secara otomatis di tabel books
    await execute(
      `UPDATE books 
       SET averageRating = COALESCE((SELECT AVG(rating) FROM reviews WHERE bookId = ?), 0),
           reviewCount = (SELECT COUNT(*) FROM reviews WHERE bookId = ?)
       WHERE id = ?`,
      [book.id, book.id, book.id]
    )

    const newReview = {
      id: String(reviewId),
      userName: auth.user.name,
      userAvatar: auth.user.avatarUrl || "/placeholder-avatar.png",
      rating: Math.round(rating),
      comment: comment.trim(),
      createdAt: "Baru saja",
    }

    return NextResponse.json({ success: true, review: newReview })
  } catch (err: unknown) {
    console.error("Gagal menambahkan ulasan:", err)
    return NextResponse.json({ success: false, error: "Gagal menyimpan ulasan." }, { status: 500 })
  }
}
