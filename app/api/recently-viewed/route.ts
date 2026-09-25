import { NextResponse } from "next/server"
import { verifyUserSession } from "@/lib/user-auth"
import { query, queryOne, execute } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET: Ambil daftar buku yang baru dilihat oleh pengguna dari MariaDB
export async function GET() {
  const auth = await verifyUserSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: true, books: [] })
  }

  try {
    const rows = await query<any>(
      `SELECT b.id, b.title, b.slug, b.coverUrl, b.authorName, b.categoryName, b.loanCount, b.averageRating, b.language, b.status
       FROM recently_viewed rv
       JOIN books b ON rv.bookId = b.id
       WHERE rv.userId = ?
       ORDER BY rv.viewedAt DESC
       LIMIT 15`,
      [auth.user.id]
    )

    const books = rows.map((b) => ({
      ...b,
      id: String(b.id),
      averageRating: Number(b.averageRating) || 5.0,
      loanCount: Number(b.loanCount) || 0,
    }))

    return NextResponse.json({ success: true, books })
  } catch (err) {
    console.error("Failed to load recently viewed books from DB:", err)
    return NextResponse.json({ success: false, error: "Gagal memuat riwayat bacaan." }, { status: 500 })
  }
}

// POST: Catat buku yang baru dilihat ke tabel recently_viewed di MariaDB
export async function POST(req: Request) {
  const auth = await verifyUserSession()
  if (!auth.authorized) {
    // Guest viewing - safe no-op
    return NextResponse.json({ success: true, message: "Aksi tamu dicatat secara lokal." })
  }

  try {
    const body = await req.json()
    const { bookId } = body

    if (!bookId) {
      return NextResponse.json({ success: false, error: "Parameter bookId wajib disertakan." }, { status: 400 })
    }

    let numericId: number | null = null
    const parsed = parseInt(String(bookId), 10)
    if (!isNaN(parsed) && parsed > 0) {
      const b = await queryOne<{ id: number }>("SELECT id FROM books WHERE id = ? LIMIT 1", [parsed])
      if (b) numericId = b.id
    }

    if (!numericId) {
      const bSlug = await queryOne<{ id: number }>("SELECT id FROM books WHERE slug = ? LIMIT 1", [String(bookId).trim()])
      if (bSlug) numericId = bSlug.id
    }

    if (!numericId) {
      return NextResponse.json({ success: false, error: "Buku tidak ditemukan." }, { status: 404 })
    }

    await execute(
      `INSERT INTO recently_viewed (userId, bookId, viewedAt)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE viewedAt = NOW()`,
      [auth.user.id, numericId]
    )

    return NextResponse.json({ success: true, bookId: String(numericId) })
  } catch (err) {
    console.error("Failed to record recently viewed:", err)
    return NextResponse.json({ success: false, error: "Gagal mencatat riwayat buku." }, { status: 500 })
  }
}
