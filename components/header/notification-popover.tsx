"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  CheckCheck,
  Clock,
  BookOpen,
  MessageSquare,
  AlertCircle,
  Trash2,
  ExternalLink,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Check,
} from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { NotificationItem } from "@/lib/notifications"

export function NotificationPopover() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(false)
  const [filter, setFilter] = React.useState<"all" | "unread">("all")

  // Fetch notifikasi dari API
  const fetchNotifications = React.useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true)
    try {
      const res = await fetch("/api/notifications")
      const data = await res.json()
      if (res.ok && data.success) {
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch {
      // ignore network errors
    } finally {
      if (!isSilent) setIsLoading(false)
    }
  }, [])

  // Inisialisasi & Polling interval
  React.useEffect(() => {
    fetchNotifications()

    const handleUpdate = () => {
      fetchNotifications(true)
    }

    window.addEventListener("notifications-updated", handleUpdate)

    // Polling setiap 30 detik
    const interval = setInterval(() => {
      fetchNotifications(true)
    }, 30000)

    return () => {
      window.removeEventListener("notifications-updated", handleUpdate)
      clearInterval(interval)
    }
  }, [fetchNotifications])

  // Tandai satu notifikasi sebagai sudah dibaca
  const markAsRead = async (id: number) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      })
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch {
      // ignore
    }
  }

  // Tandai SEMUA notifikasi sebagai sudah dibaca
  const markAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_all_read" }),
      })
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
        setUnreadCount(0)
        toast.success("Semua notifikasi telah ditandai dibaca.")
      }
    } catch {
      toast.error("Gagal memperbarui notifikasi.")
    }
  }

  // Bersihkan notifikasi yang sudah dibaca
  const clearReadNotifications = async () => {
    try {
      const res = await fetch("/api/notifications?action=clear_read", {
        method: "DELETE",
      })
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => !n.isRead))
        toast.success("Notifikasi yang sudah dibaca berhasil dibersihkan.")
      }
    } catch {
      toast.error("Gagal membersihkan notifikasi.")
    }
  }

  // Klik notifikasi: tandai dibaca & arahkan ke URL target
  const handleItemClick = (item: NotificationItem) => {
    if (!item.isRead) {
      markAsRead(item.id)
    }
    setOpen(false)
    if (item.link) {
      router.push(item.link)
    }
  }

  // Filter list
  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.isRead
    return true
  })

  // Format icon berdasarkan tipe notifikasi
  const renderIcon = (type: string) => {
    switch (type) {
      case "review_reply":
        return (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <MessageSquare className="h-4 w-4" />
          </div>
        )
      case "loan":
        return (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <BookOpen className="h-4 w-4" />
          </div>
        )
      case "due_date":
        return (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Clock className="h-4 w-4" />
          </div>
        )
      case "admin":
        return (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <ShieldCheck className="h-4 w-4" />
          </div>
        )
      default:
        return (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-neutral-500/10 text-neutral-600 dark:text-neutral-400">
            <Bell className="h-4 w-4" />
          </div>
        )
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative h-9 w-9 text-xs font-semibold rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer",
            open
              ? "bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 font-bold border border-sky-200/80 dark:border-sky-800/80 shadow-xs"
              : "text-neutral-700 dark:text-neutral-300 hover:text-sky-600 hover:bg-neutral-100 dark:hover:bg-neutral-900 border border-transparent"
          )}
          title={unreadCount > 0 ? `${unreadCount} Notifikasi Belum Dibaca` : "Pemberitahuan & Notifikasi"}
          aria-label="Pemberitahuan"
        >
          <Bell className={cn("h-4 w-4", unreadCount > 0 && "animate-bounce text-sky-600 dark:text-sky-400")} />

          {/* Badge Unread Count */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-xs">
              <span className="animate-ping absolute -inset-0.5 rounded-full bg-rose-400 opacity-60"></span>
              <span className="relative z-10">{unreadCount > 9 ? "9+" : unreadCount}</span>
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[330px] sm:w-[380px] p-0 rounded-3xl border-border bg-card shadow-2xl overflow-hidden"
      >
        {/* Header Popover */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/60 bg-muted/30">
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-sm font-bold text-foreground">
              Notifikasi
            </h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20">
                {unreadCount} Baru
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer px-1.5 py-1 rounded-md hover:bg-sky-50 dark:hover:bg-sky-950/40"
                title="Tandai semua dibaca"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Tandai Dibaca</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => fetchNotifications()}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted cursor-pointer transition-colors"
              title="Perbarui notifikasi"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin text-sky-600")} />
            </button>
          </div>
        </div>

        {/* Filter Tab (Semua vs Belum Dibaca) */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border/40 bg-muted/10 text-xs">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer",
              filter === "all"
                ? "bg-foreground text-background shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Semua ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={cn(
              "px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer",
              filter === "unread"
                ? "bg-foreground text-background shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Belum Dibaca ({unreadCount})
          </button>
        </div>

        {/* Daftar Notifikasi */}
        <div className="max-h-[340px] overflow-y-auto divide-y divide-border/40">
          {isLoading && notifications.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Spinner className="h-5 w-5 mx-auto text-sky-600" />
              <p className="text-xs text-muted-foreground">Memuat notifikasi...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-2.5">
              <div className="w-10 h-10 mx-auto rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center">
                <Bell className="h-5 w-5 opacity-40" />
              </div>
              <p className="text-xs font-semibold text-foreground">
                {filter === "unread" ? "Tidak ada notifikasi belum dibaca" : "Belum ada notifikasi"}
              </p>
              <p className="text-[11px] text-muted-foreground max-w-xs mx-auto leading-relaxed">
                Pemberitahuan aktivitas peminjaman buku, pengembalian, dan balasan ulasan akan muncul di sini.
              </p>
            </div>
          ) : (
            filteredNotifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={cn(
                  "p-3.5 flex items-start gap-3 transition-colors cursor-pointer group hover:bg-muted/50",
                  !item.isRead ? "bg-sky-50/50 dark:bg-sky-950/20" : "bg-card"
                )}
              >
                {/* Icon Tipe */}
                {renderIcon(item.type)}

                {/* Konten Notifikasi */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <p className={cn("text-xs font-bold truncate", !item.isRead ? "text-foreground font-black" : "text-foreground/80")}>
                      {item.title}
                    </p>
                    <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                      {new Date(item.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                    {item.message}
                  </p>

                  <div className="flex items-center justify-between pt-0.5">
                    {item.link ? (
                      <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 group-hover:underline flex items-center gap-1">
                        <span>Buka</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </span>
                    ) : <span />}

                    {!item.isRead && (
                      <span className="flex h-2 w-2 rounded-full bg-sky-500 ring-2 ring-sky-500/20" />
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Popover */}
        {notifications.some((n) => n.isRead) && (
          <div className="px-4 py-2.5 border-t border-border/60 bg-muted/20 flex items-center justify-between text-xs">
            <span className="text-[11px] text-muted-foreground">
              {notifications.length} notifikasi tercatat
            </span>
            <button
              type="button"
              onClick={clearReadNotifications}
              className="text-[11px] font-semibold text-muted-foreground hover:text-rose-500 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              <span>Bersihkan Terbaca</span>
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
