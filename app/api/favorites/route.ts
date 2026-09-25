import { NextResponse } from "next/server"
import { verifyUserSession } from "@/lib/user-auth"
import { query, queryOne, execute } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET: Ambil semua bookId yang difavoritkan / di-bookmark oleh pengguna saat ini
export async function GET() {
  const auth = await verifyUserSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: true, favorites: [] })
  }

  try {
    const rows = await query<{ bookId: number }>(
      "SELECT bookId FROM favorites WHERE userId = ? ORDER BY createdAt DESC",
      [auth.user.id]
    )

    const favorites = rows.map((r) => String(r.bookId))
    return NextResponse.json({ success: true, favorites })
  } catch (err) {
    console.error("Failed to fetch favorites:", err)
    return NextResponse.json({ success: false, error: "Gagal memuat daftar favorit." }, { status: 500 })
  }
}

// POST: Tambah atau Toggle Bookmark ke Database MariaDB
export async function POST(req: Request) {
  const auth = await verifyUserSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = await req.json()
    const { bookId, action } = body

    if (!bookId) {
      return NextResponse.json({ success: false, error: "Parameter bookId wajib disertakan." }, { status: 400 })
    }

    // Resolusi numeric ID buku
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

    // Cek apakah sudah ada di favorit
    const existing = await queryOne<{ bookId: number }>(
      "SELECT bookId FROM favorites WHERE userId = ? AND bookId = ? LIMIT 1",
      [auth.user.id, numericId]
    )

    let isFavorite: boolean

    if (action === "remove" || (action === "toggle" && existing) || (!action && existing)) {
      await execute("DELETE FROM favorites WHERE userId = ? AND bookId = ?", [auth.user.id, numericId])
      isFavorite = false
    } else {
      await execute(
        "INSERT INTO favorites (userId, bookId, createdAt) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE createdAt = NOW()",
        [auth.user.id, numericId]
      )
      isFavorite = true
    }

    return NextResponse.json({
      success: true,
      isFavorite,
      bookId: String(numericId),
      message: isFavorite ? "Buku berhasil ditambahkan ke bookmark." : "Buku dihapus dari bookmark.",
    })
  } catch (err) {
    console.error("Failed to toggle favorite:", err)
    return NextResponse.json({ success: false, error: "Gagal memperbarui status favorit." }, { status: 500 })
  }
}

// DELETE: Hapus bookmark spesifik
export async function DELETE(req: Request) {
  const auth = await verifyUserSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { searchParams } = new URL(req.url)
  const bookId = searchParams.get("bookId")
  if (!bookId) {
    return NextResponse.json({ success: false, error: "Parameter bookId wajib disertakan." }, { status: 400 })
  }

  try {
    const numericId = parseInt(bookId, 10)
    if (numericId) {
      await execute("DELETE FROM favorites WHERE userId = ? AND bookId = ?", [auth.user.id, numericId])
    }

    return NextResponse.json({ success: true, message: "Bookmark berhasil dihapus." })
  } catch (err) {
    console.error("Failed to delete favorite:", err)
    return NextResponse.json({ success: false, error: "Gagal menghapus favorit." }, { status: 500 })
  }
}
