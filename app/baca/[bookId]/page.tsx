"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  Lock,
  FileText,
  Sliders,
  Sparkles,
  Highlighter,
  Trash2,
  Copy,
  Plus,
  X,
  Check,
  Palette,
  Clock,
  Hourglass,
  Watch,
  ChevronsLeft,
  ChevronsRight,
  Compass,
  Bookmark,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import type { BookItem } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { ensurePdfJsLoaded } from "@/lib/pdf-extractor"

const LOCAL_STORAGE_LOANS_KEY = "rsjd_user_loans_v1"
const LOCAL_STORAGE_PROGRESS_KEY = "rsjd_reading_progress_v1"

interface StoredReaderLoan {
  id: string
  userId?: number
  userEmail?: string
  bookId: string
  dueAt: string
  status: "aktif" | "selesai"
}

export default function BookReaderPage() {
  const params = useParams()
  const router = useRouter()
  const bookId = params?.bookId as string
  const { user, isGuest, isLoaded } = useAuth()

  const initialBook = React.useMemo(() => {
    return {
      id: String(bookId),
      title: "Memuat Buku...",
      slug: String(bookId),
      synopsis: "",
      coverUrl: "",
      authorId: "",
      authorName: "",
      publisherId: "",
      publisherName: "",
      categoryId: "",
      categoryName: "",
      isbn: "",
      publishYear: 2026,
      language: "Indonesia",
      pageCount: 1,
      status: "aktif",
      isFeatured: false,
      loanCount: 0,
      averageRating: 5,
      reviewCount: 0,
      tags: [],
      formats: {
        pdf: { available: true, status: "aktif" },
        epub: { available: false, status: "aktif" },
      },
    } as BookItem
  }, [bookId])

  const [book, setBook] = React.useState<BookItem>(initialBook)
  const [isProgressRestored, setIsProgressRestored] = React.useState(false)

  // Sync fresh book metadata from database catalog & pulihkan riwayat halaman membaca
  React.useEffect(() => {
    let isMounted = true
    fetch(`/api/books/${encodeURIComponent(bookId)}`)
      .then((res) => res.json())
      .then(async (data) => {
        if (!isMounted) return
        if (data.success && data.book) {
          setBook(data.book)
          const targetPageCount = data.book.pageCount || 240
          setTotalPages(targetPageCount)

          // 1. Ambil progres lokal dari localStorage
          let localLastPage = 1
          try {
            const savedProg = localStorage.getItem(LOCAL_STORAGE_PROGRESS_KEY)
            if (savedProg) {
              const progMap = JSON.parse(savedProg)
              if (progMap.b1?.lastPage === 42 && progMap.b1?.percent === 17) delete progMap.b1
              if (progMap.b2?.lastPage === 85 && progMap.b2?.percent === 43) delete progMap.b2
              localStorage.setItem(LOCAL_STORAGE_PROGRESS_KEY, JSON.stringify(progMap))

              const bookKey = String(data.book.id)
              const slugKey = data.book.slug
              const paramKey = String(bookId)
              const savedEntry = progMap[bookKey] || (slugKey ? progMap[slugKey] : null) || progMap[paramKey]

              if (
                savedEntry &&
                typeof savedEntry.lastPage === "number" &&
                savedEntry.lastPage >= 1 &&
                savedEntry.lastPage <= targetPageCount
              ) {
                localLastPage = savedEntry.lastPage
              }
            }
          } catch {}

          // 2. Ambil progres riil dari database server MariaDB (/api/progress)
          let finalPage = localLastPage
          try {
            const pRes = await fetch(`/api/progress?bookId=${encodeURIComponent(String(data.book.id))}`)
            const pData = await pRes.json()
            if (pData.success && pData.progress?.lastPage && pData.progress.lastPage > 1) {
              const serverPage = Math.min(pData.progress.lastPage, targetPageCount)
              finalPage = Math.max(localLastPage, serverPage)
            }
          } catch {}

          if (!isMounted) return
          setCurrentPage(finalPage)
          setPageInputVal(String(finalPage))

          // 3. Sinkronkan riwayat halaman ke localStorage
          try {
            const savedProg = localStorage.getItem(LOCAL_STORAGE_PROGRESS_KEY)
            const progMap = savedProg ? JSON.parse(savedProg) : {}
            const percent = Math.min(100, Math.round((finalPage / targetPageCount) * 100))
            const entry = { lastPage: finalPage, percent }
            progMap[String(data.book.id)] = entry
            if (data.book.slug) progMap[data.book.slug] = entry
            localStorage.setItem(LOCAL_STORAGE_PROGRESS_KEY, JSON.stringify(progMap))
            window.dispatchEvent(new Event("reading-progress-updated"))
          } catch {}

          setIsProgressRestored(true)
        }
      })
      .catch(() => {
        if (isMounted) setIsProgressRestored(true)
      })
    return () => {
      isMounted = false
    }
  }, [bookId])

  // Gate Check on Entry (Section 4.1.c):
  // Check if user has active loan. If expired upon entering, block access.
  const [isAccessAllowed, setIsAccessAllowed] = React.useState<boolean | null>(null)
  const [selectedFormat, setSelectedFormat] = React.useState<"pdf" | "epub">("pdf")
  const [currentPage, setCurrentPage] = React.useState<number>(1)
  const [totalPages, setTotalPages] = React.useState<number>(book.pageCount || 240)
  const [zoomLevel, setZoomLevel] = React.useState<number>(100)
  const [isFullscreen, setIsFullscreen] = React.useState<boolean>(false)
  const [pageInputVal, setPageInputVal] = React.useState<string>("1")
  const [accessTimestamp, setAccessTimestamp] = React.useState<string>("")

  // Selalu sinkronkan kotak nomor halaman dengan halaman yang sedang aktif dibaca
  React.useEffect(() => {
    setPageInputVal(currentPage.toString())
  }, [currentPage])

  // 1. Reading Session Duration (Counting Up per detik)
  const [readingSeconds, setReadingSeconds] = React.useState<number>(0)

  // 2. Loan Countdown Duration (Counting Down per detik)
  const [activeLoanDueAt, setActiveLoanDueAt] = React.useState<string | null>(null)
  const [remainingSeconds, setRemainingSeconds] = React.useState<number | null>(null)

  // 3. Current Real-time Clock (Waktu Saat Ini)
  const [currentTimeStr, setCurrentTimeStr] = React.useState<string>("")
  const [currentDateStr, setCurrentDateStr] = React.useState<string>("")

  // Paper Theme
  const [paperTheme, setPaperTheme] = React.useState<"white" | "sepia" | "dark">("white")

  // Real PDF document & canvas state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pdfDoc, setPdfDoc] = React.useState<any>(null)
  const [isPdfLoading, setIsPdfLoading] = React.useState<boolean>(false)
  const [pdfRenderError, setPdfRenderError] = React.useState<string | null>(null)
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const viewportRef = React.useRef<HTMLDivElement | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTaskRef = React.useRef<any>(null)

  // Scroll to top on page change so user always sees the beginning of the page
  React.useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = 0
    }
  }, [currentPage])

  // Load PDF Document when book or book.pdfUrl changes
  React.useEffect(() => {
    const targetPdfUrl = book.pdfUrl || (book.fileUrl && book.fileUrl.endsWith(".pdf") ? book.fileUrl : null)
    if (!targetPdfUrl) {
      setPdfDoc(null)
      return
    }

    let isMounted = true
    setIsPdfLoading(true)
    setPdfRenderError(null)

    ensurePdfJsLoaded()
      .then(async () => {
        if (!isMounted) return null
        if (!window.pdfjsLib) throw new Error("Pustaka PDF tidak tersedia.")

        const res = await fetch(targetPdfUrl)
        if (!res.ok) throw new Error(`HTTP ${res.status}: Gagal mengunduh berkas PDF`)
        const data = await res.arrayBuffer()

        if (!isMounted) return null
        return window.pdfjsLib.getDocument({ data }).promise
      })
      .then((doc) => {
        if (!isMounted || !doc) return
        setPdfDoc(doc)
        if (doc.numPages && doc.numPages > 0) {
          setTotalPages(doc.numPages)
        }
        setIsPdfLoading(false)
      })
      .catch((err) => {
        if (!isMounted) return
        console.error("Gagal membuka dokumen PDF:", err)
        setPdfRenderError("Dokumen PDF tidak dapat dimuat langsung.")
        setIsPdfLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [book.pdfUrl, book.fileUrl])

  // Render Current Page to Canvas
  React.useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return

    let isCancelled = false
    const canvas = canvasRef.current
    const targetPage = Math.max(1, Math.min(currentPage, pdfDoc.numPages || 1))

    setIsPdfLoading(true)

    pdfDoc
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .getPage(targetPage)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((page: any) => {
        if (isCancelled) return

        const pixelRatio = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1
        const baseViewport = page.getViewport({ scale: 1.0 })
        const targetWidth = 650
        const scale = Math.max(1.0, (targetWidth / baseViewport.width) * pixelRatio)
        const viewport = page.getViewport({ scale })

        canvas.width = viewport.width
        canvas.height = viewport.height
        canvas.style.width = "100%"
        canvas.style.height = "auto"

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel()
          } catch {}
        }

        const renderTask = page.render({ canvasContext: ctx, viewport })
        renderTaskRef.current = renderTask

        return renderTask.promise
      })
      .then(() => {
        if (!isCancelled) {
          setIsPdfLoading(false)
        }
      })
      .catch((err: any) => {
        if (err?.name !== "RenderingCancelledException") {
          console.error("Kesalahan render halaman PDF:", err)
        }
        if (!isCancelled) {
          setIsPdfLoading(false)
        }
      })

    return () => {
      isCancelled = true
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel()
        } catch {}
      }
    }
  }, [pdfDoc, currentPage])

  // Reader Notes & Highlights
  interface ReaderNote {
    id: string
    page: number
    text: string
    color: "yellow" | "green" | "blue"
    createdAt: string
  }
  const [isNotesDrawerOpen, setIsNotesDrawerOpen] = React.useState(false)
  const [notes, setNotes] = React.useState<ReaderNote[]>([])
  const [newNoteText, setNewNoteText] = React.useState("")
  const [newNoteColor, setNewNoteColor] = React.useState<"yellow" | "green" | "blue">("yellow")
  const [copiedAll, setCopiedAll] = React.useState(false)

  // Bookmarks (Markah Halaman)
  const [bookmarks, setBookmarks] = React.useState<number[]>([])
  const [notesDrawerTab, setNotesDrawerTab] = React.useState<"notes" | "bookmarks">("notes")

  // Load saved notes & bookmarks
  React.useEffect(() => {
    try {
      const key = `rsjd_notes_${book.id}`
      const saved = localStorage.getItem(key)
      if (saved) {
        setNotes(JSON.parse(saved))
      } else {
        setNotes([])
      }
    } catch {}

    try {
      const bKey = `rsjd_bookmarks_${book.id}`
      const bSaved = localStorage.getItem(bKey)
      if (bSaved) {
        setBookmarks(JSON.parse(bSaved))
      } else {
        setBookmarks([])
      }
    } catch {}
  }, [book.id])

  const toggleBookmark = (pageNum: number = currentPage) => {
    setBookmarks((prev) => {
      const exists = prev.includes(pageNum)
      const next = exists ? prev.filter((p) => p !== pageNum) : [...prev, pageNum].sort((a, b) => a - b)
      try {
        localStorage.setItem(`rsjd_bookmarks_${book.id}`, JSON.stringify(next))
      } catch {}
      return next
    })
  }

  // Touch Swipe Gesture for Mobile Page Turning (Kindle & Apple Books style)
  const [touchStartX, setTouchStartX] = React.useState<number | null>(null)
  const [touchStartY, setTouchStartY] = React.useState<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX)
    setTouchStartY(e.touches[0].clientY)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return
    const diffX = touchStartX - e.changedTouches[0].clientX
    const diffY = touchStartY - e.changedTouches[0].clientY

    // Horizontal swipe must be > 40px and dominant over vertical scroll
    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY) * 1.3) {
      if (diffX > 0 && currentPage < totalPages) {
        // Swipe ke kiri -> halaman berikutnya
        setCurrentPage((p) => Math.min(totalPages, p + 1))
      } else if (diffX < 0 && currentPage > 1) {
        // Swipe ke kanan -> halaman sebelumnya
        setCurrentPage((p) => Math.max(1, p - 1))
      }
    }
    setTouchStartX(null)
    setTouchStartY(null)
  }

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNoteText.trim()) return
    const note: ReaderNote = {
      id: "note-" + Date.now(),
      page: currentPage,
      text: newNoteText.trim(),
      color: newNoteColor,
      createdAt: `Halaman ${currentPage}`,
    }
    const updated = [note, ...notes]
    setNotes(updated)
    setNewNoteText("")
    try {
      localStorage.setItem(`rsjd_notes_${book.id}`, JSON.stringify(updated))
    } catch {}
  }

  const handleDeleteNote = (noteId: string) => {
    const updated = notes.filter((n) => n.id !== noteId)
    setNotes(updated)
    try {
      localStorage.setItem(`rsjd_notes_${book.id}`, JSON.stringify(updated))
    } catch {}
  }

  const handleCopyAllNotes = () => {
    if (notes.length === 0) return
    const text =
      `KUTIPAN & CATATAN MEMBACA PERPUSAHM.COM\nBuku: ${book.title}\nPenulis: ${book.authorName}\n\n` +
      notes.map((n) => `[${n.createdAt}] (${n.color.toUpperCase()}): "${n.text}"`).join("\n\n")
    navigator.clipboard.writeText(text)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2000)
  }

  // Timer membaca berjalan maju (Counting Up per detik saat pembaca aktif)
  React.useEffect(() => {
    if (!isAccessAllowed) return

    const interval = setInterval(() => {
      setReadingSeconds((prev) => {
        const next = prev + 1
        // Setiap 60 detik (1 menit), akumulasikan ke metrik kebiasaan membaca (/pinjaman reading habit)
        if (next % 60 === 0) {
          try {
            const key = "rsjd_reading_habit_v1"
            const saved = localStorage.getItem(key)
            const data = saved ? JSON.parse(saved) : { totalMinutes: 0, booksCompleted: 0, streakDays: 0 }
            data.totalMinutes = (data.totalMinutes || 0) + 1
            localStorage.setItem(key, JSON.stringify(data))
          } catch {}
        }
        return next
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isAccessAllowed])

  // Ambil tanggal jatuh tempo peminjaman aktif dari database server MariaDB / localStorage
  React.useEffect(() => {
    if (!user) return

    fetch("/api/loans")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.loans)) {
          const match = data.loans.find(
            (l: any) =>
              (String(l.bookId) === String(book.id) ||
                String(l.bookId) === String(bookId) ||
                String(l.bookId).replace(/^b/, "") === String(bookId).replace(/^b/, "") ||
                l.bookSlug === book.slug ||
                l.bookSlug === bookId) &&
              l.status === "aktif"
          )
          if (match && match.dueAt) {
            setActiveLoanDueAt(match.dueAt)
            return
          }
        }

        // Fallback cek localStorage
        try {
          const savedLoans = localStorage.getItem(LOCAL_STORAGE_LOANS_KEY)
          if (savedLoans) {
            const loans: StoredReaderLoan[] = JSON.parse(savedLoans)
            const match = loans.find(
              (l: StoredReaderLoan) =>
                (String(l.bookId) === String(book.id) ||
                  String(l.bookId) === String(bookId) ||
                  String(l.bookId).replace(/^b/, "") === String(bookId).replace(/^b/, "") ||
                  (l as any).bookSlug === book.slug ||
                  (l as any).bookSlug === bookId) &&
                l.status === "aktif"
            )
            if (match && match.dueAt) {
              setActiveLoanDueAt(match.dueAt)
              return
            }
          }
        } catch {}

        // Jika akun admin dan belum ada jatuh tempo, sediakan 7 hari default
        if (user.role === "admin" || user.role === "super_admin") {
          const defaultDue = new Date()
          defaultDue.setDate(defaultDue.getDate() + 7)
          setActiveLoanDueAt(defaultDue.toISOString())
        }
      })
      .catch(() => {
        if (user.role === "admin" || user.role === "super_admin") {
          const defaultDue = new Date()
          defaultDue.setDate(defaultDue.getDate() + 7)
          setActiveLoanDueAt(defaultDue.toISOString())
        }
      })
  }, [user, book, bookId])

  // Timer hitung mundur durasi sisa pinjam (Counting Down per detik)
  React.useEffect(() => {
    if (!activeLoanDueAt) return

    const updateRemaining = () => {
      const now = Date.now()
      const due = new Date(activeLoanDueAt).getTime()
      const diff = Math.max(0, Math.floor((due - now) / 1000))
      setRemainingSeconds(diff)
    }

    updateRemaining()
    const interval = setInterval(updateRemaining, 1000)
    return () => clearInterval(interval)
  }, [activeLoanDueAt])

  // Timer jam waktu saat ini (Real-time live clock per detik)
  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const timePart = now.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
      setCurrentTimeStr(`${timePart} WITA`)

      const datePart = now.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
      setCurrentDateStr(datePart)
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  const formatReadingTime = (sec: number) => {
    const hours = Math.floor(sec / 3600)
    const minutes = Math.floor((sec % 3600) / 60)
    const seconds = sec % 60

    if (hours > 0) {
      return `${hours}j ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}d`
    }
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  const formatCountdown = (sec: number | null) => {
    if (sec === null) return "..."
    if (sec <= 0) return "Selesai"

    const days = Math.floor(sec / 86400)
    const hours = Math.floor((sec % 86400) / 3600)
    const minutes = Math.floor((sec % 3600) / 60)
    const seconds = sec % 60

    if (days > 0) {
      return `${days} hari ${hours} jam`
    }
    if (hours > 0) {
      return `${hours} jam ${minutes} mnt`
    }
    return `${minutes} mnt ${seconds} dtk`
  }

  // Check entrance authorization & retrieve last reading progress
  React.useEffect(() => {
    const now = new Date()
    setAccessTimestamp(
      now.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " WITA"
    )

    // 1. Jika sesi autentikasi masih dimuat (loading cookies/session), tunggu dulu
    if (!isLoaded) return

    // 2. Jika akun tamu (belum login) atau belum terverifikasi biodata
    if (isGuest || !user) {
      setIsAccessAllowed(false)
      return
    }

    if (!user.isVerified) {
      setIsAccessAllowed(false)
      return
    }

    // 3. Role Admin & Super Admin selalu memiliki izin baca penuh (preview pustakawan)
    if (user.role === "admin" || user.role === "super_admin") {
      setIsAccessAllowed(true)
    } else {
      // 4. Untuk anggota (member), verifikasi status peminjaman aktif
      const verifyMemberAccess = async () => {
        // A. Cek cache lokal (localStorage)
        try {
          const savedLoans = localStorage.getItem(LOCAL_STORAGE_LOANS_KEY)
          if (savedLoans) {
            const loans: StoredReaderLoan[] = JSON.parse(savedLoans)
            const match = loans.find(
              (l: StoredReaderLoan) =>
                (String(l.bookId) === String(book.id) ||
                  String(l.bookId) === String(bookId) ||
                  String(l.bookId).replace(/^b/, "") === String(bookId).replace(/^b/, "") ||
                  (l as any).bookSlug === book.slug ||
                  (l as any).bookSlug === bookId) &&
                (l.userId ? l.userId === user.id : l.userEmail === user.email) &&
                new Date(l.dueAt) > now &&
                l.status === "aktif"
            )
            if (match) {
              setIsAccessAllowed(true)
              return
            }
          }
        } catch {}

        // B. Cek database MariaDB secara realtime (/api/loans)
        try {
          const res = await fetch("/api/loans")
          if (res.ok) {
            const data = await res.json()
            if (data.success && Array.isArray(data.loans)) {
              const activeLoan = data.loans.find(
                (l: any) =>
                  (String(l.bookId) === String(book.id) ||
                    String(l.bookId) === String(bookId) ||
                    String(l.bookId).replace(/^b/, "") === String(bookId).replace(/^b/, "") ||
                    l.bookSlug === book.slug ||
                    l.bookSlug === bookId) &&
                  l.status === "aktif" &&
                  new Date(l.dueAt) > now
              )
              if (activeLoan) {
                setIsAccessAllowed(true)
                return
              }
            }
          }
        } catch (err) {
          console.error("Gagal memeriksa pinjaman server:", err)
        }

        // Jika tidak ada pinjaman aktif yang valid di database atau cache
        setIsAccessAllowed(false)
      }

      verifyMemberAccess()
    }

    // Restore last reading progress
    try {
      const savedProg = localStorage.getItem(LOCAL_STORAGE_PROGRESS_KEY)
      if (savedProg) {
        const progMap = JSON.parse(savedProg)
        let cleaned = false
        if (progMap.b1?.lastPage === 42 && progMap.b1?.percent === 17) {
          delete progMap.b1
          cleaned = true
        }
        if (progMap.b2?.lastPage === 85 && progMap.b2?.percent === 43) {
          delete progMap.b2
          cleaned = true
        }
        if (cleaned) {
          localStorage.setItem(LOCAL_STORAGE_PROGRESS_KEY, JSON.stringify(progMap))
        }

        const bookKey = String(book.id)
        const slugKey = book.slug
        const paramKey = String(bookId)
        const savedEntry = progMap[bookKey] || (slugKey ? progMap[slugKey] : null) || progMap[paramKey]

        if (
          savedEntry &&
          typeof savedEntry.lastPage === "number" &&
          savedEntry.lastPage >= 1 &&
          savedEntry.lastPage <= (book.pageCount || 240)
        ) {
          setCurrentPage((prev) => Math.max(prev, savedEntry.lastPage))
          setPageInputVal((prev) => String(Math.max(Number(prev) || 1, savedEntry.lastPage)))
        }
      }
    } catch {}

    // Set default format: PDF if available, otherwise EPUB
    if (book.formats?.pdf?.available && book.formats.pdf.status === "aktif") {
      setSelectedFormat("pdf")
    } else if (book.formats?.epub?.available && book.formats.epub.status === "aktif") {
      setSelectedFormat("epub")
    }
  }, [book, bookId, user, isGuest, isLoaded])

  // Save progress helper (debounced)
  const saveProgressDebounced = React.useCallback(
    (page: number) => {
      if (!book || !book.id || book.title === "Memuat Buku..." || page < 1) return
      try {
        const savedProg = localStorage.getItem(LOCAL_STORAGE_PROGRESS_KEY)
        const progMap = savedProg ? JSON.parse(savedProg) : {}
        const percent = totalPages > 0 ? Math.min(100, Math.round((page / totalPages) * 100)) : 0
        const entry = { lastPage: page, percent }
        progMap[String(book.id)] = entry
        if (book.slug) {
          progMap[book.slug] = entry
        }
        localStorage.setItem(LOCAL_STORAGE_PROGRESS_KEY, JSON.stringify(progMap))
        window.dispatchEvent(new Event("reading-progress-updated"))
      } catch {}
    },
    [book, totalPages]
  )

  // Simpan progres baca ke localStorage secara instan & kirim ke server (/api/progress) secara debounce
  React.useEffect(() => {
    if (!isProgressRestored) return

    saveProgressDebounced(currentPage)

    const numericId = parseInt(String(book?.id), 10)
    if (!numericId || !book || book.title === "Memuat Buku..." || currentPage < 1) return

    const timer = setTimeout(() => {
      const percent = totalPages > 0 ? Math.min(100, Math.round((currentPage / totalPages) * 100)) : 0
      fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId: numericId,
          lastPage: currentPage,
          progressPercent: percent,
        }),
      }).catch(() => {})
    }, 1200)

    return () => clearTimeout(timer)
  }, [currentPage, saveProgressDebounced, book, totalPages, isProgressRestored])

  // Save on page exit / unload (hanya jika progres awal sudah selesai dipulihkan)
  React.useEffect(() => {
    const handleBeforeUnload = () => {
      if (!isProgressRestored || currentPage < 1) return
      saveProgressDebounced(currentPage)

      const numericId = parseInt(String(book?.id), 10)
      if (numericId && totalPages > 0 && typeof navigator !== "undefined" && navigator.sendBeacon) {
        const percent = Math.min(100, Math.round((currentPage / totalPages) * 100))
        const payload = JSON.stringify({
          bookId: numericId,
          lastPage: currentPage,
          progressPercent: percent,
        })
        navigator.sendBeacon("/api/progress", new Blob([payload], { type: "application/json" }))
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    window.addEventListener("visibilitychange", handleBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      window.removeEventListener("visibilitychange", handleBeforeUnload)
    }
  }, [currentPage, saveProgressDebounced, isProgressRestored, book?.id, totalPages])

  // ANTI-DOWNLOAD, ANTI-COPY & ANTI-PRINT SECURITY GUARDS
  React.useEffect(() => {
    const preventAction = (e: Event) => e.preventDefault()
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent Ctrl+S (Save), Ctrl+P (Print), Ctrl+C (Copy), F12 (DevTools)
      if (
        (e.ctrlKey && (e.key === "s" || e.key === "p" || e.key === "c" || e.key === "u")) ||
        (e.metaKey && (e.key === "s" || e.key === "p" || e.key === "c"))
      ) {
        e.preventDefault()
      } else if (e.key === "ArrowRight") {
        setCurrentPage((p) => Math.min(totalPages, p + 1))
      } else if (e.key === "ArrowLeft") {
        setCurrentPage((p) => Math.max(1, p - 1))
      }
    }

    document.addEventListener("contextmenu", preventAction)
    document.addEventListener("selectstart", preventAction)
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("contextmenu", preventAction)
      document.removeEventListener("selectstart", preventAction)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [totalPages])

  // Sinkronisasi status fullscreen (baik via tombol UI, tombol keyboard F11, maupun tombol Escape)
  React.useEffect(() => {
    const checkFullscreenState = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = document as any
      const isDocFullscreen = Boolean(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      )

      // Cek apakah dimensi window cocok dengan layar penuh (F11 di Chromium / Firefox / Linux)
      const isWindowFullscreen =
        typeof window !== "undefined" &&
        typeof screen !== "undefined" &&
        window.innerWidth === screen.width &&
        Math.abs(window.innerHeight - screen.height) <= 4

      setIsFullscreen(Boolean(isDocFullscreen || isWindowFullscreen))
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F11") {
        e.preventDefault()
        toggleFullscreen()
      }
    }

    document.addEventListener("fullscreenchange", checkFullscreenState)
    document.addEventListener("webkitfullscreenchange", checkFullscreenState)
    document.addEventListener("mozfullscreenchange", checkFullscreenState)
    document.addEventListener("MSFullscreenChange", checkFullscreenState)
    window.addEventListener("resize", checkFullscreenState)
    window.addEventListener("keydown", handleKeyDown)

    checkFullscreenState()

    return () => {
      document.removeEventListener("fullscreenchange", checkFullscreenState)
      document.removeEventListener("webkitfullscreenchange", checkFullscreenState)
      document.removeEventListener("mozfullscreenchange", checkFullscreenState)
      document.removeEventListener("MSFullscreenChange", checkFullscreenState)
      window.removeEventListener("resize", checkFullscreenState)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  const toggleFullscreen = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = document as any
    const isCurrentlyFullscreen = Boolean(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement ||
      (typeof window !== "undefined" &&
        typeof screen !== "undefined" &&
        window.innerWidth === screen.width &&
        Math.abs(window.innerHeight - screen.height) <= 4)
    )

    if (!isCurrentlyFullscreen) {
      const docEl = document.documentElement as any
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {})
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen()
      } else if (docEl.mozRequestFullScreen) {
        docEl.mozRequestFullScreen()
      } else if (docEl.msRequestFullscreen) {
        docEl.msRequestFullscreen()
      }
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {})
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen()
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen()
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen()
      }
      setIsFullscreen(false)
    }
  }

  const handlePageJump = (e: React.FormEvent) => {
    e.preventDefault()
    const target = parseInt(pageInputVal, 10)
    if (!isNaN(target) && target >= 1 && target <= totalPages) {
      setCurrentPage(target)
    } else {
      setPageInputVal(currentPage.toString())
    }
  }

  // Loading screen while verifying access
  if (isAccessAllowed === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-neutral-950 text-neutral-100 space-y-4">
        <Spinner className="h-8 w-8 text-sky-500 animate-spin" />
        <div className="text-center space-y-1">
          <p className="text-sm font-bold">Menyiapkan Ruang Baca Digital...</p>
          <p className="text-xs text-neutral-400">Memuat berkas aman dan menerapkan watermark reader</p>
        </div>
      </div>
    )
  }

  // If gate check failed (guest, unverified, or loan expired)
  if (isAccessAllowed === false) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-0 sm:p-6 bg-background">
        <div className="max-w-md w-full px-5 py-8 sm:p-8 rounded-none sm:rounded-3xl border-0 sm:border border-destructive/30 bg-background sm:bg-destructive/5 text-center space-y-4 shadow-none sm:shadow-xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mx-auto">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="font-heading text-xl font-bold text-foreground">
            {isGuest
              ? "Akses Membaca Terkunci (Akun Tamu)"
              : !user?.isVerified
              ? "Verifikasi Biodata Diperlukan"
              : "Buku Belum Dipinjam / Masa Pinjam Selesai"}
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isGuest
              ? "Akun tamu tidak dapat membuka e-reader digital secara langsung. Silakan masuk atau buat akun terlebih dahulu untuk meminjam buku ini."
              : !user?.isVerified
              ? "Anda harus melengkapi verifikasi identitas peminjam (No. WhatsApp & Instansi via OTP) sebelum dapat meminjam dan membuka buku digital ini."
              : `Akses e-reader untuk buku "${book.title}" memerlukan status pinjaman aktif. Silakan pilih durasi pinjam Anda (1–7 hari gratis).`}
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link href={`/buku/${book.slug}`}>
              <Button className="w-full text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-xs">
                {isGuest
                  ? "Masuk / Buat Akun di Halaman Buku"
                  : !user?.isVerified
                  ? "Lengkapi Verifikasi Biodata"
                  : "Buka Halaman Buku & Pinjam Sekarang"}
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full text-xs rounded-xl">
                Kembali ke Beranda
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Simulated rendered page content (Mental health book page excerpt with typography)
  return (
    <div className="flex flex-col h-screen bg-neutral-900 text-neutral-100 overflow-hidden select-none">
      
      {/* TOPBAR READER CONTROLS */}
      <header className="h-14 bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800/80 px-3 sm:px-5 flex items-center justify-between shrink-0 z-30 relative select-none">
        {/* Ambient Bottom Accent Line */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neutral-700/50 to-transparent pointer-events-none" />

        {/* LEFT: BOOK INFO & NAV */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 z-10 flex-1 max-w-[62%] sm:max-w-[45%] md:max-w-[32%]">
          <Link href={`/buku/${book.slug}`}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8.5 px-2 sm:px-2.5 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-900 border border-transparent hover:border-neutral-800 gap-1 text-xs font-medium transition-all group cursor-pointer"
              title="Kembali ke Detail Buku"
            >
              <ArrowLeft className="h-4 w-4 text-neutral-400 group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden sm:inline font-semibold">Keluar</span>
            </Button>
          </Link>

          <div className="h-4.5 w-[1px] bg-neutral-800/80 hidden sm:block shrink-0" />

          <div className="flex items-center gap-2 min-w-0">
            <div className="hidden xl:flex h-8 w-8 rounded-lg bg-neutral-900 border border-neutral-800 items-center justify-center shrink-0 text-sky-400 shadow-xs">
              <BookOpen className="h-4 w-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <h1
                className="text-xs sm:text-[13px] font-bold text-neutral-100 truncate"
                title={book.title}
              >
                {book.title}
              </h1>
              <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 truncate">
                <span className="truncate max-w-[90px] sm:max-w-[140px]">{book.authorName}</span>
                <span className="text-neutral-600 hidden sm:inline">&bull;</span>
                <span className="text-neutral-500 font-mono hidden sm:inline">{book.categoryName || "E-Book"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* CENTER: UNIFIED READER DYNAMIC ISLAND (Desktop only, saves space on mobile) */}
        <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center rounded-2xl bg-neutral-900/90 backdrop-blur-md border border-neutral-800/90 shadow-sm p-1 z-10 pointer-events-auto">
          {/* 1. Sesi Baca (Active reading timer) */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-emerald-400 cursor-default hover:text-emerald-300 transition-colors"
            title={`Durasi membaca aktif sesi ini: ${Math.floor(readingSeconds / 60)} menit`}
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Clock className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span className="text-[10px] font-sans uppercase tracking-wider text-emerald-500/80 font-bold hidden xl:inline">
              Baca
            </span>
            <span className="font-semibold">{formatReadingTime(readingSeconds)}</span>
          </div>

          {/* Divider */}
          <div className="h-3.5 w-[1px] bg-neutral-800" />

          {/* 2. Jam Sekarang (Live Real-Time Clock) */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-neutral-300 cursor-default hover:text-white transition-colors"
            title={`Waktu lokal saat ini: ${currentDateStr}`}
          >
            <Watch className="h-3.5 w-3.5 text-sky-400 shrink-0" />
            <span className="text-[10px] font-sans uppercase tracking-wider text-neutral-500 font-bold hidden xl:inline">
              Waktu
            </span>
            <span className="font-semibold text-neutral-200">{currentTimeStr || "08:50 WITA"}</span>
          </div>

          {/* Divider */}
          <div className="h-3.5 w-[1px] bg-neutral-800" />

          {/* 3. Sisa Pinjam (Counting Down) */}
          <div
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono transition-colors cursor-default",
              remainingSeconds !== null && remainingSeconds <= 0
                ? "text-rose-400 font-bold"
                : remainingSeconds !== null && remainingSeconds < 7200
                ? "text-rose-400 animate-pulse font-bold"
                : remainingSeconds !== null && remainingSeconds < 86400
                ? "text-amber-400 font-semibold"
                : "text-sky-300 font-semibold"
            )}
            title={
              activeLoanDueAt
                ? `Batas masa pinjam: ${new Date(activeLoanDueAt).toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })} WITA`
                : "Menghitung sisa masa pinjam..."
            }
          >
            <Hourglass className="h-3.5 w-3.5 shrink-0 text-amber-400" />
            <span className="text-[10px] font-sans uppercase tracking-wider opacity-60 font-bold hidden xl:inline">
              Sisa
            </span>
            <span>{formatCountdown(remainingSeconds)}</span>
          </div>
        </div>

        {/* RIGHT: FORMAT SELECTOR, THEMES, BOOKMARK, NOTES & TOOLS */}
        <div className="flex items-center gap-1 sm:gap-2 z-10 shrink-0 ml-auto">
          {/* Format Selector: desktop only */}
          <div className="hidden sm:flex items-center bg-neutral-900/90 p-0.5 rounded-xl border border-neutral-800 text-[11px]">
            <button
              type="button"
              disabled={!book.formats.pdf.available || book.formats.pdf.status === "rusak"}
              onClick={() => setSelectedFormat("pdf")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer",
                selectedFormat === "pdf"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              )}
            >
              PDF {book.formats.pdf.status === "rusak" && "(Rusak)"}
            </button>
            <button
              type="button"
              disabled={!book.formats.epub.available || book.formats.epub.status === "rusak"}
              onClick={() => setSelectedFormat("epub")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer",
                selectedFormat === "epub"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              )}
            >
              EPUB {book.formats.epub.status === "rusak" && "(Rusak)"}
            </button>
          </div>

          {/* Theme Selector: Desktop */}
          <div className="hidden md:flex items-center bg-neutral-900/90 p-0.5 rounded-xl border border-neutral-800 text-[11px]">
            <button
              type="button"
              onClick={() => setPaperTheme("white")}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer",
                paperTheme === "white"
                  ? "bg-white text-neutral-950 font-bold shadow-xs"
                  : "text-neutral-400 hover:text-white"
              )}
              title="Tema Kertas Putih"
            >
              <span className="w-2 h-2 rounded-full bg-neutral-300 border border-neutral-400 shrink-0" />
              <span>Putih</span>
            </button>
            <button
              type="button"
              onClick={() => setPaperTheme("sepia")}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer",
                paperTheme === "sepia"
                  ? "bg-[#e8d5b5] text-[#3d2c25] font-bold shadow-xs"
                  : "text-neutral-400 hover:text-white"
              )}
              title="Tema Kertas Sepia"
            >
              <span className="w-2 h-2 rounded-full bg-[#d4bc94] shrink-0" />
              <span>Sepia</span>
            </button>
            <button
              type="button"
              onClick={() => setPaperTheme("dark")}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer",
                paperTheme === "dark"
                  ? "bg-neutral-800 text-white font-bold shadow-xs"
                  : "text-neutral-400 hover:text-white"
              )}
              title="Tema Malam / Gelap"
            >
              <span className="w-2 h-2 rounded-full bg-neutral-600 shrink-0" />
              <span>Malam</span>
            </button>
          </div>

          {/* Mobile Quick Theme Cycle Button */}
          <button
            type="button"
            onClick={() => {
              if (paperTheme === "white") setPaperTheme("sepia")
              else if (paperTheme === "sepia") setPaperTheme("dark")
              else setPaperTheme("white")
            }}
            className="md:hidden h-8 w-8 rounded-xl bg-neutral-900/90 border border-neutral-800 flex items-center justify-center text-neutral-300 hover:text-white cursor-pointer"
            title={`Ganti tema kertas (Saat ini: ${paperTheme})`}
          >
            <Palette className="h-3.5 w-3.5 text-neutral-400" />
          </button>

          {/* Bookmark Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleBookmark(currentPage)}
            className={cn(
              "h-8 sm:h-8.5 px-2 sm:px-2.5 rounded-xl gap-1.5 text-xs font-semibold border transition-all cursor-pointer",
              bookmarks.includes(currentPage)
                ? "bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-amber-500/25"
                : "bg-neutral-900/90 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
            )}
            title={bookmarks.includes(currentPage) ? `Hapus markah di hal ${currentPage}` : `Tandai markah hal ${currentPage}`}
          >
            <Bookmark className={cn("h-3.5 w-3.5", bookmarks.includes(currentPage) && "fill-amber-400 text-amber-400")} />
            <span className="hidden xl:inline">{bookmarks.includes(currentPage) ? "Ditandai" : "Markah"}</span>
          </Button>

          {/* Notes Drawer Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setNotesDrawerTab("notes")
              setIsNotesDrawerOpen(true)
            }}
            className="h-8 sm:h-8.5 px-2 sm:px-2.5 rounded-xl text-xs font-semibold gap-1.5 border-neutral-800 bg-neutral-900/90 text-neutral-300 hover:text-white hover:bg-neutral-800 shadow-xs cursor-pointer"
            title="Buka Catatan & Kutipan Saya"
          >
            <Highlighter className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden sm:inline">Catatan</span>
            {notes.length > 0 && (
              <span className="h-4 min-w-4 px-1 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold flex items-center justify-center">
                {notes.length}
              </span>
            )}
          </Button>

          {/* Zoom Controls: desktop only */}
          <div className="hidden sm:flex items-center bg-neutral-900/90 rounded-xl border border-neutral-800 p-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoomLevel((z) => Math.max(70, z - 15))}
              className="h-7 w-7 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer"
              title="Perkecil (Zoom Out)"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-[11px] font-mono text-neutral-300 w-9 text-center font-semibold">
              {zoomLevel}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoomLevel((z) => Math.min(150, z + 15))}
              className="h-7 w-7 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer"
              title="Perbesar (Zoom In)"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Fullscreen Button: desktop only */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="hidden sm:flex h-8.5 w-8.5 rounded-xl text-neutral-400 hover:text-white bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 cursor-pointer"
            title={isFullscreen ? "Keluar Layar Penuh (F11)" : "Mode Layar Penuh (F11)"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {/* READER VIEWPORT (DYNAMIC WATERMARK OVERLAY) */}
      <div
        ref={viewportRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex-1 relative overflow-y-auto overflow-x-hidden p-3 sm:p-6 md:p-8 flex items-start justify-center bg-neutral-950 sm:bg-neutral-900/90"
      >
        
        {/* Floating Side Page Turn Buttons (Left & Right - Desktop only) */}
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          className={cn(
            "hidden md:flex fixed left-5 top-1/2 -translate-y-1/2 z-25 w-11 h-11 rounded-full items-center justify-center transition-all shadow-xl",
            "bg-neutral-950/80 hover:bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800/90 backdrop-blur-md",
            "disabled:opacity-0 disabled:pointer-events-none hover:scale-110 active:scale-95 cursor-pointer"
          )}
          title="Halaman Sebelumnya (←)"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          className={cn(
            "hidden md:flex fixed right-5 top-1/2 -translate-y-1/2 z-25 w-11 h-11 rounded-full items-center justify-center transition-all shadow-xl",
            "bg-neutral-950/80 hover:bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800/90 backdrop-blur-md",
            "disabled:opacity-0 disabled:pointer-events-none hover:scale-110 active:scale-95 cursor-pointer"
          )}
          title="Halaman Berikutnya (→)"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* The Page Canvas/Container with Paper Theme (Edge-to-edge on mobile) */}
        <div
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
          className={cn(
            "relative w-full max-w-3xl min-h-fit sm:min-h-[700px] rounded-none sm:rounded-2xl shadow-none sm:shadow-2xl transition-all duration-200 overflow-hidden flex flex-col justify-between border-0 sm:border",
            "p-4 sm:p-8 md:p-12",
            paperTheme === "white" && "bg-white text-neutral-900 sm:border-neutral-200",
            paperTheme === "sepia" && "bg-[#fbf0d9] text-[#43302b] sm:border-[#e8d5b5]",
            paperTheme === "dark" && "bg-neutral-950 text-neutral-200 sm:border-neutral-800"
          )}
        >
          {/* DYNAMIC WATERMARK OVERLAY (Section 5: Name, Email, Timestamp dynamically stamped across page) */}
          <div
            className="absolute inset-0 pointer-events-none z-20 overflow-hidden flex flex-wrap justify-around items-center opacity-15 select-none"
            aria-hidden="true"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "transform -rotate-25 font-mono text-xs font-bold leading-tight m-6 text-center",
                  paperTheme === "dark" ? "text-neutral-400" : "text-neutral-800"
                )}
              >
                <div>RSJD ATMA HUSADA MAHAKAM</div>
                <div className="text-[10px]">Pembaca: {user?.name || "Peminjam Perpustakaan"} ({user?.role === "admin" || user?.role === "super_admin" ? "Admin" : "Member"})</div>
                <div className="text-[9px]">ID: USR-{user?.id ? String(user.id).padStart(4, "0") : "0001"} &bull; {accessTimestamp}</div>
                <div className="text-[8px] text-red-600 font-sans tracking-widest">DILARANG MENYALIN / MEMBAJAK</div>
              </div>
            ))}
          </div>

          {/* Book Header info on page */}
          <div className={cn(
            "flex justify-between items-center text-[10px] border-b pb-2 mb-6 shrink-0",
            paperTheme === "dark" ? "border-neutral-800 text-neutral-500" : paperTheme === "sepia" ? "border-[#e8d5b5] text-[#7a6458]" : "border-neutral-200 text-neutral-400"
          )}>
            <span className="font-semibold uppercase tracking-wider">{book.title}</span>
            <span>RSJD Digital Library &middot; Format {selectedFormat.toUpperCase()}</span>
          </div>

          {/* Rendered Book Content: Real PDF Canvas or Authentic Book Summary */}
          {isPdfLoading && !pdfDoc ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-3">
              <Spinner className="h-8 w-8 text-sky-500" />
              <p className="text-xs text-muted-foreground font-mono">
                Menghubungkan ke berkas PDF digital ({book.title})...
              </p>
            </div>
          ) : pdfDoc ? (
            <div
              className={cn(
                "relative z-10 flex flex-col items-center justify-center my-2 sm:my-4 transition-all w-full flex-1",
                paperTheme === "sepia" && "sepia-[0.35] brightness-95 contrast-105",
                paperTheme === "dark" && "invert-[0.9] hue-rotate-180 brightness-90 contrast-125"
              )}
            >
              {isPdfLoading && (
                <div className="absolute inset-0 bg-black/20 backdrop-blur-2xs flex items-center justify-center z-10 rounded">
                  <Spinner className="h-6 w-6 text-sky-500" />
                </div>
              )}
              <canvas
                ref={canvasRef}
                className="max-w-full rounded shadow-sm transition-transform duration-150"
              />
            </div>
          ) : book.pdfUrl ? (
            /* Fallback embed jika CDN PDF.js gagal */
            <div className="flex-1 w-full min-h-[640px] relative z-10">
              <iframe
                src={`${book.pdfUrl}#page=${currentPage}&toolbar=0&navpanes=0`}
                className="w-full h-full min-h-[640px] rounded border-0"
                title={book.title}
              />
            </div>
          ) : (
            /* Fallback konten autentik untuk buku katalog tanpa berkas PDF terunggah */
            <div
              key={currentPage}
              className={cn(
                "animate-fade-in space-y-4 text-sm leading-relaxed flex-1 font-serif",
                paperTheme === "white" && "text-neutral-800",
                paperTheme === "sepia" && "text-[#43302b]",
                paperTheme === "dark" && "text-neutral-200"
              )}
            >
              <h2
                className={cn(
                  "text-xl font-bold font-heading mb-4 border-l-4 border-sky-500 pl-3",
                  paperTheme === "white" && "text-neutral-900",
                  paperTheme === "sepia" && "text-[#2d1f1c]",
                  paperTheme === "dark" && "text-white"
                )}
              >
                {book.title} &mdash; Halaman {currentPage}
              </h2>

              <div
                className={cn(
                  "my-4 p-4 rounded-xl text-xs font-sans not-italic space-y-2 border",
                  paperTheme === "dark"
                    ? "bg-neutral-900/90 border-neutral-800 text-neutral-200"
                    : paperTheme === "sepia"
                    ? "bg-[#f4e6ca] border-[#e2cfab] text-[#43302b]"
                    : "bg-sky-50 border-sky-200 text-sky-900"
                )}
              >
                <span className={cn(
                  "font-bold flex items-center gap-1.5",
                  paperTheme === "dark" ? "text-sky-300" : paperTheme === "sepia" ? "text-[#2d1f1c]" : "text-sky-800"
                )}>
                  <Sparkles className="h-4 w-4 text-sky-500" />
                  Kategori: {book.categoryName} &bull; Penulis: {book.authorName}
                </span>
                <p className="leading-relaxed">
                  Tahun Terbit: {book.publishYear} | Bahasa: {book.language} | ISBN: {book.isbn}
                </p>
              </div>

              <p className="leading-relaxed">
                {book.synopsis || "Sinopsis dan tinjauan literatur buku ini dapat diakses secara lengkap melalui koleksi digital RSJD Atma Husada Mahakam."}
              </p>

              <div className="pt-4 text-xs font-sans text-muted-foreground italic border-t border-border/50">
                Gunakan tombol navigasi di bawah atau fitur lompat halaman untuk membaca lembaran berikutnya.
              </div>
            </div>
          )}

          {/* Book Footer on page */}
          <div className="flex justify-between items-center text-xs text-neutral-400 border-t border-neutral-200 pt-3 mt-6 shrink-0">
            <span>Halaman {currentPage} dari {totalPages}</span>
            <span className="text-[10px]">Perpustakaan Digital RSJD Kaltim</span>
          </div>
        </div>

      </div>

      {/* BOTTOMBAR NAVIGATION */}
      <footer className="h-14 sm:h-16 bg-neutral-950/95 backdrop-blur-md border-t border-neutral-800/80 px-2 sm:px-6 flex items-center justify-between shrink-0 z-30 relative select-none">
        {/* Ambient Top Progress Line (Visual reading track) */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-neutral-800/80 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky-500 via-sky-400 to-emerald-400 transition-all duration-300"
            style={{ width: `${totalPages > 0 ? Math.min(100, Math.round((currentPage / totalPages) * 100)) : 0}%` }}
          />
        </div>

        {/* SISI KIRI: Navigasi Mundur (Sebelumnya & Lompat ke Awal) */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Quick jump to Page 1 */}
          <Button
            variant="ghost"
            size="icon"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(1)}
            className="h-9 w-9 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition-all hidden sm:flex cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
            title="Lompat ke Halaman Pertama (Hal 1)"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          {/* Tombol Sebelumnya */}
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="h-8.5 sm:h-9 px-2 sm:px-4 rounded-xl gap-1 sm:gap-2 text-xs font-semibold border-neutral-800/90 bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 hover:text-white shadow-xs transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title="Halaman Sebelumnya (Panah Kiri / ←)"
          >
            <ChevronLeft className="h-4 w-4 text-neutral-400" />
            <span className="hidden sm:inline">Sebelumnya</span>
            <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono text-neutral-500 bg-neutral-950 rounded border border-neutral-800">
              ←
            </kbd>
          </Button>
        </div>

        {/* SISI TENGAH: Kontrol Halaman Simetris (Floating Center Island) */}
        <div className="flex items-center gap-1 sm:gap-3">
          <form
            onSubmit={handlePageJump}
            noValidate
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-1.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-sm"
          >
            <div className="flex items-center gap-1.5 text-xs text-neutral-400">
              <Compass className="h-3.5 w-3.5 text-sky-400 hidden sm:inline" />
              <span className="hidden sm:inline font-medium text-neutral-300">Hal</span>
            </div>

            <Input
              type="number"
              min={1}
              max={totalPages}
              value={pageInputVal}
              onChange={(e) => setPageInputVal(e.target.value.replace(/\D/g, ""))}
              onBlur={() => {
                const target = parseInt(pageInputVal, 10)
                if (!isNaN(target) && target >= 1 && target <= totalPages) {
                  setCurrentPage(target)
                } else {
                  setPageInputVal(currentPage.toString())
                }
              }}
              className="h-6.5 sm:h-7 w-11 sm:w-16 text-center font-mono font-bold text-xs bg-neutral-950 border-neutral-700/80 text-sky-400 rounded-lg p-0 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 shadow-inner"
              title="Ketik angka halaman dan tekan Enter untuk melompat"
            />

            <span className="text-xs text-neutral-500 font-medium">
              / <span className="text-neutral-300 font-mono font-semibold">{totalPages}</span>
            </span>

            {/* Quick scrubbing range slider */}
            <div className="hidden xl:flex items-center ml-2 pl-3 border-l border-neutral-800 w-28 sm:w-36">
              <input
                type="range"
                min={1}
                max={totalPages}
                value={currentPage}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  if (!isNaN(val)) setCurrentPage(val)
                }}
                className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                title={`Geser cepat: Halaman ${currentPage} dari ${totalPages}`}
              />
            </div>
          </form>
        </div>

        {/* SISI KANAN: Progres & Tombol Berikutnya (Di Kanan) */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Badge Progres Persentase */}
          <div
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-neutral-900/80 border border-neutral-800 text-[11px] font-mono text-neutral-400 cursor-default"
            title={`Progres baca: ${Math.round((currentPage / totalPages) * 100)}% tersimpan`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-emerald-400 font-bold">
              {totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0}%
            </span>
          </div>

          {/* Tombol Berikutnya (Di Kanan, Menonjol dengan Aksen Biru) */}
          <Button
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="h-8.5 sm:h-9 px-2.5 sm:px-4.5 rounded-xl gap-1 sm:gap-2 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title="Halaman Berikutnya (Panah Kanan / →)"
          >
            <span className="hidden sm:inline">Berikutnya</span>
            <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono text-sky-200 bg-sky-700/60 rounded border border-sky-500/40">
              →
            </kbd>
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Quick jump to Last Page */}
          <Button
            variant="ghost"
            size="icon"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(totalPages)}
            className="h-9 w-9 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition-all hidden sm:flex cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
            title={`Lompat ke Halaman Terakhir (Hal ${totalPages})`}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </footer>

      {/* DRAWER CATATAN & KUTIPAN MEMBACA (Highlights & Notes Drawer) */}
      {isNotesDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setIsNotesDrawerOpen(false)}
          />

          {/* Drawer Content */}
          <aside className="relative z-10 w-full max-w-md h-full bg-neutral-900 border-l border-neutral-800 p-6 flex flex-col justify-between shadow-2xl animate-slide-left">
            <div className="space-y-4">
              {/* Drawer Tab Switcher Header */}
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-neutral-950 border border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setNotesDrawerTab("notes")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      notesDrawerTab === "notes"
                        ? "bg-amber-500/20 text-amber-300 shadow-xs"
                        : "text-neutral-400 hover:text-white"
                    )}
                  >
                    <Highlighter className="h-3.5 w-3.5 text-amber-400" />
                    <span>Catatan ({notes.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotesDrawerTab("bookmarks")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      notesDrawerTab === "bookmarks"
                        ? "bg-sky-500/20 text-sky-300 shadow-xs"
                        : "text-neutral-400 hover:text-white"
                    )}
                  >
                    <Bookmark className="h-3.5 w-3.5 text-sky-400" />
                    <span>Markah ({bookmarks.length})</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNotesDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer"
                  title="Tutup Panel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* TAB 1: CATATAN */}
              {notesDrawerTab === "notes" && (
                <>
                  {/* Form Tambah Catatan */}
                  <form onSubmit={handleAddNote} noValidate className="space-y-2.5 p-3 rounded-2xl bg-neutral-950 border border-neutral-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400 font-medium">Halaman {currentPage}</span>
                      {/* Color Selector */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setNewNoteColor("yellow")}
                          className={cn(
                            "h-4 w-4 rounded-full bg-amber-400 transition-transform cursor-pointer",
                            newNoteColor === "yellow" && "ring-2 ring-white scale-110"
                          )}
                          title="Stabilo Kuning"
                        />
                        <button
                          type="button"
                          onClick={() => setNewNoteColor("green")}
                          className={cn(
                            "h-4 w-4 rounded-full bg-emerald-400 transition-transform cursor-pointer",
                            newNoteColor === "green" && "ring-2 ring-white scale-110"
                          )}
                          title="Stabilo Hijau"
                        />
                        <button
                          type="button"
                          onClick={() => setNewNoteColor("blue")}
                          className={cn(
                            "h-4 w-4 rounded-full bg-sky-400 transition-transform cursor-pointer",
                            newNoteColor === "blue" && "ring-2 ring-white scale-110"
                          )}
                          title="Stabilo Biru"
                        />
                      </div>
                    </div>

                    <textarea
                      rows={3}
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      placeholder="Masukkan Catatan atau Kutipan..."
                      className="w-full text-xs p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white placeholder:text-neutral-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                    />

                    <Button
                      type="submit"
                      size="sm"
                      className="w-full h-8 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 gap-1.5 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Simpan Catatan di Hal {currentPage}</span>
                    </Button>
                  </form>

                  {/* Daftar Catatan Tersimpan */}
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                    {notes.length === 0 ? (
                      <p className="text-xs text-neutral-500 text-center py-8">
                        Belum ada catatan atau kutipan pada buku ini.
                      </p>
                    ) : (
                      notes.map((note) => (
                        <div
                          key={note.id}
                          className={cn(
                            "p-3 rounded-xl border text-xs space-y-1.5 relative group",
                            note.color === "yellow" && "bg-amber-950/20 border-amber-500/30 text-amber-200",
                            note.color === "green" && "bg-emerald-950/20 border-emerald-500/30 text-emerald-200",
                            note.color === "blue" && "bg-sky-950/20 border-sky-500/30 text-sky-200"
                          )}
                        >
                          <div className="flex items-center justify-between text-[10px] text-neutral-400">
                            <span className="font-bold">{note.createdAt}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteNote(note.id)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-neutral-400 hover:text-rose-400 transition-opacity cursor-pointer"
                              title="Hapus Catatan"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                          <p className="leading-relaxed font-sans">{note.text}</p>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              {/* TAB 2: MARKAH HALAMAN (BOOKMARKS) */}
              {notesDrawerTab === "bookmarks" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span>Halaman Ditandai</span>
                    <span className="font-mono text-sky-400">{bookmarks.length} markah</span>
                  </div>

                  {bookmarks.length === 0 ? (
                    <div className="text-center py-12 text-neutral-500 text-xs">
                      <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-30 text-sky-400" />
                      <p className="font-medium text-neutral-300">Belum ada halaman yang ditandai</p>
                      <p className="text-[11px] text-neutral-500 mt-1 max-w-xs mx-auto">
                        Klik tombol &ldquo;Markah&rdquo; di bilah atas untuk menyimpan halaman favorit Anda.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-[55vh] overflow-y-auto pr-1">
                      {bookmarks.map((p) => (
                        <div
                          key={p}
                          className={cn(
                            "flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all",
                            p === currentPage
                              ? "bg-sky-950/40 border-sky-500/60 text-white font-bold shadow-xs"
                              : "bg-neutral-950/80 border-neutral-800 text-neutral-300 hover:border-neutral-700"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentPage(p)
                              setIsNotesDrawerOpen(false)
                            }}
                            className="flex items-center gap-2 text-left cursor-pointer flex-1 truncate"
                            title={`Lompat ke Halaman ${p}`}
                          >
                            <Bookmark className={cn("h-3.5 w-3.5 shrink-0", p === currentPage ? "fill-sky-400 text-sky-400" : "text-sky-400")} />
                            <span className="truncate">Hal {p}</span>
                            {p === currentPage && (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-sky-500/20 text-sky-300">Aktif</span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleBookmark(p)
                            }}
                            className="p-1 text-neutral-500 hover:text-rose-400 cursor-pointer transition-colors"
                            title="Hapus Markah"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Aksi */}
            <div className="pt-3 border-t border-neutral-800">
              {notesDrawerTab === "notes" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyAllNotes}
                  disabled={notes.length === 0}
                  className="w-full text-xs font-semibold gap-1.5 border-neutral-800 bg-neutral-950 text-neutral-300 hover:text-white cursor-pointer"
                >
                  {copiedAll ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Semua Catatan Berhasil Disalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Salin Seluruh Catatan ({notes.length})</span>
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toggleBookmark(currentPage)}
                  className="w-full text-xs font-semibold gap-1.5 border-neutral-800 bg-neutral-950 text-neutral-300 hover:text-white cursor-pointer"
                >
                  <Bookmark className={cn("h-3.5 w-3.5", bookmarks.includes(currentPage) && "fill-amber-400 text-amber-400")} />
                  <span>
                    {bookmarks.includes(currentPage)
                      ? `Hapus Markah Halaman Ini (Hal ${currentPage})`
                      : `Tandai Halaman Ini (Hal ${currentPage})`}
                  </span>
                </Button>
              )}
            </div>
          </aside>
        </div>
      )}

    </div>
  )
}
