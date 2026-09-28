"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import {
  BookOpen,
  Clock,
  CheckCircle,
  RotateCcw,
  Bookmark,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers,
  CheckCircle2,
  X,
  Award,
  Flame,
  Target,
  TrendingUp,
  Lock,
  ChevronDown,
  ChevronUp,
  History,
  AlertTriangle,
  Trash2,
  Star,
} from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/lib/auth-context"
import { DigitalMemberCardDialog } from "@/components/member/digital-member-card"
import { AccountBiodataDialog } from "@/components/member/account-biodata-dialog"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { Skeleton } from "@/components/ui/skeleton"
import { LoanCardSkeleton, BookCardSkeleton, BookListSkeleton } from "@/components/ui/book-card-skeleton"
import type { BookItem } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

const LOCAL_STORAGE_LOANS_KEY = "rsjd_user_loans_v1"
const LOCAL_STORAGE_BOOKMARK_KEY = "rsjd_bookmarks_v1"
const LOCAL_STORAGE_PROGRESS_KEY = "rsjd_reading_progress_v1"

function formatDetailedDateTime(dateStr?: string) {
  if (!dateStr) return "-"
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const datePart = d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
  const timePart = d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).replace(/\./g, ":")
  return `${datePart}, ${timePart} WITA`
}

interface StoredLoan {
  id: string
  userId?: number
  userEmail?: string
  bookId: string
  bookSlug?: string
  bookTitle: string
  coverUrl: string
  durationDays: number
  borrowedAt: string
  dueAt: string
  status: "aktif" | "selesai"
  lastPage?: number
  pageCount?: number
  progressPercent?: number
  borrowCount?: number
  sessions?: StoredLoan[]
}

function LoansContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get("tab") === "bookmark" ? "bookmark" : (searchParams.get("tab") === "riwayat" ? "riwayat" : "aktif")

  const [activeTab, setActiveTab] = React.useState<"aktif" | "riwayat" | "bookmark">(initialTab)
  const [loans, setLoans] = React.useState<StoredLoan[]>([])
  const [bookmarks, setBookmarks] = React.useState<string[]>([])
  const [catalogBooks, setCatalogBooks] = React.useState<BookItem[]>([])
  const [progressMap, setProgressMap] = React.useState<Record<string, { lastPage: number; percent: number }>>({})
  const [readingStats, setReadingStats] = React.useState({ totalMinutes: 0, streakDays: 0 })
  const [returningLoanId, setReturningLoanId] = React.useState<string | null>(null)
  const [loanToReturn, setLoanToReturn] = React.useState<StoredLoan | null>(null)
  const [returnSuccessMessage, setReturnSuccessMessage] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(true)
  const { user, isGuest } = useAuth()
  const [isKtaModalOpen, setIsKtaModalOpen] = React.useState(false)
  const [isAccountBiodataOpen, setIsAccountBiodataOpen] = React.useState(false)
  const [expandedBookIds, setExpandedBookIds] = React.useState<Record<string, boolean>>({})

  // Sinkronisasi tab dengan URL searchParams secara real-time
  React.useEffect(() => {
    const tabParam = searchParams.get("tab")
    if (tabParam === "bookmark") {
      setActiveTab("bookmark")
    } else if (tabParam === "riwayat") {
      setActiveTab("riwayat")
    } else if (tabParam === "aktif") {
      setActiveTab("aktif")
    }
  }, [searchParams])

  // Listener event instan untuk navigasi dari header (bahkan jika URL sudah di /pinjaman)
  React.useEffect(() => {
    const handleSwitchTab = (e: Event) => {
      const customEvent = e as CustomEvent<string | { tab: string }>
      const tab = typeof customEvent.detail === "object" && customEvent.detail ? customEvent.detail.tab : customEvent.detail
      if (tab === "bookmark" || tab === "riwayat" || tab === "aktif") {
        setActiveTab(tab)
      }
    }
    window.addEventListener("switch-loan-tab", handleSwitchTab)
    return () => window.removeEventListener("switch-loan-tab", handleSwitchTab)
  }, [])

  // Sinkronisasi bookmark dari basis data MariaDB resmi (Single Source of Truth)
  React.useEffect(() => {
    if (user?.id) {
      fetch("/api/favorites")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.favorites)) {
            setBookmarks(data.favorites)
            try {
              localStorage.setItem(LOCAL_STORAGE_BOOKMARK_KEY, JSON.stringify(data.favorites))
              window.dispatchEvent(new Event("bookmarks-updated"))
            } catch {}
          }
        })
        .catch(() => {})
    }
  }, [user?.id])

  // Listener sinkronisasi bookmark antar komponen
  React.useEffect(() => {
    const handleBookmarkUpdate = () => {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_BOOKMARK_KEY)
        if (saved) setBookmarks(JSON.parse(saved))
      } catch {}
    }
    window.addEventListener("bookmarks-updated", handleBookmarkUpdate)
    return () => window.removeEventListener("bookmarks-updated", handleBookmarkUpdate)
  }, [])

  const handleTabChange = (newTab: "aktif" | "riwayat" | "bookmark") => {
    setActiveTab(newTab)
    router.replace(`/pinjaman?tab=${newTab}`, { scroll: false })
  }

  const toggleExpand = (bookKey: string) => {
    setExpandedBookIds((prev) => ({
      ...prev,
      [bookKey]: !prev[bookKey],
    }))
  }

  const handleRemoveBookmark = (bookIdentifier: string | number, bookTitle: string) => {
    const stringId = String(bookIdentifier)
    const bookObj = catalogBooks.find((b) => String(b.id) === stringId || b.slug === stringId)
    const idsToRemove = [stringId]
    if (bookObj?.id) idsToRemove.push(String(bookObj.id))
    if (bookObj?.slug) idsToRemove.push(bookObj.slug)

    const updated = bookmarks.filter((b) => !idsToRemove.includes(String(b)))
    setBookmarks(updated)
    try {
      localStorage.setItem(LOCAL_STORAGE_BOOKMARK_KEY, JSON.stringify(updated))
      window.dispatchEvent(new Event("bookmarks-updated"))
      fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId: stringId, action: "remove" }),
      }).catch(() => {})
      toast.success(`"${bookTitle}" dihapus dari bookmark`)
    } catch {}
  }

  const handleConfirmReturn = async () => {
    if (!loanToReturn) return
    const loanId = loanToReturn.id
    setReturningLoanId(loanId)

    try {
      const res = await fetch("/api/loans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loanId, action: "kembali" }),
      })
      const data = await res.json()
      const returnedPage = data.lastPage || 1

      const updated = loans.map((l) => {
        if (l.id === loanId) {
          const prog =
            progressMap[l.bookId] ||
            (l.bookSlug ? progressMap[l.bookSlug] : null) || {
              lastPage: l.lastPage || 1,
              percent: l.progressPercent || 0,
            }
          return {
            ...l,
            lastPage: Math.max(prog.lastPage, returnedPage),
            progressPercent: prog.percent,
            dueAt: new Date(Date.now() - 1000).toISOString(),
            status: "selesai" as const,
          }
        }
        return l
      })
      setLoans(updated)
      try {
        localStorage.setItem(LOCAL_STORAGE_LOANS_KEY, JSON.stringify(updated))
        window.dispatchEvent(new Event("loans-updated"))
      } catch {}

      setReturnSuccessMessage(`Buku "${loanToReturn.bookTitle}" telah berhasil dikembalikan ke rak perpustakaan!`)
      setTimeout(() => setReturnSuccessMessage(""), 4000)
    } catch {
      const updated = loans.map((l) =>
        l.id === loanId
          ? {
              ...l,
              dueAt: new Date(Date.now() - 1000).toISOString(),
              status: "selesai" as const,
            }
          : l
      )
      setLoans(updated)
      try {
        localStorage.setItem(LOCAL_STORAGE_LOANS_KEY, JSON.stringify(updated))
        window.dispatchEvent(new Event("loans-updated"))
      } catch {}
      setReturnSuccessMessage(`Buku "${loanToReturn.bookTitle}" telah berhasil dikembalikan.`)
      setTimeout(() => setReturnSuccessMessage(""), 4000)
    } finally {
      setReturningLoanId(null)
      setLoanToReturn(null)
    }
  }

  // Initialize and load loans, bookmarks, reading progress
  React.useEffect(() => {
    // 1. Ambil katalog buku dinamis dari database MariaDB
    fetch("/api/books")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.books) && data.books.length > 0) {
          setCatalogBooks(data.books)
        }
      })
      .catch(() => {})

    // 2. Ambil data peminjaman resmi dari database MariaDB
    const loadLoansFromDb = () => {
      if (user?.id) {
        fetch("/api/loans")
          .then((res) => res.json())
          .then((data) => {
            if (data.success && Array.isArray(data.loans)) {
              const formatted: StoredLoan[] = data.loans.map((l: {
                id: number
                userId: number
                bookId: number
                bookTitle: string
                bookSlug?: string
                bookCover: string | null
                durationDays: number
                borrowedAt: string
                dueAt: string
                status: string
                lastPage?: number
                pageCount?: number
                progressPercent?: number
              }) => ({
                id: String(l.id),
                userId: l.userId,
                userEmail: user.email,
                bookId: String(l.bookId),
                bookSlug: l.bookSlug,
                bookTitle: l.bookTitle,
                coverUrl: l.bookCover || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
                durationDays: l.durationDays,
                borrowedAt: l.borrowedAt,
                dueAt: l.dueAt,
                status: l.status === "kembali" ? "selesai" : (l.status as "aktif" | "selesai"),
                lastPage: l.lastPage || 1,
                pageCount: l.pageCount || 240,
                progressPercent: l.progressPercent || 0,
              }))
              setLoans(formatted)
              try {
                localStorage.setItem(LOCAL_STORAGE_LOANS_KEY, JSON.stringify(formatted))
              } catch {}

              // Sinkronkan progressMap dari data reading_progress MariaDB
              setProgressMap((prev) => {
                const next = { ...prev }
                data.loans.forEach((l: any) => {
                  if (l.lastPage && l.lastPage > 0) {
                    const currentEntry = next[String(l.bookId)]
                    const higherPage = Math.max(currentEntry?.lastPage || 1, l.lastPage)
                    const percent = l.pageCount ? Math.min(100, Math.round((higherPage / l.pageCount) * 100)) : (l.progressPercent || 0)
                    next[String(l.bookId)] = {
                      lastPage: higherPage,
                      percent,
                    }
                    if (l.bookSlug) {
                      next[l.bookSlug] = {
                        lastPage: higherPage,
                        percent,
                      }
                    }
                  }
                })
                return next
              })
            }
          })
          .catch(() => {})
      }
    }

    loadLoansFromDb()
    window.addEventListener("loans-updated", loadLoansFromDb)

    try {
      const savedLoans = localStorage.getItem(LOCAL_STORAGE_LOANS_KEY)
      if (savedLoans) {
        setLoans(JSON.parse(savedLoans))
      } else {
        setLoans([])
      }

      const savedBookmarks = localStorage.getItem(LOCAL_STORAGE_BOOKMARK_KEY)
      if (savedBookmarks) {
        setBookmarks(JSON.parse(savedBookmarks))
      } else {
        setBookmarks([])
      }

      const savedProgress = localStorage.getItem(LOCAL_STORAGE_PROGRESS_KEY)
      if (savedProgress) {
        const parsed = JSON.parse(savedProgress)
        let cleaned = false
        if (parsed.b1?.lastPage === 42 && parsed.b1?.percent === 17) {
          delete parsed.b1
          cleaned = true
        }
        if (parsed.b2?.lastPage === 85 && parsed.b2?.percent === 43) {
          delete parsed.b2
          cleaned = true
        }
        if (cleaned) {
          localStorage.setItem(LOCAL_STORAGE_PROGRESS_KEY, JSON.stringify(parsed))
        }
        setProgressMap(parsed)
      } else {
        // Akun baru dimulai dari progress kosong (bukan nilai palsu)
        setProgressMap({})
      }

      const savedHabit = localStorage.getItem("rsjd_reading_habit_v1")
      if (savedHabit) {
        const parsed = JSON.parse(savedHabit)
        setReadingStats({
          totalMinutes: Number(parsed.totalMinutes) || 0,
          streakDays: Number(parsed.streakDays) || 0,
        })
      }
    } catch {} finally {
      const reloadProg = () => {
        try {
          const sp = localStorage.getItem(LOCAL_STORAGE_PROGRESS_KEY)
          if (sp) setProgressMap(JSON.parse(sp))
        } catch {}
      }
      window.addEventListener("reading-progress-updated", reloadProg)

      const timer = setTimeout(() => setIsLoading(false), 250)
      return () => {
        clearTimeout(timer)
        window.removeEventListener("loans-updated", loadLoansFromDb)
        window.removeEventListener("reading-progress-updated", reloadProg)
      }
    }
  }, [user])

  // Partition loans into Active ("Sedang Dipinjam") and Past ("Riwayat")
  // Aktif HANYA jika status === "aktif" DAN belum melewati dueAt
  const userLoans = React.useMemo(() => {
    if (isGuest || !user?.isVerified) return []
    return loans.filter((l: StoredLoan) =>
      l.userId ? l.userId === user?.id : l.userEmail === user?.email
    )
  }, [loans, user, isGuest])

  const nowTime = new Date().getTime()
  const activeLoans = React.useMemo(() => {
    // Pinjaman aktif unik per buku (ambil yang dueAt paling baru jika ada ganda)
    const activeMap = new Map<string, StoredLoan>()
    userLoans
      .filter((l) => l.status === "aktif" && new Date(l.dueAt).getTime() > nowTime)
      .forEach((l) => {
        const key = String(l.bookId)
        const existing = activeMap.get(key)
        if (!existing || new Date(l.dueAt).getTime() > new Date(existing.dueAt).getTime()) {
          const allSessions = userLoans
            .filter((s) => String(s.bookId) === key)
            .sort((a, b) => new Date(b.borrowedAt || b.dueAt).getTime() - new Date(a.borrowedAt || a.dueAt).getTime())

          activeMap.set(key, {
            ...l,
            borrowCount: allSessions.length,
            sessions: allSessions,
          })
        }
      })
    return Array.from(activeMap.values())
  }, [userLoans, nowTime])

  const pastLoans = React.useMemo(() => {
    // Kumpulkan bookId yang sedang aktif dipinjam agar tidak duplikat di riwayat selesai
    const activeBookKeys = new Set(activeLoans.map((l) => String(l.bookId)))

    // Kelompokkan riwayat selesai per buku unik, ambil data paling baru & kumpulkan seluruh sesi peminjaman
    const pastMap = new Map<string, { loan: StoredLoan; sessions: StoredLoan[] }>()
    userLoans
      .filter(
        (l) =>
          (l.status === "selesai" || (l.status as string) === "kembali" || new Date(l.dueAt).getTime() <= nowTime) &&
          !activeBookKeys.has(String(l.bookId))
      )
      .forEach((l) => {
        const key = String(l.bookId)
        const entry = pastMap.get(key)
        if (!entry) {
          pastMap.set(key, { loan: { ...l, borrowCount: 1 }, sessions: [l] })
        } else {
          if (!entry.sessions.some((s) => String(s.id) === String(l.id))) {
            entry.sessions.push(l)
          }

          const existingTime = new Date(entry.loan.dueAt || entry.loan.borrowedAt).getTime()
          const newTime = new Date(l.dueAt || l.borrowedAt).getTime()
          const higherPage = Math.max(entry.loan.lastPage || 1, l.lastPage || 1)
          const higherPercent = Math.max(entry.loan.progressPercent || 0, l.progressPercent || 0)

          const baseLoan = newTime >= existingTime ? l : entry.loan
          entry.loan = {
            ...baseLoan,
            lastPage: higherPage,
            progressPercent: higherPercent,
            borrowCount: entry.sessions.length,
          }
        }
      })

    return Array.from(pastMap.values()).map(({ loan, sessions }) => {
      const sortedSessions = [...sessions].sort(
        (a, b) => new Date(b.borrowedAt || b.dueAt).getTime() - new Date(a.borrowedAt || a.dueAt).getTime()
      )
      return {
        ...loan,
        borrowCount: sortedSessions.length,
        sessions: sortedSessions,
      }
    })
  }, [userLoans, activeLoans, nowTime])

  const bookmarkedBooks = React.useMemo(() => {
    const bookmarkSet = new Set(bookmarks.map(String))
    return catalogBooks.filter((b) => bookmarkSet.has(String(b.id)) || (b.slug && bookmarkSet.has(b.slug)))
  }, [catalogBooks, bookmarks])

  // Calculate days remaining helper
  const getRemainingTimeText = (dueAtIso: string) => {
    const diff = new Date(dueAtIso).getTime() - new Date().getTime()
    if (diff <= 0) return "Selesai"
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    if (days > 0) return `${days} hari ${hours} jam lagi`
    return `${hours} jam lagi`
  }

  // Guest Access Guard (Sesuai SPESIFIKASI.md: Tamu tidak memiliki akses ke Rak Pinjaman)
  if (isGuest) {
    return (
      <div className="min-h-[82vh] flex items-center justify-center p-0 sm:p-6 lg:p-8 bg-background sm:bg-radial-[at_top_center] sm:from-sky-50/50 sm:via-background sm:to-muted/30 dark:sm:from-sky-950/20 dark:sm:via-background dark:sm:to-neutral-950">
        <div className="max-w-md w-full px-5 py-8 sm:p-8 rounded-none sm:rounded-3xl border-0 sm:border border-sky-200/80 dark:border-sky-800/60 bg-background sm:bg-card text-center space-y-5 shadow-none sm:shadow-xl animate-fade-in">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 mx-auto shadow-inner">
            <Lock className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
              <span>Akses Terkunci &bull; Akun Tamu</span>
            </div>
            <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              Rak Pinjaman Khusus Anggota
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Sesuai ketentuan perpustakaan RSJD, akun tamu hanya dapat menjelajahi katalog dan membaca ringkasan sinopsis. Masuk atau daftar anggota untuk meminjam buku digital, mengaktifkan KTA resmi, dan memantau riwayat bacaan Anda.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <Link href="/masuk?redirect=/pinjaman">
              <Button className="w-full h-11 rounded-xl bg-sky-600 hover:bg-sky-500 font-bold text-xs sm:text-sm text-white shadow-xs">
                Masuk ke Akun Anda
              </Button>
            </Link>
            <Link href="/daftar">
              <Button variant="outline" className="w-full h-11 rounded-xl text-xs sm:text-sm font-semibold">
                Daftar Akun Anggota Baru (Gratis)
              </Button>
            </Link>
          </div>

          <div className="pt-3 border-t border-border/80 flex flex-col items-center gap-2 text-xs text-muted-foreground">
            <p>
              Ingin melihat koleksi buku terlebih dahulu?{" "}
              <Link href="/buku" className="text-sky-600 font-bold hover:underline">
                Jelajahi Katalog E-Book
              </Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-600 mb-1">
            <BookOpen className="h-4 w-4" />
            <span>Rak Pribadi Pembaca</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Daftar Pinjaman Saya
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Kelola bacaan aktif Anda, pantau progres halaman, dan lanjutkan membaca kapan saja.
          </p>
        </div>

        {/* Banner Status Akun Belum Verifikasi Anti-Bot */}
        {!user?.isVerified && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs flex items-center justify-between shadow-xs">
            <div className="space-y-0.5">
              <p className="font-bold text-amber-900 dark:text-amber-200">⚠️ Akun Belum Terverifikasi</p>
              <p className="text-amber-700/80 dark:text-amber-300/80">
                Selesaikan verifikasi identitas (Nomor WhatsApp & Instansi via OTP) saat meminjam buku untuk mengaktifkan rak peminjaman.
              </p>
            </div>
            <Link href="/">
              <Button size="sm" className="h-8 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-xl">
                Jelajahi Katalog
              </Button>
            </Link>
          </div>
        )}

        {/* READING HABIT & KTA DASHBOARD (Fitur Inovatif v33) */}
        <div className="mb-8 grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* 4 Statistik Membaca Pribadi */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-card border border-border shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] font-bold uppercase tracking-wider">Selesai Dibaca</span>
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="font-heading text-xl font-black text-foreground">
                {pastLoans.length} <span className="text-xs font-normal text-muted-foreground">Buku</span>
              </p>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                {pastLoans.length > 0 ? `${pastLoans.length} tersimpan di riwayat` : "Belum ada buku selesai"}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] font-bold uppercase tracking-wider">Waktu Baca</span>
                <Clock className="h-4 w-4 text-sky-500" />
              </div>
              <p className="font-heading text-xl font-black text-foreground">
                {readingStats.totalMinutes} <span className="text-xs font-normal text-muted-foreground">Mnt</span>
              </p>
              <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold">
                {readingStats.totalMinutes > 0
                  ? `≈ ${(readingStats.totalMinutes / 60).toFixed(1)} jam total`
                  : "0 jam total"}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] font-bold uppercase tracking-wider">Reading Streak</span>
                <Flame className="h-4 w-4 text-amber-500" />
              </div>
              <p className="font-heading text-xl font-black text-amber-600 dark:text-amber-400">
                {readingStats.streakDays} <span className="text-xs font-normal text-muted-foreground">Hari</span>
              </p>
              <span className="text-[10px] text-muted-foreground">
                {readingStats.streakDays > 0 ? "Konsisten membaca" : "Mulai membaca hari ini"}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] font-bold uppercase tracking-wider">Target 2026</span>
                <Target className="h-4 w-4 text-purple-500" />
              </div>
              <p className="font-heading text-xl font-black text-foreground">
                {pastLoans.length} <span className="text-xs font-normal text-muted-foreground">/ 12 Buku</span>
              </p>
              <Progress
                value={Math.min(100, Math.round((pastLoans.length / 12) * 100))}
                className="h-1.5 mt-1"
              />
            </div>
          </div>

          {/* KTA Digital Shortcut Banner */}
          <div className="lg:col-span-4 p-4 rounded-2xl bg-gradient-to-br from-sky-900 to-indigo-950 text-white flex flex-col justify-between shadow-sm border border-sky-400/20">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-sky-300 text-xs font-bold">
                <Award className="h-4 w-4" />
                <span>Kartu Anggota RSJD</span>
              </div>
              <h3 className="font-heading text-sm font-bold">
                KTA Digital Resmi (QR Code)
              </h3>
              <p className="text-[11px] text-sky-100/70 leading-relaxed">
                {user?.isVerified
                  ? (user?.nik ? "Identitas resmi peminjam literasi digital terverifikasi (NIK terdaftar)." : "Identitas resmi peminjam literasi digital terverifikasi.")
                  : "Selesaikan verifikasi akun peminjam untuk mengaktifkan Kartu Anggota (KTA) Digital resmi Anda."}
              </p>
            </div>

            <div className="pt-3 mt-2 border-t border-white/10">
              <Button
                size="sm"
                onClick={() => setIsKtaModalOpen(true)}
                className="w-full h-8 text-xs font-bold bg-white text-sky-900 hover:bg-sky-50 shadow-xs gap-1.5"
              >
                <Award className="h-3.5 w-3.5 text-sky-600" />
                <span>Buka & Cetak KTA Digital</span>
              </Button>
            </div>
          </div>
        </div>

        {/* SUKSES KEMBALIKAN BANNER */}
        {returnSuccessMessage && (
          <div className="animate-slide-down mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{returnSuccessMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setReturnSuccessMessage("")}
              className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 p-1 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Segmented Tabs (Responsive: 3 columns on mobile, inline on desktop) */}
        <div className="w-full grid grid-cols-3 sm:inline-flex sm:w-auto rounded-2xl bg-muted p-1 text-xs font-semibold text-muted-foreground mb-8">
          <button
            type="button"
            onClick={() => handleTabChange("aktif")}
            className={cn(
              "px-2 sm:px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer text-center",
              activeTab === "aktif"
                ? "bg-background text-foreground font-bold shadow-xs"
                : "hover:text-foreground"
            )}
          >
            <Clock className="h-3.5 w-3.5 text-sky-600 shrink-0" />
            <span><span className="sm:hidden">Dipinjam</span><span className="hidden sm:inline">Sedang Dipinjam</span> ({activeLoans.length})</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("riwayat")}
            className={cn(
              "px-2 sm:px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer text-center",
              activeTab === "riwayat"
                ? "bg-background text-foreground font-bold shadow-xs"
                : "hover:text-foreground"
            )}
          >
            <RotateCcw className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span><span className="sm:hidden">Riwayat</span><span className="hidden sm:inline">Riwayat Selesai</span> ({pastLoans.length})</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("bookmark")}
            className={cn(
              "px-2 sm:px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer text-center",
              activeTab === "bookmark"
                ? "bg-background text-foreground font-bold shadow-xs"
                : "hover:text-foreground"
            )}
          >
            <Bookmark className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span><span className="sm:hidden">Bookmark</span><span className="hidden sm:inline">Bookmark Saya</span> ({catalogBooks.length > 0 ? bookmarkedBooks.length : bookmarks.length})</span>
          </button>
        </div>

        {/* TAB 1: SEDANG DIPINJAM */}
        {activeTab === "aktif" && (
          <div key="aktif" className="animate-fade-in space-y-4">
            {isLoading ? (
              <div className="flex flex-col gap-3.5">
                <BookListSkeleton />
                <BookListSkeleton />
                <BookListSkeleton />
              </div>
            ) : activeLoans.length === 0 ? (
              <div className="py-16 text-center rounded-3xl border border-dashed border-border bg-muted/20">
                <BookOpen className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <h3 className="font-heading text-base font-bold text-foreground">
                  Belum Ada Buku yang Sedang Dipinjam
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Semua buku di perpustakaan RSJD dapat dipinjam secara langsung tanpa antrean.
                </p>
                <Link href="/buku">
                  <Button size="sm" className="mt-4 text-xs font-semibold">
                    Jelajahi Katalog Buku
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3.5 w-full">
                {activeLoans.map((loan) => {
                  const bookData = catalogBooks.find((b) => String(b.id) === String(loan.bookId))
                  const prog = progressMap[loan.bookId] || (loan.bookSlug ? progressMap[loan.bookSlug] : null) || { lastPage: loan.lastPage || 1, percent: loan.progressPercent || 0 }
                  const totalPages = bookData?.pageCount || loan.pageCount || 240
                  const currentLastPage = prog.lastPage || loan.lastPage || 1
                  const currentPercent = prog.percent > 0 ? prog.percent : Math.min(100, Math.round((currentLastPage / totalPages) * 100))
                  const isFinished = currentLastPage >= totalPages || currentPercent >= 100
                  const remaining = getRemainingTimeText(loan.dueAt)
                  const targetSlug = loan.bookSlug || bookData?.slug || loan.bookId
                  const isExpanded = !!expandedBookIds[`active_${loan.id}`]

                  return (
                    <div
                      key={loan.id}
                      className={cn(
                        "flex flex-col rounded-2xl border border-border bg-card shadow-2xs hover:border-sky-400/50 dark:hover:border-sky-600/50 transition-all overflow-hidden w-full group",
                        isExpanded && "border-sky-300 dark:border-sky-800 shadow-xs"
                      )}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-4">
                        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
                          {/* Book Cover with 3D Spine */}
                          <Link
                            href={`/buku/${targetSlug}`}
                            className="relative h-20 w-14 sm:h-22 sm:w-16 rounded-xl overflow-hidden shadow-xs ring-1 ring-border shrink-0 group/cover"
                            title={`Buka detail buku ${loan.bookTitle}`}
                          >
                            <img
                              src={loan.coverUrl}
                              alt={loan.bookTitle}
                              loading="lazy"
                              decoding="async"
                              className="h-full w-full object-cover group-hover/cover:scale-105 transition-transform duration-300 pointer-events-none"
                            />
                            <div className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/30 to-transparent z-10" />
                          </Link>

                          <div className="flex flex-col min-w-0 space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge className="bg-emerald-500/90 text-white text-[10px] px-2 py-0.5 font-semibold">
                                Akses Aktif &middot; {loan.durationDays} Hari
                              </Badge>

                              <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-semibold text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/40 flex items-center gap-1">
                                <Clock className="h-3 w-3 text-sky-600 dark:text-sky-400" />
                                <span>{remaining}</span>
                              </Badge>

                              {isFinished ? (
                                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] px-2.5 py-0.5 font-bold flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  <span>Tamat (Selesai Dibaca)</span>
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-semibold bg-muted/60 border-border text-foreground flex items-center gap-1">
                                  <BookOpen className="h-3 w-3 text-sky-500 shrink-0" />
                                  <span>Hal. {currentLastPage} / {totalPages} ({currentPercent}%)</span>
                                </Badge>
                              )}
                            </div>

                            <Link
                              href={`/buku/${targetSlug}`}
                              className="font-heading text-sm sm:text-base font-bold text-foreground line-clamp-1 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                              title={loan.bookTitle}
                            >
                              {loan.bookTitle}
                            </Link>

                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>{bookData?.authorName || "Pustaka RSJD"}</span>
                              <span>&bull;</span>
                              <div className="flex items-center gap-2">
                                <div className="w-20 sm:w-32 bg-muted rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-sky-500 h-full rounded-full transition-all"
                                    style={{ width: `${isFinished ? 100 : currentPercent}%` }}
                                  />
                                </div>
                                <span className="text-[11px] font-medium">{isFinished ? "100%" : `${currentPercent}%`}</span>
                              </div>
                              <span className="hidden sm:inline">&bull;</span>
                              <span className="hidden sm:inline text-[11px] text-muted-foreground/80">
                                Tenggat: <strong className="font-mono text-foreground">{formatDetailedDateTime(loan.dueAt)}</strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/40 w-full sm:w-auto">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => toggleExpand(`active_${loan.id}`)}
                            className={cn(
                              "h-9 px-2.5 sm:px-3 text-xs font-semibold gap-1 sm:gap-1.5 transition-all rounded-xl shrink-0",
                              isExpanded
                                ? "bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/70 dark:text-sky-300 dark:border-sky-800"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                            )}
                            title="Tampilkan detail waktu peminjaman lengkap"
                          >
                            <Clock className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                            <span>{isExpanded ? "Tutup" : "Detail"}<span className="hidden sm:inline">{isExpanded ? " Detail" : " Waktu"}</span></span>
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5 shrink-0" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                            )}
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            disabled={returningLoanId === loan.id}
                            onClick={() => setLoanToReturn(loan)}
                            className="h-9 px-2.5 sm:px-3 text-xs font-semibold rounded-xl border-border hover:border-rose-300 dark:hover:border-rose-900/60 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-all cursor-pointer shrink-0"
                            title="Kembalikan buku lebih awal"
                          >
                            {returningLoanId === loan.id ? (
                              <span className="flex items-center gap-1.5">
                                <Spinner className="h-3.5 w-3.5 text-rose-500" />
                                <span>Mengembalikan...</span>
                              </span>
                            ) : (
                              "Kembalikan"
                            )}
                          </Button>

                          <Link href={`/baca/${loan.bookId}`} className="shrink-0">
                            <Button
                              size="sm"
                              className="h-9 px-3 sm:px-3.5 text-xs font-semibold gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 shadow-xs"
                            >
                              <BookOpen className="h-3.5 w-3.5" />
                              <span>Lanjutkan Baca</span>
                            </Button>
                          </Link>
                        </div>
                      </div>

                      {/* Detail Waktu Peminjaman Aktif (Expandable Drawer) */}
                      {isExpanded && (
                        <div className="border-t border-border/70 bg-muted/20 p-4 sm:p-5 space-y-3.5 animate-fade-in">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-muted-foreground pb-2.5 border-b border-border/50">
                            <span className="flex items-center gap-2 font-semibold text-foreground">
                              <Calendar className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                              <span>Rincian Waktu Sesi Peminjaman Aktif</span>
                            </span>
                            <span className="text-[11px] font-mono text-muted-foreground">
                              Zona Waktu: WITA (UTC+8)
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-card border border-border/60">
                              <Calendar className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                                  Waktu Mulai Pinjam
                                </span>
                                <span className="font-semibold text-foreground font-mono text-xs mt-0.5 block">
                                  {formatDetailedDateTime(loan.borrowedAt)}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-card border border-border/60">
                              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                                  Tenggat Pengembalian
                                </span>
                                <span className="font-semibold text-foreground font-mono text-xs mt-0.5 block">
                                  {formatDetailedDateTime(loan.dueAt)}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-card border border-border/60">
                              <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                                  Sisa Waktu Akses
                                </span>
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono text-xs mt-0.5 block">
                                  {remaining} ({loan.durationDays} Hari Total)
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: RIWAYAT PEMINJAMAN SELESAI */}
        {activeTab === "riwayat" && (
          <div key="riwayat" className="animate-fade-in space-y-4">
            {isLoading ? (
              <div className="flex flex-col gap-3.5">
                <BookListSkeleton />
                <BookListSkeleton />
                <BookListSkeleton />
              </div>
            ) : pastLoans.length === 0 ? (
              <div className="py-16 text-center rounded-3xl border border-dashed border-border bg-muted/20">
                <CheckCircle className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <h3 className="font-heading text-base font-bold text-foreground">
                  Belum Ada Riwayat Peminjaman yang Berakhir
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Semua buku yang telah melewati batas tenggat peminjaman akan tersimpan rapi di sini.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3.5 w-full">
                {pastLoans.map((loan) => {
                  const bookData = catalogBooks.find((b) => String(b.id) === String(loan.bookId))
                  const prog = progressMap[loan.bookId] || (loan.bookSlug ? progressMap[loan.bookSlug] : null)
                  const lastPage = prog?.lastPage || loan.lastPage || 1
                  const totalPages = bookData?.pageCount || loan.pageCount || 240
                  const percent = prog?.percent && prog.percent > 0
                    ? prog.percent
                    : (loan.progressPercent && loan.progressPercent > 0 ? loan.progressPercent : Math.min(100, Math.round((lastPage / totalPages) * 100)))
                  const isFinished = lastPage >= totalPages || percent >= 100
                  const targetSlug = loan.bookSlug || bookData?.slug || loan.bookId
                  const isExpanded = !!expandedBookIds[String(loan.bookId)]
                  const sessions = loan.sessions && loan.sessions.length > 0 ? loan.sessions : [loan]

                  return (
                    <div
                      key={loan.id}
                      className={cn(
                        "flex flex-col rounded-2xl border border-border bg-card shadow-2xs hover:border-sky-400/50 dark:hover:border-sky-600/50 transition-all overflow-hidden w-full",
                        isExpanded && "border-sky-300 dark:border-sky-800 shadow-xs"
                      )}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-4">
                        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
                          {/* Book Cover */}
                          <Link
                            href={`/buku/${targetSlug}`}
                            className="relative h-20 w-14 sm:h-22 sm:w-16 rounded-xl overflow-hidden shadow-xs ring-1 ring-border shrink-0 group"
                            title={`Buka detail buku ${loan.bookTitle}`}
                          >
                            <img
                              src={loan.coverUrl}
                              alt={loan.bookTitle}
                              loading="lazy"
                              decoding="async"
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                            />
                            <div className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/30 to-transparent" />
                          </Link>

                          <div className="flex flex-col min-w-0 space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge variant="secondary" className="w-fit text-[10px] px-2 py-0.5 font-medium">
                                Selesai &middot; {loan.durationDays} Hari
                              </Badge>

                              {loan.borrowCount && loan.borrowCount > 1 ? (
                                <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-semibold text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/40">
                                  {loan.borrowCount}x Pernah Dipinjam
                                </Badge>
                              ) : null}

                              {/* Status Tamat atau Halaman Terakhir */}
                              {isFinished ? (
                                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] px-2.5 py-0.5 font-bold flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  <span>Tamat (Selesai Dibaca)</span>
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-semibold bg-muted/60 border-border text-foreground flex items-center gap-1">
                                  <BookOpen className="h-3 w-3 text-sky-500 shrink-0" />
                                  <span>Terakhir Dibaca: Hal. {lastPage} / {totalPages} ({percent}%)</span>
                                </Badge>
                              )}
                            </div>

                            <Link
                              href={`/buku/${targetSlug}`}
                              className="font-heading text-sm sm:text-base font-bold text-foreground line-clamp-1 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                              title={loan.bookTitle}
                            >
                              {loan.bookTitle}
                            </Link>

                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>Terakhir selesai {formatDetailedDateTime(loan.dueAt)}</span>
                              {!isFinished && (
                                <>
                                  <span>&bull;</span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-24 sm:w-36 bg-muted rounded-full h-1.5 overflow-hidden">
                                      <div
                                        className="bg-sky-500 h-full rounded-full transition-all"
                                        style={{ width: `${percent}%` }}
                                      />
                                    </div>
                                    <span className="text-[11px] font-medium">{percent}%</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/40 w-full sm:w-auto">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => toggleExpand(String(loan.bookId))}
                            className={cn(
                              "h-9 px-2.5 sm:px-3 text-xs font-semibold gap-1 sm:gap-1.5 transition-all rounded-xl shrink-0",
                              isExpanded
                                ? "bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/70 dark:text-sky-300 dark:border-sky-800"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                            )}
                            title="Tampilkan detail waktu peminjaman lengkap"
                          >
                            <Clock className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                            <span>{isExpanded ? "Tutup" : "Detail"}<span className="hidden sm:inline">{isExpanded ? " Detail" : ` Waktu (${sessions.length})`}</span></span>
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5 shrink-0" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                            )}
                          </Button>

                          <Link href={`/buku/${targetSlug}`} className="shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 px-3 text-xs font-semibold gap-1.5 rounded-xl hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-950/60 dark:hover:text-sky-400 transition-colors"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              <span>Pinjam Lagi</span>
                            </Button>
                          </Link>
                        </div>
                      </div>

                      {/* Detail Waktu Tiap Sesi Peminjaman (Full Width Expandable Drawer) */}
                      {isExpanded && (
                        <div className="border-t border-border/70 bg-muted/20 p-4 sm:p-5 space-y-3.5 animate-fade-in">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-muted-foreground pb-2.5 border-b border-border/50">
                            <span className="flex items-center gap-2 font-semibold text-foreground">
                              <History className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
                              <span>Riwayat Sesi Peminjaman ({sessions.length} Sesi Tercatat)</span>
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              Urutan: Sesi Terbaru ke Terlama
                            </span>
                          </div>

                          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                            {sessions.map((session, sIdx) => {
                              const isLatestSession = sIdx === 0
                              const sessionPage = session.lastPage || 1
                              const sessionPercent = session.progressPercent && session.progressPercent > 0
                                ? session.progressPercent
                                : Math.min(100, Math.round((sessionPage / totalPages) * 100))
                              const sessionFinished = sessionPage >= totalPages || sessionPercent >= 100

                              return (
                                <div
                                  key={session.id || sIdx}
                                  className={cn(
                                    "p-3.5 sm:p-4 rounded-xl border text-xs transition-colors space-y-2.5",
                                    isLatestSession
                                      ? "bg-background/95 dark:bg-card border-sky-300/80 dark:border-sky-800/80 shadow-2xs"
                                      : "bg-background/60 dark:bg-card/60 border-border/60"
                                  )}
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={cn(
                                          "px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wide",
                                          isLatestSession
                                            ? "bg-sky-600 text-white"
                                            : "bg-muted text-muted-foreground"
                                        )}
                                      >
                                        {isLatestSession ? "Sesi Terbaru" : `Sesi #${sessions.length - sIdx}`}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        Durasi Akses: <strong className="text-foreground">{session.durationDays} Hari</strong>
                                      </span>
                                    </div>

                                    {sessionFinished ? (
                                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] px-2 py-0.5 font-bold flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" />
                                        <span>Tamat (Selesai Dibaca)</span>
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-medium text-muted-foreground bg-muted/40">
                                        Progres: Hal. {sessionPage} / {totalPages} ({sessionPercent}%)
                                      </Badge>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border/40">
                                    <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border/40">
                                      <Calendar className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                                      <div className="min-w-0">
                                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                                          Waktu Mulai Pinjam
                                        </span>
                                        <span className="font-semibold text-foreground font-mono text-xs mt-0.5 block">
                                          {formatDetailedDateTime(session.borrowedAt)}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border/40">
                                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                      <div className="min-w-0">
                                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                                          Waktu Selesai / Dikembalikan
                                        </span>
                                        <span className="font-semibold text-foreground font-mono text-xs mt-0.5 block">
                                          {formatDetailedDateTime(session.dueAt)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BOOKMARK SAYA */}
        {activeTab === "bookmark" && (
          <div key="bookmark" className="animate-fade-in space-y-4">
            {isLoading ? (
              <div className="flex flex-col gap-3.5">
                <BookListSkeleton />
                <BookListSkeleton />
                <BookListSkeleton />
              </div>
            ) : bookmarkedBooks.length === 0 ? (
              <div className="py-16 text-center rounded-3xl border border-dashed border-border bg-muted/20">
                <Bookmark className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <h3 className="font-heading text-base font-bold text-foreground">
                  Belum Ada Buku yang Disimpan
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Tandai buku yang ingin Anda baca nanti dengan menekan tombol simpan atau bookmark pada halaman buku.
                </p>
                <Link href="/buku">
                  <Button size="sm" className="mt-4 text-xs font-semibold">
                    Cari Buku Sekarang
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3.5 w-full">
                {bookmarkedBooks.map((book) => {
                  const targetSlug = book.slug || book.id
                  const activeLoan = activeLoans.find(
                    (l) => String(l.bookId) === String(book.id) || l.bookSlug === book.slug
                  )
                  const isCurrentlyBorrowed = Boolean(activeLoan)

                  return (
                    <div
                      key={book.id}
                      className="flex flex-col rounded-2xl border border-border bg-card shadow-2xs hover:border-sky-400/50 dark:hover:border-sky-600/50 transition-all overflow-hidden w-full group"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-4">
                        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
                          {/* Book Cover with 3D Spine */}
                          <Link
                            href={`/buku/${targetSlug}`}
                            className="relative h-20 w-14 sm:h-22 sm:w-16 rounded-xl overflow-hidden shadow-xs ring-1 ring-border shrink-0 group/cover"
                            title={`Buka detail buku ${book.title}`}
                          >
                            <img
                              src={book.coverUrl}
                              alt={book.title}
                              loading="lazy"
                              decoding="async"
                              className="h-full w-full object-cover group-hover/cover:scale-105 transition-transform duration-300 pointer-events-none"
                            />
                            <div className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/30 to-transparent z-10" />
                          </Link>

                          <div className="flex flex-col min-w-0 space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {book.categoryName && (
                                <Badge variant="secondary" className="w-fit text-[10px] px-2 py-0.5 font-medium text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800">
                                  {book.categoryName}
                                </Badge>
                              )}

                              {isCurrentlyBorrowed ? (
                                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] px-2 py-0.5 font-bold flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>Sedang Dipinjam</span>
                                </Badge>
                              ) : null}

                              {book.averageRating && book.averageRating > 0 ? (
                                <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-semibold text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/30 flex items-center gap-1">
                                  <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                                  <span>{Number(book.averageRating).toFixed(1)}</span>
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-normal text-muted-foreground bg-muted/40">
                                  Belum ada ulasan
                                </Badge>
                              )}
                            </div>

                            <Link
                              href={`/buku/${targetSlug}`}
                              className="font-heading text-sm sm:text-base font-bold text-foreground line-clamp-1 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                              title={book.title}
                            >
                              {book.title}
                            </Link>

                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>{book.authorName || "Pustaka RSJD"}</span>
                              {book.pageCount ? (
                                <>
                                  <span>&bull;</span>
                                  <span>{book.pageCount} Halaman</span>
                                </>
                              ) : null}
                              {book.publishYear ? (
                                <>
                                  <span>&bull;</span>
                                  <span>Tahun {book.publishYear}</span>
                                </>
                              ) : null}
                              {book.synopsis ? (
                                <>
                                  <span className="hidden sm:inline">&bull;</span>
                                  <span className="hidden sm:inline line-clamp-1 max-w-md text-muted-foreground/80">
                                    {book.synopsis}
                                  </span>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/40 w-full sm:w-auto">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveBookmark(book.id || book.slug, book.title)}
                            className="h-9 px-3 text-xs font-semibold gap-1.5 rounded-xl border-border hover:border-rose-300 dark:hover:border-rose-900/60 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
                            title="Hapus dari Bookmark Saya"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Hapus Bookmark</span>
                          </Button>

                          {isCurrentlyBorrowed ? (
                            <Link href={`/baca/${book.id}`}>
                              <Button
                                size="sm"
                                className="h-9 px-3.5 text-xs font-semibold gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 shadow-xs"
                              >
                                <BookOpen className="h-3.5 w-3.5" />
                                <span>Lanjutkan Baca</span>
                              </Button>
                            </Link>
                          ) : (
                            <Link href={`/buku/${targetSlug}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 px-3.5 text-xs font-semibold gap-1.5 rounded-xl hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-950/60 dark:hover:text-sky-400 transition-colors"
                              >
                                <BookOpen className="h-3.5 w-3.5" />
                                <span>Lihat & Pinjam</span>
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* MODAL KTA DIGITAL */}
      <DigitalMemberCardDialog
        open={isKtaModalOpen}
        onOpenChange={setIsKtaModalOpen}
        onOpenBiodata={() => setIsAccountBiodataOpen(true)}
      />

      {/* MODAL BIODATA AKUN */}
      <AccountBiodataDialog
        open={isAccountBiodataOpen}
        onOpenChange={setIsAccountBiodataOpen}
        onOpenKta={() => setIsKtaModalOpen(true)}
      />

      {/* DIALOG WARNING KONFIRMASI PENGEMBALIAN BUKU */}
      <Dialog
        open={Boolean(loanToReturn)}
        onOpenChange={(open) => {
          if (!open && !returningLoanId) setLoanToReturn(null)
        }}
      >
        <DialogContent className="w-full sm:max-w-md p-6 rounded-3xl border border-border bg-card shadow-2xl overflow-hidden animate-fade-in">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base font-bold text-foreground">
                  Konfirmasi Pengembalian Buku
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Kembalikan buku pinjaman digital sebelum masa tenggat.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {loanToReturn && (() => {
            const bookMeta = catalogBooks.find(
              (b) => b.id === loanToReturn.bookId || b.slug === loanToReturn.bookSlug
            )
            const prog =
              progressMap[loanToReturn.bookId] ||
              (loanToReturn.bookSlug ? progressMap[loanToReturn.bookSlug] : null) || {
                lastPage: loanToReturn.lastPage || 1,
                percent: loanToReturn.progressPercent || 0,
              }
            const totalPages = loanToReturn.pageCount || bookMeta?.pageCount || 200
            const lastPage = prog.lastPage || 1
            const percent = prog.percent || Math.round((lastPage / totalPages) * 100)

            return (
              <div className="space-y-4 py-2 text-xs w-full min-w-0">
                {/* Card Ringkasan Buku */}
                <div className="p-3.5 rounded-2xl bg-muted/50 border border-border/80 flex items-start gap-3.5 min-w-0 w-full">
                  <div className="relative h-20 w-14 rounded-lg overflow-hidden shadow-xs ring-1 ring-border/60 shrink-0 bg-background">
                    <img
                      src={loanToReturn.coverUrl}
                      alt={loanToReturn.bookTitle}
                      className="h-full w-full object-cover"
                    />
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-gradient-to-r from-black/40 to-transparent" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1 justify-center space-y-1">
                    <h4 className="font-heading font-bold text-xs text-foreground line-clamp-2 leading-snug">
                      {loanToReturn.bookTitle}
                    </h4>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {bookMeta?.authorName || "Pustaka RSJD"}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-1 text-[10px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1 font-medium text-sky-600 dark:text-sky-400">
                        <Clock className="h-3 w-3" />
                        {getRemainingTimeText(loanToReturn.dueAt)}
                      </span>
                      <span>&bull;</span>
                      <span>
                        Halaman {lastPage} / {totalPages} ({percent}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Box Warning Info */}
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs space-y-1 leading-relaxed">
                  <div className="font-semibold flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Akses membaca aktif akan diakhiri</span>
                  </div>
                  <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90">
                    Buku ini akan dipindahkan dari rak aktif ke tab <strong>Riwayat Selesai</strong>. Progres membaca terakhir Anda akan tetap tersimpan dan Anda dapat meminjamnya kembali kapan saja.
                  </p>
                </div>
              </div>
            )
          })()}

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-border/60 mt-1 w-full min-w-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLoanToReturn(null)}
              disabled={Boolean(returningLoanId)}
              className="h-10 px-4 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground border-border hover:bg-muted/60 transition-all cursor-pointer w-full sm:w-auto"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleConfirmReturn}
              disabled={Boolean(returningLoanId)}
              className="h-10 px-5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white gap-2 shadow-md shadow-rose-600/25 hover:shadow-lg hover:shadow-rose-600/35 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 w-full sm:w-auto"
            >
              {returningLoanId ? (
                <>
                  <Spinner className="h-4 w-4 text-white" />
                  <span>Mengembalikan...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 text-white" />
                  <span>Ya, Kembalikan Buku</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function LoansPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-background py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-8 w-64 rounded-md" />
              <Skeleton className="h-4 w-96 rounded-md" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <LoanCardSkeleton />
              <LoanCardSkeleton />
            </div>
          </div>
        </div>
      }
    >
      <LoansContent />
    </React.Suspense>
  )
}

