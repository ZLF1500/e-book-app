"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import {
  Search,
  Bookmark,
  User as UserIcon,
  X,
  History,
  Tag as TagIcon,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Layers,
  ArrowRight,
  LogOut,
  Sparkles,
  Shield,
  Menu,
  Heart,
  Globe,
  Award,
  Flame,
  Clock,
  Check,
  Home,
  MessageSquare,
  FileText,
  HelpCircle,
  Crown,
} from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/lib/auth-context"
import { NotificationPopover } from "@/components/header/notification-popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DigitalMemberCardDialog } from "@/components/member/digital-member-card"
import { AccountBiodataDialog } from "@/components/member/account-biodata-dialog"
import { WebsiteFeedbackDialog } from "@/components/member/website-feedback-dialog"
import { TermsDialog } from "@/components/member/terms-dialog"
import { HelpDialog } from "@/components/member/help-dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import type {
  BookItem,
  TagItem,
} from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { saveRecentlyViewed } from "@/lib/recently-viewed"

const LOCAL_STORAGE_HISTORY_KEY = "rsjd_search_history_v1"
const LOCAL_STORAGE_BOOKMARK_KEY = "rsjd_bookmarks_v1"

// Quick keywords displayed under search bar (like Zahran / Gramedia reference)
const HEADER_KEYWORDS = [
  { label: "Kecemasan", query: "kecemasan" },
  { label: "Mindfulness", query: "mindfulness" },
  { label: "Pola Asuh", query: "parenting" },
  { label: "Depresi", query: "depresi" },
  { label: "Tidur Nyenyak", query: "tidur" },
  { label: "Psikosomatis", query: "psikosomatis" },
]

export function SiteHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const isKatalogActive = pathname === "/buku" || pathname.startsWith("/buku/")
  const isPinjamanActive = pathname === "/pinjaman" || pathname.startsWith("/pinjaman/")
  const { user, isGuest, logout } = useAuth()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isSearching, setIsSearching] = React.useState(false)
  const [isSearchOpen, setIsSearchOpen] = React.useState(false)
  const [isMegaMenuOpen, setIsMegaMenuOpen] = React.useState(false)
  const [megaMenuTab, setMegaMenuTab] = React.useState<"ebook" | "kurasi">("ebook")
  const [showAllTags, setShowAllTags] = React.useState(false)
  const [searchHistory, setSearchHistory] = React.useState<string[]>([])
  const [bookmarkCount, setBookmarkCount] = React.useState<number>(0)
  const [activeLoansCount, setActiveLoansCount] = React.useState<number>(0)
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [isKtaModalOpen, setIsKtaModalOpen] = React.useState(false)
  const [isAccountModalOpen, setIsAccountModalOpen] = React.useState(false)
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = React.useState(false)
  const [isTermsModalOpen, setIsTermsModalOpen] = React.useState(false)
  const [isHelpModalOpen, setIsHelpModalOpen] = React.useState(false)
  const [isUserDropdownOpen, setIsUserDropdownOpen] = React.useState(false)

  const searchContainerRef = React.useRef<HTMLDivElement>(null)
  const searchInputRef = React.useRef<HTMLInputElement>(null)
  const mobileSearchContainerRef = React.useRef<HTMLDivElement>(null)
  const mobileSearchInputRef = React.useRef<HTMLInputElement>(null)
  const megaMenuRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (searchQuery.trim()) {
      setIsSearching(true)
      const timer = setTimeout(() => setIsSearching(false), 200)
      return () => clearTimeout(timer)
    } else {
      setIsSearching(false)
    }
  }, [searchQuery])

  // Load search history and bookmark count from localStorage on mount & listen to real-time events
  React.useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY)
      if (savedHistory) {
        setSearchHistory(JSON.parse(savedHistory))
      } else {
        const defaultHistory = ["kecemasan", "mindfulness", "pola asuh anak"]
        setSearchHistory(defaultHistory)
        localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(defaultHistory))
      }
    } catch {}

    // Sinkronisasi riwayat pencarian dari database MariaDB
    fetch("/api/search-history")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.history) && d.history.length > 0) {
          setSearchHistory((prev) => Array.from(new Set([...d.history, ...prev])))
        }
      })
      .catch(() => {})

    const syncBookmarkCount = () => {
      try {
        const savedBookmarks = localStorage.getItem(LOCAL_STORAGE_BOOKMARK_KEY)
        if (savedBookmarks) {
          setBookmarkCount(JSON.parse(savedBookmarks).length)
        } else {
          setBookmarkCount(0)
        }
      } catch {
        setBookmarkCount(0)
      }
    }

    const syncActiveLoansCount = () => {
      const now = Date.now()
      try {
        const saved = localStorage.getItem("rsjd_user_loans_v1")
        if (saved) {
          const list = JSON.parse(saved)
          if (Array.isArray(list)) {
            const count = list.filter(
              (l: any) =>
                (l.status === "aktif" || !l.status) &&
                new Date(l.dueAt).getTime() > now
            ).length
            setActiveLoansCount(count)
          }
        }
      } catch {}

      fetch("/api/loans")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.loans)) {
            const count = data.loans.filter(
              (l: any) =>
                l.status === "aktif" && new Date(l.dueAt).getTime() > now
            ).length
            setActiveLoansCount(count)
          }
        })
        .catch(() => {})
    }

    syncBookmarkCount()
    syncActiveLoansCount()

    window.addEventListener("bookmarks-updated", syncBookmarkCount)
    window.addEventListener("loans-updated", syncActiveLoansCount)
    window.addEventListener("storage", syncBookmarkCount)
    window.addEventListener("storage", syncActiveLoansCount)

    return () => {
      window.removeEventListener("bookmarks-updated", syncBookmarkCount)
      window.removeEventListener("loans-updated", syncActiveLoansCount)
      window.removeEventListener("storage", syncBookmarkCount)
      window.removeEventListener("storage", syncActiveLoansCount)
    }
  }, [])

  // Close search & mega menu dropdowns on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const isInsideDesktop = searchContainerRef.current?.contains(event.target as Node)
      const isInsideMobile = mobileSearchContainerRef.current?.contains(event.target as Node)
      if (!isInsideDesktop && !isInsideMobile) {
        setIsSearchOpen(false)
      }
      if (
        megaMenuRef.current &&
        !megaMenuRef.current.contains(event.target as Node)
      ) {
        setIsMegaMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Keyboard shortcut: "/" or "Ctrl+K" to focus search
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        (event.key === "/" || (event.ctrlKey && event.key === "k")) &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        event.preventDefault()
        const targetInput =
          typeof window !== "undefined" && window.innerWidth < 768
            ? mobileSearchInputRef.current
            : searchInputRef.current
        targetInput?.focus()
        setIsSearchOpen(true)
      } else if (event.key === "Escape") {
        setIsSearchOpen(false)
        setIsMegaMenuOpen(false)
        searchInputRef.current?.blur()
        mobileSearchInputRef.current?.blur()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const handleSaveSearch = (query: string) => {
    const trimmed = query.trim()
    if (!trimmed) return
    const updated = [
      trimmed,
      ...searchHistory.filter((item) => item.toLowerCase() !== trimmed.toLowerCase()),
    ].slice(0, 10)
    setSearchHistory(updated)
    try {
      localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(updated))
    } catch {}

    // Simpan ke tabel search_history MariaDB
    fetch("/api/search-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: trimmed }),
    }).catch(() => {})
  }

  const handleRemoveHistoryItem = (itemToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = searchHistory.filter((item) => item !== itemToRemove)
    setSearchHistory(updated)
    try {
      localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(updated))
    } catch {}

    // Hapus dari database MariaDB
    fetch(`/api/search-history?query=${encodeURIComponent(itemToRemove)}`, {
      method: "DELETE",
    }).catch(() => {})
  }

  const handleClearAllHistory = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSearchHistory([])
    try {
      localStorage.removeItem(LOCAL_STORAGE_HISTORY_KEY)
    } catch {}

    // Bersihkan semua riwayat dari database MariaDB
    fetch("/api/search-history", {
      method: "DELETE",
    }).catch(() => {})
  }

  const handleExecuteSearch = (query: string) => {
    if (!query.trim()) return
    handleSaveSearch(query)
    setIsSearchOpen(false)
    setIsMegaMenuOpen(false)
    searchInputRef.current?.blur()
    mobileSearchInputRef.current?.blur()
    router.push(`/buku?q=${encodeURIComponent(query.trim())}`)
  }

  const handleSelectTag = (tagSlug: string, tagName: string) => {
    handleSaveSearch(tagName)
    setIsSearchOpen(false)
    setIsMegaMenuOpen(false)
    searchInputRef.current?.blur()
    mobileSearchInputRef.current?.blur()
    router.push(`/buku?tag=${encodeURIComponent(tagSlug)}`)
  }

  const handleSelectAuthor = (authorName: string) => {
    handleSaveSearch(authorName)
    setIsSearchOpen(false)
    setIsMegaMenuOpen(false)
    searchInputRef.current?.blur()
    mobileSearchInputRef.current?.blur()
    router.push(`/buku?author=${encodeURIComponent(authorName)}`)
  }

  const [headerBooks, setHeaderBooks] = React.useState<BookItem[]>([])
  const [popularTags, setPopularTags] = React.useState<TagItem[]>([])

  // Dynamic real authors extracted from live MariaDB catalog
  const dynamicAuthors = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; title: string; photoUrl: string }>()
    for (const b of headerBooks) {
      if (b.authorName && !map.has(b.authorName)) {
        map.set(b.authorName, {
          id: b.authorId || b.authorName,
          name: b.authorName,
          title: "Penulis Terdaftar",
          photoUrl: b.authorPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(b.authorName)}`,
        })
      }
    }
    return Array.from(map.values())
  }, [headerBooks])

  const fetchTags = React.useCallback(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.tags) && d.tags.length > 0) {
          setPopularTags(d.tags)
        }
      })
      .catch(() => {})
  }, [])

  React.useEffect(() => {
    fetch("/api/books")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.books) && d.books.length > 0) {
          setHeaderBooks(d.books)
        }
      })
      .catch(() => {})

    fetchTags()
    window.addEventListener("tags-updated", fetchTags)
    window.addEventListener("books-updated", () => {
      fetch("/api/books")
        .then((r) => r.json())
        .then((d) => {
          if (d.success && Array.isArray(d.books) && d.books.length > 0) {
            setHeaderBooks(d.books)
          }
        })
        .catch(() => {})
      fetchTags()
    })

    return () => {
      window.removeEventListener("tags-updated", fetchTags)
    }
  }, [fetchTags])

  // Filtered lists for typing state
  const trimmedQuery = searchQuery.trim().toLowerCase()
  const isTyping = trimmedQuery.length > 0

  const filteredBooks = isTyping
    ? headerBooks.filter(
        (b) =>
          b.title.toLowerCase().includes(trimmedQuery) ||
          b.authorName.toLowerCase().includes(trimmedQuery) ||
          (Array.isArray(b.tags) && b.tags.some((t) => t.toLowerCase().includes(trimmedQuery))) ||
          (b.categoryName && b.categoryName.toLowerCase().includes(trimmedQuery))
      ).slice(0, 5)
    : []

  // Pool tag lengkap dari tabel tags dan dari buku katalog riil (menjamin tag baru seperti "isekai" selalu muncul)
  const allAvailableTags = React.useMemo(() => {
    const map = new Map<string, TagItem>()
    for (const t of popularTags) {
      map.set(t.name.toLowerCase(), t)
    }
    for (const b of headerBooks) {
      if (Array.isArray(b.tags)) {
        for (const tagName of b.tags) {
          const clean = tagName.trim()
          const key = clean.toLowerCase()
          if (clean && !map.has(key)) {
            map.set(key, {
              id: key,
              name: clean,
              slug: clean.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
              usageCount: 1,
            })
          }
        }
      }
    }
    return Array.from(map.values())
  }, [popularTags, headerBooks])

  const filteredTags = isTyping
    ? allAvailableTags.filter((t) => t.name.toLowerCase().includes(trimmedQuery) || t.slug.toLowerCase().includes(trimmedQuery)).slice(0, 12)
    : []

  const filteredAuthors = isTyping
    ? dynamicAuthors.filter((a) => a.name.toLowerCase().includes(trimmedQuery)).slice(0, 4)
    : []

  const displayTags = showAllTags ? allAvailableTags : allAvailableTags.slice(0, 25)

  const renderSearchBox = (isMobile: boolean) => {
    const containerRef = isMobile ? mobileSearchContainerRef : searchContainerRef
    const inputRef = isMobile ? mobileSearchInputRef : searchInputRef

    return (
      <div ref={containerRef} className="relative w-full">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleExecuteSearch(searchQuery)
          }}
          noValidate
          className="relative w-full"
        >
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Cari judul buku, penulis, topik..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              setIsSearchOpen(true)
              setIsMegaMenuOpen(false)
            }}
            className={cn(
              "w-full pl-10 pr-10 rounded-full bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 focus-visible:bg-white dark:focus-visible:bg-neutral-950 focus-visible:border-sky-600 focus-visible:ring-2 focus-visible:ring-sky-500/20 transition-all shadow-inner",
              isMobile ? "h-9 text-xs" : "h-10 text-xs sm:text-sm"
            )}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {isSearching && (
              <Spinner className="h-4 w-4 text-sky-500 animate-spin" />
            )}
            {searchQuery && !isSearching ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("")
                  inputRef.current?.focus()
                }}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-full"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </form>

        {/* SMART SEARCH DROPDOWN */}
        {isSearchOpen && (
          <div
            className={cn(
              "absolute top-full mt-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 shadow-2xl z-50 animate-fade-scale overflow-y-auto overscroll-contain",
              isMobile
                ? "left-0 right-0 p-3 max-h-[65vh]"
                : "left-1/2 -translate-x-1/2 w-[92vw] sm:w-[480px] md:w-[540px] max-w-[560px] p-4 max-h-[70vh]"
            )}
          >
            {/* KONDISI A: BELUM MENGETIK */}
            {!isTyping && (
              <div className="space-y-4">
                {/* 1. Riwayat Pencarian Milik User */}
                {searchHistory.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-neutral-500 px-1">
                      <span className="flex items-center gap-1.5">
                        <History className="h-3.5 w-3.5 text-sky-600" />
                        Riwayat Pencarian
                      </span>
                      <button
                        type="button"
                        onClick={handleClearAllHistory}
                        className="text-[11px] text-neutral-400 hover:text-destructive transition-colors font-medium"
                      >
                        Hapus Semua
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {searchHistory.map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setSearchQuery(item)
                            handleExecuteSearch(item)
                          }}
                          className="group flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-900 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 hover:border-sky-300 cursor-pointer transition-colors"
                        >
                          <span>{item}</span>
                          <button
                            type="button"
                            onClick={(e) => handleRemoveHistoryItem(item, e)}
                            className="text-neutral-400 hover:text-destructive rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Tags Populer */}
                <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-900">
                  <div className="flex items-center justify-between text-xs font-semibold text-neutral-500 px-1">
                    <span className="flex items-center gap-1.5">
                      <TagIcon className="h-3.5 w-3.5 text-sky-600" />
                      Tag Populer
                    </span>
                    <span className="text-[11px] text-neutral-400 font-normal">
                      {displayTags.length} tag
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {displayTags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleSelectTag(tag.slug, tag.name)}
                        className="px-2.5 py-1 rounded-md text-xs font-medium bg-neutral-100 dark:bg-neutral-900 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-neutral-700 dark:text-neutral-300 hover:text-sky-600 border border-neutral-200 dark:border-neutral-800 transition-all text-left"
                      >
                        #{tag.name}
                      </button>
                    ))}
                    {!showAllTags && popularTags.length > 25 && (
                      <button
                        type="button"
                        onClick={() => setShowAllTags(true)}
                        className="text-xs font-semibold text-sky-600 hover:text-sky-700 underline underline-offset-2 px-2 py-1"
                      >
                        Lainnya ({popularTags.length - 25}+)
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. Penulis Populer */}
                <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-900">
                  <div className="text-xs font-semibold text-neutral-500 px-1">
                    Penulis Populer
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {dynamicAuthors.slice(0, 4).map((author) => (
                      <div
                        key={author.id}
                        onClick={() => handleSelectAuthor(author.name)}
                        className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer transition-colors"
                      >
                        <img
                          src={author.photoUrl}
                          alt={author.name}
                          className="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover ring-1 ring-border shrink-0"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold text-foreground truncate">
                            {author.name}
                          </span>
                          <span className="text-[11px] text-muted-foreground truncate">
                            {author.title}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* KONDISI B: SEDANG MENGETIK */}
            {isTyping && (
              <div className="animate-fade-in space-y-4">
                {isSearching ? (
                  <div className="space-y-3 py-1 animate-fade-in">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2">
                      Mencari Koleksi...
                    </div>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-xl">
                        <Skeleton className="h-11 w-8 rounded-md shrink-0" />
                        <div className="space-y-1.5 flex-1">
                          <Skeleton className="h-3.5 w-3/4 rounded-md" />
                          <Skeleton className="h-2.5 w-1/3 rounded-md" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Saran Judul Buku */}
                    {filteredBooks.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1">
                          Buku Terkait
                        </div>
                        {filteredBooks.map((book) => (
                          <div
                            key={book.id}
                            onClick={() => {
                              saveRecentlyViewed(book)
                              setIsSearchOpen(false)
                              router.push(`/buku/${book.slug}`)
                            }}
                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-sky-50 dark:hover:bg-sky-950/40 cursor-pointer transition-colors"
                          >
                            <img
                              src={book.coverUrl}
                              alt={book.title}
                              className="h-11 w-8 rounded-md object-cover shadow-xs ring-1 ring-border/50 shrink-0"
                            />
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-xs font-semibold text-foreground truncate">
                                {book.title}
                              </span>
                              <span className="text-[11px] text-muted-foreground truncate">
                                {book.authorName} &bull; {book.categoryName}
                              </span>
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-50 shrink-0" />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Saran Tags yang Cocok */}
                    {filteredTags.length > 0 && (
                      <div className="space-y-2 pt-2 border-t">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2">
                          Tag yang Cocok
                        </div>
                        <div className="flex flex-wrap gap-1.5 px-2">
                          {filteredTags.map((tag) => (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => handleSelectTag(tag.slug, tag.name)}
                              className="px-2.5 py-1 rounded-md text-xs font-medium bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 hover:bg-sky-100 transition-colors"
                            >
                              #{tag.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Saran Penulis yang Cocok */}
                    {filteredAuthors.length > 0 && (
                      <div className="space-y-2 pt-2 border-t">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2">
                          Penulis
                        </div>
                        <div className="space-y-1">
                          {filteredAuthors.map((author) => (
                            <div
                              key={author.id}
                              onClick={() => handleSelectAuthor(author.name)}
                              className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer transition-colors"
                            >
                              <img
                                src={author.photoUrl}
                                alt={author.name}
                                className="h-8 w-8 rounded-full object-cover ring-1 ring-border"
                              />
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-semibold text-foreground truncate">
                                  {author.name}
                                </span>
                                <span className="text-[11px] text-muted-foreground truncate">
                                  {author.title}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CTA Submit Keseluruhan */}
                    <div className="pt-2 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleExecuteSearch(searchQuery)}
                        className="w-full justify-between h-9 text-xs font-medium text-sky-600 hover:text-sky-700 hover:bg-sky-50"
                      >
                        <span>Cari semua untuk &ldquo;{searchQuery}&rdquo;</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const isAuthPage =
    pathname === "/masuk" ||
    pathname === "/daftar" ||
    pathname === "/lupa-password" ||
    pathname === "/reset-password" ||
    pathname === "/verifikasi"

  const isReaderPage = pathname?.startsWith("/baca/")
  const isAdminPage = pathname === "/admin" || pathname?.startsWith("/admin/")

  if (isAuthPage || isReaderPage || isAdminPage) {
    return null
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white dark:bg-neutral-950 transition-all shadow-xs">
      {/* MAIN HEADER BAR */}
      <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between gap-2 sm:gap-4 px-3 sm:px-5 lg:px-6">
        
        {/* BRAND / LOGO + KATEGORI */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link href="/" className="group flex items-center gap-2 focus:outline-hidden mr-1">
            <div className="relative h-9 w-9 sm:h-10 sm:w-10 shrink-0 overflow-hidden rounded-xl bg-white p-0.5 ring-1 ring-border shadow-xs group-hover:scale-105 transition-transform flex items-center justify-center">
              <img
                src="/logo.png"
                alt="Logo RS Atma Husada Mahakam"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1 leading-none">
                <span className="font-heading text-base sm:text-lg font-black tracking-tight text-foreground group-hover:text-sky-600 transition-colors">
                  Perpus<span className="text-sky-600">AHM</span>
                </span>
                <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-1 py-0.5 rounded-md border border-sky-200 dark:border-sky-800 leading-none">
                  .com
                </span>
              </div>
              <span className="text-[9.5px] font-medium text-muted-foreground mt-0.5 tracking-wide truncate hidden xl:block">
                RS Atma Husada Mahakam
              </span>
            </div>
          </Link>

          {/* DROPDOWN KATEGORI TRIGGER (MEGA MENU TRIGGER) */}
          <div ref={megaMenuRef} className="relative hidden md:block">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsMegaMenuOpen(!isMegaMenuOpen)
                setIsSearchOpen(false)
              }}
              className={cn(
                "h-9 gap-1.5 px-3 text-xs sm:text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 rounded-xl",
                isMegaMenuOpen && "bg-neutral-100 dark:bg-neutral-900 text-sky-600"
              )}
            >
              <span>Kategori</span>
              {isMegaMenuOpen ? (
                <ChevronUp className="h-4 w-4 text-sky-600" />
              ) : (
                <ChevronDown className="h-4 w-4 opacity-70" />
              )}
            </Button>

            {/* MEGA MENU DROPDOWN */}
            {isMegaMenuOpen && (
              <div className="fixed left-0 right-0 top-14 sm:top-16 bg-white dark:bg-neutral-950 border-b border-border shadow-2xl z-50 animate-slide-down max-h-[calc(100vh-4rem)] overflow-y-auto">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
                  
                  {/* Left Column: Pill switch, quick links & Promo Banner */}
                  <div className="col-span-1 md:col-span-4 lg:col-span-3 space-y-4 border-b md:border-b-0 md:border-r border-border/70 pb-4 md:pb-0 md:pr-6">
                    {/* Toggle [E-Book] [Kurasi] */}
                    <div className="inline-flex rounded-full bg-neutral-100 dark:bg-neutral-900 p-1 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setMegaMenuTab("ebook")}
                        className={cn(
                          "px-4 py-1 rounded-full transition-all cursor-pointer",
                          megaMenuTab === "ebook"
                            ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xs"
                            : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                        )}
                      >
                        E-Book
                      </button>
                      <button
                        type="button"
                        onClick={() => setMegaMenuTab("kurasi")}
                        className={cn(
                          "px-4 py-1 rounded-full transition-all cursor-pointer",
                          megaMenuTab === "kurasi"
                            ? "bg-sky-600 text-white shadow-xs"
                            : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                        )}
                      >
                        Kurasi RSJD
                      </button>
                    </div>

                    {/* Quick navigation list */}
                    <div className="space-y-1 text-xs">
                      {megaMenuTab === "ebook" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setIsMegaMenuOpen(false)
                              router.push("/buku")
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-bold cursor-pointer"
                          >
                            Semua E-Book
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsMegaMenuOpen(false)
                              router.push("/buku?format=epub")
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-400 font-medium cursor-pointer"
                          >
                            Format EPUB
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsMegaMenuOpen(false)
                              router.push("/buku?format=pdf")
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-400 font-medium cursor-pointer"
                          >
                            Format PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsMegaMenuOpen(false)
                              router.push("/buku?featured=true")
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-400 font-medium cursor-pointer"
                          >
                            E-Book Pilihan Editor
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsMegaMenuOpen(false)
                              router.push("/buku?sort=populer")
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-400 font-medium cursor-pointer"
                          >
                            E-Book Terpopuler
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsMegaMenuOpen(false)
                              router.push("/buku?sort=terbaru")
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-400 font-medium cursor-pointer"
                          >
                            Koleksi Terbaru
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setIsMegaMenuOpen(false)
                              router.push("/buku?featured=true")
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-bold cursor-pointer"
                          >
                            ⭐ Rekomendasi Klinisi RSJD
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsMegaMenuOpen(false)
                              router.push("/buku?category=kesehatan-jiwa-psikiatri")
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-400 font-medium cursor-pointer"
                          >
                            Psikiatri & Pemulihan Jiwa
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsMegaMenuOpen(false)
                              router.push("/buku?tag=terapi-kognitif")
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-400 font-medium cursor-pointer"
                          >
                            Biblioterapi & CBT
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsMegaMenuOpen(false)
                              router.push("/buku?tag=stres")
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-400 font-medium cursor-pointer"
                          >
                            Regulasi Emosi & Stres
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsMegaMenuOpen(false)
                              router.push("/buku?tag=keluarga-tangguh")
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-400 font-medium cursor-pointer"
                          >
                            Dukungan Keluarga & Caregiver
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsMegaMenuOpen(false)
                              router.push("/buku?category=pengembangan-diri-mindfulness")
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-400 font-medium cursor-pointer"
                          >
                            Mindfulness & Relaksasi
                          </button>
                        </>
                      )}
                    </div>

                    {/* Promotion banner card */}
                    <div className={cn(
                      "p-4 rounded-2xl text-white space-y-2 shadow-md transition-all",
                      megaMenuTab === "kurasi"
                        ? "bg-gradient-to-br from-emerald-600 to-teal-700"
                        : "bg-gradient-to-br from-sky-600 to-sky-700"
                    )}>
                      <span className="text-[11px] font-semibold text-white/90">
                        {megaMenuTab === "kurasi" ? "Kurasi Medis RSJD" : "Jelajahi Semua"}
                      </span>
                      <h4 className="font-heading text-sm sm:text-base font-bold leading-snug">
                        {megaMenuTab === "kurasi"
                          ? "Pilihan Dokter & Psikiater"
                          : `${headerBooks.length > 0 ? `${headerBooks.length}+` : "Koleksi"} Buku Digital`}
                      </h4>
                      <Link
                        href={megaMenuTab === "kurasi" ? "/buku?featured=true" : "/buku"}
                        onClick={() => setIsMegaMenuOpen(false)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-white hover:underline pt-1"
                      >
                        <span>{megaMenuTab === "kurasi" ? "Buka Rekomendasi" : "Buka Direktori"}</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>

                  {/* Right Columns: category grid with sub-items */}
                  <div className="col-span-1 md:col-span-8 lg:col-span-9 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 max-h-[70vh] overflow-y-auto pr-2">
                    {/* Group 1: Kesehatan Mental & Psikiatri */}
                    <div className="space-y-4">
                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsMegaMenuOpen(false)
                            router.push("/buku?category=kesehatan-jiwa-psikiatri")
                          }}
                          className="font-heading text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider mb-2 hover:text-sky-600 transition-colors text-left flex items-center gap-1 group cursor-pointer"
                        >
                          <span>Kesehatan Jiwa & Psikiatri</span>
                          <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-sky-600" />
                        </button>
                        <ul className="space-y-1 text-xs text-neutral-600 dark:text-neutral-400">
                          <li>
                            <button
                              type="button"
                              onClick={() => {
                                setIsMegaMenuOpen(false)
                                router.push("/buku?tag=kesehatan-jiwa")
                              }}
                              className="hover:text-sky-600 text-left"
                            >
                              Gangguan Mood & Ansietas
                            </button>
                          </li>
                          <li>
                            <button
                              type="button"
                              onClick={() => {
                                setIsMegaMenuOpen(false)
                                router.push("/buku?tag=skizofrenia")
                              }}
                              className="hover:text-sky-600 text-left"
                            >
                              Skizofrenia & Psikotik
                            </button>
                          </li>
                          <li>
                            <button
                              type="button"
                              onClick={() => {
                                setIsMegaMenuOpen(false)
                                router.push("/buku?tag=bipolar")
                              }}
                              className="hover:text-sky-600 text-left"
                            >
                              Gangguan Afektif Bipolar
                            </button>
                          </li>
                          <li>
                            <button
                              type="button"
                              onClick={() => {
                                setIsMegaMenuOpen(false)
                                router.push("/buku?tag=psikosomatis")
                              }}
                              className="hover:text-sky-600 text-left"
                            >
                              Keluhan Psikosomatis
                            </button>
                          </li>
                        </ul>
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsMegaMenuOpen(false)
                            router.push("/buku?category=manajemen-stres-burnout")
                          }}
                          className="font-heading text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider mb-2 hover:text-sky-600 transition-colors text-left flex items-center gap-1 group cursor-pointer"
                        >
                          <span>Manajemen Stres & Burnout</span>
                          <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-sky-600" />
                        </button>
                        <ul className="space-y-1 text-xs text-neutral-600 dark:text-neutral-400">
                          <li>
                            <button
                              type="button"
                              onClick={() => {
                                setIsMegaMenuOpen(false)
                                router.push("/buku?tag=burnout")
                              }}
                              className="hover:text-sky-600 text-left"
                            >
                              Burnout Tenaga Medis & Pekerja
                            </button>
                          </li>
                          <li>
                            <button
                              type="button"
                              onClick={() => {
                                setIsMegaMenuOpen(false)
                                router.push("/buku?tag=tidur-berkualitas")
                              }}
                              className="hover:text-sky-600 text-left"
                            >
                              Terapi Insomnia & Irama Sirkadian
                            </button>
                          </li>
                          <li>
                            <button
                              type="button"
                              onClick={() => {
                                setIsMegaMenuOpen(false)
                                router.push("/buku?tag=relaksasi")
                              }}
                              className="hover:text-sky-600 text-left"
                            >
                              Teknik Relaksasi Pernapasan
                            </button>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Group 2: Psikologi & Pengembangan Diri */}
                    <div className="space-y-4">
                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsMegaMenuOpen(false)
                            router.push("/buku?category=pengembangan-diri-mindfulness")
                          }}
                          className="font-heading text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider mb-2 hover:text-sky-600 transition-colors text-left flex items-center gap-1 group cursor-pointer"
                        >
                          <span>Pengembangan Diri & Mindfulness</span>
                          <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-sky-600" />
                        </button>
                        <ul className="space-y-1 text-xs text-neutral-600 dark:text-neutral-400">
                          <li>
                            <button
                              type="button"
                              onClick={() => {
                                setIsMegaMenuOpen(false)
                                router.push("/buku?tag=mindfulness")
                              }}
                              className="hover:text-sky-600 text-left"
                            >
                              Meditasi & Kesadaran Penuh
                            </button>
                          </li>
                          <li>
                            <button
                              type="button"
                              onClick={() => {
                                setIsMegaMenuOpen(false)
                                router.push("/buku?tag=self-help")
                              }}
                              className="hover:text-sky-600 text-left"
                            >
                              Stoikisme & Ketenangan Batin
                            </button>
                          </li>
                          <li>
                            <button
                              type="button"
                              onClick={() => {
                                setIsMegaMenuOpen(false)
                                router.push("/buku?tag=resiliensi")
                              }}
                              className="hover:text-sky-600 text-left"
                            >
                              Resiliensi & Manajemen Emosi
                            </button>
                          </li>
                          <li>
                            <button
                              type="button"
                              onClick={() => {
                                setIsMegaMenuOpen(false)
                                router.push("/buku?tag=terapi-kognitif")
                              }}
                              className="hover:text-sky-600 text-left"
                            >
                              Terapi Kognitif Perilaku (CBT)
                            </button>
                          </li>
                        </ul>
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsMegaMenuOpen(false)
                            router.push("/buku?category=psikologi-konseling")
                          }}
                          className="font-heading text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider mb-2 hover:text-sky-600 transition-colors text-left flex items-center gap-1 group cursor-pointer"
                        >
                          <span>Pertolongan Pertama Psikologis</span>
                          <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-sky-600" />
                        </button>
                        <ul className="space-y-1 text-xs text-neutral-600 dark:text-neutral-400">
                          <li>
                            <button
                              type="button"
                              onClick={() => {
                                setIsMegaMenuOpen(false)
                                router.push("/buku?tag=pertolongan-pertama")
                              }}
                              className="hover:text-sky-600 text-left"
                            >
                              Psychological First Aid (PFA)
                            </button>
                          </li>
                          <li>
                            <button
                              type="button"
                              onClick={() => {
                                setIsMegaMenuOpen(false)
                                router.push("/buku?tag=trauma-healing")
                              }}
                              className="hover:text-sky-600 text-left"
                            >
                              Intervensi Pascatrauma Bencana
                            </button>
                          </li>
                          <li>
                            <button
                              type="button"
                              onClick={() => {
                                setIsMegaMenuOpen(false)
                                router.push("/buku?tag=komunikasi-terapeutik")
                              }}
                              className="hover:text-sky-600 text-left"
                            >
                              Komunikasi Pasien Agitasi
                            </button>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Group 3: Parenting, Gizi & Geriatri */}
                    <div className="space-y-4">
                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsMegaMenuOpen(false)
                            router.push("/buku?category=parenting-perkembangan-anak")
                          }}
                          className="font-heading text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider mb-2 hover:text-sky-600 transition-colors text-left flex items-center gap-1 group cursor-pointer"
                        >
                          <span>Parenting & Perkembangan Anak</span>
                          <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-sky-600" />
                        </button>
                        <ul className="space-y-1 text-xs text-neutral-600 dark:text-neutral-400">
                          <li>
                            <button
                              type="button"
                              onClick={() => {
                                setIsMegaMenuOpen(false)
                                router.push("/buku?tag=parenting")
                              }}
                              className="hover:text-sky-600 text-left"
                            >
                              Pola Asuh Tanpa Teriak
                            </button>
                          </li>
                          <li>
                            <button
                              type="button"
                              onClick={() => {
                                setIsMegaMenuOpen(false)
                                router.push("/buku?tag=autisme")
                              }}
                              className="hover:text-sky-600 text-left"
                            >
                              Deteksi Dini Spektrum Autisme
                            </button>
                          </li>
                          <li>
                            <button
                              type="button"
                              onClick={() => {
                                setIsMegaMenuOpen(false)
                                router.push("/buku?tag=adhd")
                              }}
                              className="hover:text-sky-600 text-left"
                            >
                              Pendampingan Remaja ADHD
                            </button>
                          </li>
                        </ul>
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsMegaMenuOpen(false)
                            router.push("/buku?category=gizi-kesehatan-fisik")
                          }}
                          className="font-heading text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider mb-2 hover:text-sky-600 transition-colors text-left flex items-center gap-1 group cursor-pointer"
                        >
                          <span>Gizi & Kesehatan Fisik</span>
                          <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-sky-600" />
                        </button>
                        <ul className="space-y-1 text-xs text-neutral-600 dark:text-neutral-400">
                          <li>
                            <button
                              type="button"
                              onClick={() => {
                                setIsMegaMenuOpen(false)
                                router.push("/buku?tag=gizi")
                              }}
                              className="hover:text-sky-600 text-left"
                            >
                              Gut-Brain Axis & Mikrobioma
                            </button>
                          </li>
                          <li>
                            <button
                              type="button"
                              onClick={() => {
                                setIsMegaMenuOpen(false)
                                router.push("/buku?tag=lansia")
                              }}
                              className="hover:text-sky-600 text-left"
                            >
                              Pendampingan Demensia Lansia
                            </button>
                          </li>
                        </ul>
                      </div>
                    </div>

                  </div>

                </div>
              </div>
            )}
            </div>
        </div>

        {/* DESKTOP SMART SEARCH BAR (LUAS, SIMETRIS & PANJANG DI TENGAH) */}
        <div className="hidden md:flex flex-1 max-w-2xl lg:max-w-3xl mx-3 lg:mx-4 justify-center">
          {renderSearchBox(false)}
        </div>

        {/* RIGHT ACTIONS: KATALOG, PINJAMAN, BOOKMARK, PROFILE */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* 1. Akses Katalog (Di sebelah kiri Pinjaman, dengan Indikator :active) */}
          <Link
            href="/buku"
            className={cn(
              "h-9 w-9 sm:w-auto px-0 sm:px-3 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0",
              isKatalogActive
                ? "bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 font-bold border border-sky-200/80 dark:border-sky-800/80 shadow-xs"
                : "text-neutral-700 dark:text-neutral-300 hover:text-sky-600 hover:bg-neutral-100 dark:hover:bg-neutral-900 border border-transparent"
            )}
            title="Katalog Buku Digital"
          >
            <BookOpen className={cn("h-4 w-4 shrink-0", isKatalogActive ? "text-sky-600" : "text-neutral-500")} />
            <span className="hidden lg:inline">Katalog</span>
          </Link>

          {/* 2. Akses Pinjaman Saya (Dengan Indikator :active & Ping Jumlah Pinjaman Aktif) */}
          <Link
            href="/pinjaman"
            className={cn(
              "relative h-9 w-9 sm:w-auto px-0 sm:px-2.5 lg:px-3 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0",
              isPinjamanActive
                ? "bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 font-bold border border-sky-200/80 dark:border-sky-800/80 shadow-xs"
                : "text-neutral-700 dark:text-neutral-300 hover:text-sky-600 hover:bg-neutral-100 dark:hover:bg-neutral-900 border border-transparent"
            )}
            title={activeLoansCount > 0 ? `${activeLoansCount} Buku Sedang Dipinjam Aktif` : "Daftar Pinjaman Saya"}
          >
            <Layers className={cn("h-4 w-4 shrink-0", isPinjamanActive ? "text-sky-600" : "text-neutral-500")} />
            <span className="hidden lg:inline">Pinjaman</span>

            {/* Ping Radar & Active Loan Counter Badge */}
            {activeLoansCount > 0 && (
              <>
                {/* Mobile & Tablet absolute badge indicator */}
                <span className="lg:hidden absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-sky-600 text-[10px] font-bold text-white shadow-xs">
                  <span className="animate-ping absolute -inset-0.5 rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative z-10">{activeLoansCount}</span>
                </span>

                {/* Desktop large inline badge with radar ping */}
                <span className="hidden lg:inline-flex items-center gap-1.5 ml-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                  </span>
                  <span className="flex h-4 min-w-4 px-1.5 items-center justify-center rounded-full bg-sky-600 dark:bg-sky-500 text-[10px] font-bold text-white shadow-xs">
                    {activeLoansCount}
                  </span>
                </span>
              </>
            )}
          </Link>
          {!user ? (
            <div className="flex items-center gap-1 sm:gap-1.5">
              <Link href="/masuk">
                <Button variant="ghost" size="sm" className="h-8 sm:h-9 px-2 sm:px-3 text-xs font-semibold text-foreground hover:text-sky-600">
                  Masuk
                </Button>
              </Link>
              <Link href="/daftar">
                <Button size="sm" className="h-8 sm:h-9 px-2.5 sm:px-3.5 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-xs">
                  Daftar
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Notifikasi Pengguna */}
              <NotificationPopover />

              {/* Profile Menu Dropdown (Gramedia Aesthetic with RSJD PerpusAHM Features) */}
              <DropdownMenu open={isUserDropdownOpen} onOpenChange={setIsUserDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1 sm:gap-1.5 h-9 sm:h-10 px-1 sm:px-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all cursor-pointer ring-1 ring-border/80"
                  >
                    <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                      <AvatarImage
                        src={user?.avatarUrl || undefined}
                        alt={user?.name || "Foto Profil"}
                        referrerPolicy="no-referrer"
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-sky-600 text-white font-bold text-xs">
                        {user?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="h-3.5 w-3.5 text-neutral-500 hidden sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 sm:w-80 p-2 shadow-2xl rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 animate-fade-scale">
                  {/* User Profile Header */}
                  <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-900/70 rounded-2xl mb-1">
                    <Avatar className={cn(
                      "h-11 w-11 shrink-0 ring-2",
                      user?.role === "super_admin"
                        ? "ring-amber-500 shadow-sm shadow-amber-500/20"
                        : user?.role === "admin"
                        ? "ring-indigo-500/50"
                        : "ring-sky-500/20"
                    )}>
                      <AvatarImage
                        src={user?.avatarUrl || undefined}
                        alt={user?.name || "Foto Profil"}
                        referrerPolicy="no-referrer"
                        className="object-cover"
                      />
                      <AvatarFallback className={cn(
                        "text-white font-bold text-sm",
                        user?.role === "super_admin"
                          ? "bg-gradient-to-br from-amber-500 via-rose-500 to-indigo-600"
                          : user?.role === "admin"
                          ? "bg-indigo-600"
                          : "bg-sky-600"
                      )}>
                        {user?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">
                          {user?.name}
                        </span>
                        {user?.role === "super_admin" ? (
                          <Badge className="bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white text-[9px] px-1.5 py-0 h-4 shrink-0 font-bold shadow-xs flex items-center gap-1">
                            <Crown className="h-2.5 w-2.5" />
                            <span>Super Admin</span>
                          </Badge>
                        ) : user?.role === "admin" ? (
                          <Badge className="bg-indigo-600 text-white text-[9px] px-1.5 py-0 h-4 shrink-0 font-semibold flex items-center gap-1">
                            <Shield className="h-2.5 w-2.5" />
                            <span>Admin</span>
                          </Badge>
                        ) : null}
                      </div>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                        {user?.email}
                      </span>
                      <div className="mt-1">
                        {user?.role === "super_admin" ? (
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <Crown className="h-3 w-3 shrink-0" />
                            <span>Super Administrator RSJD</span>
                          </span>
                        ) : user?.role === "admin" ? (
                          <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                            <Shield className="h-3 w-3 shrink-0" />
                            <span>Pustakawan • Admin RSJD</span>
                          </span>
                        ) : user?.isVerified ? (
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <Check className="h-3 w-3 shrink-0" />
                            <span>
                              {user?.nik && user.nik.trim()
                                ? "Terverifikasi (NIK)"
                                : "Anggota Terverifikasi"}
                            </span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span>Belum Terverifikasi</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <DropdownMenuSeparator className="my-1.5" />

                  {/* Gramedia-style List Items with ChevronRight */}
                  <DropdownMenuGroup className="space-y-0.5">
                    {/* 1. Beranda */}
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link
                        href="/"
                        className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors w-full group"
                      >
                        <div className="flex items-center gap-2.5">
                          <Home className="h-4 w-4 text-neutral-500 group-hover:text-sky-600 transition-colors" />
                          <span className="font-medium text-[13px]">Beranda</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-600 group-hover:translate-x-0.5 transition-all" />
                      </Link>
                    </DropdownMenuItem>

                    {/* 1b. Katalog E-Book */}
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link
                        href="/buku"
                        className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors w-full group"
                      >
                        <div className="flex items-center gap-2.5">
                          <BookOpen className="h-4 w-4 text-neutral-500 group-hover:text-sky-600 transition-colors" />
                          <span className="font-medium text-[13px]">Katalog E-Book</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-600 group-hover:translate-x-0.5 transition-all" />
                      </Link>
                    </DropdownMenuItem>

                    {/* 1c. Pinjaman Saya */}
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link
                        href="/pinjaman"
                        className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors w-full group"
                      >
                        <div className="flex items-center gap-2.5">
                          <Layers className="h-4 w-4 text-neutral-500 group-hover:text-sky-600 transition-colors" />
                          <span className="font-medium text-[13px]">Pinjaman Saya</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-600 group-hover:translate-x-0.5 transition-all" />
                      </Link>
                    </DropdownMenuItem>

                    {/* 2. Bookmark (Menggantikan Wishlist, Transaksi ngga dipake) */}
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link
                        href="/pinjaman?tab=bookmark"
                        className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors w-full group"
                      >
                        <div className="flex items-center gap-2.5">
                          <Bookmark className="h-4 w-4 text-neutral-500 group-hover:text-amber-500 transition-colors" />
                          <span className="font-medium text-[13px]">Bookmark</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {bookmarkCount > 0 && (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                              {bookmarkCount}
                            </span>
                          )}
                          <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-600 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </Link>
                    </DropdownMenuItem>

                    {/* 2. Akun (Tempat View Mode dan Edit Mode Biodata) */}
                    <DropdownMenuItem
                      onClick={() => setIsAccountModalOpen(true)}
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <UserIcon className="h-4 w-4 text-neutral-500 group-hover:text-sky-600 transition-colors" />
                        <span className="font-medium text-[13px]">Akun</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-600 group-hover:translate-x-0.5 transition-all" />
                    </DropdownMenuItem>

                    {/* 3. Ulasan Web */}
                    <DropdownMenuItem
                      onClick={() => setIsFeedbackModalOpen(true)}
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <MessageSquare className="h-4 w-4 text-neutral-500 group-hover:text-sky-600 transition-colors" />
                        <span className="font-medium text-[13px]">Ulasan Web</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-600 group-hover:translate-x-0.5 transition-all" />
                    </DropdownMenuItem>

                    {/* 4. Syarat dan Ketentuan */}
                    <DropdownMenuItem
                      onClick={() => setIsTermsModalOpen(true)}
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileText className="h-4 w-4 text-neutral-500 group-hover:text-sky-600 transition-colors" />
                        <span className="font-medium text-[13px]">Syarat dan Ketentuan</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-600 group-hover:translate-x-0.5 transition-all" />
                    </DropdownMenuItem>

                    {/* 5. Bantuan */}
                    <DropdownMenuItem
                      onClick={() => setIsHelpModalOpen(true)}
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <HelpCircle className="h-4 w-4 text-neutral-500 group-hover:text-sky-600 transition-colors" />
                        <span className="font-medium text-[13px]">Bantuan</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-600 group-hover:translate-x-0.5 transition-all" />
                    </DropdownMenuItem>

                    {/* Admin / Super Admin Panel */}
                    {(user?.role === "admin" || user?.role === "super_admin") && (
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link
                          href="/admin"
                          className={cn(
                            "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors w-full group",
                            user?.role === "super_admin"
                              ? "text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50"
                              : "text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            {user?.role === "super_admin" ? (
                              <Crown className="h-4 w-4 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
                            ) : (
                              <Shield className="h-4 w-4 text-indigo-600 group-hover:scale-110 transition-transform" />
                            )}
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[13px]">
                                {user?.role === "super_admin" ? "Panel Super Admin" : "Panel Admin RSJD"}
                              </span>
                              {user?.role === "super_admin" && (
                                <Badge className="bg-purple-600 text-white text-[8px] px-1 py-0 h-3.5 font-bold uppercase tracking-wider">
                                  Utama
                                </Badge>
                              )}
                            </div>
                          </div>
                          <ChevronRight className={cn(
                            "h-4 w-4 group-hover:translate-x-0.5 transition-all",
                            user?.role === "super_admin" ? "text-purple-400" : "text-indigo-400"
                          )} />
                        </Link>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>



                  {/* 6. Keluar Akun (Logout) */}
                  <DropdownMenuItem
                    onClick={logout}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer group transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <LogOut className="h-4 w-4 text-rose-500 group-hover:scale-110 transition-transform" />
                      <span className="font-semibold text-[13px]">Keluar Akun</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-rose-400 group-hover:translate-x-0.5 transition-all" />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>

      </div>

      {/* MOBILE SEARCH BAR ROW (LEBAR PENUH & RESPONSIF DI BAWAH TOP BAR) */}
      <div className="md:hidden w-full px-3 sm:px-5 pb-2.5 pt-0.5">
        {renderSearchBox(true)}
      </div>



      {/* MODAL KTA DIGITAL RESMI */}
      <DigitalMemberCardDialog
        open={isKtaModalOpen}
        onOpenChange={setIsKtaModalOpen}
        onOpenBiodata={() => setIsAccountModalOpen(true)}
      />

      {/* MODAL BIODATA AKUN (VIEW & EDIT MODE) */}
      <AccountBiodataDialog
        open={isAccountModalOpen}
        onOpenChange={setIsAccountModalOpen}
        onOpenKta={() => setIsKtaModalOpen(true)}
      />

      {/* MODAL ULASAN WEBSITE */}
      <WebsiteFeedbackDialog
        open={isFeedbackModalOpen}
        onOpenChange={setIsFeedbackModalOpen}
      />

      {/* MODAL SYARAT & KETENTUAN */}
      <TermsDialog
        open={isTermsModalOpen}
        onOpenChange={setIsTermsModalOpen}
      />

      {/* MODAL BANTUAN & FAQ */}
      <HelpDialog
        open={isHelpModalOpen}
        onOpenChange={setIsHelpModalOpen}
      />
    </header>
  )
}
