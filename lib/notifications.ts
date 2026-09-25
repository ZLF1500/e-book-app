import { execute, query } from "@/lib/db"

export type NotificationType = "review_reply" | "loan" | "due_date" | "system" | "admin"

export interface NotificationItem {
  id: number
  userId: number
  title: string
  message: string
  type: NotificationType
  link: string | null
  isRead: boolean
  createdAt: string
}

export interface CreateNotificationParams {
  userId: number
  title: string
  message: string
  type?: NotificationType
  link?: string | null
}

/**
 * Buat notifikasi baru untuk pengguna tertentu
 */
export async function createNotification(params: CreateNotificationParams): Promise<number | null> {
  try {
    const result = await execute(
      `INSERT INTO notifications (userId, title, message, type, link, isRead, createdAt)
       VALUES (?, ?, ?, ?, ?, 0, NOW())`,
      [
        params.userId,
        params.title,
        params.message,
        params.type || "system",
        params.link || null,
      ]
    )
    return result.insertId || null
  } catch (err) {
    console.error("[Notification Error] Gagal membuat notifikasi:", err)
    return null
  }
}

/**
 * Buat notifikasi untuk semua pengguna (Broadcast)
 */
export async function broadcastNotification(params: Omit<CreateNotificationParams, "userId">): Promise<void> {
  try {
    const users = await query<{ id: number }>("SELECT id FROM users WHERE isActive = 1")
    if (users.length === 0) return

    for (const u of users) {
      await createNotification({
        userId: u.id,
        ...params,
      })
    }
  } catch (err) {
    console.error("[Notification Error] Gagal broadcast notifikasi:", err)
  }
}
