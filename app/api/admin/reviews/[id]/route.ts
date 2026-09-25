import { NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import { queryOne, execute } from "@/lib/db"

export const dynamic = "force-dynamic"

// PATCH: Balas / Edit balasan admin pada ulasan
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const { id } = await params
    const reviewId = parseInt(id, 10)
    if (isNaN(reviewId)) {
      return NextResponse.json({ success: false, error: "ID ulasan tidak valid." }, { status: 400 })
    }

    const body = await req.json()
    const { reply } = body

    if (!reply || typeof reply !== "string" || !reply.trim()) {
      return NextResponse.json(
        { success: false, error: "Isi balasan admin tidak boleh kosong." },
        { status: 400 }
      )
    }

    // Periksa apakah ulasan ada
    const existing = await queryOne<{ id: number; bookId: number; userId: number }>(
      "SELECT id, bookId, userId FROM reviews WHERE id = ? LIMIT 1",
      [reviewId]
    )

    if (!existing) {
      return NextResponse.json({ success: false, error: "Ulasan tidak ditemukan." }, { status: 404 })
    }

    // Update balasan admin dan waktu balas
    await execute(
      "UPDATE reviews SET adminReply = ?, adminReplyAt = NOW() WHERE id = ?",
      [reply.trim(), reviewId]
    )

    // Kirim notifikasi ke pengguna yang menulis ulasan
    try {
      const book = await queryOne<{ title: string; slug: string }>(
        "SELECT title, slug FROM books WHERE id = ? LIMIT 1",
        [existing.bookId]
      )
      if (existing.userId && book) {
        const { createNotification } = await import("@/lib/notifications")
        await createNotification({
          userId: existing.userId,
          title: "Respon Ulasan Pembaca",
          message: `Admin Perpustakaan RSJD telah menanggapi ulasan Anda pada buku "${book.title}".`,
          type: "review_reply",
          link: `/buku/${book.slug}`,
        })
      }
    } catch (notifErr) {
      console.warn("Gagal mengirim notifikasi ulasan:", notifErr)
    }

    const nowFormatted = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })

    return NextResponse.json({
      success: true,
      adminReply: reply.trim(),
      adminReplyAt: nowFormatted,
      message: "Balasan resmi admin berhasil disimpan.",
    })
  } catch (err: unknown) {
    console.error("Gagal membalas ulasan:", err)
    return NextResponse.json(
      { success: false, error: "Gagal menyimpan balasan ulasan." },
      { status: 500 }
    )
  }
}

// DELETE: Hapus balasan admin atau hapus ulasan secara moderasi
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const { id } = await params
    const reviewId = parseInt(id, 10)
    if (isNaN(reviewId)) {
      return NextResponse.json({ success: false, error: "ID ulasan tidak valid." }, { status: 400 })
    }

    const url = new URL(req.url)
    const action = url.searchParams.get("action") || "delete_reply"

    // Periksa apakah ulasan ada
    const existing = await queryOne<{ id: number; bookId: number }>(
      "SELECT id, bookId FROM reviews WHERE id = ? LIMIT 1",
      [reviewId]
    )

    if (!existing) {
      return NextResponse.json({ success: false, error: "Ulasan tidak ditemukan." }, { status: 404 })
    }

    if (action === "delete_review") {
      // Hapus seluruh ulasan (moderasi konten)
      await execute("DELETE FROM reviews WHERE id = ?", [reviewId])

      // Sinkronkan ulang rating & reviewCount buku
      await execute(
        `UPDATE books 
         SET averageRating = COALESCE((SELECT AVG(rating) FROM reviews WHERE bookId = ?), 0),
             reviewCount = (SELECT COUNT(*) FROM reviews WHERE bookId = ?)
         WHERE id = ?`,
        [existing.bookId, existing.bookId, existing.bookId]
      )

      return NextResponse.json({
        success: true,
        action: "delete_review",
        message: "Ulasan berhasil dihapus dari sistem.",
      })
    } else {
      // Hapus hanya balasan admin
      await execute(
        "UPDATE reviews SET adminReply = NULL, adminReplyAt = NULL WHERE id = ?",
        [reviewId]
      )

      return NextResponse.json({
        success: true,
        action: "delete_reply",
        message: "Balasan admin berhasil dihapus.",
      })
    }
  } catch (err: unknown) {
    console.error("Gagal menghapus balasan/ulasan:", err)
    return NextResponse.json(
      { success: false, error: "Gagal menghapus balasan/ulasan." },
      { status: 500 }
    )
  }
}
