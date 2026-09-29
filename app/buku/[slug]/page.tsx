"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  BookOpen,
  Star,
  Bookmark,
  Calendar,
  Layers,
  Building,
  User,
  Hash,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Share2,
  CheckCircle2,
  Clock,
  ArrowLeft,
  FileText,
  Sparkles,
  Send,
  CornerDownRight,
  ChevronRight,
  Globe,
  Check,
  Lock,
  Quote,
  Mail,
  Home,
  Trash2,
  Edit3,
  X,
} from "lucide-react"

import { CitationDialog } from "@/components/book/citation-dialog"
import { GuestModal } from "@/components/auth/guest-modal"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp"
import { Textarea } from "@/components/ui/textarea"
import { FieldError } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/lib/auth-context"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import type {
  BookItem,
  ReviewItem,
} from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { saveRecentlyViewed } from "@/lib/recently-viewed"

const LOCAL_STORAGE_BOOKMARK_KEY = "rsjd_bookmarks_v1"
const LOCAL_STORAGE_LOANS_KEY = "rsjd_user_loans_v1"

interface StoredLoanRecord {
  id: string
  userId?: number
  userEmail?: string
  bookId: string
  bookTitle: string
  coverUrl: string
  durationDays: number
  borrowedAt: string
  dueAt: string
  status: "aktif" | "selesai"
}

export default function BookDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string

  const [liveBook, setLiveBook] = React.useState<BookItem | null>(null)

  React.useEffect(() => {
    if (slug) {
      fetch(`/api/books/${encodeURIComponent(slug)}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.book) {
            setLiveBook(d.book)
            if (Array.isArray(d.book.reviews)) {
              setReviewsList(d.book.reviews)
            }
          }
        })
        .catch(() => {})
    }
  }, [slug])

  const book = liveBook

  // Track into Recently Viewed
  React.useEffect(() => {
    if (book && (book.id || book.slug)) {
      saveRecentlyViewed(book)
    }
  }, [book?.id, book?.slug, book?.title])

  // Resolve category slug for breadcrumb and category filter navigation
  const categorySlug = React.useMemo(() => {
    if (!book) return ""
    return book.categorySlug || book.categoryName?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || ""
  }, [book])

  // Bookmarks (Terintegrasi dengan Basis Data MariaDB & Local Storage)
  const [isBookmarked, setIsBookmarked] = React.useState(false)
  React.useEffect(() => {
    if (!book) return
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_BOOKMARK_KEY)
      if (saved) {
        const list: string[] = JSON.parse(saved)
        setIsBookmarked(list.includes(String(book.id)))
      }
    } catch {}

    // Sinkronisasi data bookmark akun dari database (Single Source of Truth)
    fetch("/api/favorites")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.favorites)) {
          const stringFavs = d.favorites.map(String)
          setIsBookmarked(stringFavs.includes(String(book.id)))
          try {
            localStorage.setItem(LOCAL_STORAGE_BOOKMARK_KEY, JSON.stringify(stringFavs))
          } catch {}
        }
      })
      .catch(() => {})

    const handleBookmarkUpdate = () => {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_BOOKMARK_KEY)
        if (saved) {
          const list: string[] = JSON.parse(saved)
          setIsBookmarked(list.includes(String(book.id)))
        }
      } catch {}
    }
    window.addEventListener("bookmarks-updated", handleBookmarkUpdate)
    return () => window.removeEventListener("bookmarks-updated", handleBookmarkUpdate)
  }, [book?.id])

  const toggleBookmark = () => {
    if (!book) return
    if (isGuest) {
      setGuestActionType("bookmark")
      setIsGuestModalOpen(true)
      return
    }
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_BOOKMARK_KEY)
      const list: string[] = saved ? JSON.parse(saved) : []
      let updated: string[]
      const currentBookId = String(book.id)
      if (list.includes(currentBookId)) {
        updated = list.filter((id) => id !== currentBookId)
        setIsBookmarked(false)
      } else {
        updated = [...list, currentBookId]
        setIsBookmarked(true)
      }
      localStorage.setItem(LOCAL_STORAGE_BOOKMARK_KEY, JSON.stringify(updated))
      window.dispatchEvent(new Event("bookmarks-updated"))

      // Kirim pembaruan ke tabel favorites MariaDB
      fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId: book.id, action: "toggle" }),
      }).catch(() => {})
    } catch {}
  }

  // Auth & Guest Protection
  const { user, isGuest, verifyBiodata } = useAuth()
  const [isGuestModalOpen, setIsGuestModalOpen] = React.useState(false)
  const [guestActionType, setGuestActionType] = React.useState<"pinjam" | "ulasan" | "bookmark">("pinjam")

  // Anti-Bot Biodata Verification Modal
  const [isVerifyModalOpen, setIsVerifyModalOpen] = React.useState(false)
  const [verifyName, setVerifyName] = React.useState("")
  const [verifyNik, setVerifyNik] = React.useState("")
  const [verifyPhone, setVerifyPhone] = React.useState("")
  const [verifyInstitution, setVerifyInstitution] = React.useState("")
  const [verifyCity, setVerifyCity] = React.useState("")
  const [verifyOtp, setVerifyOtp] = React.useState("")
  const [isVerifying, setIsVerifying] = React.useState(false)
  const [verifyError, setVerifyError] = React.useState("")
  const [verifyFieldErrors, setVerifyFieldErrors] = React.useState<{
    name?: string
    phone?: string
    institution?: string
    otp?: string
  }>({})
  const [isSendingOtp, setIsSendingOtp] = React.useState(false)
  const [otpCountdown, setOtpCountdown] = React.useState(0)

  React.useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown((c) => c - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [otpCountdown])

  const handleSendBorrowOtp = async () => {
    if (!user?.email) {
      toast.error("Alamat email pengguna tidak ditemukan.")
      return
    }

    setIsSendingOtp(true)
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: user.email,
          channel: "email",
          purpose: "borrow_verification",
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setOtpCountdown(60)
        toast.success(`Kode OTP 6-digit berhasil dikirim langsung ke email ${user.email}!`)
      } else {
        toast.error(data.error || "Gagal mengirim kode OTP.")
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan.")
    } finally {
      setIsSendingOtp(false)
    }
  }

  // Loans State
  const [isBorrowDialogOpen, setIsBorrowDialogOpen] = React.useState(false)
  const [borrowDuration, setBorrowDuration] = React.useState<number>(7) // Default 7 days
  const [activeLoan, setActiveLoan] = React.useState<StoredLoanRecord | null>(null)
  const [isBorrowing, setIsBorrowing] = React.useState(false)
  const [borrowSuccess, setBorrowSuccess] = React.useState(false)
  // Citation Dialog
  const [isCitationDialogOpen, setIsCitationDialogOpen] = React.useState(false)

  // Pure computed due date for display
  const dueDateString = React.useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + borrowDuration)
    return d.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }, [borrowDuration])

  const handleInitiateBorrow = () => {
    if (isGuest) {
      setGuestActionType("pinjam")
      setIsGuestModalOpen(true)
      return
    }
    if (!user?.isVerified) {
      setVerifyName(user?.name || "")
      setVerifyPhone(user?.phone || "")
      setIsVerifyModalOpen(true)
      return
    }
    setIsBorrowDialogOpen(true)
  }

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errors: typeof verifyFieldErrors = {}

    if (!verifyName.trim()) {
      errors.name = "Nama lengkap peminjam wajib diisi."
    }
    if (!verifyPhone.trim() || verifyPhone.trim().length < 8) {
      errors.phone = "Nomor WhatsApp / HP aktif wajib diisi (minimal 8-10 digit)."
    }
    if (!verifyInstitution.trim()) {
      errors.institution = "Profesi / instansi peminjam wajib diisi."
    }
    if (!verifyOtp.trim() || verifyOtp.trim().length !== 6) {
      errors.otp = "Silakan masukkan 6 digit kode OTP yang dikirim ke email."
    }

    if (Object.keys(errors).length > 0) {
      setVerifyFieldErrors(errors)
      setVerifyError("Silakan lengkapi atau periksa kolom yang bertanda merah.")
      return
    }

    setVerifyFieldErrors({})
    setIsVerifying(true)
    setVerifyError("")

    const res = await verifyBiodata(
      verifyNik.trim(),
      verifyPhone.trim(),
      verifyInstitution.trim(),
      verifyOtp.trim(),
      verifyCity.trim(),
      verifyName.trim()
    )
    setIsVerifying(false)

    if (res.success) {
      setIsVerifyModalOpen(false)
      // Open borrowing dialog right away
      setIsBorrowDialogOpen(true)
    } else {
      setVerifyError(res.error || "Kode OTP tidak valid atau telah kedaluwarsa.")
    }
  }

  // Helper fleksibel untuk mencocokkan record peminjaman dengan buku yang sedang dibuka
  const isLoanMatch = React.useCallback(
    (l: any) => {
      if (!book || !l) return false
      const lBookId = String(l.bookId || "").replace(/^b/i, "")
      const curBookId = String(book.id || "").replace(/^b/i, "")
      const isIdMatch = Boolean(lBookId && curBookId && lBookId === curBookId)
      const isSlugMatch = Boolean(book.slug && (l.bookSlug === book.slug || l.slug === book.slug))
      const isTitleMatch = Boolean(
        book.title && l.bookTitle && l.bookTitle.toLowerCase().trim() === book.title.toLowerCase().trim()
      )

      if (!isIdMatch && !isSlugMatch && !isTitleMatch) return false

      const isStatusActive = l.status === "aktif" || l.status === "active"
      if (!isStatusActive) return false

      if (l.dueAt) {
        const dueTime = new Date(l.dueAt).getTime()
        if (!isNaN(dueTime) && dueTime <= Date.now()) {
          return false
        }
      }
      return true
    },
    [book]
  )

  // Sinkronisasi status pinjaman aktif (dengan cache lokal instan + sinkronisasi server + event listener)
  React.useEffect(() => {
    if (!book || isGuest) {
      setActiveLoan(null)
      return
    }

    let isMounted = true

    const syncLoanState = () => {
      // 1. Coba baca secara sinkron dari cache localStorage terlebih dahulu (menghindari layout shift/flicker tombol)
      try {
        const savedLoans = localStorage.getItem(LOCAL_STORAGE_LOANS_KEY)
        if (savedLoans) {
          const loansList = JSON.parse(savedLoans)
          if (Array.isArray(loansList)) {
            const localMatch = loansList.find(isLoanMatch)
            if (localMatch && isMounted) {
              setActiveLoan({
                id: String(localMatch.id),
                userId: localMatch.userId,
                bookId: String(localMatch.bookId),
                bookTitle: localMatch.bookTitle,
                coverUrl: localMatch.coverUrl || localMatch.bookCover,
                durationDays: localMatch.durationDays,
                borrowedAt: localMatch.borrowedAt,
                dueAt: localMatch.dueAt,
                status: localMatch.status,
              })
            }
          }
        }
      } catch {}

      // 2. Sinkronkan dengan server database MariaDB (/api/loans)
      if (user?.id) {
        fetch("/api/loans")
          .then((res) => res.json())
          .then((data) => {
            if (!isMounted) return
            if (data.success && Array.isArray(data.loans)) {
              const match = data.loans.find(isLoanMatch)
              if (match) {
                setActiveLoan({
                  id: String(match.id),
                  userId: match.userId,
                  bookId: String(match.bookId),
                  bookTitle: match.bookTitle,
                  coverUrl: match.bookCover,
                  durationDays: match.durationDays,
                  borrowedAt: match.borrowedAt,
                  dueAt: match.dueAt,
                  status: match.status,
                })
              } else {
                setActiveLoan(null)
              }
            }
          })
          .catch(() => {})
      }
    }

    syncLoanState()

    // Dengarkan perubahan pinjaman dari tab lain / halaman admin / pengembalian buku
    window.addEventListener("loans-updated", syncLoanState)
    return () => {
      isMounted = false
      window.removeEventListener("loans-updated", syncLoanState)
    }
  }, [book, user?.id, isGuest, isLoanMatch])

  const handleConfirmBorrow = async () => {
    if (!book) return
    if (isGuest) {
      setGuestActionType("pinjam")
      setIsGuestModalOpen(true)
      return
    }
    if (!user?.isVerified) {
      setVerifyName(user?.name || "")
      setVerifyPhone(user?.phone || "")
      setIsVerifyModalOpen(true)
      return
    }

    setIsBorrowing(true)
    try {
      // 1. Simpan ke database MariaDB melalui API
      const res = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId: book.id,
          durationDays: borrowDuration,
        }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        toast.error(data.error || "Gagal memproses peminjaman pada server.")
        return
      }

      toast.success(data.message || `Buku "${book.title}" berhasil dipinjam!`)

      const now = new Date()
      const dueDate = new Date(now.getTime() + borrowDuration * 24 * 60 * 60 * 1000)
      const newLoan: StoredLoanRecord = {
        id: data.loanId ? String(data.loanId) : "loan-" + Date.now(),
        userId: user?.id,
        userEmail: user?.email,
        bookId: String(book.id),
        bookTitle: book.title,
        coverUrl: book.coverUrl,
        durationDays: borrowDuration,
        borrowedAt: now.toISOString(),
        dueAt: dueDate.toISOString(),
        status: "aktif",
      }

      // 2. Simpan juga ke localStorage sebagai cache cepat
      const savedLoans = localStorage.getItem(LOCAL_STORAGE_LOANS_KEY)
      const loans: StoredLoanRecord[] = savedLoans ? JSON.parse(savedLoans) : []
      const updatedLoans = [
        newLoan,
        ...loans.filter((l: StoredLoanRecord) => String(l.id) !== String(newLoan.id)),
      ]
      localStorage.setItem(LOCAL_STORAGE_LOANS_KEY, JSON.stringify(updatedLoans))
      window.dispatchEvent(new Event("loans-updated"))

      // 3. Teruskan progres membaca riwayat sebelumnya jika ada (jangan di-reset ke 1!)
      try {
        const LOCAL_STORAGE_PROGRESS_KEY = "rsjd_reading_progress_v1"
        const savedProg = localStorage.getItem(LOCAL_STORAGE_PROGRESS_KEY)
        const progMap = savedProg ? JSON.parse(savedProg) : {}
        const existingEntry = progMap[String(book.id)] || (book.slug ? progMap[book.slug] : null)

        // Prioritaskan riwayat halaman yang dikembalikan server (dari basis data) atau cache lokal
        const preservedPage = data.lastPage && data.lastPage > 1
          ? data.lastPage
          : (existingEntry?.lastPage && existingEntry.lastPage > 1 ? existingEntry.lastPage : 1)
        const preservedPercent = data.progressPercent ?? existingEntry?.percent ?? 0

        progMap[String(book.id)] = { lastPage: preservedPage, percent: preservedPercent }
        if (book.slug) {
          progMap[book.slug] = { lastPage: preservedPage, percent: preservedPercent }
        }
        localStorage.setItem(LOCAL_STORAGE_PROGRESS_KEY, JSON.stringify(progMap))
        window.dispatchEvent(new Event("reading-progress-updated"))
      } catch {}

      setActiveLoan(newLoan)
      setIsBorrowDialogOpen(false)
      setBorrowSuccess(true)
      setTimeout(() => setBorrowSuccess(false), 4000)
    } catch (err) {
      console.error("Gagal mencatat peminjaman:", err)
      toast.error("Terjadi kendala jaringan saat menghubungi server perpustakaan.")
    } finally {
      setIsBorrowing(false)
    }
  }

  // Report Issue (Help) Dialog
  const [isReportDialogOpen, setIsReportDialogOpen] = React.useState(false)
  const [reportFormat, setReportFormat] = React.useState<"pdf" | "epub" | "lainnya">("pdf")
  const [reportMessage, setReportMessage] = React.useState("")
  const [reportSuccess, setReportSuccess] = React.useState(false)
  const [isSubmittingReport, setIsSubmittingReport] = React.useState(false)
  const [reportError, setReportError] = React.useState("")

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reportMessage.trim()) {
      setReportError("Silakan tuliskan deskripsi kendala yang Anda temukan.")
      return
    }
    if (reportMessage.trim().length < 5) {
      setReportError("Deskripsi kendala terlalu singkat. Jelaskan minimal 5 karakter.")
      return
    }
    setReportError("")
    if (isSubmittingReport) return
    setIsSubmittingReport(true)

    try {
      const res = await fetch(`/api/books/${encodeURIComponent(slug)}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: reportFormat,
          message: reportMessage.trim(),
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setReportSuccess(true)
        toast.success("Laporan kendala berhasil dikirim ke Pustakawan!")
        setTimeout(() => {
          setReportSuccess(false)
          setIsReportDialogOpen(false)
          setReportMessage("")
        }, 1500)
      } else {
        setReportError(data.error || "Gagal mengirim laporan kendala.")
      }
    } catch {
      setReportError("Terjadi kesalahan jaringan saat mengirim laporan.")
    } finally {
      setIsSubmittingReport(false)
    }
  }

  // Reviews
  const [reviewsList, setReviewsList] = React.useState<ReviewItem[]>([])
  const [newRating, setNewRating] = React.useState<number>(5)
  const [newComment, setNewComment] = React.useState("")
  const [isSubmittingReview, setIsSubmittingReview] = React.useState(false)

  // Admin Reply & Moderation State
  const isAdmin = user?.role === "admin" || user?.role === "super_admin"
  const [replyingReviewId, setReplyingReviewId] = React.useState<string | null>(null)
  const [replyText, setReplyText] = React.useState("")
  const [isSubmittingReply, setIsSubmittingReply] = React.useState(false)

  const handleOpenReplyBox = (rev: ReviewItem) => {
    setReplyingReviewId(rev.id)
    setReplyText(rev.adminReply || "")
  }

  const handleSubmitAdminReply = async (reviewId: string) => {
    if (!replyText.trim() || isSubmittingReply) return
    setIsSubmittingReply(true)
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: replyText.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setReviewsList((prev) =>
          prev.map((r) =>
            r.id === reviewId
              ? {
                  ...r,
                  adminReply: data.adminReply || replyText.trim(),
                  adminReplyAt: data.adminReplyAt || "Baru saja",
                }
              : r
          )
        )
        setReplyingReviewId(null)
        setReplyText("")
        toast.success("Balasan resmi admin berhasil dipublikasikan!")
      } else {
        toast.error(data.error || "Gagal menyimpan balasan admin.")
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan saat membalas ulasan.")
    } finally {
      setIsSubmittingReply(false)
    }
  }

  const handleDeleteAdminReply = async (reviewId: string) => {
    if (!confirm("Hapus balasan admin pada ulasan ini?")) return
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}?action=delete_reply`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setReviewsList((prev) =>
          prev.map((r) =>
            r.id === reviewId
              ? { ...r, adminReply: undefined, adminReplyAt: undefined }
              : r
          )
        )
        toast.success("Balasan admin berhasil dihapus.")
      } else {
        toast.error(data.error || "Gagal menghapus balasan admin.")
      }
    } catch {
      toast.error("Gagal menghubungi server.")
    }
  }

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm("Hapus ulasan pembaca ini secara permanen dari sistem?")) return
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}?action=delete_review`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setReviewsList((prev) => prev.filter((r) => r.id !== reviewId))
        toast.success("Ulasan berhasil dihapus.")
      } else {
        toast.error(data.error || "Gagal menghapus ulasan.")
      }
    } catch {
      toast.error("Gagal menghubungi server.")
    }
  }

  React.useEffect(() => {
    if (liveBook?.reviews && Array.isArray(liveBook.reviews)) {
      setReviewsList(liveBook.reviews)
    } else {
      setReviewsList([])
    }
  }, [liveBook])

  const displayReviewCount = reviewsList.length
  const displayRating =
    displayReviewCount > 0
      ? (reviewsList.reduce((acc, r) => acc + r.rating, 0) / displayReviewCount).toFixed(1)
      : null

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isGuest) {
      setGuestActionType("ulasan")
      setIsGuestModalOpen(true)
      return
    }
    if (!user?.isVerified) {
      setVerifyName(user?.name || "")
      setVerifyPhone(user?.phone || "")
      setIsVerifyModalOpen(true)
      return
    }
    if (!newComment.trim() || isSubmittingReview) return
    setIsSubmittingReview(true)

    try {
      const res = await fetch(`/api/books/${encodeURIComponent(slug)}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: newRating,
          comment: newComment.trim(),
        }),
      })
      const data = await res.json()
      if (res.ok && data.success && data.review) {
        setReviewsList((prev) => [data.review, ...prev])
        setNewComment("")
        toast.success("Ulasan Anda berhasil dikirim dan tersimpan!")
      } else {
        const review: ReviewItem = {
          id: "rev-" + Date.now(),
          userName: user?.name || "Pembaca Terdaftar",
          userAvatar:
            user?.avatarUrl ||
            "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80",
          rating: newRating,
          comment: newComment.trim(),
          createdAt: "Baru saja",
        }
        setReviewsList((prev) => [review, ...prev])
        setNewComment("")
        toast.success("Ulasan Anda berhasil dikirim!")
      }
    } catch {
      const review: ReviewItem = {
        id: "rev-" + Date.now(),
        userName: user?.name || "Pembaca Terdaftar",
        userAvatar:
          user?.avatarUrl ||
          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80",
        rating: newRating,
        comment: newComment.trim(),
        createdAt: "Baru saja",
      }
      setReviewsList((prev) => [review, ...prev])
      setNewComment("")
      toast.success("Ulasan Anda berhasil dikirim!")
    } finally {
      setIsSubmittingReview(false)
    }
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8 animate-pulse">
          <div className="h-4 w-56 bg-neutral-200 dark:bg-neutral-800 rounded-md" />
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
            <div className="md:col-span-4 lg:col-span-3">
              <div className="aspect-3/4 rounded-3xl bg-neutral-200 dark:bg-neutral-800" />
            </div>
            <div className="md:col-span-8 lg:col-span-9 space-y-4">
              <div className="h-9 w-3/4 bg-neutral-200 dark:bg-neutral-800 rounded-2xl" />
              <div className="h-4 w-1/3 bg-neutral-200 dark:bg-neutral-800 rounded-md" />
              <div className="h-5 w-40 bg-neutral-200 dark:bg-neutral-800 rounded-md pt-2" />
              <div className="h-28 w-full bg-neutral-200 dark:bg-neutral-800 rounded-2xl" />
              <div className="h-12 w-48 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Availability calculation (v31 decision)
  const isPdfAvailable = book.formats.pdf.available && book.formats.pdf.status === "aktif"
  const isEpubAvailable = book.formats.epub.available && book.formats.epub.status === "aktif"
  const isAnyFormatAvailable = (isPdfAvailable || isEpubAvailable) && book.status === "aktif"

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 py-4 sm:py-6 pb-24 sm:pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* BREADCRUMB (Clean, Modern, Borderless Minimalist) */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-neutral-500 mb-5 sm:mb-6 font-medium overflow-x-auto no-scrollbar whitespace-nowrap py-1 select-none scroll-smooth w-full"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-neutral-500 hover:text-sky-600 dark:hover:text-sky-400 transition-colors shrink-0"
            title="Kembali ke Beranda"
          >
            <Home className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
            <span>Beranda</span>
          </Link>

          <ChevronRight className="h-3.5 w-3.5 text-neutral-400 shrink-0" />

          <Link
            href="/buku"
            className="text-neutral-500 hover:text-sky-600 dark:hover:text-sky-400 transition-colors shrink-0"
          >
            Katalog
          </Link>

          <ChevronRight className="h-3.5 w-3.5 text-neutral-400 shrink-0" />

          <Link
            href={`/buku?category=${encodeURIComponent(categorySlug)}`}
            className="text-neutral-600 dark:text-neutral-300 hover:text-sky-600 dark:hover:text-sky-400 font-semibold transition-colors shrink-0"
          >
            {book.categoryName}
          </Link>

          <ChevronRight className="h-3.5 w-3.5 text-neutral-400 shrink-0" />

          <span
            className="text-neutral-900 dark:text-neutral-100 font-bold truncate max-w-[150px] sm:max-w-xs md:max-w-md shrink-0"
            title={book.title}
          >
            {book.title}
          </span>
        </nav>

        {/* SUKSES PINJAM BANNER */}
        {borrowSuccess && (
          <div className="animate-slide-down mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold">Buku berhasil dipinjam untuk {borrowDuration} hari ke depan!</p>
                <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 font-normal">
                  Akses langsung dibuka tanpa antrean. Klik &quot;Baca Sekarang&quot; untuk mulai membaca.
                </p>
              </div>
            </div>
            <Link href={`/baca/${book.id}`}>
              <Button size="sm" className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs">
                Baca Sekarang
              </Button>
            </Link>
          </div>
        )}

        {/* HERO DETAIL BUKU */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 mb-10 sm:mb-14">
          
          {/* SISI KIRI: COVER DENGAN AMBIENT GLOW, BADGE & INFO FORMAT */}
          <div className="lg:col-span-4 flex flex-col items-center lg:items-start">
            <div className="relative aspect-3/4 w-full max-w-[210px] sm:max-w-xs overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl bg-neutral-100 dark:bg-neutral-900 group">
              <Skeleton className="absolute inset-0" />
              <img
                src={book.coverUrl}
                alt={book.title}
                fetchPriority="high"
                decoding="async"
                className="relative z-1 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 pointer-events-none"
              />

              {/* 3D Realistic Book Spine Effect */}
              <div className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-black/40 via-black/15 to-transparent z-10" />
              <div className="pointer-events-none absolute inset-y-0 left-1.5 w-[1px] bg-white/30 z-10" />
              <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/10 dark:ring-white/10 z-10" />

              {/* Hanging Ribbon Bookmark when bookmarked */}
              {isBookmarked && (
                <div className="absolute -top-1 left-6 z-20 pointer-events-none drop-shadow-md animate-fade-in">
                  <div className="h-9 w-4 bg-rose-600 rounded-b-xs shadow-md relative">
                    <div className="absolute -bottom-1.5 left-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[6px] border-t-rose-600" />
                  </div>
                </div>
              )}

              {/* Badge PILIHAN */}
              {book.isFeatured && (
                <div className="absolute top-3 right-3 z-10">
                  <Badge className="bg-sky-600 text-white font-bold text-xs px-2.5 py-0.5 rounded-full shadow-md">
                    PILIHAN
                  </Badge>
                </div>
              )}

              {/* Status Badge (Pure Binary: Akses Instan vs Sedang Revisi File) */}
              <div className="absolute bottom-3 left-3 z-10">
                {isAnyFormatAvailable ? (
                  <Badge className="bg-emerald-600 text-white font-bold text-[10px] sm:text-xs px-2.5 py-0.5 shadow-md flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    <span>Akses Instan (Tersedia)</span>
                  </Badge>
                ) : (
                  <Badge className="bg-amber-600 text-white font-bold text-[10px] sm:text-xs px-2.5 py-0.5 shadow-md flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>Sedang Revisi File</span>
                  </Badge>
                )}
              </div>
            </div>

            {/* Pills di bawah cover: Format & Bahasa */}
            <div className="w-full max-w-[210px] sm:max-w-xs flex items-center justify-between gap-2 mt-3.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex-1 justify-center">
                <span className="text-[11px] text-neutral-500">Format:</span>
                <span className="font-bold text-neutral-900 dark:text-white uppercase text-[11px]">
                  {book.formats.epub.available ? "EPUB" : "PDF"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex-1 justify-center">
                <span className="text-[11px] text-neutral-500">Bahasa:</span>
                <span className="font-bold text-neutral-900 dark:text-white text-[11px]">
                  {book.language}
                </span>
              </div>
            </div>

            {/* Help / Report Issue button */}
            <button
              type="button"
              onClick={() => setIsReportDialogOpen(true)}
              className="w-auto inline-flex items-center justify-center gap-1.5 text-xs text-neutral-500 hover:text-amber-600 py-1 px-2 font-medium transition-colors cursor-pointer text-center"
            >
              <HelpCircle className="h-3.5 w-3.5 shrink-0" />
              <span>Laporkan File Rusak / Kendala Buku</span>
            </button>
          </div>

          {/* SISI KANAN: METADATA, SINOPSIS & 4 BOX SPESIFIKASI */}
          <div className="lg:col-span-8 flex flex-col justify-between">
            <div className="space-y-4">
              
              {/* Category Pill (Clickable link to category catalog) */}
              <div>
                <Link
                  href={`/buku?category=${encodeURIComponent(categorySlug)}`}
                  className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-900 transition-colors cursor-pointer"
                  title={`Lihat semua koleksi ${book.categoryName}`}
                >
                  {book.categoryName}
                </Link>
              </div>

              {/* Title */}
              <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100 leading-tight">
                {book.title}
              </h1>

              {/* Author & Publisher line */}
              <div className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 flex items-center gap-2 flex-wrap">
                <span>
                  Penulis:{" "}
                  <Link
                    href={`/buku?author=${encodeURIComponent(book.authorName)}`}
                    className="font-bold text-neutral-900 dark:text-neutral-100 hover:text-sky-600 transition-colors"
                  >
                    {book.authorName}
                  </Link>
                </span>
                <span>&bull;</span>
                <span>
                  Penerbit: <strong className="text-neutral-800 dark:text-neutral-200">{book.publisherName}</strong>
                </span>
              </div>

              {/* Rating & Siap Dibaca Indicator */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                  {displayReviewCount > 0 ? (
                    <>
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />
                      <span>{displayRating}</span>
                      <span className="font-normal text-neutral-500">
                        ({displayReviewCount} ulasan)
                      </span>
                    </>
                  ) : (
                    <>
                      <Star className="h-3.5 w-3.5 text-neutral-300 dark:text-neutral-700 shrink-0" />
                      <span className="font-medium text-neutral-500">Belum ada rating</span>
                      <span className="font-normal text-neutral-400">(0 ulasan)</span>
                    </>
                  )}
                </div>
                <span className="text-neutral-300 dark:text-neutral-700 hidden xs:inline">&bull;</span>
                <span className="text-neutral-600 dark:text-neutral-400 font-medium whitespace-nowrap">
                  {book.loanCount || 0} kali dibaca
                </span>
                <span className="text-neutral-300 dark:text-neutral-700 hidden xs:inline">&bull;</span>
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap">
                  <Check className="h-3.5 w-3.5 stroke-[3] shrink-0" />
                  <span>Siap Dibaca</span>
                </div>
              </div>

              {/* SINOPSIS BUKU */}
              <div className="pt-4 border-t border-neutral-150 dark:border-neutral-800 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                  SINOPSIS BUKU
                </h3>
                <p className="text-xs sm:text-sm leading-relaxed text-neutral-600 dark:text-neutral-300 whitespace-pre-line">
                  {book.synopsis}
                </p>
              </div>

              {/* 4-BOX SPECIFICATION GRID WITH MICRO-ICONS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-4">
                <div className="p-3 sm:p-3.5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-50/70 dark:bg-neutral-900/40 hover:bg-neutral-100/70 dark:hover:bg-neutral-800/40 transition-colors flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] sm:text-[11px] font-medium text-neutral-400 dark:text-neutral-500 block leading-tight">
                      Jumlah Halaman
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate mt-0.5">
                      {book.pageCount} Hal
                    </p>
                  </div>
                </div>

                <div className="p-3 sm:p-3.5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-50/70 dark:bg-neutral-900/40 hover:bg-neutral-100/70 dark:hover:bg-neutral-800/40 transition-colors flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] sm:text-[11px] font-medium text-neutral-400 dark:text-neutral-500 block leading-tight">
                      Tahun Terbit
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate mt-0.5">
                      {book.publishYear}
                    </p>
                  </div>
                </div>

                <div className="p-3 sm:p-3.5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-50/70 dark:bg-neutral-900/40 hover:bg-neutral-100/70 dark:hover:bg-neutral-800/40 transition-colors flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Hash className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] sm:text-[11px] font-medium text-neutral-400 dark:text-neutral-500 block leading-tight">
                      ISBN
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 font-mono truncate mt-0.5" title={book.isbn}>
                      {book.isbn}
                    </p>
                  </div>
                </div>

                <div className="p-3 sm:p-3.5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-50/70 dark:bg-neutral-900/40 hover:bg-neutral-100/70 dark:hover:bg-neutral-800/40 transition-colors flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] sm:text-[11px] font-medium text-neutral-400 dark:text-neutral-500 block leading-tight">
                      Format Digital
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 truncate mt-0.5">
                      {book.formats.epub.available ? "EPUB DRM" : "PDF DRM"}
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* ACTION BUTTONS:
                Mobile: Row 1 prominent full-width primary button, Row 2 equal 3-column grid [Simpan] [Kutip] [Bagi]
                Desktop: Inline row with primary button taking flex-1
            */}
            <div className="pt-6 sm:pt-8 mt-6 border-t border-neutral-200 dark:border-neutral-800 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
              {/* Primary Action Button (Baca Sekarang / Pinjam Buku) */}
              {activeLoan ? (
                <Link href={`/baca/${book.id}`} className="block w-full sm:flex-1">
                  <Button
                    size="lg"
                    className="w-full h-12 sm:h-11 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white gap-2 shadow-lg shadow-sky-600/25 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <BookOpen className="h-4 w-4 shrink-0" />
                    <span>Baca Sekarang ({activeLoan.durationDays} Hari Akses)</span>
                  </Button>
                </Link>
              ) : (
                <Button
                  size="lg"
                  disabled={!isAnyFormatAvailable}
                  onClick={handleInitiateBorrow}
                  className="w-full sm:flex-1 h-12 sm:h-11 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white gap-2 shadow-lg shadow-sky-600/25 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
                >
                  <BookOpen className="h-4 w-4 shrink-0" />
                  <span>
                    {isGuest
                      ? "Masuk untuk Meminjam"
                      : !user?.isVerified
                      ? "Verifikasi Biodata untuk Pinjam"
                      : "Pinjam Buku (Pilih Durasi)"}
                  </span>
                </Button>
              )}

              {/* Secondary Actions: On mobile 3 equal columns, on desktop inline */}
              <div className="grid grid-cols-3 sm:flex sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={toggleBookmark}
                  className={cn(
                    "h-10 sm:h-11 px-3 sm:px-4 rounded-xl text-xs font-semibold gap-1.5 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 active:scale-95 transition-all w-full sm:w-auto cursor-pointer",
                    isBookmarked && "border-sky-500 text-sky-600 bg-sky-50 dark:bg-sky-950/40"
                  )}
                  title="Simpan ke Daftar Bacaan"
                >
                  <Bookmark className={cn("h-4 w-4 shrink-0 transition-transform", isBookmarked && "fill-sky-600 text-sky-600 scale-110")} />
                  <span>{isBookmarked ? "Tersimpan" : "Simpan"}</span>
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setIsCitationDialogOpen(true)}
                  className="h-10 sm:h-11 px-3 sm:px-4 rounded-xl text-xs font-semibold gap-1.5 border-neutral-200 dark:border-neutral-800 hover:border-sky-400 hover:text-sky-600 active:scale-95 transition-all w-full sm:w-auto cursor-pointer"
                  title="Salin Sitasi Ilmiah (APA, MLA, Chicago)"
                >
                  <Quote className="h-4 w-4 text-sky-600 shrink-0" />
                  <span>Kutip</span>
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    if (typeof navigator !== "undefined" && navigator.clipboard) {
                      navigator.clipboard.writeText(window.location.href)
                      toast.success("Tautan buku berhasil disalin ke clipboard!")
                    }
                  }}
                  className="h-10 sm:h-11 px-3 sm:px-3 rounded-xl border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 active:scale-95 transition-transform flex items-center justify-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 w-full sm:w-auto cursor-pointer"
                  title="Bagikan Tautan Buku"
                >
                  <Share2 className="h-4 w-4 text-neutral-600 dark:text-neutral-400 shrink-0" />
                  <span className="sm:hidden">Bagi</span>
                </Button>
              </div>
            </div>

          </div>

        </div>

        {/* SECTION ULASAN & PENILAIAN PEMBACA (Matching Video Frame 4) */}
        <div className="space-y-6 pt-8 border-t border-neutral-200 dark:border-neutral-800">
          <div>
            <h3 className="font-heading text-xl font-bold text-neutral-900 dark:text-neutral-100">
              Ulasan & Penilaian Pembaca
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {displayReviewCount > 0 ? (
                <>
                  <div className="flex items-center gap-1 text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span>{displayRating}</span>
                  </div>
                  <span className="text-xs text-neutral-500">
                    ({displayReviewCount} ulasan)
                  </span>
                </>
              ) : (
                <span className="text-xs text-neutral-500">
                  Belum ada ulasan untuk buku ini
                </span>
              )}
            </div>
          </div>

          {/* Form Bagikan Pendapat Anda (Matching Video Frame 4 & Spesifikasi v32) */}
          {isGuest ? (
            <div className="p-5 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50/70 dark:bg-neutral-900/40 text-center space-y-2.5">
              <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                🔒 Masuk ke akun Anda terlebih dahulu untuk dapat memberikan rating dan ulasan pada buku ini.
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setGuestActionType("ulasan")
                  setIsGuestModalOpen(true)
                }}
                className="h-8 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-xs"
              >
                Masuk / Buat Akun
              </Button>
            </div>
          ) : !user?.isVerified ? (
            <div className="p-5 rounded-2xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/70 dark:bg-amber-950/30 text-center space-y-2.5">
              <div className="flex items-center justify-center gap-1.5 text-amber-800 dark:text-amber-300 text-xs font-bold">
                <ShieldCheck className="h-4 w-4" />
                <span>Verifikasi Biodata Diperlukan (Anti-Bot)</span>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 max-w-md mx-auto leading-relaxed">
                Untuk menjaga kualitas ulasan dan mencegah spam bot, Anda harus melengkapi biodata NIK & nomor WhatsApp sebelum dapat menulis ulasan.
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setVerifyName(user?.name || "")
                  setVerifyPhone(user?.phone || "")
                  setIsVerifyModalOpen(true)
                }}
                className="h-8 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-xs"
              >
                Isi Biodata Verifikasi Sekarang
              </Button>
            </div>
          ) : (
            <form onSubmit={handleAddReview} noValidate className="space-y-3">
              <div className="flex items-center gap-3 text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                <span>Bagikan pendapat Anda tentang buku ini:</span>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-neutral-500 mr-1">Rating Anda:</span>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setNewRating(s)}
                      className="p-0.5 hover:scale-110 active:scale-90 transition-transform"
                    >
                      <Star
                        className={cn(
                          "h-3.5 w-3.5",
                          s <= newRating ? "fill-amber-400 text-amber-400" : "text-neutral-300 dark:text-neutral-700"
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <Textarea
                placeholder="Masukkan Ulasan Anda..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="text-xs resize-none h-20 rounded-xl bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
              />

              <Button
                type="submit"
                disabled={isSubmittingReview}
                size="sm"
                className="h-9 text-xs font-bold px-5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl transition-all gap-2 shadow-xs"
              >
                {isSubmittingReview ? (
                  <>
                    <Spinner className="h-3.5 w-3.5 text-white" />
                    <span>Mengirim...</span>
                  </>
                ) : (
                  "Kirim Ulasan"
                )}
              </Button>
            </form>
          )}

          {/* Reviews List */}
          <div className="space-y-4 pt-4">
            {reviewsList.length === 0 ? (
              <div className="p-8 sm:p-10 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 text-center space-y-2.5">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Star className="w-6 h-6 text-amber-500 fill-amber-400/20" />
                </div>
                <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                  Belum Ada Ulasan
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto leading-relaxed">
                  Buku ini baru ditambahkan ke katalog dan belum memiliki ulasan pembaca. Jadilah orang pertama yang membagikan ulasan dan penilaian!
                </p>
              </div>
            ) : (
              reviewsList.map((rev) => (
                <div
                  key={rev.id}
                  className="animate-fade-in p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={rev.userAvatar}
                        alt={rev.userName}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="h-8 w-8 rounded-full object-cover ring-1 ring-neutral-200"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">{rev.userName}</span>
                        <span className="text-[10px] text-neutral-400">{rev.createdAt}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                          key={idx}
                          className={cn(
                            "h-3 w-3",
                            idx < rev.rating ? "fill-amber-400 text-amber-400" : "text-neutral-200"
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">{rev.comment}</p>

                  {/* Action Bar Khusus Admin & Super Admin */}
                  {isAdmin && (
                    <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-neutral-800/60 text-[11px]">
                      <div className="flex items-center gap-1.5 text-neutral-400">
                        <ShieldCheck className="h-3 w-3 text-sky-600" />
                        <span className="font-semibold text-sky-700 dark:text-sky-400">Akses Pengelola</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {rev.adminReply ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenReplyBox(rev)}
                              className="text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                            >
                              <Edit3 className="h-3 w-3" />
                              <span>Edit Balasan</span>
                            </button>
                            <span className="text-neutral-300 dark:text-neutral-700">&bull;</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteAdminReply(rev.id)}
                              className="text-neutral-400 hover:text-rose-500 flex items-center gap-1 font-medium cursor-pointer"
                            >
                              <X className="h-3 w-3" />
                              <span>Hapus Balasan</span>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenReplyBox(rev)}
                            className="text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                          >
                            <CornerDownRight className="h-3 w-3" />
                            <span>Balas Ulasan</span>
                          </button>
                        )}
                        <span className="text-neutral-300 dark:text-neutral-700">&bull;</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteReview(rev.id)}
                          className="text-destructive/70 hover:text-destructive flex items-center gap-1 font-medium cursor-pointer"
                          title="Hapus ulasan pembaca ini"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Inline Form Balasan Admin */}
                  {replyingReviewId === rev.id && (
                    <div className="ml-2 sm:ml-4 p-3.5 rounded-2xl border border-sky-300 dark:border-sky-800 bg-sky-50/60 dark:bg-sky-950/40 space-y-2.5 animate-fade-in">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-sky-800 dark:text-sky-200">
                          <CornerDownRight className="h-3.5 w-3.5 text-sky-600" />
                          <span>{rev.adminReply ? "Edit Respon Resmi Admin" : "Tulis Respon Resmi Admin"}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setReplyingReviewId(null)}
                          className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer p-0.5"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <Textarea
                        autoFocus
                        rows={3}
                        placeholder={`Tanggapi ulasan dari ${rev.userName} atas nama Tim Pustakawan RSJD...`}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="text-xs resize-none rounded-xl bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 focus:border-sky-500"
                      />

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setReplyingReviewId(null)}
                          disabled={isSubmittingReply}
                          className="h-8 text-xs rounded-xl"
                        >
                          Batal
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={isSubmittingReply || !replyText.trim()}
                          onClick={() => handleSubmitAdminReply(rev.id)}
                          className="h-8 px-4 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-xl gap-1.5 shadow-xs cursor-pointer"
                        >
                          {isSubmittingReply ? (
                            <Spinner className="h-3 w-3 text-white" />
                          ) : (
                            <Send className="h-3 w-3" />
                          )}
                          <span>{isSubmittingReply ? "Menyimpan..." : "Kirim Respon"}</span>
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Balasan Admin (Shopee Style 1 Balasan) */}
                  {rev.adminReply && (
                    <div className="ml-4 p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/40 border-l-2 border-sky-600 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-sky-800 dark:text-sky-200 text-[11px]">
                        <CornerDownRight className="h-3 w-3 text-sky-600" />
                        <span>Respon Admin Perpustakaan RSJD</span>
                      </div>
                      <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-[11px]">
                        {rev.adminReply}
                      </p>
                      {rev.adminReplyAt && (
                        <span className="text-[10px] text-neutral-400 block pt-0.5">
                          {rev.adminReplyAt}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* STICKY MOBILE BOTTOM FLOATING ACTION DOCK */}
      <div className="fixed bottom-0 inset-x-0 z-40 sm:hidden bg-white/95 dark:bg-neutral-950/95 backdrop-blur-xl border-t border-neutral-200/80 dark:border-neutral-800/80 px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-2xl flex items-center justify-between gap-3 animate-fade-in">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="relative h-10 w-7 rounded-md overflow-hidden shrink-0 border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <img src={book.coverUrl} alt={book.title} className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate leading-tight">
              {book.title}
            </p>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
              {book.authorName}
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={toggleBookmark}
            className={cn(
              "h-9 w-9 p-0 rounded-xl border-neutral-200 dark:border-neutral-800 active:scale-90 transition-transform cursor-pointer",
              isBookmarked && "border-sky-500 bg-sky-50 dark:bg-sky-950 text-sky-600"
            )}
            title="Simpan Buku"
          >
            <Bookmark className={cn("h-4 w-4", isBookmarked && "fill-sky-600 text-sky-600")} />
          </Button>

          {activeLoan ? (
            <Link href={`/baca/${book.id}`}>
              <Button
                size="sm"
                className="h-9 px-4 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20 gap-1.5 cursor-pointer"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Baca</span>
              </Button>
            </Link>
          ) : (
            <Button
              size="sm"
              disabled={!isAnyFormatAvailable}
              onClick={handleInitiateBorrow}
              className="h-9 px-4 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20 gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Pinjam</span>
            </Button>
          )}
        </div>
      </div>

      {/* DIALOG PEMILIHAN DURASI PINJAM (1–7 HARI DIPILIH USER) */}
      <Dialog open={isBorrowDialogOpen} onOpenChange={setIsBorrowDialogOpen}>
        <DialogContent className="max-w-md p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 mb-1">
              <BookOpen className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Layanan Peminjaman Digital</span>
            </div>
            <DialogTitle className="font-heading text-lg font-bold text-foreground">
              Pilih Durasi Peminjaman Buku
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Akses e-book langsung aktif seketika tanpa antre. Tentukan durasi pinjam yang Anda butuhkan (1–7 hari):
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-4">
            <div className="flex gap-3 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <img
                src={book.coverUrl}
                alt={book.title}
                className="h-16 w-12 rounded-xl object-cover shadow-xs shrink-0"
              />
              <div className="flex flex-col min-w-0 justify-center">
                <span className="text-xs font-bold text-foreground line-clamp-1">{book.title}</span>
                <span className="text-[11px] text-muted-foreground">{book.authorName}</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 uppercase">
                    {book.formats.epub.available ? "Format EPUB" : "Format PDF"}
                  </Badge>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                    <Check className="h-3 w-3" />
                    <span>Gratis Tanpa Denda</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Choice Chips */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-foreground block">
                Pilih Cepat Durasi Pinjam:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 3, 5, 7].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setBorrowDuration(days)}
                    className={cn(
                      "py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer",
                      borrowDuration === days
                        ? "bg-sky-600 text-white border-sky-600 shadow-md scale-102"
                        : "bg-muted/40 hover:bg-muted border-border text-foreground"
                    )}
                  >
                    {days} Hari{days === 7 ? " (Max)" : ""}
                  </button>
                ))}
              </div>
            </div>

            {/* Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Atur Durasi Kustom:</span>
                <span className="font-bold text-sky-600 text-sm">{borrowDuration} Hari</span>
              </div>
              <Slider
                min={1}
                max={7}
                step={1}
                value={[borrowDuration]}
                onValueChange={(val) => setBorrowDuration(val[0])}
                className="py-1 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>1 Hari (Singkat)</span>
                <span>7 Hari (Batas Maksimal)</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs space-y-1">
              <div className="flex items-center justify-between font-bold text-sky-900 dark:text-sky-200">
                <span>Jatuh Tempo Pengembalian:</span>
                <span className="text-sky-600 dark:text-sky-400">
                  {dueDateString}
                </span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Pengembalian buku digital otomatis setelah tenggat waktu tanpa denda. Sesi baca yang sedang terbuka tidak akan ditutup paksa.
              </p>
            </div>
          </div>

          <DialogFooter className="flex flex-row items-center justify-between gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBorrowDialogOpen(false)}
              className="text-xs rounded-xl"
            >
              Batal
            </Button>
            <Button
              size="sm"
              disabled={isBorrowing}
              onClick={handleConfirmBorrow}
              className="text-xs font-bold px-5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl transition-all gap-2 shadow-md shadow-sky-600/20"
            >
              {isBorrowing ? (
                <>
                  <Spinner className="h-3.5 w-3.5 text-white" />
                  <span>Mengaktifkan Pinjaman...</span>
                </>
              ) : (
                `Konfirmasi Pinjam (${borrowDuration} Hari)`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG LAPOR MASALAH / HELP */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="max-w-md p-4 sm:p-6 rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-amber-500" />
              Lapor Masalah Buku
            </DialogTitle>
          </DialogHeader>

          {reportSuccess ? (
            <div className="py-6 text-center space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
              <p className="text-xs font-bold text-foreground">Laporan Anda telah berhasil terkirim.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitReport} noValidate className="space-y-4 py-2">
              <div className="space-y-1 text-xs">
                <label className="font-bold">Format:</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setReportFormat("pdf")}
                    className={cn(
                      "px-3 py-1.5 rounded-lg border text-xs font-medium",
                      reportFormat === "pdf" ? "border-amber-500 bg-amber-50 text-amber-800 font-bold" : "border-neutral-200"
                    )}
                  >
                    File PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportFormat("epub")}
                    className={cn(
                      "px-3 py-1.5 rounded-lg border text-xs font-medium",
                      reportFormat === "epub" ? "border-amber-500 bg-amber-50 text-amber-800 font-bold" : "border-neutral-200"
                    )}
                  >
                    File EPUB
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <label className="font-bold">Pilih Kategori Kendala Cepat:</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Halaman Kosong / Putih",
                    "File Rusak / Tidak Mau Terbuka",
                    "Teks Buram / Font Pecah",
                    "Halaman Terpotong / Tidak Lengkap",
                    "Tautan File Error",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setReportMessage((prev) => (prev ? `${prev}, ${preset}` : preset))
                        if (reportError) setReportError("")
                      }}
                      className="px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 text-[11px] text-neutral-700 dark:text-neutral-300 hover:bg-amber-100 hover:text-amber-800 dark:hover:bg-amber-950/60 dark:hover:text-amber-300 transition-colors cursor-pointer"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <label className="font-bold">Deskripsi / Detail Kendala:</label>
                <Textarea
                  placeholder="Contoh: Pada halaman 45-50 gambar tidak muncul dan teks kosong..."
                  value={reportMessage}
                  aria-invalid={Boolean(reportError)}
                  onChange={(e) => {
                    setReportMessage(e.target.value)
                    if (reportError) setReportError("")
                  }}
                  className="text-xs h-24 rounded-xl"
                />
                {reportError && (
                  <FieldError className="text-[11px] font-medium flex items-center gap-1.5 mt-1 animate-fade-in">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{reportError}</span>
                  </FieldError>
                )}
              </div>

              <DialogFooter className="pt-2 border-t">
                <Button
                  type="submit"
                  disabled={isSubmittingReport}
                  size="sm"
                  className="text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition-all gap-2"
                >
                  {isSubmittingReport ? (
                    <>
                      <Spinner className="h-3.5 w-3.5 text-white" />
                      <span>Mengirim...</span>
                    </>
                  ) : (
                    "Kirim Laporan"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL AJAKAN LOGIN UNTUK TAMU (GUEST) */}
      <GuestModal
        open={isGuestModalOpen}
        onOpenChange={setIsGuestModalOpen}
        actionType={guestActionType}
      />

      {/* MODAL VERIFIKASI BIODATA ANTI-BOT */}
      <Dialog open={isVerifyModalOpen} onOpenChange={setIsVerifyModalOpen}>
        <DialogContent className="sm:max-w-lg w-full p-4 sm:p-7 rounded-2xl sm:rounded-3xl bg-card border-border space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 border border-amber-500/20 mt-0.5">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <DialogTitle className="font-heading text-base sm:text-lg font-bold text-foreground leading-tight">
                Verifikasi Identitas Peminjam (Anti-Bot)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-normal">
                Lengkapi biodata peminjam dan verifikasi kode OTP untuk mengamankan hak akses peminjaman e-book.
              </DialogDescription>
            </div>
          </div>

          {verifyError && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
              {verifyError}
            </div>
          )}

          <form onSubmit={handleVerifySubmit} noValidate className="space-y-3.5 py-1">
            {/* Nama Lengkap */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between h-5">
                <span>Nama Lengkap (sesuai KTP)</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <Input
                placeholder="Masukkan Nama Lengkap..."
                value={verifyName}
                aria-invalid={Boolean(verifyFieldErrors.name)}
                onChange={(e) => {
                  setVerifyName(e.target.value)
                  if (verifyFieldErrors.name) setVerifyFieldErrors((prev) => ({ ...prev, name: undefined }))
                }}
                className="h-10 rounded-xl text-xs bg-muted/20 border-border"
              />
              {verifyFieldErrors.name && (
                <FieldError className="text-[11px] font-medium flex items-center gap-1.5 mt-1 animate-fade-in">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{verifyFieldErrors.name}</span>
                </FieldError>
              )}
            </div>

            {/* Row 1: WhatsApp + Profesi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between h-5">
                  <span className="truncate">WhatsApp / No. HP</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <Input
                  type="tel"
                  placeholder="Masukkan Nomor WhatsApp..."
                  value={verifyPhone}
                  inputMode="numeric"
                  maxLength={15}
                  aria-invalid={Boolean(verifyFieldErrors.phone)}
                  onChange={(e) => {
                    setVerifyPhone(e.target.value.replace(/\D/g, ""))
                    if (verifyFieldErrors.phone) setVerifyFieldErrors((prev) => ({ ...prev, phone: undefined }))
                  }}
                  className="h-10 rounded-xl text-xs bg-muted/20 border-border font-mono"
                />
                {verifyFieldErrors.phone && (
                  <FieldError className="text-[11px] font-medium flex items-center gap-1.5 mt-1 animate-fade-in">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{verifyFieldErrors.phone}</span>
                  </FieldError>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between h-5">
                  <span className="truncate">Profesi / Instansi</span>
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <Input
                  placeholder="Masukkan Profesi / Instansi..."
                  value={verifyInstitution}
                  aria-invalid={Boolean(verifyFieldErrors.institution)}
                  onChange={(e) => {
                    setVerifyInstitution(e.target.value)
                    if (verifyFieldErrors.institution) setVerifyFieldErrors((prev) => ({ ...prev, institution: undefined }))
                  }}
                  className="h-10 rounded-xl text-xs bg-muted/20 border-border"
                />
                {verifyFieldErrors.institution && (
                  <FieldError className="text-[11px] font-medium flex items-center gap-1.5 mt-1 animate-fade-in">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{verifyFieldErrors.institution}</span>
                  </FieldError>
                )}
              </div>
            </div>

            {/* Row 2: Kota Domisili + NIK */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between h-5">
                  <span className="truncate">Kota Domisili</span>
                  <span className="text-[10px] text-muted-foreground font-normal bg-muted/60 px-1.5 py-0.5 rounded">Opsional</span>
                </label>
                <Input
                  placeholder="Masukkan Kota Domisili..."
                  value={verifyCity}
                  onChange={(e) => setVerifyCity(e.target.value)}
                  className="h-10 rounded-xl text-xs bg-muted/20 border-border"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between h-5">
                  <span className="truncate">No. Identitas / NIK</span>
                  <span className="text-[10px] text-muted-foreground font-normal bg-muted/60 px-1.5 py-0.5 rounded">Opsional</span>
                </label>
                <Input
                  type="text"
                  maxLength={16}
                  inputMode="numeric"
                  placeholder="Masukkan Nomor Induk Kependudukan (NIK)..."
                  value={verifyNik}
                  onChange={(e) => setVerifyNik(e.target.value.replace(/\D/g, ""))}
                  className="h-10 rounded-xl text-xs font-mono bg-muted/20 border-border"
                />
              </div>
            </div>

            {/* OTP Section Card */}
            <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800/80 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <Mail className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
                  <span>Kode OTP dikirim ke:</span>
                </div>
                <span className="font-mono font-medium text-sky-700 dark:text-sky-300 bg-sky-100/80 dark:bg-sky-900/60 px-2 py-0.5 rounded-lg truncate max-w-[240px]">
                  {user?.email || "Email Akun Anda"}
                </span>
              </div>

              {/* Action Bar: Status on Left, Send OTP on Right */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-xl bg-background/90 border border-border/60">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground px-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>Kanal Aktif: <strong className="text-foreground">Email (Google SMTP)</strong></span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={isSendingOtp || otpCountdown > 0}
                  onClick={handleSendBorrowOtp}
                  className="h-8 px-3 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white shadow-2xs gap-1.5 cursor-pointer"
                >
                  {isSendingOtp ? (
                    <>
                      <Spinner className="h-3 w-3" />
                      <span>Mengirim...</span>
                    </>
                  ) : otpCountdown > 0 ? (
                    <>
                      <Clock className="h-3 w-3" />
                      <span>Kirim Ulang ({otpCountdown}s)</span>
                    </>
                  ) : (
                    <>
                      <Mail className="h-3 w-3" />
                      <span>Kirim Kode OTP</span>
                    </>
                  )}
                </Button>
              </div>

              {/* 6 Digit OTP Input - Centered & Symmetrical */}
              <div className="flex flex-col items-center justify-center gap-2 py-1">
                <InputOTP
                  maxLength={6}
                  value={verifyOtp}
                  onChange={(val) => {
                    setVerifyOtp(val)
                    if (verifyFieldErrors.otp) setVerifyFieldErrors((prev) => ({ ...prev, otp: undefined }))
                  }}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="h-11 w-9 sm:h-12 sm:w-11 text-base sm:text-lg font-mono font-bold bg-background shadow-xs" />
                    <InputOTPSlot index={1} className="h-11 w-9 sm:h-12 sm:w-11 text-base sm:text-lg font-mono font-bold bg-background shadow-xs" />
                    <InputOTPSlot index={2} className="h-11 w-9 sm:h-12 sm:w-11 text-base sm:text-lg font-mono font-bold bg-background shadow-xs" />
                  </InputOTPGroup>
                  <InputOTPSeparator className="mx-1 sm:mx-2 text-muted-foreground/60" />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} className="h-11 w-9 sm:h-12 sm:w-11 text-base sm:text-lg font-mono font-bold bg-background shadow-xs" />
                    <InputOTPSlot index={4} className="h-11 w-9 sm:h-12 sm:w-11 text-base sm:text-lg font-mono font-bold bg-background shadow-xs" />
                    <InputOTPSlot index={5} className="h-11 w-9 sm:h-12 sm:w-11 text-base sm:text-lg font-mono font-bold bg-background shadow-xs" />
                  </InputOTPGroup>
                </InputOTP>
                {verifyFieldErrors.otp ? (
                  <FieldError className="text-[11px] font-medium flex items-center gap-1.5 mt-1 animate-fade-in">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{verifyFieldErrors.otp}</span>
                  </FieldError>
                ) : (
                  <p className="text-[11px] text-muted-foreground text-center">
                    Periksa kotak masuk atau folder spam email Anda untuk melihat 6 digit kode OTP.
                  </p>
                )}
              </div>
            </div>

            {/* Dialog Footer Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsVerifyModalOpen(false)}
                className="text-xs h-10 px-4 rounded-xl"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isVerifying}
                className="h-10 px-5 rounded-xl bg-sky-600 hover:bg-sky-500 font-bold text-xs text-white shadow-md shadow-sky-600/20 gap-2 cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <Spinner className="h-3.5 w-3.5" />
                    <span>Memverifikasi Identitas...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Verifikasi & Lanjutkan Pinjam</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL SITASI ILMIAH RESMI */}
      <CitationDialog
        open={isCitationDialogOpen}
        onOpenChange={setIsCitationDialogOpen}
        book={{
          title: book.title,
          authorName: book.authorName,
          publisherName: book.publisherName,
          publishYear: book.publishYear,
          isbn: book.isbn,
          slug: book.slug,
        }}
      />

    </div>
  )
}
