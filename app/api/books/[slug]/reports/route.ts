import { NextResponse } from "next/server"
import { verifyUserSession } from "@/lib/user-auth"
import { queryOne, execute, query } from "@/lib/db"
import { createNotification } from "@/lib/notifications"

export const dynamic = "force-dynamic"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await req.json()
    const { format = "PDF", message } = body

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { success: false, error: "Deskripsi kendala wajib diisi." },
        { status: 400 }
      )
    }

    if (message.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: "Deskripsi kendala terlalu singkat. Jelaskan minimal 5 karakter." },
        { status: 400 }
      )
    }

    // Cari buku berdasarkan slug atau id
    const isNumeric = /^\d+$/.test(slug)
    const book = await queryOne<{ id: number; title: string; slug: string }>(
      `SELECT id, title, slug FROM books WHERE ${isNumeric ? "id = ? OR slug = ?" : "slug = ?"} LIMIT 1`,
      isNumeric ? [parseInt(slug, 10), slug] : [slug]
    )

    if (!book) {
      return NextResponse.json({ success: false, error: "Buku tidak ditemukan." }, { status: 404 })
    }

    // Cek sesi user jika login (bisa juga tamu/guest jika tidak login)
    const auth = await verifyUserSession()
    const userId = auth.authorized ? auth.user.id : null

    // Simpan ke tabel book_reports
    const insertResult = await execute(
      `INSERT INTO book_reports (bookId, userId, format, message, status, createdAt)
       VALUES (?, ?, ?, ?, 'baru', NOW())`,
      [book.id, userId, String(format).toUpperCase(), message.trim()]
    )

    // Notifikasi untuk pengguna jika sedang login
    if (userId) {
      await createNotification({
        userId,
        title: "Laporan Kendala Diterima",
        message: `Terima kasih! Laporan kendala Anda terkait berkas buku "${book.title}" telah diterima oleh Tim Pustakawan RSJD.`,
        type: "system",
        link: `/buku/${book.slug}`,
      })
    }

    // Notifikasi untuk seluruh Admin & Super Admin
    try {
      const admins = await query<{ id: number }>(
        "SELECT id FROM users WHERE role IN ('admin', 'super_admin') AND isActive = 1"
      )
      const reporterName = auth.authorized ? auth.user.name : "Tamu Anonim"
      for (const adm of admins) {
        await createNotification({
          userId: adm.id,
          title: "Laporan Kerusakan Berkas Buku",
          message: `${reporterName} melaporkan kendala pada buku "${book.title}": ${message.trim().slice(0, 80)}`,
          type: "admin",
          link: "/admin",
        })
      }
    } catch (adminNotifErr) {
      console.warn("Gagal mengirim notifikasi ke admin:", adminNotifErr)
    }

    return NextResponse.json({
      success: true,
      reportId: insertResult.insertId,
      message: "Laporan kendala berhasil dikirim dan dicatat oleh Tim Pustakawan RSJD.",
    })
  } catch (err: unknown) {
    console.error("Gagal mengirim laporan kendala buku:", err)
    return NextResponse.json(
      { success: false, error: "Gagal menyimpan laporan kendala buku." },
      { status: 500 }
    )
  }
}
