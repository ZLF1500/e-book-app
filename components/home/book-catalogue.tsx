"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  LayoutGrid,
  List,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Star,
  BookOpen,
  Bookmark,
  Check,
  X,
  RotateCcw,
  Sparkles,
  Info,
  ChevronLeft,
  ChevronRight,
  Search,
  PanelLeftClose,
  PanelLeft,
  Layers,
  ChevronUp,
  ChevronDown,
  Globe,
  CheckCircle2,
  FileText,
  Calendar,
  User,
  Building,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Spinner } from "@/components/ui/spinner"
import { Skeleton } from "@/components/ui/skeleton"
import { BookCardSkeleton, BookListSkeleton } from "@/components/ui/book-card-skeleton"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { BookItem } from "@/lib/mock-data"
import { useAuth } from "@/lib/auth-context"
import { GuestModal } from "@/components/auth/guest-modal"
import { cn } from "@/lib/utils"
import { saveRecentlyViewed } from "@/lib/recently-viewed"

const ITEMS_PER_PAGE = 12
const LOCAL_STORAGE_BOOKMARK_KEY = "rsjd_bookmarks_v1"

type SelectionType = "terbaru" | "populer" | "rating" | "az" | "bookmark"
type SortOrder = "desc" | "asc"

function resolveCategory(input: string, categories: { id: string | number; name: string; slug: string }[] = []) {
  if (!input) return null
  const clean = input.trim().toLowerCase()
  return (
    categories.find(
      (c) =>
        c.slug.toLowerCase() === clean ||
        String(c.id).toLowerCase() === clean ||
        c.name.toLowerCase() === clean
    ) || null
  )
}

export function BookCatalogue() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // URL query params
  const urlQuery = searchParams.get("q") || ""
  const urlCategory = searchParams.get("category") || ""
  const urlTag = searchParams.get("tag") || ""
  const urlAuthor = searchParams.get("author") || ""
  const urlFormat = searchParams.get("format") || ""
  const urlLanguage = searchParams.get("language") || searchParams.get("lang") || ""
  const urlSort = searchParams.get("sort") || ""
  const urlFeatured = searchParams.get("featured") || ""

  const initialCategory = React.useMemo(() => {
    if (!urlCategory) return ""
    const resolved = resolveCategory(urlCategory)
    return resolved ? resolved.slug : urlCategory
  }, [urlCategory])

  const initialFormat = React.useMemo<"semua" | "epub" | "pdf">(() => {
    if (urlFormat === "epub" || urlFormat === "pdf") return urlFormat
    return "semua"
  }, [urlFormat])

  const initialLanguage = React.useMemo<"semua" | "indonesia" | "inggris">(() => {
    const l = (urlLanguage || "").toLowerCase()
    if (l === "indonesia" || l === "id") return "indonesia"
    if (l === "inggris" || l === "en" || l === "english") return "inggris"
    return "semua"
  }, [urlLanguage])

  const initialSelection = React.useMemo<SelectionType>(() => {
    if (urlSort === "terbaru" || urlSort === "populer" || urlSort === "rating" || urlSort === "az" || urlSort === "bookmark") {
      return urlSort
    }
    return "populer"
  }, [urlSort])

  // Local state
  const { user, isGuest } = useAuth()
  const [isGuestModalOpen, setIsGuestModalOpen] = React.useState(false)
  const [guestActionType, setGuestActionType] = React.useState<"pinjam" | "ulasan" | "bookmark">("bookmark")

  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid")
  const [selection, setSelection] = React.useState<SelectionType>(initialSelection)
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("desc")
  const [currentPage, setCurrentPage] = React.useState<number>(1)
  const [isSidebarOpen, setIsSidebarOpen] = React.useState<boolean>(true)
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = React.useState<boolean>(false)
  const [isApplyingFilter, setIsApplyingFilter] = React.useState<boolean>(false)
  const [bookmarkedIds, setBookmarkedIds] = React.useState<string[]>([])

  // Live Database Books & Categories State
  const [liveBooks, setLiveBooks] = React.useState<BookItem[]>([])
  const [liveCategories, setLiveCategories] = React.useState<{ id: string | number; name: string; slug: string; bookCount: number; iconName: string }[]>([])
  const [isCatalogLoading, setIsCatalogLoading] = React.useState<boolean>(true)

  const resolveCategoryDynamic = React.useCallback(
    (input: string) => {
      if (!input) return null
      const clean = input.trim().toLowerCase()
      return (
        liveCategories.find(
          (c) =>
            c.slug.toLowerCase() === clean ||
            String(c.id).toLowerCase() === clean ||
            c.name.toLowerCase() === clean
        ) || null
      )
    },
    [liveCategories]
  )

  React.useEffect(() => {
    Promise.all([
      fetch("/api/books").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ])
      .then(([booksData, catData]) => {
        if (booksData.success && Array.isArray(booksData.books)) {
          setLiveBooks(booksData.books)
        }
        if (catData.success && Array.isArray(catData.categories)) {
          setLiveCategories(catData.categories)
        }
      })
      .catch(() => {})
      .finally(() => setIsCatalogLoading(false))
  }, [])

  // Filter state (live instant filtering)
  const [filterCategory, setFilterCategory] = React.useState<string>(initialCategory)
  const [filterStatus, setFilterStatus] = React.useState<"semua" | "tersedia" | "tidak_tersedia">("semua")
  const [filterFormat, setFilterFormat] = React.useState<"semua" | "epub" | "pdf">(initialFormat)
  const [filterLanguage, setFilterLanguage] = React.useState<"semua" | "indonesia" | "inggris">(initialLanguage)
  const [filterFeatured, setFilterFeatured] = React.useState<boolean>(urlFeatured === "true")
  const [filterAuthorQuery, setFilterAuthorQuery] = React.useState<string>(urlAuthor)
  const [filterPublisherQuery, setFilterPublisherQuery] = React.useState<string>("")
  const [filterYearRange, setFilterYearRange] = React.useState<number[]>([1950, 2030])

  // Dynamic Authors & Publishers extracted from live MariaDB books
  const dynamicAuthors = React.useMemo(() => {
    const set = new Set<string>()
    for (const b of liveBooks) {
      if (b.authorName) set.add(b.authorName.trim())
    }
    return Array.from(set).map((name) => ({ id: name, name }))
  }, [liveBooks])

  const dynamicPublishers = React.useMemo(() => {
    const set = new Set<string>()
    for (const b of liveBooks) {
      if (b.publisherName) set.add(b.publisherName.trim())
    }
    return Array.from(set).map((name) => ({ id: name, name }))
  }, [liveBooks])

  // Collapsible section accordions inside sidebar (all collapsed by default per user request)
  const [expandedSections, setExpandedSections] = React.useState({
    category: Boolean(urlCategory),
    status: false,
    format: Boolean(urlFormat),
    language: Boolean(urlLanguage),
    year: false,
    author: Boolean(urlAuthor),
    publisher: false,
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  // Sync bookmarks from localStorage & MariaDB database
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_BOOKMARK_KEY)
      if (saved) {
        setBookmarkedIds(JSON.parse(saved))
      } else {
        setBookmarkedIds([])
      }
    } catch {}

    // Sinkronisasi data bookmark akun dari database
    fetch("/api/favorites")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.favorites)) {
          setBookmarkedIds((prev) => {
            const combined = Array.from(new Set([...prev, ...d.favorites]))
            try {
              localStorage.setItem(LOCAL_STORAGE_BOOKMARK_KEY, JSON.stringify(combined))
            } catch {}
            return combined
          })
        }
      })
      .catch(() => {})
  }, [])

  // Sync filters from URL if present
  React.useEffect(() => {
    if (urlCategory) {
      const resolved = resolveCategoryDynamic(urlCategory)
      setFilterCategory(resolved ? resolved.slug : urlCategory)
      setExpandedSections((prev) => ({ ...prev, category: true }))
    }
  }, [urlCategory, resolveCategoryDynamic])

  React.useEffect(() => {
    if (urlAuthor) {
      setFilterAuthorQuery(urlAuthor)
      setExpandedSections((prev) => ({ ...prev, author: true }))
    }
  }, [urlAuthor])

  React.useEffect(() => {
    if (urlFormat === "epub" || urlFormat === "pdf") {
      setFilterFormat(urlFormat)
      setExpandedSections((prev) => ({ ...prev, format: true }))
    }
  }, [urlFormat])

  React.useEffect(() => {
    if (urlLanguage) {
      const l = urlLanguage.toLowerCase()
      if (l === "indonesia" || l === "id") {
        setFilterLanguage("indonesia")
        setExpandedSections((prev) => ({ ...prev, language: true }))
      } else if (l === "inggris" || l === "en" || l === "english") {
        setFilterLanguage("inggris")
        setExpandedSections((prev) => ({ ...prev, language: true }))
      }
    }
  }, [urlLanguage])

  React.useEffect(() => {
    if (urlFeatured === "true") {
      setFilterFeatured(true)
    }
  }, [urlFeatured])

  React.useEffect(() => {
    if (urlSort === "terbaru" || urlSort === "populer" || urlSort === "rating" || urlSort === "az" || urlSort === "bookmark") {
      setSelection(urlSort)
      if (urlSort === "az") {
        setSortOrder("asc")
      }
    }
  }, [urlSort])

  const toggleBookmark = (bookId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isGuest) {
      setGuestActionType("bookmark")
      setIsGuestModalOpen(true)
      return
    }
    let updated: string[]
    if (bookmarkedIds.includes(bookId)) {
      updated = bookmarkedIds.filter((id) => id !== bookId)
    } else {
      updated = [...bookmarkedIds, bookId]
    }
    setBookmarkedIds(updated)
    try {
      localStorage.setItem(LOCAL_STORAGE_BOOKMARK_KEY, JSON.stringify(updated))
      window.dispatchEvent(new Event("bookmarks-updated"))

      // Kirim pembaruan ke tabel favorites MariaDB
      fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, action: "toggle" }),
      }).catch(() => {})
    } catch {}
  }

  const handleSelectionChange = (newSelection: SelectionType) => {
    if (newSelection === "bookmark" && isGuest) {
      setGuestActionType("bookmark")
      setIsGuestModalOpen(true)
      return
    }
    if (newSelection === "az") {
      if (selection === "az") {
        setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
      } else {
        setSortOrder("asc")
        setSelection("az")
      }
      setIsApplyingFilter(true)
      setCurrentPage(1)
      setTimeout(() => setIsApplyingFilter(false), 250)
      return
    }
    if (newSelection === selection) return
    setIsApplyingFilter(true)
    setSelection(newSelection)
    if (newSelection === "terbaru" || newSelection === "populer" || newSelection === "rating") {
      setSortOrder("desc")
    }
    setCurrentPage(1)
    setTimeout(() => setIsApplyingFilter(false), 250)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage === currentPage) return
    setIsApplyingFilter(true)
    setCurrentPage(newPage)
    setTimeout(() => setIsApplyingFilter(false), 250)
  }

  // Filter & Sort Logic
  const filteredAndSortedBooks = React.useMemo(() => {
    let result = [...liveBooks]

    // 1. Text Search Query
    if (urlQuery.trim()) {
      const q = urlQuery.toLowerCase().trim()
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.authorName.toLowerCase().includes(q) ||
          b.categoryName.toLowerCase().includes(q) ||
          b.tags.some((t) => t.toLowerCase().includes(q))
      )
    }

    // 2. Category Filter
    if (filterCategory) {
      const resolved = resolveCategoryDynamic(filterCategory)
      if (resolved) {
        result = result.filter(
          (b) =>
            b.categoryId === resolved.id ||
            b.categoryName.toLowerCase() === resolved.name.toLowerCase() ||
            (resolved.slug && b.categoryName.toLowerCase().includes(resolved.slug.replace(/-/g, " ")))
        )
      } else {
        result = result.filter(
          (b) =>
            b.categoryName.toLowerCase().includes(filterCategory.toLowerCase()) ||
            b.categoryId === filterCategory
        )
      }
    }

    // 3. Tag Filter from URL
    if (urlTag) {
      const normalizedTag = urlTag.toLowerCase().replace(/-/g, " ")
      result = result.filter((b) =>
        b.tags.some((t) => t.toLowerCase().includes(normalizedTag) || t.toLowerCase() === urlTag.toLowerCase())
      )
    }

    // 4. Author Filter
    if (filterAuthorQuery.trim()) {
      const a = filterAuthorQuery.toLowerCase().trim()
      result = result.filter((b) => b.authorName.toLowerCase().includes(a))
    }

    // 5. Publisher Filter
    if (filterPublisherQuery.trim()) {
      const p = filterPublisherQuery.toLowerCase().trim()
      result = result.filter((b) => b.publisherName.toLowerCase().includes(p))
    }

    // 6. Year Range
    const [minYear, maxYear] = filterYearRange
    result = result.filter((b) => b.publishYear >= minYear && b.publishYear <= maxYear)

    // 7. Format Filter
    if (filterFormat === "epub") {
      result = result.filter((b) => b.formats.epub.available)
    } else if (filterFormat === "pdf") {
      result = result.filter((b) => b.formats.pdf.available)
    }

    // 8. Language Filter
    if (filterLanguage === "indonesia") {
      result = result.filter((b) => b.language.toLowerCase() === "indonesia")
    } else if (filterLanguage === "inggris") {
      result = result.filter((b) => b.language.toLowerCase() === "inggris" || b.language.toLowerCase() === "english")
    }

    // 9. Status Filter:
    // Sesuai revisi v31: Buku berstatus nonaktif/rusak tetap tampil di katalog dengan badge "Tidak Tersedia"
    if (filterStatus === "tersedia") {
      result = result.filter((b) => b.status === "aktif")
    } else if (filterStatus === "tidak_tersedia") {
      result = result.filter((b) => b.status === "nonaktif")
    }

    // 10. Featured Filter (dari /buku?featured=true)
    if (filterFeatured) {
      result = result.filter((b) => b.isFeatured)
    }

    // 11. Selection Button:
    // Bookmark is a filter: show only bookmarked books
    if (selection === "bookmark") {
      result = result.filter((b) => bookmarkedIds.includes(b.id))
    } else if (selection === "terbaru") {
      result.sort((a, b) => (sortOrder === "desc" ? b.publishYear - a.publishYear : a.publishYear - b.publishYear))
    } else if (selection === "populer") {
      result.sort((a, b) => (sortOrder === "desc" ? b.loanCount - a.loanCount : a.loanCount - b.loanCount))
    } else if (selection === "rating") {
      result.sort((a, b) =>
        sortOrder === "desc" ? b.averageRating - a.averageRating : a.averageRating - b.averageRating
      )
    } else if (selection === "az") {
      result.sort((a, b) =>
        sortOrder === "asc"
          ? a.title.localeCompare(b.title, "id", { sensitivity: "base" })
          : b.title.localeCompare(a.title, "id", { sensitivity: "base" })
      )
    }

    return result
  }, [
    liveBooks,
    liveCategories,
    resolveCategoryDynamic,
    urlQuery,
    urlTag,
    filterCategory,
    filterAuthorQuery,
    filterPublisherQuery,
    filterYearRange,
    filterFormat,
    filterLanguage,
    filterStatus,
    filterFeatured,
    selection,
    sortOrder,
    bookmarkedIds,
  ])

  // Pagination calculations: 12 items per page
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedBooks.length / ITEMS_PER_PAGE))
  const paginatedBooks = React.useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredAndSortedBooks.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredAndSortedBooks, currentPage])

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [selection, sortOrder, filterCategory, filterStatus, filterFormat, filterLanguage, filterAuthorQuery, filterPublisherQuery, filterYearRange, urlQuery, urlTag])

  const handleResetAllFilters = () => {
    setFilterCategory("")
    setFilterStatus("semua")
    setFilterFormat("semua")
    setFilterLanguage("semua")
    setFilterFeatured(false)
    setFilterAuthorQuery("")
    setFilterPublisherQuery("")
    setFilterYearRange([1950, 2030])
    setSelection("populer")
    setSortOrder("desc")
    setCurrentPage(1)
    if (urlQuery || urlTag || urlCategory || urlAuthor || urlFormat || urlLanguage || urlFeatured || urlSort) {
      router.push("/buku")
    }
  }

  const isAnyFilterActive = Boolean(
    urlQuery ||
    urlTag ||
    filterCategory ||
    filterAuthorQuery ||
    filterPublisherQuery ||
    filterFeatured ||
    filterStatus !== "semua" ||
    filterFormat !== "semua" ||
    filterLanguage !== "semua" ||
    filterYearRange[0] > 1950 ||
    filterYearRange[1] < 2030
  )

  // Real-time counts for badges
  const categoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = { all: liveBooks.length }
    liveCategories.forEach((c) => {
      counts[c.slug] = liveBooks.filter((b) => b.categoryId === c.id || b.categoryName.toLowerCase() === c.name.toLowerCase()).length
    })
    return counts
  }, [liveBooks, liveCategories])

  const formatCounts = React.useMemo(() => {
    return {
      all: liveBooks.length,
      epub: liveBooks.filter((b) => b.formats.epub.available).length,
      pdf: liveBooks.filter((b) => b.formats.pdf.available).length,
    }
  }, [liveBooks])

  const languageCounts = React.useMemo(() => {
    return {
      all: liveBooks.length,
      indonesia: liveBooks.filter((b) => b.language.toLowerCase() === "indonesia").length,
      inggris: liveBooks.filter((b) => b.language.toLowerCase() === "inggris" || b.language.toLowerCase() === "english").length,
    }
  }, [liveBooks])

  const statusCounts = React.useMemo(() => {
    return {
      all: liveBooks.length,
      tersedia: liveBooks.filter((b) => b.status === "aktif").length,
      tidak_tersedia: liveBooks.filter((b) => b.status === "nonaktif").length,
    }
  }, [liveBooks])

  // Modular Filter Content used by both Desktop Sidebar & Mobile Sheet Drawer
  const renderFilterSidebarContent = (isMobile = false) => (
    <div className={cn("text-xs flex-1 flex flex-col justify-between", isMobile ? "p-5 space-y-5" : "space-y-5")}>
      <div className="space-y-4">
        {/* Sidebar Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-sky-600" />
            <span className="font-heading font-bold text-sm text-foreground">Filter Katalog</span>
            {isAnyFilterActive && (
              <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
            )}
          </div>
          <div className="flex items-center gap-2">
            {isAnyFilterActive && (
              <button
                type="button"
                onClick={handleResetAllFilters}
                className="text-[11px] font-medium text-sky-600 hover:text-sky-700 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            )}
            {isMobile && (
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Tutup filter"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* 1. KATEGORI BUKU (Single-Select) */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => toggleSection("category")}
            className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors py-1 cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-sky-600" />
              <span>Kategori</span>
            </div>
            <div className="flex items-center gap-1.5">
              {filterCategory && (
                <span className="text-[10px] font-normal normal-case px-1.5 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 truncate max-w-[90px]">
                  {resolveCategory(filterCategory)?.name || filterCategory}
                </span>
              )}
              {expandedSections.category ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </div>
          </button>

          {expandedSections.category && (
            <div className="space-y-1 pt-1 animate-fade-in">
              <button
                type="button"
                onClick={() => setFilterCategory("")}
                className={cn(
                  "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl font-medium transition-all text-left",
                  !filterCategory
                    ? "bg-sky-500 text-white font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                )}
              >
                <span>Semua Kategori</span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-md font-mono",
                    !filterCategory ? "bg-sky-600/60 text-white" : "bg-muted text-muted-foreground"
                  )}
                >
                  {categoryCounts.all}
                </span>
              </button>

              {liveCategories.map((c) => {
                const isSelected = filterCategory === c.slug || resolveCategory(filterCategory, liveCategories)?.slug === c.slug
                const count = categoryCounts[c.slug] || 0
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setFilterCategory(isSelected ? "" : c.slug)}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl font-medium transition-all text-left",
                      isSelected
                        ? "bg-sky-500 text-white font-semibold shadow-xs"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    )}
                  >
                    <span className="truncate pr-2">{c.name}</span>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-md font-mono shrink-0",
                        isSelected ? "bg-sky-600/60 text-white" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* 2. STATUS KETERSEDIAAN FILE (Aktif / Revisi) */}
        <div className="space-y-2 pt-3 border-t border-border/80">
          <button
            type="button"
            onClick={() => toggleSection("status")}
            className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors py-1 cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-sky-600" />
              <span>Status Berkas</span>
            </div>
            <div className="flex items-center gap-1.5">
              {filterStatus !== "semua" && (
                <span className="text-[10px] font-normal normal-case px-1.5 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                  {filterStatus === "tersedia" ? "Akses Instan" : "Revisi"}
                </span>
              )}
              {expandedSections.status ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </div>
          </button>

          {expandedSections.status && (
            <div className="grid grid-cols-1 gap-1 pt-1 animate-fade-in">
              {[
                { key: "semua", label: "Semua Koleksi", count: statusCounts.all },
                { key: "tersedia", label: "Akses Instan (Tersedia)", count: statusCounts.tersedia },
                { key: "tidak_tersedia", label: "Sedang Revisi File", count: statusCounts.tidak_tersedia },
              ].map((s) => {
                const isSelected = filterStatus === s.key
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setFilterStatus(s.key as "semua" | "tersedia" | "tidak_tersedia")}
                    className={cn(
                      "flex items-center justify-between px-2.5 py-1.5 rounded-xl font-medium transition-all text-left",
                      isSelected
                        ? "bg-sky-50 dark:bg-sky-950/50 border border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300 font-semibold"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground border border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          s.key === "semua"
                            ? "bg-neutral-400"
                            : s.key === "tersedia"
                            ? "bg-emerald-500"
                            : "bg-amber-500"
                        )}
                      />
                      <span>{s.label}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">{s.count}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* 3. FORMAT DIGITAL (EPUB / PDF) */}
        <div className="space-y-2 pt-3 border-t border-border/80">
          <button
            type="button"
            onClick={() => toggleSection("format")}
            className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors py-1 cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-sky-600" />
              <span>Format E-Book</span>
            </div>
            <div className="flex items-center gap-1.5">
              {filterFormat !== "semua" && (
                <span className="text-[10px] font-normal normal-case px-1.5 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 uppercase">
                  {filterFormat}
                </span>
              )}
              {expandedSections.format ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </div>
          </button>

          {expandedSections.format && (
            <div className="grid grid-cols-3 gap-1.5 pt-1 animate-fade-in">
              {[
                { key: "semua", label: "Semua", count: formatCounts.all },
                { key: "epub", label: "EPUB", count: formatCounts.epub },
                { key: "pdf", label: "PDF", count: formatCounts.pdf },
              ].map((f) => {
                const isSelected = filterFormat === f.key
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFilterFormat(f.key as "semua" | "epub" | "pdf")}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded-xl text-xs font-medium border transition-all",
                      isSelected
                        ? "border-sky-500 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-bold shadow-2xs"
                        : "border-border/80 hover:bg-muted/70 text-muted-foreground"
                    )}
                  >
                    <span>{f.label}</span>
                    <span className="text-[10px] text-muted-foreground font-mono mt-0.5">{f.count}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* BAHASA (Indonesia / Inggris) */}
        <div className="space-y-2 pt-3 border-t border-border/80">
          <button
            type="button"
            onClick={() => toggleSection("language")}
            className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors py-1 cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-sky-600" />
              <span>Bahasa</span>
            </div>
            <div className="flex items-center gap-1.5">
              {filterLanguage !== "semua" && (
                <span className="text-[10px] font-normal normal-case px-1.5 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                  {filterLanguage === "indonesia" ? "Indonesia" : "Inggris"}
                </span>
              )}
              {expandedSections.language ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </div>
          </button>

          {expandedSections.language && (
            <div className="grid grid-cols-3 gap-1.5 pt-1 animate-fade-in">
              {[
                { key: "semua", label: "Semua", count: languageCounts.all },
                { key: "indonesia", label: "Indonesia", count: languageCounts.indonesia },
                { key: "inggris", label: "Inggris", count: languageCounts.inggris },
              ].map((l) => {
                const isSelected = filterLanguage === l.key
                return (
                  <button
                    key={l.key}
                    type="button"
                    onClick={() => setFilterLanguage(l.key as "semua" | "indonesia" | "inggris")}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded-xl text-xs font-medium border transition-all cursor-pointer",
                      isSelected
                        ? "border-sky-500 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-bold shadow-2xs"
                        : "border-border/80 hover:bg-muted/70 text-muted-foreground"
                    )}
                  >
                    <span>{l.label}</span>
                    <span className="text-[10px] text-muted-foreground font-mono mt-0.5">{l.count}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* 4. RENTANG TAHUN TERBIT */}
        <div className="space-y-2 pt-3 border-t border-border/80">
          <button
            type="button"
            onClick={() => toggleSection("year")}
            className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors py-1 cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-sky-600" />
              <span>Tahun Terbit</span>
            </div>
            <div className="flex items-center gap-1.5">
              {(filterYearRange[0] > 1950 || filterYearRange[1] < 2030) && (
                <span className="text-[10px] font-normal normal-case px-1.5 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                  {filterYearRange[0]}–{filterYearRange[1]}
                </span>
              )}
              {expandedSections.year ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </div>
          </button>

          {expandedSections.year && (
            <div className="pt-2 px-1 animate-fade-in space-y-2">
              <div className="flex justify-between items-center text-[11px] font-bold text-sky-600">
                <span>Rentang Aktif:</span>
                <span>{filterYearRange[0]} - {filterYearRange[1]}</span>
              </div>
              <Slider
                min={1950}
                max={2030}
                step={1}
                value={filterYearRange}
                onValueChange={(val) => setFilterYearRange(val)}
                className="py-2"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>1950</span>
                <span>1990</span>
                <span>2030</span>
              </div>
            </div>
          )}
        </div>

        {/* 5. PENULIS */}
        <div className="space-y-2 pt-3 border-t border-border/80">
          <button
            type="button"
            onClick={() => toggleSection("author")}
            className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors py-1 cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-sky-600" />
              <span>Penulis</span>
            </div>
            <div className="flex items-center gap-1.5">
              {filterAuthorQuery && (
                <span className="text-[10px] font-normal normal-case px-1.5 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 truncate max-w-[90px]">
                  {filterAuthorQuery}
                </span>
              )}
              {expandedSections.author ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </div>
          </button>

          {expandedSections.author && (
            <div className="space-y-2 pt-1 animate-fade-in">
              <div className="relative">
                <Input
                  placeholder="Masukkan Nama Penulis..."
                  value={filterAuthorQuery}
                  onChange={(e) => setFilterAuthorQuery(e.target.value)}
                  className="h-8 text-xs pr-7 rounded-lg"
                />
                {filterAuthorQuery && (
                  <button
                    type="button"
                    onClick={() => setFilterAuthorQuery("")}
                    className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Popular Author Tags */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {dynamicAuthors.slice(0, 10).map((a) => {
                  const isSelected = filterAuthorQuery.toLowerCase() === a.name.toLowerCase()
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setFilterAuthorQuery(isSelected ? "" : a.name)}
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-md transition-colors",
                        isSelected
                          ? "bg-sky-500 text-white font-semibold"
                          : "bg-muted text-foreground hover:bg-sky-100 dark:hover:bg-sky-950/60"
                      )}
                    >
                      {a.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* 6. PENERBIT */}
        <div className="space-y-2 pt-3 border-t border-border/80">
          <button
            type="button"
            onClick={() => toggleSection("publisher")}
            className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors py-1 cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5 text-sky-600" />
              <span>Penerbit</span>
            </div>
            <div className="flex items-center gap-1.5">
              {filterPublisherQuery && (
                <span className="text-[10px] font-normal normal-case px-1.5 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 truncate max-w-[90px]">
                  {filterPublisherQuery}
                </span>
              )}
              {expandedSections.publisher ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </div>
          </button>

          {expandedSections.publisher && (
            <div className="space-y-2 pt-1 animate-fade-in">
              <div className="relative">
                <Input
                  placeholder="Masukkan Nama Penerbit..."
                  value={filterPublisherQuery}
                  onChange={(e) => setFilterPublisherQuery(e.target.value)}
                  className="h-8 text-xs pr-7 rounded-lg"
                />
                {filterPublisherQuery && (
                  <button
                    type="button"
                    onClick={() => setFilterPublisherQuery("")}
                    className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Popular Publisher Tags */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {dynamicPublishers.slice(0, 10).map((p) => {
                  const isSelected = filterPublisherQuery.toLowerCase() === p.name.toLowerCase()
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFilterPublisherQuery(isSelected ? "" : p.name)}
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-md transition-colors",
                        isSelected
                          ? "bg-sky-500 text-white font-semibold"
                          : "bg-muted text-foreground hover:bg-sky-100 dark:hover:bg-sky-950/60"
                      )}
                    >
                      {p.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Catatan Desktop di Dasar Sidebar yang Menyesuaikan Tinggi Kartu */}
      {!isMobile && (
        <div className="mt-auto pt-6 border-t border-border/60 text-muted-foreground">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground mb-1">
            <Info className="h-3.5 w-3.5 text-sky-600 shrink-0" />
            <span>Koleksi Terbuka</span>
          </div>
          <p className="text-[10px] leading-relaxed text-muted-foreground/80">
            Akses bebas tanpa antrean eksemplar. Durasi peminjaman 1–7 hari dapat Anda tentukan sendiri.
          </p>
        </div>
      )}

      {isMobile && (
        <div className="pt-4 border-t border-border/80 flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-1/2 text-xs h-9 rounded-xl"
            onClick={handleResetAllFilters}
          >
            Reset
          </Button>
          <Button
            type="button"
            className="w-1/2 text-xs h-9 rounded-xl bg-sky-600 hover:bg-sky-700 text-white"
            onClick={() => setIsMobileDrawerOpen(false)}
          >
            Tutup ({filteredAndSortedBooks.length})
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <section id="katalog-buku" className="w-full py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* TOTAL KOLEKSI COUNTER & TITLE */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-600 mb-1">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Katalog Terbuka RSJD</span>
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Daftar Buku Digital
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Akses bebas tanpa antrean eksemplar. Durasi peminjaman 1–7 hari dipilih langsung oleh Anda.
            </p>
          </div>

          {/* Badge Total Koleksi */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl border border-sky-200 dark:border-sky-800 bg-sky-50/80 dark:bg-sky-950/40 px-3.5 py-2">
              <BookOpen className="h-4 w-4 text-sky-600" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground">
                  {liveBooks.length > 0 ? `${liveBooks.length}+ Koleksi Digital` : "Koleksi Digital"}
                </span>
                <span className="text-[10px] text-muted-foreground">Kesehatan Jiwa & Umum</span>
              </div>
            </div>
          </div>
        </div>

        {/* ACTIVE FILTER / QUERY BANNER (if arrived via search bar or tag) */}
        {isAnyFilterActive && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-muted/60 border border-border/80 mb-6 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground">Filter Aktif:</span>
              {urlQuery && (
                <Badge variant="secondary" className="gap-1 bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200">
                  <span>Cari: &ldquo;{urlQuery}&rdquo;</span>
                </Badge>
              )}
              {urlTag && (
                <Badge variant="secondary" className="gap-1 bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200">
                  <span>Tag: #{urlTag}</span>
                </Badge>
              )}
              {filterCategory && (
                <Badge variant="secondary" className="gap-1">
                  <span>Kategori: {resolveCategory(filterCategory)?.name || filterCategory}</span>
                </Badge>
              )}
              {filterFeatured && (
                <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                  <Sparkles className="h-3 w-3" />
                  <span>Koleksi Pilihan (Featured)</span>
                </Badge>
              )}
              {filterStatus !== "semua" && (
                <Badge variant="secondary" className="gap-1">
                  <span>Status: {filterStatus === "tersedia" ? "Akses Instan" : "Sedang Revisi"}</span>
                </Badge>
              )}
              {filterFormat !== "semua" && (
                <Badge variant="secondary" className="gap-1">
                  <span>Format: {filterFormat.toUpperCase()}</span>
                </Badge>
              )}
              {filterLanguage !== "semua" && (
                <Badge variant="secondary" className="gap-1">
                  <Globe className="h-3 w-3 text-sky-600" />
                  <span>Bahasa: {filterLanguage === "indonesia" ? "Indonesia" : "Inggris"}</span>
                </Badge>
              )}
              {filterAuthorQuery && (
                <Badge variant="secondary" className="gap-1">
                  <span>Penulis: {filterAuthorQuery}</span>
                </Badge>
              )}
              {filterPublisherQuery && (
                <Badge variant="secondary" className="gap-1">
                  <span>Penerbit: {filterPublisherQuery}</span>
                </Badge>
              )}
              {(filterYearRange[0] > 1950 || filterYearRange[1] < 2030) && (
                <Badge variant="secondary" className="gap-1">
                  <span>Tahun: {filterYearRange[0]}–{filterYearRange[1]}</span>
                </Badge>
              )}
              <span className="text-muted-foreground">
                ({filteredAndSortedBooks.length} buku ditemukan)
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetAllFilters}
              className="h-7 text-xs text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950/40 px-2"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              <span>Reset Pencarian</span>
            </Button>
          </div>
        )}

        {/* TOOLBAR: SIDEBAR TOGGLE, VIEW TOGGLE, SELECTION, SORT ORDER */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-2xl bg-card border border-border shadow-2xs mb-6">
          
          {/* SISI KIRI: DESKTOP SIDEBAR TOGGLE, MOBILE SHEET TRIGGER & GRID/LIST TOGGLE */}
          {/* SISI KIRI: DESKTOP SIDEBAR TOGGLE, MOBILE SHEET TRIGGER & GRID/LIST TOGGLE */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Desktop Sidebar Toggle */}
            <Button
              variant="outline"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className={cn(
                "hidden lg:inline-flex items-center gap-2 h-9 px-3 rounded-xl border-border hover:bg-muted text-xs font-semibold text-foreground transition-all cursor-pointer",
                isSidebarOpen && "border-sky-500 text-sky-600 bg-sky-50/60 dark:bg-sky-950/40"
              )}
              title={isSidebarOpen ? "Sembunyikan Sidebar Filter" : "Tampilkan Sidebar Filter"}
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="h-4 w-4 text-sky-600" />
              ) : (
                <PanelLeft className="h-4 w-4" />
              )}
              <span>{isSidebarOpen ? "Tutup Filter" : "Buka Filter"}</span>
              {isAnyFilterActive && (
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
              )}
            </Button>

            {/* Mobile Sheet Trigger */}
            <Button
              variant="outline"
              onClick={() => setIsMobileDrawerOpen(true)}
              className={cn(
                "inline-flex lg:hidden items-center gap-1.5 h-9 px-3 rounded-xl border-border hover:bg-muted text-xs font-semibold text-foreground relative cursor-pointer",
                isAnyFilterActive && "border-sky-500 text-sky-600 bg-sky-50/60 dark:bg-sky-950/40"
              )}
              title="Buka Filter Buku"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filter</span>
              {isAnyFilterActive && (
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
              )}
            </Button>

            {/* Grid/List Toggle */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              className="h-9 w-9 rounded-xl border-border hover:bg-muted text-foreground cursor-pointer"
              title={viewMode === "grid" ? "Ganti ke Tampilan Baris (List)" : "Ganti ke Tampilan Grid"}
            >
              {viewMode === "grid" ? (
                <List className="h-4 w-4" />
              ) : (
                <LayoutGrid className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* SISI KANAN: SELECTION BUTTON (SEGMENTED CONTROL) & ARAH SORT */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end overflow-hidden">
            {/* Selection Button (Segmented Control) */}
            <div className="inline-flex rounded-xl bg-muted p-1 text-xs font-medium text-muted-foreground overflow-x-auto no-scrollbar max-w-[calc(100%-44px)] sm:max-w-none">
              <button
                type="button"
                onClick={() => handleSelectionChange("terbaru")}
                className={cn(
                  "px-2.5 sm:px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer",
                  selection === "terbaru"
                    ? "bg-background text-foreground font-semibold shadow-xs"
                    : "hover:text-foreground"
                )}
              >
                Terbaru
              </button>
              <button
                type="button"
                onClick={() => handleSelectionChange("populer")}
                className={cn(
                  "px-2.5 sm:px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer",
                  selection === "populer"
                    ? "bg-background text-foreground font-semibold shadow-xs"
                    : "hover:text-foreground"
                )}
              >
                Populer
              </button>
              <button
                type="button"
                onClick={() => handleSelectionChange("rating")}
                className={cn(
                  "px-2.5 sm:px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer",
                  selection === "rating"
                    ? "bg-background text-foreground font-semibold shadow-xs"
                    : "hover:text-foreground"
                )}
              >
                Rating
              </button>
              <button
                type="button"
                onClick={() => handleSelectionChange("az")}
                className={cn(
                  "px-2.5 sm:px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer font-medium",
                  selection === "az"
                    ? "bg-background text-foreground font-semibold shadow-xs"
                    : "hover:text-foreground"
                )}
                title={selection === "az" ? (sortOrder === "asc" ? "Urutan A ke Z (Klik untuk Z ke A)" : "Urutan Z ke A (Klik untuk A ke Z)") : "Urutkan Berdasarkan Abjad (A - Z)"}
              >
                {selection === "az" && sortOrder === "desc" ? "Z - A" : "A - Z"}
              </button>
              <button
                type="button"
                onClick={() => handleSelectionChange("bookmark")}
                className={cn(
                  "px-2.5 sm:px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer",
                  selection === "bookmark"
                    ? "bg-background text-foreground font-semibold shadow-xs"
                    : "hover:text-foreground"
                )}
              >
                <Bookmark className="h-3 w-3" />
                <span>Bookmark</span>
              </button>
            </div>

            {/* Arah Urutan Toggle (Icon-only asc/desc) */}
            {selection !== "bookmark" && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                className="h-9 w-9 shrink-0 rounded-xl border-border hover:bg-muted text-foreground cursor-pointer"
                title={
                  selection === "az"
                    ? sortOrder === "asc"
                      ? "Sedang A ke Z (Klik untuk ubah ke Z ke A)"
                      : "Sedang Z ke A (Klik untuk ubah ke A ke Z)"
                    : sortOrder === "desc"
                    ? "Urutan Menurun (Tertinggi / Terbaru)"
                    : "Urutan Menaik (Terendah / Terlama)"
                }
              >
                {sortOrder === "desc" ? (
                  <ArrowDown className="h-4 w-4 text-sky-600" />
                ) : (
                  <ArrowUp className="h-4 w-4 text-sky-600" />
                )}
              </Button>
            )}
          </div>

        </div>

        {/* MAIN 2-COLUMN LAYOUT: COLLAPSIBLE SIDEBAR + CATALOGUE */}
        <div className="flex flex-col lg:flex-row gap-6 items-stretch">
          
          {/* DESKTOP COLLAPSIBLE SIDEBAR (Tinggi Menyesuaikan Kolom Buku, Aliran Normal Tanpa Fixed Scroll) */}
          {isSidebarOpen && (
            <aside className="hidden lg:flex flex-col justify-between w-64 xl:w-72 shrink-0 self-stretch rounded-2xl border border-border/90 bg-card p-4 shadow-2xs">
              {renderFilterSidebarContent(false)}
            </aside>
          )}

          {/* MAIN CATALOGUE CONTENT AREA */}
          <div className="flex-1 min-w-0 w-full">
            
            {/* SKELETON PLACEHOLDER LOADING STATE */}
            {isApplyingFilter || isCatalogLoading ? (
              viewMode === "grid" ? (
                <div
                  className={cn(
                    "animate-fade-in grid gap-3 sm:gap-4 md:gap-5 xl:gap-6",
                    isSidebarOpen
                      ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4"
                      : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
                  )}
                >
                  {Array.from({ length: 8 }).map((_, i) => (
                    <BookCardSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <div className="animate-fade-in space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <BookListSkeleton key={i} />
                  ))}
                </div>
              )
            ) : (
              <>
                {/* BUKU KOSONG / NOT FOUND */}
                {paginatedBooks.length === 0 && (
                  <div className="py-16 text-center rounded-2xl border border-dashed border-border bg-muted/20">
                    <BookOpen className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                    <h3 className="font-heading text-base font-bold text-foreground">
                      Tidak Ada Buku yang Sesuai
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      Coba sesuaikan kata kunci pencarian, rentang tahun terbit, atau reset filter untuk melihat katalog lengkap.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetAllFilters}
                      className="mt-4 text-xs"
                    >
                      Reset Semua Filter
                    </Button>
                  </div>
                )}

                {/* TAMPILAN GRID */}
                {viewMode === "grid" && paginatedBooks.length > 0 && (
                  <div
                    key={`grid-${currentPage}-${selection}-${sortOrder}-${filterCategory}`}
                    className={cn(
                      "animate-fade-in grid gap-3 sm:gap-4 md:gap-5 xl:gap-6",
                      isSidebarOpen
                        ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4"
                        : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
                    )}
                  >
                    {paginatedBooks.map((book) => {
                      const isBookmarked = bookmarkedIds.includes(book.id)
                      const isAvailable = book.status === "aktif"

                      return (
                        <div
                          key={book.id}
                          className="group relative flex flex-col justify-between rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-2.5 sm:p-3 shadow-2xs hover:shadow-lg hover:border-sky-300 dark:hover:border-sky-700 transition-all duration-300"
                        >
                          <div className="relative aspect-3/4 w-full overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-900 mb-2.5 sm:mb-3 shadow-inner group-hover:shadow-lg transition-shadow">
                            <Link
                              href={`/buku/${book.slug}`}
                              onClick={() => saveRecentlyViewed(book)}
                              className="block h-full w-full"
                            >
                              <Skeleton className="absolute inset-0" />
                              <img
                                src={book.coverUrl}
                                alt={book.title}
                                loading="lazy"
                                className="relative z-1 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />

                              {/* 3D Realistic Book Spine Effect */}
                              <div className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/35 via-black/10 to-transparent z-10" />
                              <div className="pointer-events-none absolute inset-y-0 left-1 w-[1px] bg-white/25 z-10" />
                              <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-black/10 dark:ring-white/10 z-10" />

                              {/* Hanging Ribbon Bookmark when bookmarked */}
                              {isBookmarked && (
                                <div className="absolute -top-1 right-9 sm:right-11 z-20 pointer-events-none drop-shadow-sm animate-fade-in">
                                  <div className="h-5 sm:h-6 w-2.5 sm:w-3 bg-rose-600 rounded-b-xs shadow-xs relative">
                                    <div className="absolute -bottom-1 left-0 border-l-[5px] sm:border-l-[6px] border-l-transparent border-r-[5px] sm:border-r-[6px] border-r-transparent border-t-[3px] sm:border-t-[4px] border-t-rose-600" />
                                  </div>
                                </div>
                              )}

                              {/* 🌐 ID/EN badge & Akses Instan */}
                              <div className="absolute top-2 left-2 z-10 flex items-center gap-1 flex-wrap">
                                <div className="flex items-center gap-1 rounded-md bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xs px-1 sm:px-1.5 py-0.5 shadow-xs text-[9px] sm:text-[10px] font-bold text-sky-600">
                                  <span className="text-[10px] sm:text-[11px]">🌐</span>
                                  <span>{book.language.toLowerCase().includes("inggris") || book.language.toLowerCase().includes("eng") ? "EN" : "ID"}</span>
                                </div>
                                {isAvailable ? (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600/95 backdrop-blur-xs text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 shadow-xs">
                                    <span className="h-1 w-1 rounded-full bg-white" />
                                    Akses Instan
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-600/95 backdrop-blur-xs text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 shadow-xs">
                                    Sedang Revisi
                                  </span>
                                )}
                              </div>
                            </Link>

                            {/* Heart / Bookmark Button (Outside Link to avoid nested button in a) */}
                            <button
                              type="button"
                              onClick={(e) => toggleBookmark(book.id, e)}
                              className={cn(
                                "absolute top-2 right-2 z-20 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-white dark:bg-neutral-900 shadow-md transition-transform active:scale-90 cursor-pointer",
                                isBookmarked ? "text-sky-600" : "text-neutral-400 hover:text-neutral-700"
                              )}
                              title={isBookmarked ? "Hapus Simpanan" : "Simpan Buku"}
                            >
                              <Bookmark className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5", isBookmarked && "fill-sky-600 text-sky-600")} />
                            </button>
                          </div>

                          {/* Book Metadata */}
                          <div className="flex flex-col flex-1 justify-between min-w-0 pt-0.5">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-muted-foreground font-medium gap-1 min-w-0">
                                <span className="shrink-0 font-medium text-foreground/80">{book.loanCount || 0} dibaca</span>
                                {(book.reviewCount || 0) > 0 ? (
                                  <div className="flex items-center gap-1 text-amber-500 font-semibold shrink-0">
                                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                    <span>{book.averageRating.toFixed(1)}</span>
                                  </div>
                                ) : (
                                  <span className="text-[9.5px] sm:text-[10px] text-muted-foreground/70 italic shrink-0 whitespace-nowrap">
                                    Belum ada ulasan
                                  </span>
                                )}
                              </div>

                              <span
                                className="block text-xs text-neutral-600 dark:text-neutral-400 font-medium truncate"
                                title={book.authorName}
                              >
                                {book.authorName}
                              </span>

                              <Link
                                href={`/buku/${book.slug}`}
                                onClick={() => saveRecentlyViewed(book)}
                                className="block"
                              >
                                <h3
                                  className="font-heading text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 line-clamp-2 leading-snug hover:text-sky-600 transition-colors min-h-[2rem] sm:min-h-[2.25rem]"
                                  title={book.title}
                                >
                                  {book.title}
                                </h3>
                              </Link>
                            </div>

                            <div className="pt-2 mt-2 border-t border-border/60 flex items-center justify-between gap-1.5 text-[9.5px] sm:text-[10px] text-muted-foreground min-w-0">
                              <span
                                className="font-semibold text-sky-600 dark:text-sky-400 truncate flex-1 min-w-0"
                                title={book.categoryName}
                              >
                                {book.categoryName}
                              </span>
                              <span className="shrink-0 whitespace-nowrap text-right font-medium">
                                {book.publishYear} &bull; {book.pageCount} hlm
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* TAMPILAN LIST */}
                {viewMode === "list" && paginatedBooks.length > 0 && (
                  <div
                    key={`list-${currentPage}-${selection}-${sortOrder}-${filterCategory}`}
                    className="animate-fade-in space-y-3"
                  >
                    {paginatedBooks.map((book) => {
                      const isBookmarked = bookmarkedIds.includes(book.id)
                      const isAvailable = book.status === "aktif"

                      return (
                        <div
                          key={book.id}
                          className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-3.5 rounded-2xl border border-border/80 bg-card hover:border-sky-300 dark:hover:border-sky-700 shadow-2xs hover:shadow-md transition-all"
                        >
                          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                            <Link
                              href={`/buku/${book.slug}`}
                              onClick={() => saveRecentlyViewed(book)}
                              className="relative shrink-0 overflow-hidden rounded-lg shadow-xs group-hover:shadow-md"
                            >
                              <Skeleton className="absolute inset-0" />
                              <img
                                src={book.coverUrl}
                                alt={book.title}
                                loading="lazy"
                                className="relative z-1 h-16 w-12 sm:h-20 sm:w-14 rounded-lg object-cover ring-1 ring-border group-hover:scale-105 transition-transform"
                              />
                              <div className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/35 to-transparent z-10" />
                              <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-inset ring-black/10 dark:ring-white/10 z-10" />
                            </Link>

                            <div className="flex flex-col min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1.5 py-0 h-4 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300">
                                  {book.categoryName}
                                </Badge>
                                <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1.5 py-0 h-4 border-border text-muted-foreground gap-1">
                                  <Globe className="h-2.5 w-2.5" />
                                  {book.language.toLowerCase().includes("inggris") || book.language.toLowerCase().includes("eng") ? "EN" : "ID"}
                                </Badge>
                                {isAvailable ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    Akses Instan
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                    Sedang Revisi File
                                  </span>
                                )}
                              </div>

                              <Link
                                href={`/buku/${book.slug}`}
                                onClick={() => saveRecentlyViewed(book)}
                              >
                                <h3 className="font-heading text-xs sm:text-base font-bold text-foreground group-hover:text-sky-600 transition-colors line-clamp-1">
                                  {book.title}
                                </h3>
                              </Link>

                              <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-muted-foreground mt-1 flex-wrap">
                                <span>Penulis: <strong className="text-foreground">{book.authorName}</strong></span>
                                <span>&bull;</span>
                                <span>Tahun: {book.publishYear}</span>
                                <span>&bull;</span>
                                <span>{book.pageCount} Halaman</span>
                                <span>&bull;</span>
                                <span className="font-medium text-foreground/80">{book.loanCount || 0} dibaca</span>
                                <span>&bull;</span>
                                {(book.reviewCount || 0) > 0 ? (
                                  <span className="flex items-center gap-1 text-amber-500 font-semibold">
                                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                                    <span>{book.averageRating.toFixed(1)} ({book.reviewCount})</span>
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/75 italic">
                                    Belum ada ulasan
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <button
                              type="button"
                              onClick={(e) => toggleBookmark(book.id, e)}
                              className={cn(
                                "p-2 rounded-xl border border-border hover:bg-muted transition-colors cursor-pointer",
                                isBookmarked && "text-sky-600 border-sky-300 bg-sky-50 dark:bg-sky-950/40"
                              )}
                              title={isBookmarked ? "Hapus Bookmark" : "Simpan Bookmark"}
                            >
                              <Bookmark className={cn("h-4 w-4", isBookmarked && "fill-sky-600")} />
                            </button>
                            <Link
                              href={`/buku/${book.slug}`}
                              onClick={() => saveRecentlyViewed(book)}
                            >
                              <Button size="sm" className="h-8 sm:h-9 px-3 sm:px-4 rounded-xl text-xs font-semibold cursor-pointer">
                                Detail Buku
                              </Button>
                            </Link>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {/* PAGINATION */}
            {filteredAndSortedBooks.length > ITEMS_PER_PAGE && (
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border">
                <div className="text-xs text-muted-foreground order-2 sm:order-1">
                  Menampilkan <span className="font-medium text-foreground">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> -{" "}
                  <span className="font-medium text-foreground">
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedBooks.length)}
                  </span>{" "}
                  dari <span className="font-medium text-foreground">{filteredAndSortedBooks.length}</span> buku
                </div>

                <div className="flex items-center gap-1 order-1 sm:order-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="h-8 gap-1 text-xs cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Sebelumnya</span>
                  </Button>

                  <div className="flex items-center gap-1 mx-1 overflow-x-auto no-scrollbar max-w-[180px] sm:max-w-none">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "ghost"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className={cn(
                          "h-8 w-8 text-xs p-0 font-medium cursor-pointer shrink-0",
                          currentPage === page && "bg-sky-600 text-white font-bold"
                        )}
                      >
                        {page}
                      </Button>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8 gap-1 text-xs cursor-pointer"
                  >
                    <span className="hidden sm:inline">Selanjutnya</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* MOBILE FILTER SHEET DRAWER */}
      <Sheet open={isMobileDrawerOpen} onOpenChange={setIsMobileDrawerOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-[310px] sm:w-[360px] p-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Filter Katalog Buku</SheetTitle>
          </SheetHeader>
          {renderFilterSidebarContent(true)}
        </SheetContent>
      </Sheet>

      {/* GUEST ACCESS RESTRICTION MODAL */}
      <GuestModal
        open={isGuestModalOpen}
        onOpenChange={setIsGuestModalOpen}
        actionType={guestActionType}
      />
    </section>
  )
}

