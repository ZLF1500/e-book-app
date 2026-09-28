"use client"

import * as React from "react"
import Link from "next/link"
import { Globe, Heart, ChevronLeft, ChevronRight } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { GuestModal } from "@/components/auth/guest-modal"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  RECENTLY_VIEWED_KEY,
  RECENTLY_VIEWED_EVENT,
  RecentlyViewedBook,
  getStoredRecentlyViewed,
  syncRecentlyViewedWithDatabase,
} from "@/lib/recently-viewed"

const LOCAL_STORAGE_BOOKMARK_KEY = "rsjd_bookmarks_v1"

export function RecentlyViewedSection() {
  const { isGuest } = useAuth()
  const [isGuestModalOpen, setIsGuestModalOpen] = React.useState(false)
  const [recentBooks, setRecentBooks] = React.useState<RecentlyViewedBook[]>([])
  const [bookmarkedIds, setBookmarkedIds] = React.useState<string[]>([])

  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = React.useState(false)
  const [canScrollRight, setCanScrollRight] = React.useState(false)

  // Drag-to-scroll state
  const isMouseDown = React.useRef(false)
  const startX = React.useRef(0)
  const scrollLeftPos = React.useRef(0)
  const isDragging = React.useRef(false)

  // Scroll state & rAF throttle
  const rafId = React.useRef<number | null>(null)

  const updateScrollState = React.useCallback(() => {
    if (rafId.current !== null) return
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null
      const el = scrollContainerRef.current
      if (!el) return
      const { scrollLeft, scrollWidth, clientWidth } = el
      const nextLeft = scrollLeft > 4
      const nextRight = scrollLeft + clientWidth < scrollWidth - 6
      setCanScrollLeft((prev) => (prev !== nextLeft ? nextLeft : prev))
      setCanScrollRight((prev) => (prev !== nextRight ? nextRight : prev))
    })
  }, [])

  const scroll = (direction: "left" | "right") => {
    const el = scrollContainerRef.current
    if (!el) return
    const scrollAmount = 380
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    })
    setTimeout(updateScrollState, 350)
  }

  // Wheel listener for horizontal scrolling with standard mouse wheel (desktop only)
  React.useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    // Only bind wheel listener on devices with fine pointer (mouse/trackpad), never on touchscreens
    if (typeof window !== "undefined" && !window.matchMedia("(pointer: fine)").matches) {
      return
    }

    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return

      // When vertical scroll is dominant (standard mouse wheel)
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        const isAtLeft = el.scrollLeft <= 0
        const isAtRight = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4

        // If user can scroll further horizontally in that direction, translate wheel to horizontal
        if ((e.deltaY > 0 && !isAtRight) || (e.deltaY < 0 && !isAtLeft)) {
          e.preventDefault()
          el.scrollLeft += e.deltaY * 1.2
          updateScrollState()
        }
      }
    }

    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [recentBooks, updateScrollState])

  // Track scroll position for navigation buttons
  React.useEffect(() => {
    updateScrollState()
    const el = scrollContainerRef.current
    if (!el) return

    const handleScroll = () => updateScrollState()
    el.addEventListener("scroll", handleScroll, { passive: true })
    window.addEventListener("resize", handleScroll)

    const timer = setTimeout(updateScrollState, 150)

    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current)
        rafId.current = null
      }
      el.removeEventListener("scroll", handleScroll)
      window.removeEventListener("resize", handleScroll)
      clearTimeout(timer)
    }
  }, [recentBooks, updateScrollState])

  // Drag-to-scroll handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return
    isMouseDown.current = true
    isDragging.current = false
    startX.current = e.pageX - scrollContainerRef.current.offsetLeft
    scrollLeftPos.current = scrollContainerRef.current.scrollLeft
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown.current || !scrollContainerRef.current) return
    const x = e.pageX - scrollContainerRef.current.offsetLeft
    const walk = (x - startX.current) * 1.2
    if (Math.abs(walk) > 4) {
      isDragging.current = true
    }
    scrollContainerRef.current.scrollLeft = scrollLeftPos.current - walk
    updateScrollState()
  }

  const handleMouseUp = () => {
    isMouseDown.current = false
    setTimeout(() => {
      isDragging.current = false
    }, 60)
  }

  const loadRecentBooks = React.useCallback(() => {
    const stored = getStoredRecentlyViewed()
    if (stored.length > 0) {
      setRecentBooks(stored.slice(0, 10))
    }

    syncRecentlyViewedWithDatabase().then((synced) => {
      if (synced && synced.length > 0) {
        setRecentBooks(synced.slice(0, 10))
      }
    })

    try {
      const savedBm = localStorage.getItem(LOCAL_STORAGE_BOOKMARK_KEY)
      if (savedBm) {
        setBookmarkedIds(JSON.parse(savedBm))
      }
    } catch {}
  }, [])

  React.useEffect(() => {
    loadRecentBooks()

    const handleUpdate = () => {
      loadRecentBooks()
    }

    window.addEventListener(RECENTLY_VIEWED_EVENT, handleUpdate)
    window.addEventListener("bookmarks-updated", handleUpdate)
    window.addEventListener("storage", handleUpdate)
    window.addEventListener("focus", handleUpdate)
    window.addEventListener("pageshow", handleUpdate)

    return () => {
      window.removeEventListener(RECENTLY_VIEWED_EVENT, handleUpdate)
      window.removeEventListener("bookmarks-updated", handleUpdate)
      window.removeEventListener("storage", handleUpdate)
      window.removeEventListener("focus", handleUpdate)
      window.removeEventListener("pageshow", handleUpdate)
    }
  }, [loadRecentBooks])

  const toggleBookmark = (bookId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isGuest) {
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
    } catch {}
  }

  if (recentBooks.length === 0) {
    return null
  }

  return (
    <section className="w-full py-6 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Container with rounded border */}
        <div className="relative group/box rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 p-5 sm:p-6 shadow-2xs">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                Baru Saja Dilihat
              </h2>
              <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
                ({recentBooks.length} buku)
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setRecentBooks([])
                  try {
                    localStorage.removeItem(RECENTLY_VIEWED_KEY)
                    window.dispatchEvent(new Event(RECENTLY_VIEWED_EVENT))
                  } catch {}
                }}
                className="text-xs text-neutral-400 hover:text-rose-500 font-medium transition-colors cursor-pointer"
              >
                Bersihkan
              </button>

              {/* Header Navigation Arrows */}
              <div className="flex items-center gap-1 border-l border-neutral-200 dark:border-neutral-800 pl-3">
                <button
                  type="button"
                  disabled={!canScrollLeft}
                  onClick={() => scroll("left")}
                  className={cn(
                    "flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 shadow-2xs transition-all hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95 cursor-pointer",
                    !canScrollLeft && "opacity-30 pointer-events-none"
                  )}
                  title="Geser ke kiri"
                  aria-label="Geser ke kiri"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={!canScrollRight}
                  onClick={() => scroll("right")}
                  className={cn(
                    "flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 shadow-2xs transition-all hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95 cursor-pointer",
                    !canScrollRight && "opacity-30 pointer-events-none"
                  )}
                  title="Geser ke kanan"
                  aria-label="Geser ke kanan"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Wrapper for cards with floating navigation buttons & edge fades */}
          <div className="relative">
            {/* Left Edge Fade */}
            {canScrollLeft && (
              <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-neutral-50/90 dark:from-neutral-900/90 to-transparent z-20 rounded-l-2xl transition-opacity duration-300" />
            )}

            {/* Right Edge Fade */}
            {canScrollRight && (
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-14 bg-gradient-to-l from-neutral-50/90 dark:from-neutral-900/90 to-transparent z-20 rounded-r-2xl transition-opacity duration-300" />
            )}

            {/* Floating Left Button (on hover) */}
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => scroll("left")}
                className="absolute left-1.5 top-1/2 -translate-y-1/2 z-30 hidden sm:flex h-9.5 w-9.5 items-center justify-center rounded-full bg-white/95 dark:bg-neutral-900/95 text-foreground shadow-lg border border-neutral-200 dark:border-neutral-800 backdrop-blur-xs transition-all hover:scale-110 active:scale-95 cursor-pointer"
                title="Geser ke kiri"
                aria-label="Geser ke kiri"
              >
                <ChevronLeft className="h-4.5 w-4.5" />
              </button>
            )}

            {/* Floating Right Button (on hover) */}
            {canScrollRight && (
              <button
                type="button"
                onClick={() => scroll("right")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 z-30 hidden sm:flex h-9.5 w-9.5 items-center justify-center rounded-full bg-white/95 dark:bg-neutral-900/95 text-foreground shadow-lg border border-neutral-200 dark:border-neutral-800 backdrop-blur-xs transition-all hover:scale-110 active:scale-95 cursor-pointer"
                title="Geser ke kanan"
                aria-label="Geser ke kanan"
              >
                <ChevronRight className="h-4.5 w-4.5" />
              </button>
            )}

            {/* Horizontal scroll cards container */}
            <div
              ref={scrollContainerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="flex items-stretch gap-4 overflow-x-auto no-scrollbar py-1 scroll-smooth cursor-grab active:cursor-grabbing select-none touch-pan-y"
            >
              {recentBooks.map((book) => {
                const isBookmarked = bookmarkedIds.includes(String(book.id))
                const isEnglish =
                  book.language?.toLowerCase().includes("inggris") ||
                  book.language?.toLowerCase().includes("english")

                return (
                  <div
                    key={book.id}
                    className="group flex flex-col justify-between rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3 w-[170px] shrink-0 shadow-xs hover:shadow-md hover:border-sky-300 dark:hover:border-sky-700 transition-[border-color,box-shadow] duration-200"
                  >
                    {/* Cover image with badge & bookmark button */}
                    <div className="relative aspect-3/4 w-full rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 mb-3 shadow-2xs">
                      <Link
                        href={`/buku/${book.slug}`}
                        onClick={(e) => {
                          if (isDragging.current) e.preventDefault()
                        }}
                        className="block h-full w-full"
                      >
                        <Skeleton className="absolute inset-0" />
                        <img
                          src={book.coverUrl || "/placeholder.svg"}
                          alt={book.title}
                          loading="lazy"
                          decoding="async"
                          draggable={false}
                          className="relative z-1 h-full w-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                        />

                        {/* 🌐 ID/EN badge */}
                        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-md bg-white/95 dark:bg-neutral-900/95 sm:backdrop-blur-xs px-1.5 py-0.5 shadow-xs text-[10px] font-bold text-sky-600">
                          <Globe className="h-3 w-3" />
                          <span>{isEnglish ? "EN" : "ID"}</span>
                        </div>
                      </Link>

                      {/* Favorite / Bookmark Heart Button */}
                      <button
                        type="button"
                        onClick={(e) => toggleBookmark(String(book.id), e)}
                        className={cn(
                          "absolute top-2 right-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-white dark:bg-neutral-900 shadow-md transition-transform duration-200 active:scale-75 hover:scale-110 cursor-pointer",
                          isBookmarked
                            ? "text-sky-600"
                            : "text-neutral-400 hover:text-neutral-700"
                        )}
                        title={isBookmarked ? "Hapus Simpanan" : "Simpan Buku"}
                      >
                        <Heart
                          className={cn("h-3.5 w-3.5 transition-transform duration-200", isBookmarked && "fill-sky-600 text-sky-600 scale-110")}
                        />
                      </button>
                    </div>

                    {/* Metadata: Read Count, Author, Title */}
                    <div className="space-y-1">
                      <span className="block text-[11px] text-neutral-400 font-medium">
                        {book.loanCount || 0} dibaca
                      </span>
                      <span className="block text-xs text-neutral-600 dark:text-neutral-400 font-medium truncate">
                        {book.authorName}
                      </span>
                      <Link
                        href={`/buku/${book.slug}`}
                        onClick={(e) => {
                          if (isDragging.current) e.preventDefault()
                        }}
                        className="block"
                      >
                        <h3 className="font-heading text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 line-clamp-2 leading-snug group-hover:text-sky-600 transition-colors">
                          {book.title}
                        </h3>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Guest Modal */}
      <GuestModal
        open={isGuestModalOpen}
        onOpenChange={setIsGuestModalOpen}
        actionType="bookmark"
      />
    </section>
  )
}
