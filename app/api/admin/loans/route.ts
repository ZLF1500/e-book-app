import { NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import { query, execute } from "@/lib/db"

interface LoanRow {
  id: number
  userId: number
  bookId: number
  durationDays: number
  borrowedAt: string
  dueAt: string
  status: "aktif" | "kembali" | "terlambat"
  userName: string
  userEmail: string
  userNik: string | null
  userAvatar: string | null
  bookTitle: string
  bookSlug: string
  bookCover: string | null
  categoryName: string | null
}

export async function GET() {
  const auth = await verifyAdminSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    // 1. Sinkronkan status terlambat jika melewati dueAt
    await execute("UPDATE loans SET status = 'kembali' WHERE status = 'aktif' AND dueAt < NOW()")

    // 2. Ambil seluruh data peminjaman lintas pengguna
    const rows = await query<LoanRow>(`
      SELECT l.id, l.userId, l.bookId, l.durationDays, l.borrowedAt, l.dueAt, l.status,
             u.name as userName, u.email as userEmail, u.nik as userNik, u.avatarUrl as userAvatar,
             b.title as bookTitle, b.slug as bookSlug, b.coverUrl as bookCover, b.categoryName
      FROM loans l
      JOIN users u ON l.userId = u.id
      JOIN books b ON l.bookId = b.id
      ORDER BY l.borrowedAt DESC
    `)

    return NextResponse.json({ success: true, loans: rows })
  } catch (err) {
    console.error("Failed to load loans:", err)
    return NextResponse.json({ success: false, error: "Gagal memuat data peminjaman." }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const auth = await verifyAdminSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = await req.json()
    const { id, status, action } = body

    if (!id) {
      return NextResponse.json({ success: false, error: "ID peminjaman wajib diisi." }, { status: 400 })
    }

    if (action === "extend") {
      await execute(
        "UPDATE loans SET dueAt = DATE_ADD(dueAt, INTERVAL 7 DAY), durationDays = durationDays + 7, status = 'aktif' WHERE id = ?",
        [id]
      )
      return NextResponse.json({ success: true, message: "Masa peminjaman berhasil diperpanjang 7 hari!" })
    }

    const newStatus = status || "kembali"
    await execute("UPDATE loans SET status = ? WHERE id = ?", [newStatus, id])

    return NextResponse.json({ success: true, message: "Status peminjaman berhasil diperbarui!" })
  } catch (err) {
    console.error("Failed to update loan:", err)
    return NextResponse.json({ success: false, error: "Gagal memperbarui status peminjaman." }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const auth = await verifyAdminSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ success: false, error: "ID peminjaman wajib diisi." }, { status: 400 })
    }

    await execute("DELETE FROM loans WHERE id = ?", [id])
    return NextResponse.json({ success: true, message: "Catatan peminjaman berhasil dihapus dari basis data." })
  } catch (err) {
    console.error("Failed to delete loan:", err)
    return NextResponse.json({ success: false, error: "Gagal menghapus data peminjaman." }, { status: 500 })
  }
}
