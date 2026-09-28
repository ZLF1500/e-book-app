"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  CheckCheck,
  Clock,
  BookOpen,
  MessageSquare,
  Trash2,
  ExternalLink,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Check,
  X,
  Layers,
  Inbox,
  ArrowRight,
  Info,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { NotificationItem } from "@/lib/notifications"

export interface NotificationPopoverProps {
  isOpen?: boolean
  onToggle?: () => void
  onClose?: () => void
}

type NotificationFilter = "all" | "unread" | "loan" | "review" | "system"

export function NotificationPopover({
  isOpen: controlledOpen,
  onToggle: controlledToggle,
  onClose: controlledClose,
}: NotificationPopoverProps = {}) {
  const router = useRouter()
  const isControlled = typeof controlledOpen === "boolean"
  const [internalOpen, setInternalOpen] = React.useState(false)
  const open = isControlled ? (controlledOpen ?? false) : internalOpen

  const [notifications, setNotifications] = React.useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(false)
  const [filter, setFilter] = React.useState<NotificationFilter>("all")
  const [isMobile, setIsMobile] = React.useState(false)

  const desktopPanelRef = React.useRef<HTMLDivElement>(null)
  const triggerButtonRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== "undefined" && window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const handleToggle = () => {
    if (isControlled && controlledToggle) {
      controlledToggle()
    } else {
      setInternalOpen((prev) => !prev)
    }
  }

  const handleClose = () => {
    if (isControlled && controlledClose) {
      controlledClose()
    } else {
      setInternalOpen(false)
    }
  }

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
    handleClose()
    if (item.link) {
      router.push(item.link)
    }
  }

  // Filter list
  const filteredNotifications = React.useMemo(() => {
    return notifications.filter((n) => {
      if (filter === "unread") return !n.isRead
      if (filter === "loan") return n.type === "loan" || n.type === "due_date"
      if (filter === "review") return n.type === "review_reply"
      if (filter === "system") return n.type === "admin" || n.type === "system"
      return true
    })
  }, [notifications, filter])

  // Count items by category
  const counts = React.useMemo(() => {
    return {
      all: notifications.length,
      unread: notifications.filter((n) => !n.isRead).length,
      loan: notifications.filter((n) => n.type === "loan" || n.type === "due_date").length,
      review: notifications.filter((n) => n.type === "review_reply").length,
      system: notifications.filter((n) => n.type === "admin" || n.type === "system").length,
    }
  }, [notifications])

  // Format relative timestamp
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffMins < 1) return "Baru saja"
      if (diffMins < 60) return `${diffMins} mnt lalu`
      if (diffHours < 24) return `${diffHours} jam lalu`
      if (diffDays === 1) return "Kemarin"
      if (diffDays < 7) return `${diffDays} hari lalu`
      return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
    } catch {
      return dateString
    }
  }

  // Format icon berdasarkan tipe notifikasi
  const renderIcon = (type: string) => {
    switch (type) {
      case "review_reply":
        return (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/20">
            <MessageSquare className="h-4 w-4" />
          </div>
        )
      case "loan":
        return (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
            <BookOpen className="h-4 w-4" />
          </div>
        )
      case "due_date":
        return (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20">
            <Clock className="h-4 w-4" />
          </div>
        )
      case "admin":
        return (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 ring-1 ring-purple-500/20">
            <ShieldCheck className="h-4 w-4" />
          </div>
        )
      default:
        return (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 ring-1 ring-neutral-500/20">
            <Bell className="h-4 w-4" />
          </div>
        )
    }
  }

  const getFilterTitle = () => {
    switch (filter) {
      case "unread":
        return "Notifikasi Belum Dibaca"
      case "loan":
        return "Peminjaman & Pengembalian Buku"
      case "review":
        return "Tanggapan & Diskusi Ulasan"
      case "system":
        return "Sistem & Keanggotaan RSJD"
      default:
        return "Semua Notifikasi"
    }
  }

  return (
    <div className="relative">
      {/* TRIGGER BUTTON (ICON LONCENG DI HEADER) */}
      <button
        ref={triggerButtonRef}
        type="button"
        onClick={handleToggle}
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

      {/* 1. DESKTOP EXPANDABLE MEGA PANEL (LEBAR PENUH SEPERTI KATEGORI) */}
      {open && !isMobile && (
        <div
          ref={desktopPanelRef}
          className="fixed left-0 right-0 top-14 sm:top-16 bg-white dark:bg-neutral-950 border-b border-border shadow-2xl z-50 animate-slide-down max-h-[calc(100vh-4rem)] overflow-y-auto"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
            
            {/* Left Column: Pusat Notifikasi Header, Filter Kategori, & Quick Actions */}
            <div className="col-span-1 md:col-span-4 lg:col-span-3 space-y-4 border-b md:border-b-0 md:border-r border-border/70 pb-4 md:pb-0 md:pr-6">
              {/* Header Title */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                    <Bell className="h-4 w-4" />
                  </div>
                  <h3 className="font-heading text-base font-bold text-foreground">
                    Pusat Notifikasi
                  </h3>
                  {unreadCount > 0 && (
                    <Badge className="bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0 h-4.5 ml-auto">
                      {unreadCount} Baru
                    </Badge>
                  )}
                </div>
                <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                  Pemberitahuan aktivitas peminjaman buku, batas pengembalian, dan tanggapan ulasan.
                </p>
              </div>

              {/* Vertical Category Filter List */}
              <div className="space-y-1 text-xs">
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer font-medium text-left",
                    filter === "all"
                      ? "bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-bold border border-sky-200/80 dark:border-sky-800/80 shadow-2xs"
                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Inbox className="h-3.5 w-3.5" />
                    <span>Semua Notifikasi</span>
                  </span>
                  <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                    {counts.all}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilter("unread")}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer font-medium text-left",
                    filter === "unread"
                      ? "bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-bold border border-sky-200/80 dark:border-sky-800/80 shadow-2xs"
                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Bell className="h-3.5 w-3.5" />
                    <span>Belum Dibaca</span>
                  </span>
                  {counts.unread > 0 ? (
                    <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-md bg-rose-500 text-white">
                      {counts.unread}
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                      0
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setFilter("loan")}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer font-medium text-left",
                    filter === "loan"
                      ? "bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-bold border border-sky-200/80 dark:border-sky-800/80 shadow-2xs"
                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Peminjaman & Buku</span>
                  </span>
                  <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                    {counts.loan}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilter("review")}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer font-medium text-left",
                    filter === "review"
                      ? "bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-bold border border-sky-200/80 dark:border-sky-800/80 shadow-2xs"
                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5 text-sky-600" />
                    <span>Tanggapan Ulasan</span>
                  </span>
                  <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                    {counts.review}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilter("system")}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer font-medium text-left",
                    filter === "system"
                      ? "bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-bold border border-sky-200/80 dark:border-sky-800/80 shadow-2xs"
                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
                    <span>Sistem & Keanggotaan</span>
                  </span>
                  <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                    {counts.system}
                  </span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="space-y-1.5 pt-2 border-t border-border/60">
                {unreadCount > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={markAllAsRead}
                    className="w-full justify-start h-8 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/50 rounded-xl"
                  >
                    <CheckCheck className="h-3.5 w-3.5 mr-2" />
                    <span>Tandai Semua Dibaca</span>
                  </Button>
                )}

                {notifications.some((n) => n.isRead) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearReadNotifications}
                    className="w-full justify-start h-8 text-xs font-medium text-neutral-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    <span>Bersihkan Terbaca</span>
                  </Button>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchNotifications()}
                  className="w-full justify-start h-8 text-xs font-medium text-muted-foreground hover:text-foreground rounded-xl"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5 mr-2", isLoading && "animate-spin text-sky-600")} />
                  <span>Segarkan Notifikasi</span>
                </Button>
              </div>

              {/* Info Card RSJD */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-500/10 via-sky-500/5 to-transparent border border-sky-200/60 dark:border-sky-800/40 text-xs space-y-1">
                <span className="font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1.5 text-[11.5px]">
                  <Sparkles className="h-3 w-3" />
                  Pengingat Otomatis
                </span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Sistem otomatis mengingatkan Anda 3 hari & 1 hari sebelum batas waktu pinjaman buku berakhir.
                </p>
              </div>
            </div>

            {/* Right Column: Notification Cards List & Content */}
            <div className="col-span-1 md:col-span-8 lg:col-span-9 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {/* Category Header Bar */}
              <div className="flex items-center justify-between pb-2 border-b border-border/70">
                <div className="flex items-center gap-2">
                  <h4 className="font-heading text-sm font-bold text-foreground">
                    {getFilterTitle()}
                  </h4>
                  <Badge variant="secondary" className="text-[11px] font-mono font-medium px-2 py-0">
                    {filteredNotifications.length}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">
                    Tekan <kbd className="px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-[10px] font-mono">ESC</kbd> untuk menutup
                  </span>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                    title="Tutup Notifikasi"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Items List */}
              {isLoading && notifications.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <Spinner className="h-6 w-6 mx-auto text-sky-600 animate-spin" />
                  <p className="text-xs text-muted-foreground">Memuat data notifikasi...</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="py-16 px-4 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-neutral-100 dark:bg-neutral-900 text-neutral-400 flex items-center justify-center ring-1 ring-border">
                    <Inbox className="h-6 w-6 opacity-60" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground">
                      {filter === "unread"
                        ? "Semua notifikasi sudah dibaca"
                        : "Belum ada notifikasi di kategori ini"}
                    </p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                      Pemberitahuan aktivitas baru akan otomatis muncul di sini. Anda dapat memeriksa katalog atau rak pinjaman kapan saja.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {filteredNotifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className={cn(
                        "p-4 rounded-2xl border transition-all cursor-pointer group flex items-start gap-3 relative",
                        !item.isRead
                          ? "bg-sky-50/50 dark:bg-sky-950/25 border-sky-200 dark:border-sky-800/60 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:border-sky-300 shadow-2xs"
                          : "bg-white dark:bg-neutral-900/40 border-neutral-200/80 dark:border-neutral-800/80 hover:bg-neutral-50 dark:hover:bg-neutral-900/80"
                      )}
                    >
                      {/* Icon */}
                      <div className="pt-0.5 shrink-0">
                        {renderIcon(item.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between gap-1.5">
                          <h5 className={cn(
                            "text-xs sm:text-[13px] font-bold truncate",
                            !item.isRead ? "text-foreground font-black" : "text-foreground/85"
                          )}>
                            {item.title}
                          </h5>
                          <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                            {formatTime(item.createdAt)}
                          </span>
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {item.message}
                        </p>

                        <div className="flex items-center justify-between pt-1">
                          {item.link ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400 group-hover:underline">
                              <span>Lihat Detail</span>
                              <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                            </span>
                          ) : (
                            <span />
                          )}

                          {!item.isRead ? (
                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-950 px-2 py-0.5 rounded-full">
                              <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
                              <span>Baru</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground font-medium">
                              Terbaca
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 2. MOBILE BOTTOM SHEET (KHUSUS TAMPILAN HP) */}
      <Sheet open={open && isMobile} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="h-[84vh] rounded-t-3xl p-0 flex flex-col bg-white dark:bg-neutral-950 border-t border-border"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Pusat Notifikasi</SheetTitle>
          </SheetHeader>

          {/* Grab handle */}
          <div className="pt-2 pb-1 flex justify-center">
            <div className="h-1 w-10 rounded-full bg-neutral-300 dark:bg-neutral-700" />
          </div>

          {/* Mobile Sheet Top Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/70">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600">
                <Bell className="h-4 w-4" />
              </div>
              <h3 className="font-heading text-sm font-bold text-foreground">
                Pusat Notifikasi
              </h3>
              {unreadCount > 0 && (
                <Badge className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0 h-4">
                  {unreadCount}
                </Badge>
              )}
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg"
              aria-label="Tutup notifikasi"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Responsive Category Filter Chips (Wrap cleanly, no cut-off text) */}
          <div className="flex flex-wrap items-center gap-1.5 px-3.5 py-2 border-b border-border/40 shrink-0">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer",
                filter === "all"
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-2xs"
                  : "bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/70"
              )}
            >
              Semua ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer",
                filter === "unread"
                  ? "bg-rose-500 text-white shadow-2xs"
                  : "bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/70"
              )}
            >
              Belum Dibaca ({counts.unread})
            </button>
            <button
              type="button"
              onClick={() => setFilter("loan")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer",
                filter === "loan"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/70"
              )}
            >
              Pinjaman ({counts.loan})
            </button>
            <button
              type="button"
              onClick={() => setFilter("review")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer",
                filter === "review"
                  ? "bg-sky-600 text-white shadow-2xs"
                  : "bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/70"
              )}
            >
              Ulasan ({counts.review})
            </button>
            <button
              type="button"
              onClick={() => setFilter("system")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer",
                filter === "system"
                  ? "bg-purple-600 text-white shadow-2xs"
                  : "bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/70"
              )}
            >
              Sistem ({counts.system})
            </button>
          </div>

          {/* Quick Action Toolbar for Mobile */}
          <div className="flex items-center justify-between px-4 py-2 bg-neutral-50/60 dark:bg-neutral-900/40 border-b border-border/40 text-[11px]">
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-1 active:scale-95"
                >
                  <CheckCheck className="h-3 w-3" />
                  <span>Tandai Semua Dibaca</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {notifications.some((n) => n.isRead) && (
                <button
                  type="button"
                  onClick={clearReadNotifications}
                  className="text-muted-foreground hover:text-rose-500 flex items-center gap-1 active:scale-95"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Bersihkan</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => fetchNotifications()}
                className="text-muted-foreground hover:text-foreground active:scale-95"
                title="Perbarui"
              >
                <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin text-sky-600")} />
              </button>
            </div>
          </div>

          {/* Scrollable Notification List for Mobile */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/40 px-3">
            {isLoading && notifications.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <Spinner className="h-5 w-5 mx-auto text-sky-600 animate-spin" />
                <p className="text-xs text-muted-foreground">Memuat notifikasi...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-16 px-4 text-center space-y-2">
                <div className="w-10 h-10 mx-auto rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center">
                  <Bell className="h-5 w-5 opacity-40" />
                </div>
                <p className="text-xs font-semibold text-foreground">
                  {filter === "unread" ? "Tidak ada notifikasi belum dibaca" : "Belum ada notifikasi"}
                </p>
                <p className="text-[11px] text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  Pemberitahuan aktivitas peminjaman buku dan balasan ulasan akan muncul di sini.
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    "p-3.5 flex items-start gap-3 transition-colors cursor-pointer group active:bg-neutral-100 dark:active:bg-neutral-900 rounded-xl my-1",
                    !item.isRead ? "bg-sky-50/50 dark:bg-sky-950/20" : "bg-transparent"
                  )}
                >
                  {renderIcon(item.type)}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <p className={cn(
                        "text-xs font-bold truncate",
                        !item.isRead ? "text-foreground font-black" : "text-foreground/80"
                      )}>
                        {item.title}
                      </p>
                      <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                        {formatTime(item.createdAt)}
                      </span>
                    </div>

                    <p className="text-[11.5px] text-muted-foreground leading-relaxed line-clamp-2">
                      {item.message}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      {item.link ? (
                        <span className="text-[10.5px] font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-1">
                          <span>Buka Detail</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </span>
                      ) : (
                        <span />
                      )}

                      {!item.isRead && (
                        <span className="flex h-2 w-2 rounded-full bg-sky-500 ring-2 ring-sky-500/20" />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
