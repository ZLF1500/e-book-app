import { NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import { query, execute, queryOne } from "@/lib/db"
import { createNotification } from "@/lib/notifications"

export const dynamic = "force-dynamic"

interface ReportRow {
  id: number
  bookId: number
  userId: number | null
  format: string
  message: string
  status: "baru" | "diproses" | "selesai"
  createdAt: string
  bookTitle: string
  bookSlug: string
  coverUrl: string | null
  reporterName: string | null
  reporterEmail: string | null
}

export async function GET() {
  const auth = await verifyAdminSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const rows = await query<ReportRow>(`
      SELECT r.id, r.bookId, r.userId, r.format, r.message, r.status, r.createdAt,
             COALESCE(b.title, 'Buku Terhapus') as bookTitle,
             COALESCE(b.slug, '') as bookSlug,
             b.coverUrl,
             COALESCE(u.name, 'Tamu Anonim') as reporterName,
             u.email as reporterEmail
      FROM book_reports r
      LEFT JOIN books b ON r.bookId = b.id
      LEFT JOIN users u ON r.userId = u.id
      ORDER BY r.createdAt DESC
    `)

    return NextResponse.json({ success: true, reports: rows })
  } catch (err) {
    console.error("Failed to load reports:", err)
    return NextResponse.json({ success: false, error: "Gagal memuat laporan masalah buku." }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const auth = await verifyAdminSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = await req.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json({ success: false, error: "ID dan status wajib diisi." }, { status: 400 })
    }

    // Ambil data laporan sebelum update untuk kirim notifikasi
    const report = await queryOne<{ userId: number | null; bookId: number; status: string }>(
      "SELECT userId, bookId, status FROM book_reports WHERE id = ? LIMIT 1",
      [id]
    )

    await execute("UPDATE book_reports SET status = ? WHERE id = ?", [status, id])

    // Jika diubah menjadi selesai dan ada userId pelapor, kirim notifikasi
    if (status === "selesai" && report?.userId) {
      try {
        const book = await queryOne<{ title: string; slug: string }>(
          "SELECT title, slug FROM books WHERE id = ? LIMIT 1",
          [report.bookId]
        )
        if (book) {
          await createNotification({
            userId: report.userId,
            title: "Laporan Kendala Selesai Ditangani",
            message: `Kabar baik! Laporan kendala Anda pada buku "${book.title}" telah selesai diperiksa dan diperbaiki oleh Tim Pustakawan RSJD. Terima kasih atas partisipasi Anda!`,
            type: "system",
            link: `/buku/${book.slug}`,
          })
        }
      } catch (notifErr) {
        console.warn("Gagal mengirim notifikasi penyelesaian laporan:", notifErr)
      }
    }

    return NextResponse.json({ success: true, message: `Status laporan berhasil diperbarui menjadi ${status}!` })
  } catch (err) {
    console.error("Failed to update report:", err)
    return NextResponse.json({ success: false, error: "Gagal memperbarui status laporan." }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const auth = await verifyAdminSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const url = new URL(req.url)
    const id = url.searchParams.get("id")

    if (!id) {
      return NextResponse.json({ success: false, error: "ID laporan wajib disertakan." }, { status: 400 })
    }

    await execute("DELETE FROM book_reports WHERE id = ?", [parseInt(id, 10)])
    return NextResponse.json({ success: true, message: "Laporan berhasil dihapus." })
  } catch (err) {
    console.error("Failed to delete report:", err)
    return NextResponse.json({ success: false, error: "Gagal menghapus laporan." }, { status: 500 })
  }
}
