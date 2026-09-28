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
  Sun,
  Moon,
  MoreVertical,
} from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/lib/auth-context"
import { useTheme } from "next-themes"
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

export interface HeaderCategoryItem {
  id: string
  name: string
  slug: string
  iconName?: string
  description?: string
  bookCount?: number
}

export function SiteHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const isKatalogActive = pathname === "/buku" || pathname.startsWith("/buku/")
  const isPinjamanActive = pathname === "/pinjaman" || pathname.startsWith("/pinjaman/")
  const { user, isGuest, logout } = useAuth()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isSearching, setIsSearching] = React.useState(false)
  const [isSearchOpen, setIsSearchOpen] = React.useState(false)
  const [isMegaMenuOpen, setIsMegaMenuOpen] = React.useState(false)
  const [megaMenuTab, setMegaMenuTab] = React.useState<"ebook" | "kurasi">("ebook")
  const [showAllTags, setShowAllTags] = React.useState(false)
  const [headerCategories, setHeaderCategories] = React.useState<HeaderCategoryItem[]>([])
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
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = React.useState(false)
  const [isNotifOpen, setIsNotifOpen] = React.useState(false)

  const searchContainerRef = React.useRef<HTMLDivElement>(null)
  const searchInputRef = React.useRef<HTMLInputElement>(null)
  const searchMegaMenuRef = React.useRef<HTMLDivElement>(null)
  const mobileSearchContainerRef = React.useRef<HTMLDivElement>(null)
  const mobileSearchInputRef = React.useRef<HTMLInputElement>(null)
  const mobileSearchPanelRef = React.useRef<HTMLDivElement>(null)
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

  // Tutup semua panel saat berpindah halaman rute
  React.useEffect(() => {
    setIsSearchOpen(false)
    setIsMegaMenuOpen(false)
    setIsNotifOpen(false)
  }, [pathname])

  // Close search & mega menu dropdowns on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      const isInsideDesktop = searchContainerRef.current?.contains(target)
      const isInsideMobile = mobileSearchContainerRef.current?.contains(target)
      const isInsideSearchMega = searchMegaMenuRef.current?.contains(target)
      const isInsideMobileSearchPanel = mobileSearchPanelRef.current?.contains(target)

      if (
        !isInsideDesktop &&
        !isInsideMobile &&
        !isInsideSearchMega &&
        !isInsideMobileSearchPanel
      ) {
        setIsSearchOpen(false)
      }
      if (
        megaMenuRef.current &&
        !megaMenuRef.current.contains(target)
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
        setIsMegaMenuOpen(false)
        setIsNotifOpen(false)
      } else if (event.key === "Escape") {
        setIsSearchOpen(false)
        setIsMegaMenuOpen(false)
        setIsNotifOpen(false)
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

  const fetchCategories = React.useCallback(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.categories)) {
          setHeaderCategories(d.categories)
        }
      })
      .catch(() => {})
  }, [])

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
    fetchCategories()

    const onTagsUpdated = () => fetchTags()
    const onCategoriesUpdated = () => fetchCategories()
    const onBooksUpdated = () => {
      fetch("/api/books")
        .then((r) => r.json())
        .then((d) => {
          if (d.success && Array.isArray(d.books) && d.books.length > 0) {
            setHeaderBooks(d.books)
          }
        })
        .catch(() => {})
      fetchTags()
      fetchCategories()
    }

    window.addEventListener("tags-updated", onTagsUpdated)
    window.addEventListener("categories-updated", onCategoriesUpdated)
    window.addEventListener("books-updated", onBooksUpdated)

    return () => {
      window.removeEventListener("tags-updated", onTagsUpdated)
      window.removeEventListener("categories-updated", onCategoriesUpdated)
      window.removeEventListener("books-updated", onBooksUpdated)
    }
  }, [fetchTags, fetchCategories])

  // Filtered lists for typing state (Memoized for high FPS performance)
  const trimmedQuery = searchQuery.trim().toLowerCase()
  const isTyping = trimmedQuery.length > 0

  const filteredBooks = React.useMemo(() => {
    if (!isTyping) return []
    return headerBooks
      .filter(
        (b) =>
          b.title.toLowerCase().includes(trimmedQuery) ||
          b.authorName.toLowerCase().includes(trimmedQuery) ||
          (Array.isArray(b.tags) && b.tags.some((t) => t.toLowerCase().includes(trimmedQuery))) ||
          (b.categoryName && b.categoryName.toLowerCase().includes(trimmedQuery))
      )
      .slice(0, 5)
  }, [isTyping, headerBooks, trimmedQuery])

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

  // Quick keywords dynamically derived from real database tags
  const quickKeywords = React.useMemo(() => {
    if (allAvailableTags.length > 0) {
      return allAvailableTags.slice(0, 6).map((t) => ({
        label: t.name,
        query: t.slug,
      }))
    }
    return []
  }, [allAvailableTags])

  const filteredTags = React.useMemo(() => {
    if (!isTyping) return []
    return allAvailableTags
      .filter((t) => t.name.toLowerCase().includes(trimmedQuery) || t.slug.toLowerCase().includes(trimmedQuery))
      .slice(0, 12)
  }, [isTyping, allAvailableTags, trimmedQuery])

  const filteredAuthors = React.useMemo(() => {
    if (!isTyping) return []
    return dynamicAuthors.filter((a) => a.name.toLowerCase().includes(trimmedQuery)).slice(0, 4)
  }, [isTyping, dynamicAuthors, trimmedQuery])

  const displayTags = showAllTags ? allAvailableTags : allAvailableTags.slice(0, 8)

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
              setIsNotifOpen(false)
            }}
            onClick={() => {
              setIsSearchOpen(true)
              setIsMegaMenuOpen(false)
              setIsNotifOpen(false)
            }}
            className={cn(
              "w-full pl-10 pr-10 rounded-full bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 focus-visible:bg-white dark:focus-visible:bg-neutral-950 focus-visible:border-sky-600 focus-visible:ring-2 focus-visible:ring-sky-500/20 transition-all shadow-inner",
              isMobile ? "h-9 text-xs" : "h-10 text-xs sm:text-sm",
              isSearchOpen && "border-sky-500 ring-2 ring-sky-500/20 bg-white dark:bg-neutral-950"
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
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-full cursor-pointer"
                title="Bersihkan kata kunci"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </form>
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
    <header className="sticky top-0 z-50 w-full border-b bg-white dark:bg-neutral-950 shadow-xs">
      {/* MAIN HEADER BAR */}
      <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between gap-2 sm:gap-4 px-3 sm:px-5 lg:px-6">
        
        {/* BRAND / LOGO + KATEGORI (SISI KIRI: SEIMBANG DENGAN KANAN) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 lg:min-w-[270px] xl:min-w-[290px]">
          <Link href="/" className="group flex items-center gap-2 focus:outline-hidden mr-1">
            <div className="relative h-9 w-9 sm:h-10 sm:w-10 shrink-0 overflow-hidden rounded-xl bg-white p-0.5 ring-1 ring-border shadow-xs group-hover:scale-105 transition-transform flex items-center justify-center">
              <img
                src="/logo.png"
                alt="Logo RS Atma Husada Mahakam"
                decoding="async"
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
                setIsNotifOpen(false)
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
                            ⭐ Semua Rekomendasi Klinisi
                          </button>
                          {headerCategories.slice(0, 5).map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                setIsMegaMenuOpen(false)
                                router.push(`/buku?category=${encodeURIComponent(cat.slug)}`)
                              }}
                              className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-400 font-medium cursor-pointer truncate"
                            >
                              {cat.name}
                            </button>
                          ))}
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

                  {/* Right Columns: category grid dynamically loaded from MariaDB */}
                  <div className="col-span-1 md:col-span-8 lg:col-span-9 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 lg:gap-5 max-h-[70vh] overflow-y-auto pr-2">
                    {headerCategories.length === 0 ? (
                      <div className="col-span-full py-12 text-center space-y-2">
                        <Spinner className="h-5 w-5 mx-auto text-sky-600 animate-spin" />
                        <p className="text-xs text-muted-foreground">Memuat kategori katalog...</p>
                      </div>
                    ) : (
                      headerCategories.map((cat) => {
                        const catBooks = headerBooks.filter(
                          (b) =>
                            b.categoryId === cat.id ||
                            (b.categoryName && b.categoryName.toLowerCase() === cat.name.toLowerCase())
                        )
                        const catTags = Array.from(
                          new Set(catBooks.flatMap((b) => b.tags || []))
                        ).slice(0, 3)

                        return (
                          <div
                            key={cat.id}
                            className="space-y-2 p-3.5 rounded-2xl bg-neutral-50/50 dark:bg-neutral-900/30 border border-neutral-200/60 dark:border-neutral-800/60 hover:border-sky-300 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-all group"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setIsMegaMenuOpen(false)
                                router.push(`/buku?category=${encodeURIComponent(cat.slug)}`)
                              }}
                              className="font-heading text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider group-hover:text-sky-600 transition-colors text-left flex items-center justify-between w-full cursor-pointer"
                            >
                              <span className="truncate pr-1">{cat.name}</span>
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-neutral-200/70 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 shrink-0">
                                {cat.bookCount ?? catBooks.length}
                              </span>
                            </button>

                            {cat.description && (
                              <p className="text-[11px] text-muted-foreground line-clamp-1 leading-normal">
                                {cat.description}
                              </p>
                            )}

                            {/* Live Books in this Category */}
                            <ul className="space-y-1 text-xs text-neutral-600 dark:text-neutral-400 pt-1.5 border-t border-border/40">
                              {catBooks.slice(0, 3).map((book) => (
                                <li key={book.id}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      saveRecentlyViewed(book)
                                      setIsMegaMenuOpen(false)
                                      router.push(`/buku/${book.slug}`)
                                    }}
                                    className="hover:text-sky-600 text-left truncate w-full flex items-center gap-1.5 transition-colors cursor-pointer text-[11px]"
                                  >
                                    <span className="h-1 w-1 rounded-full bg-sky-500 shrink-0" />
                                    <span className="truncate">{book.title}</span>
                                  </button>
                                </li>
                              ))}

                              {catBooks.length === 0 && (
                                <li className="text-[11px] text-muted-foreground italic py-0.5">
                                  Belum ada buku terbit
                                </li>
                              )}

                              {catTags.length > 0 && (
                                <li className="pt-1 flex flex-wrap gap-1">
                                  {catTags.map((tag, tIdx) => (
                                    <button
                                      key={tIdx}
                                      type="button"
                                      onClick={() => {
                                        setIsMegaMenuOpen(false)
                                        router.push(`/buku?tag=${encodeURIComponent(tag.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`)
                                      }}
                                      className="text-[10px] px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-sky-600 transition-colors"
                                    >
                                      #{tag}
                                    </button>
                                  ))}
                                </li>
                              )}
                            </ul>
                          </div>
                        )
                      })
                    )}
                  </div>

                </div>
              </div>
            )}
          </div>
        </div>

          {/* DESKTOP SMART SEARCH EXPANDABLE MEGA PANEL (LEBAR PENUH SEPERTI KATEGORI) */}
          {isSearchOpen && (
            <div
              ref={searchMegaMenuRef}
              className="hidden md:block fixed left-0 right-0 top-14 sm:top-16 bg-white dark:bg-neutral-950 border-b border-border shadow-2xl z-50 animate-slide-down max-h-[calc(100vh-4rem)] overflow-y-auto"
            >
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 grid grid-cols-1 md:grid-cols-12 gap-5 lg:gap-6">
                
                {/* SISI KIRI (col-span-4 lg:col-span-3): Riwayat, Kata Kunci Klinis Cepat & Bantuan */}
                <div className="col-span-1 md:col-span-4 lg:col-span-3 space-y-4 border-b md:border-b-0 md:border-r border-border/70 pb-3 md:pb-0 md:pr-5">
                  
                  {/* Riwayat Pencarian */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-neutral-500 px-0.5">
                      <span className="flex items-center gap-1.5 font-bold text-foreground">
                        <History className="h-3.5 w-3.5 text-sky-600" />
                        Riwayat Pencarian
                      </span>
                      {searchHistory.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearAllHistory}
                          className="text-[11px] text-muted-foreground hover:text-destructive transition-colors font-medium cursor-pointer"
                        >
                          Hapus Semua
                        </button>
                      )}
                    </div>
                    
                    {searchHistory.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {searchHistory.map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              setSearchQuery(item)
                              handleExecuteSearch(item)
                            }}
                            className="group flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-900 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 hover:border-sky-300 cursor-pointer transition-colors"
                          >
                            <span>{item}</span>
                            <button
                              type="button"
                              onClick={(e) => handleRemoveHistoryItem(item, e)}
                              className="text-neutral-400 hover:text-destructive rounded-full p-0.5"
                              title="Hapus item riwayat"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic py-0.5">
                        Belum ada riwayat pencarian terbaru.
                      </p>
                    )}
                  </div>

                  {/* Topik Klinis Cepat (Quick Keywords) */}
                  {quickKeywords.length > 0 && (
                    <div className="space-y-1.5 pt-2.5 border-t border-border/60">
                      <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        <span>Topik Populer</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {quickKeywords.map((kw, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setSearchQuery(kw.query)
                              handleExecuteSearch(kw.query)
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-950/40 dark:hover:text-sky-300 border border-neutral-200 dark:border-neutral-800 transition-colors cursor-pointer text-left"
                          >
                            #{kw.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Compact Keyboard Hint */}
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium text-[11px]">
                      <Search className="h-3 w-3 text-sky-600" />
                      <span>Tekan <kbd className="px-1.5 py-0.5 rounded bg-background border border-border text-[10px] font-mono">ESC</kbd> untuk tutup</span>
                    </span>
                  </div>

                </div>

                {/* SISI KANAN (col-span-8 lg:col-span-9): TAG POPULER, PENULIS POPULER, BUKU / HASIL LIVE */}
                <div className="col-span-1 md:col-span-8 lg:col-span-9 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                  {/* KONDISI A: BELUM MENGETIK */}
                  {!isTyping && (
                    <div className="space-y-4">
                      {/* Top Bar Status */}
                      <div className="flex items-center justify-between pb-1.5 border-b border-border/70">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Eksplorasi Katalog & Penulis
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsSearchOpen(false)}
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium cursor-pointer"
                        >
                          <span>Tutup</span>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Tag Populer */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-heading text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                            <TagIcon className="h-3.5 w-3.5 text-sky-600" />
                            Tag Populer & Topik
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground">
                              {displayTags.length} dari {allAvailableTags.length} tag
                            </span>
                            {allAvailableTags.length > 8 && (
                              <button
                                type="button"
                                onClick={() => setShowAllTags(!showAllTags)}
                                className="text-xs font-bold text-sky-600 hover:text-sky-700 underline underline-offset-2 cursor-pointer ml-1"
                              >
                                {showAllTags ? "Ringkas" : `Lihat Semua (${allAvailableTags.length})`}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {displayTags.map((tag) => (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => handleSelectTag(tag.slug, tag.name)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-neutral-100 dark:bg-neutral-900 hover:bg-sky-50 dark:hover:bg-sky-950/50 text-neutral-700 dark:text-neutral-300 hover:text-sky-600 dark:hover:text-sky-300 border border-neutral-200 dark:border-neutral-800 hover:border-sky-300 transition-all text-left cursor-pointer"
                            >
                              #{tag.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Penulis Populer */}
                      <div className="space-y-2 pt-2 border-t border-border/60">
                        <span className="font-heading text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                          <Award className="h-3.5 w-3.5 text-sky-600" />
                          Penulis Terdaftar
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {dynamicAuthors.slice(0, 6).map((author) => (
                            <div
                              key={author.id}
                              onClick={() => handleSelectAuthor(author.name)}
                              className="flex items-center gap-2.5 p-2 rounded-xl bg-neutral-50/60 dark:bg-neutral-900/40 border border-neutral-200/80 dark:border-neutral-800/80 hover:bg-sky-50/60 dark:hover:bg-sky-950/40 hover:border-sky-300 cursor-pointer transition-all group"
                            >
                              <img
                                src={author.photoUrl}
                                alt={author.name}
                                loading="lazy"
                                decoding="async"
                                className="h-8 w-8 rounded-full object-cover ring-1 ring-border shrink-0 group-hover:scale-105 transition-transform"
                              />
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold text-foreground group-hover:text-sky-600 truncate transition-colors">
                                  {author.name}
                                </span>
                                <span className="text-[10px] text-muted-foreground truncate">
                                  {author.title}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Koleksi Pilihan Rekomendasi Cepat */}
                      {headerBooks.length > 0 && (
                        <div className="space-y-3 pt-3 border-t border-border/60">
                          <span className="font-heading text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                            <BookOpen className="h-3.5 w-3.5 text-sky-600" />
                            Koleksi Rekomendasi Unggulan
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {headerBooks.slice(0, 3).map((book) => (
                              <div
                                key={book.id}
                                onClick={() => {
                                  saveRecentlyViewed(book)
                                  setIsSearchOpen(false)
                                  router.push(`/buku/${book.slug}`)
                                }}
                                className="flex items-center gap-3 p-2.5 rounded-2xl bg-neutral-50/60 dark:bg-neutral-900/40 border border-neutral-200/80 dark:border-neutral-800/80 hover:bg-sky-50/60 dark:hover:bg-sky-950/40 hover:border-sky-300 cursor-pointer transition-all group"
                              >
                                <img
                                  src={book.coverUrl}
                                  alt={book.title}
                                  loading="lazy"
                                  decoding="async"
                                  className="h-12 w-9 rounded-md object-cover ring-1 ring-border shrink-0 shadow-2xs group-hover:scale-105 transition-transform"
                                />
                                <div className="flex flex-col min-w-0 flex-1">
                                  <span className="text-xs font-bold text-foreground group-hover:text-sky-600 truncate transition-colors">
                                    {book.title}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground truncate">
                                    {book.authorName}
                                  </span>
                                  <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold mt-0.5 truncate">
                                    {book.categoryName}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                  {/* KONDISI B: SEDANG MENGETIK */}
                  {isTyping && (
                    <div className="space-y-5 animate-fade-in">
                      {/* Header info */}
                      <div className="flex items-center justify-between pb-2 border-b border-border/70">
                        <span className="text-xs font-bold text-muted-foreground">
                          Hasil Pencarian Cepat untuk &ldquo;<span className="text-sky-600">{searchQuery}</span>&rdquo;
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsSearchOpen(false)}
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium cursor-pointer"
                        >
                          <span>Tutup</span>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {isSearching ? (
                        <div className="space-y-3 py-4">
                          <div className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                            <Spinner className="h-4 w-4 animate-spin text-sky-600" />
                            <span>Mencari koleksi perpustakaan...</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[1, 2, 3, 4].map((i) => (
                              <div key={i} className="flex items-center gap-3 p-3 rounded-2xl border border-border">
                                <Skeleton className="h-14 w-10 rounded-md shrink-0" />
                                <div className="space-y-2 flex-1">
                                  <Skeleton className="h-4 w-3/4 rounded-md" />
                                  <Skeleton className="h-3 w-1/2 rounded-md" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* 1. Buku Terkait */}
                          {filteredBooks.length > 0 ? (
                            <div className="space-y-2.5">
                              <span className="font-heading text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                                <BookOpen className="h-3.5 w-3.5 text-sky-600" />
                                Buku yang Cocok ({filteredBooks.length})
                              </span>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {filteredBooks.map((book) => (
                                  <div
                                    key={book.id}
                                    onClick={() => {
                                      saveRecentlyViewed(book)
                                      setIsSearchOpen(false)
                                      router.push(`/buku/${book.slug}`)
                                    }}
                                    className="flex items-center gap-3.5 p-3 rounded-2xl bg-neutral-50/60 dark:bg-neutral-900/40 border border-neutral-200/80 dark:border-neutral-800/80 hover:bg-sky-50/60 dark:hover:bg-sky-950/40 hover:border-sky-300 cursor-pointer transition-all group"
                                  >
                                    <img
                                      src={book.coverUrl}
                                      alt={book.title}
                                      loading="lazy"
                                      decoding="async"
                                      className="h-14 w-10 rounded-md object-cover ring-1 ring-border shadow-2xs shrink-0 group-hover:scale-105 transition-transform"
                                    />
                                    <div className="flex flex-col min-w-0 flex-1">
                                      <span className="text-xs sm:text-[13px] font-bold text-foreground group-hover:text-sky-600 truncate transition-colors">
                                        {book.title}
                                      </span>
                                      <span className="text-[11px] text-muted-foreground truncate">
                                        {book.authorName} &bull; {book.categoryName}
                                      </span>
                                      <div className="flex items-center gap-1 text-[10px] font-semibold text-sky-600 dark:text-sky-400 mt-1">
                                        <span>Buka Buku</span>
                                        <ArrowRight className="h-2.5 w-2.5 group-hover:translate-x-1 transition-transform" />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 text-center space-y-1">
                              <p className="text-xs font-semibold text-foreground">
                                Tidak ada judul buku langsung yang cocok
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                Coba cari dengan kata kunci lain atau klik tombol pencarian penuh di bawah.
                              </p>
                            </div>
                          )}

                          {/* 2. Tag yang Cocok */}
                          {filteredTags.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-border/60">
                              <span className="font-heading text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                                <TagIcon className="h-3.5 w-3.5 text-sky-600" />
                                Tag yang Cocok
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {filteredTags.map((tag) => (
                                  <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => handleSelectTag(tag.slug, tag.name)}
                                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 transition-colors cursor-pointer"
                                  >
                                    #{tag.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 3. Penulis yang Cocok */}
                          {filteredAuthors.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-border/60">
                              <span className="font-heading text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                                <Award className="h-3.5 w-3.5 text-sky-600" />
                                Penulis yang Cocok
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {filteredAuthors.map((author) => (
                                  <div
                                    key={author.id}
                                    onClick={() => handleSelectAuthor(author.name)}
                                    className="flex items-center gap-3 p-2.5 rounded-2xl bg-neutral-50/60 dark:bg-neutral-900/40 border border-neutral-200/80 dark:border-neutral-800/80 hover:bg-sky-50 dark:hover:bg-sky-950/40 cursor-pointer transition-colors"
                                  >
                                    <img
                                      src={author.photoUrl}
                                      alt={author.name}
                                      loading="lazy"
                                      decoding="async"
                                      className="h-9 w-9 rounded-full object-cover ring-1 ring-border"
                                    />
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-xs font-bold text-foreground truncate">
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

                          {/* Tombol Eksekusi Cari Seluruh Katalog */}
                          <div className="pt-2 border-t border-border/60">
                            <Button
                              type="button"
                              onClick={() => handleExecuteSearch(searchQuery)}
                              className="w-full justify-between h-10 text-xs sm:text-sm font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-xs"
                            >
                              <span>Cari seluruh katalog untuk &ldquo;{searchQuery}&rdquo;</span>
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                </div>

              </div>
            </div>
          )}

        {/* DESKTOP SMART SEARCH BAR (PANJANG, LEBAR & SIMETRIS DI TENGAH) */}
        <div className="hidden md:flex flex-1 max-w-2xl lg:max-w-3xl xl:max-w-4xl mx-3 lg:mx-6 justify-center">
          <div className="w-full">
            {renderSearchBox(false)}
          </div>
        </div>

        {/* RIGHT ACTIONS: KATALOG, PINJAMAN, NOTIFIKASI, PROFIL (SEIMBANG DENGAN SISI KIRI) */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 justify-end lg:min-w-[270px] xl:min-w-[290px]">
          {/* 1. Akses Katalog (Desktop & Mobile) */}
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
                <Button size="sm" className="h-8 sm:h-9 px-3 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-xs transition-all">
                  Masuk
                </Button>
              </Link>
              <Link href="/daftar" className="hidden sm:inline-flex">
                <Button variant="ghost" size="sm" className="h-8 sm:h-9 px-2.5 sm:px-3 text-xs font-semibold text-foreground hover:text-sky-600 rounded-xl">
                  Daftar
                </Button>
              </Link>

              {/* Mobile Guest Menu Trigger (Icon garis 3 / hamburger di HP) */}
              <div className="block md:hidden">
                <button
                  type="button"
                  onClick={() => setIsProfileDrawerOpen(true)}
                  className={cn(
                    "h-9 w-9 text-xs font-semibold rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer",
                    isProfileDrawerOpen
                      ? "bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 font-bold border border-sky-200/80 dark:border-sky-800/80 shadow-xs"
                      : "text-neutral-700 dark:text-neutral-300 hover:text-sky-600 hover:bg-neutral-100 dark:hover:bg-neutral-900 border border-transparent"
                  )}
                  aria-label="Buka Menu & Pengaturan"
                  title="Menu Utama"
                >
                  <Menu className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Notifikasi Pengguna (Dapat di-expand seperti Kategori) */}
              <NotificationPopover
                isOpen={isNotifOpen}
                onToggle={() => {
                  setIsNotifOpen((prev) => {
                    const next = !prev
                    if (next) {
                      setIsMegaMenuOpen(false)
                      setIsSearchOpen(false)
                    }
                    return next
                  })
                }}
                onClose={() => setIsNotifOpen(false)}
              />

              {/* 1. DESKTOP PROFILE MENU (Dropdown Menu untuk tampilan layar md ke atas) */}
              <div className="hidden md:block">
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

                  <DropdownMenuSeparator className="my-1.5" />

                  {/* Ganti Tema Tampilan */}
                  <DropdownMenuItem
                    onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="relative h-4 w-4 flex items-center justify-center">
                        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
                        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-sky-400" />
                      </div>
                      <span className="font-medium text-[13px]">
                        Tema: {resolvedTheme === "dark" ? "Mode Gelap" : "Mode Terang"}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground">
                      {resolvedTheme === "dark" ? "Gelap" : "Terang"}
                    </span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="my-1.5" />

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
              </div>

              {/* 2. MOBILE MENU TRIGGER (Icon titik tiga di HP - tanpa border, selaras dengan tombol lain) */}
              <div className="block md:hidden">
                <button
                  type="button"
                  onClick={() => setIsProfileDrawerOpen(true)}
                  className={cn(
                    "h-9 w-9 text-xs font-semibold rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer",
                    isProfileDrawerOpen
                      ? "bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 font-bold border border-sky-200/80 dark:border-sky-800/80 shadow-xs"
                      : "text-neutral-700 dark:text-neutral-300 hover:text-sky-600 hover:bg-neutral-100 dark:hover:bg-neutral-900 border border-transparent"
                  )}
                  aria-label="Buka Menu Akun & Pengaturan"
                  title="Menu Utama"
                >
                  <Menu className="h-4.5 w-4.5" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* SIDEBAR SHEET DRAWER UNTUK TAMPILAN HP (Pengguna & Tamu) */}
        <Sheet open={isProfileDrawerOpen} onOpenChange={setIsProfileDrawerOpen}>
          <SheetContent
            side="right"
            showCloseButton={false}
            className="w-[300px] sm:w-[340px] p-0 flex flex-col justify-between overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-white dark:bg-neutral-950 border-l border-border"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Menu Pengguna & Pengaturan</SheetTitle>
            </SheetHeader>

            <div className="flex-1 flex flex-col">
              {/* Mobile Sidebar Header */}
              <div className="flex items-center justify-between p-4 border-b border-border/80 bg-neutral-50/80 dark:bg-neutral-900/60 sticky top-0 z-10 backdrop-blur-xs">
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-sky-600" />
                  <span className="font-heading font-bold text-sm text-foreground">
                    {user ? "Menu Akun & Pengaturan" : "Menu & Pengaturan"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsProfileDrawerOpen(false)}
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Tutup menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Profile Card / Guest Card */}
              {user ? (
                <div className="p-4 border-b border-border/60 bg-gradient-to-b from-sky-50/60 to-transparent dark:from-sky-950/20 dark:to-transparent">
                  <div className="flex items-center gap-3">
                    <Avatar className={cn(
                      "h-12 w-12 shrink-0 ring-2",
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
                        <span className="text-sm font-bold text-foreground truncate max-w-[160px]">
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
                      <span className="text-xs text-muted-foreground truncate">
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
                </div>
              ) : (
                <div className="p-4 border-b border-border/60 bg-gradient-to-b from-sky-50/60 to-transparent dark:from-sky-950/20 dark:to-transparent">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-sky-100 dark:bg-sky-950/70 border border-sky-300 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                      <UserIcon className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-bold text-foreground">Pengunjung Tamu</span>
                      <span className="text-xs text-muted-foreground">Perpustakaan Digital RSJD</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <Link href="/masuk" onClick={() => setIsProfileDrawerOpen(false)}>
                      <Button size="sm" className="w-full h-8 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-xs">
                        Masuk
                      </Button>
                    </Link>
                    <Link href="/daftar" onClick={() => setIsProfileDrawerOpen(false)}>
                      <Button variant="outline" size="sm" className="w-full h-8 text-xs font-semibold rounded-xl border-border">
                        Daftar
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {/* Fitur Switch Theme di Sidebar Mobile (Permintaan User: "kalo di hp taro di sidebarnya") */}
              <div className="px-3.5 py-2.5 border-b border-border/60 bg-muted/20 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative h-7 w-7 rounded-lg bg-background border border-border/80 flex items-center justify-center shadow-xs text-foreground shrink-0">
                    <Sun className="h-3.5 w-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
                    <Moon className="absolute h-3.5 w-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-sky-400" />
                  </div>
                  <div className="flex flex-col text-left min-w-0">
                    <span className="text-xs font-bold text-foreground truncate">Tema Tampilan</span>
                    <span className="text-[10px] text-muted-foreground truncate">
                      {resolvedTheme === "dark" ? "Mode Gelap" : "Mode Terang"}
                    </span>
                  </div>
                </div>

                {/* Compact Pill Toggle Button */}
                <div className="flex items-center bg-muted/90 p-0.5 rounded-xl border border-border/60 shrink-0">
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer",
                      resolvedTheme !== "dark"
                        ? "bg-white dark:bg-neutral-800 text-amber-600 dark:text-amber-400 shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    title="Mode Terang"
                  >
                    <Sun className="h-3 w-3" />
                    <span>Terang</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer",
                      resolvedTheme === "dark"
                        ? "bg-white dark:bg-neutral-800 text-sky-500 dark:text-sky-400 shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    title="Mode Gelap"
                  >
                    <Moon className="h-3 w-3" />
                    <span>Gelap</span>
                  </button>
                </div>
              </div>

              {/* Mobile Navigation List */}
              <div className="p-3 space-y-1 overflow-y-auto flex-1">
                {/* 1. Beranda */}
                <Link
                  href="/"
                  onClick={() => setIsProfileDrawerOpen(false)}
                  className="flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors w-full group active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <Home className="h-4 w-4 text-neutral-500 group-hover:text-sky-600 transition-colors" />
                    <span className="font-medium text-[13px]">Beranda</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-600 group-hover:translate-x-0.5 transition-all" />
                </Link>

                {/* 2. Katalog E-Book */}
                <Link
                  href="/buku"
                  onClick={() => setIsProfileDrawerOpen(false)}
                  className="flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors w-full group active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-4 w-4 text-neutral-500 group-hover:text-sky-600 transition-colors" />
                    <span className="font-medium text-[13px]">Katalog E-Book</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-600 group-hover:translate-x-0.5 transition-all" />
                </Link>

                {/* 3. Pinjaman Saya (Khusus Login) */}
                {user && (
                  <Link
                    href="/pinjaman"
                    onClick={() => setIsProfileDrawerOpen(false)}
                    className="flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors w-full group active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3">
                      <Layers className="h-4 w-4 text-neutral-500 group-hover:text-sky-600 transition-colors" />
                      <span className="font-medium text-[13px]">Pinjaman Saya</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeLoansCount > 0 && (
                        <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
                          {activeLoansCount}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-600 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </Link>
                )}

                {/* 4. Bookmark (Khusus Login) */}
                {user && (
                  <Link
                    href="/pinjaman?tab=bookmark"
                    onClick={() => setIsProfileDrawerOpen(false)}
                    className="flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors w-full group active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3">
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
                )}

                {/* 5. Akun (Khusus Login) */}
                {user && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileDrawerOpen(false)
                      setIsAccountModalOpen(true)
                    }}
                    className="flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors w-full cursor-pointer group active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3">
                      <UserIcon className="h-4 w-4 text-neutral-500 group-hover:text-sky-600 transition-colors" />
                      <span className="font-medium text-[13px]">Akun</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-600 group-hover:translate-x-0.5 transition-all" />
                  </button>
                )}

                {/* 6. Ulasan Web */}
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileDrawerOpen(false)
                    setIsFeedbackModalOpen(true)
                  }}
                  className="flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors w-full cursor-pointer group active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-4 w-4 text-neutral-500 group-hover:text-sky-600 transition-colors" />
                    <span className="font-medium text-[13px]">Ulasan Web</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-600 group-hover:translate-x-0.5 transition-all" />
                </button>

                {/* 7. Syarat dan Ketentuan */}
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileDrawerOpen(false)
                    setIsTermsModalOpen(true)
                  }}
                  className="flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors w-full cursor-pointer group active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-neutral-500 group-hover:text-sky-600 transition-colors" />
                    <span className="font-medium text-[13px]">Syarat dan Ketentuan</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-600 group-hover:translate-x-0.5 transition-all" />
                </button>

                {/* 8. Bantuan */}
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileDrawerOpen(false)
                    setIsHelpModalOpen(true)
                  }}
                  className="flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors w-full cursor-pointer group active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <HelpCircle className="h-4 w-4 text-neutral-500 group-hover:text-sky-600 transition-colors" />
                    <span className="font-medium text-[13px]">Bantuan</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-600 group-hover:translate-x-0.5 transition-all" />
                </button>

                {/* 9. Admin / Super Admin Panel */}
                {user && (user?.role === "admin" || user?.role === "super_admin") && (
                  <Link
                    href="/admin"
                    onClick={() => setIsProfileDrawerOpen(false)}
                    className={cn(
                      "flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium transition-colors w-full group active:scale-[0.99]",
                      user?.role === "super_admin"
                        ? "text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50"
                        : "text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
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
                )}
              </div>
            </div>

            {/* Mobile Footer Logout Button (Khusus Login) */}
            {user && (
              <div className="p-4 border-t border-border/80 bg-neutral-50/50 dark:bg-neutral-900/40">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileDrawerOpen(false)
                    logout()
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4 text-rose-500" />
                  <span>Keluar Akun</span>
                </button>
              </div>
            )}
          </SheetContent>
        </Sheet>

      </div>

      {/* MOBILE SEARCH BAR ROW (LEBAR PENUH & RESPONSIF DI BAWAH TOP BAR) */}
      <div className="md:hidden w-full px-3 sm:px-5 pb-2.5 pt-0.5">
        {renderSearchBox(true)}
      </div>

      {/* MOBILE SMART SEARCH EXPANDED OVERLAY (KHUSUS TAMPILAN HP) */}
      {isSearchOpen && (
        <div
          ref={mobileSearchPanelRef}
          className="md:hidden absolute left-0 right-0 top-full h-[calc(100dvh-100%)] bg-white/98 dark:bg-neutral-950/98 border-t border-border z-50 overflow-y-auto overscroll-contain p-3.5 space-y-3.5 shadow-2xl animate-fade-in"
        >
          {/* Top Bar with Dismiss Button */}
          <div className="flex items-center justify-between pb-2 border-b border-border/70">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-sky-600" />
              <span className="font-heading text-sm font-bold text-foreground">
                Pusat Pencarian Buku
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsSearchOpen(false)
                mobileSearchInputRef.current?.blur()
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground bg-neutral-100 dark:bg-neutral-900 flex items-center gap-1 cursor-pointer"
            >
              <span>Tutup</span>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Content if Typing */}
          {isTyping ? (
            <div className="space-y-4">
              {isSearching ? (
                <div className="py-8 text-center space-y-2">
                  <Spinner className="h-5 w-5 mx-auto text-sky-600 animate-spin" />
                  <p className="text-xs text-muted-foreground">Mencari koleksi buku...</p>
                </div>
              ) : (
                <>
                  {/* Matching Books */}
                  {filteredBooks.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Buku Terkait ({filteredBooks.length})
                      </span>
                      <div className="space-y-2">
                        {filteredBooks.map((book) => (
                          <div
                            key={book.id}
                            onClick={() => {
                              saveRecentlyViewed(book)
                              setIsSearchOpen(false)
                              router.push(`/buku/${book.slug}`)
                            }}
                            className="flex items-center gap-3 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 active:bg-sky-50"
                          >
                            <img
                              src={book.coverUrl}
                              alt={book.title}
                              loading="lazy"
                              decoding="async"
                              className="h-12 w-8.5 rounded-md object-cover shrink-0"
                            />
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-xs font-bold text-foreground truncate">
                                {book.title}
                              </span>
                              <span className="text-[11px] text-muted-foreground truncate">
                                {book.authorName} &bull; {book.categoryName}
                              </span>
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching Tags */}
                  {filteredTags.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border/60">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Tag yang Cocok
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {filteredTags.map((tag) => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => handleSelectTag(tag.slug, tag.name)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200"
                          >
                            #{tag.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching Authors */}
                  {filteredAuthors.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border/60">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Penulis yang Cocok
                      </span>
                      <div className="space-y-1.5">
                        {filteredAuthors.map((author) => (
                          <div
                            key={author.id}
                            onClick={() => handleSelectAuthor(author.name)}
                            className="flex items-center gap-2.5 p-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
                          >
                            <img
                              src={author.photoUrl}
                              alt={author.name}
                              loading="lazy"
                              decoding="async"
                              className="h-8 w-8 rounded-full object-cover shrink-0"
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-foreground truncate">
                                {author.name}
                              </span>
                              <span className="text-[10px] text-muted-foreground truncate">
                                {author.title}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Full Execute Button */}
                  <div className="pt-2">
                    <Button
                      type="button"
                      onClick={() => handleExecuteSearch(searchQuery)}
                      className="w-full justify-between h-9 text-xs font-bold bg-sky-600 text-white rounded-xl shadow-xs"
                    >
                      <span>Cari &ldquo;{searchQuery}&rdquo;</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3.5">
              {/* Riwayat Pencarian */}
              {searchHistory.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-neutral-500">
                    <span className="flex items-center gap-1.5 font-bold text-foreground">
                      <History className="h-3.5 w-3.5 text-sky-600" />
                      Riwayat Pencarian
                    </span>
                    <button
                      type="button"
                      onClick={handleClearAllHistory}
                      className="text-[11px] text-muted-foreground hover:text-destructive font-medium"
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
                        className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800"
                      >
                        <span>{item}</span>
                        <button
                          type="button"
                          onClick={(e) => handleRemoveHistoryItem(item, e)}
                          className="text-neutral-400 hover:text-destructive p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Topik Klinis Populer */}
              {quickKeywords.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-border/60">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    Topik Populer
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {quickKeywords.slice(0, 5).map((kw, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSearchQuery(kw.query)
                          handleExecuteSearch(kw.query)
                        }}
                        className="px-2 py-0.5 rounded-lg text-xs font-medium bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800"
                      >
                        #{kw.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tag Populer */}
              <div className="space-y-1.5 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between text-xs font-bold text-foreground">
                  <span className="flex items-center gap-1.5">
                    <TagIcon className="h-3.5 w-3.5 text-sky-600" />
                    Tag Populer
                  </span>
                  {allAvailableTags.length > 6 && (
                    <button
                      type="button"
                      onClick={() => setShowAllTags(!showAllTags)}
                      className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 underline"
                    >
                      {showAllTags ? "Ringkas" : `Semua (${allAvailableTags.length})`}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(showAllTags ? allAvailableTags : allAvailableTags.slice(0, 6)).map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleSelectTag(tag.slug, tag.name)}
                      className="px-2 py-0.5 rounded-lg text-xs font-medium bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800"
                    >
                      #{tag.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Penulis Populer */}
              <div className="space-y-1.5 pt-2 border-t border-border/60">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-sky-600" />
                  Penulis Terdaftar
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {dynamicAuthors.slice(0, 4).map((author) => (
                    <div
                      key={author.id}
                      onClick={() => handleSelectAuthor(author.name)}
                      className="flex items-center gap-2 p-1.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 cursor-pointer active:scale-98"
                    >
                      <img
                        src={author.photoUrl}
                        alt={author.name}
                        loading="lazy"
                        decoding="async"
                        className="h-6 w-6 rounded-full object-cover shrink-0"
                      />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[11px] font-bold text-foreground truncate">
                          {author.name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}



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
