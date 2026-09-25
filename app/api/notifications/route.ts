import { NextResponse } from "next/server"
import { verifyUserSession } from "@/lib/user-auth"
import { query, execute, queryOne } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET: Ambil daftar notifikasi untuk user yang sedang login
export async function GET() {
  const auth = await verifyUserSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const notifications = await query<{
      id: number
      userId: number
      title: string
      message: string
      type: string
      link: string | null
      isRead: number
      createdAt: string
    }>(
      `SELECT id, userId, title, message, type, link, isRead, createdAt
       FROM notifications
       WHERE userId = ?
       ORDER BY createdAt DESC
       LIMIT 30`,
      [auth.user.id]
    )

    const unreadResult = await queryOne<{ unreadCount: number }>(
      `SELECT COUNT(*) as unreadCount
       FROM notifications
       WHERE userId = ? AND isRead = 0`,
      [auth.user.id]
    )

    const formatted = notifications.map((n) => ({
      ...n,
      isRead: Boolean(n.isRead),
    }))

    return NextResponse.json({
      success: true,
      notifications: formatted,
      unreadCount: unreadResult?.unreadCount || 0,
    })
  } catch (err: unknown) {
    console.error("Gagal mengambil notifikasi:", err)
    return NextResponse.json(
      { success: false, error: "Gagal mengambil notifikasi." },
      { status: 500 }
    )
  }
}

// PATCH: Tandai notifikasi sebagai sudah dibaca
export async function PATCH(req: Request) {
  const auth = await verifyUserSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = await req.json()
    const { action, notificationId } = body

    if (action === "mark_all_read") {
      await execute(
        "UPDATE notifications SET isRead = 1 WHERE userId = ?",
        [auth.user.id]
      )
      return NextResponse.json({ success: true, message: "Semua notifikasi ditandai dibaca." })
    }

    if (notificationId) {
      await execute(
        "UPDATE notifications SET isRead = 1 WHERE id = ? AND userId = ?",
        [notificationId, auth.user.id]
      )
      return NextResponse.json({ success: true, message: "Notifikasi ditandai dibaca." })
    }

    return NextResponse.json(
      { success: false, error: "Parameter aksi tidak valid." },
      { status: 400 }
    )
  } catch (err: unknown) {
    console.error("Gagal memperbarui status notifikasi:", err)
    return NextResponse.json(
      { success: false, error: "Gagal memperbarui notifikasi." },
      { status: 500 }
    )
  }
}

// DELETE: Hapus notifikasi
export async function DELETE(req: Request) {
  const auth = await verifyUserSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const url = new URL(req.url)
    const id = url.searchParams.get("id")
    const action = url.searchParams.get("action")

    if (action === "clear_read") {
      await execute(
        "DELETE FROM notifications WHERE userId = ? AND isRead = 1",
        [auth.user.id]
      )
      return NextResponse.json({ success: true, message: "Notifikasi yang sudah dibaca berhasil dibersihkan." })
    }

    if (id) {
      await execute(
        "DELETE FROM notifications WHERE id = ? AND userId = ?",
        [parseInt(id, 10), auth.user.id]
      )
      return NextResponse.json({ success: true, message: "Notifikasi berhasil dihapus." })
    }

    return NextResponse.json(
      { success: false, error: "Parameter hapus tidak valid." },
      { status: 400 }
    )
  } catch (err: unknown) {
    console.error("Gagal menghapus notifikasi:", err)
    return NextResponse.json(
      { success: false, error: "Gagal menghapus notifikasi." },
      { status: 500 }
    )
  }
}
