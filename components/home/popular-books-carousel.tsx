"use client"

import * as React from "react"
import Link from "next/link"
import useEmblaCarousel from "embla-carousel-react"
import Autoplay from "embla-carousel-autoplay"
import { Star, Globe, Heart, Bookmark, ArrowRight, Sparkles } from "lucide-react"

import type { BookItem } from "@/lib/mock-data"
import { useAuth } from "@/lib/auth-context"
import { GuestModal } from "@/components/auth/guest-modal"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { saveRecentlyViewed } from "@/lib/recently-viewed"

const LOCAL_STORAGE_BOOKMARK_KEY = "rsjd_bookmarks_v1"

export function PopularBooksCarousel() {
  const { isGuest } = useAuth()
  const [isGuestModalOpen, setIsGuestModalOpen] = React.useState(false)
  const [bookmarkedIds, setBookmarkedIds] = React.useState<string[]>([])

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_BOOKMARK_KEY)
      if (saved) setBookmarkedIds(JSON.parse(saved))
    } catch {}

    // Sinkronisasi dengan database favorit MariaDB
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

  const toggleBookmark = (bookId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isGuest) {
      setIsGuestModalOpen(true)
      return
    }
    let updated: string[]
    const currentId = String(bookId)
    if (bookmarkedIds.includes(currentId)) {
      updated = bookmarkedIds.filter((id) => id !== currentId)
    } else {
      updated = [...bookmarkedIds, currentId]
    }
    setBookmarkedIds(updated)
    try {
      localStorage.setItem(LOCAL_STORAGE_BOOKMARK_KEY, JSON.stringify(updated))
      window.dispatchEvent(new Event("bookmarks-updated"))

      // Kirim pembaruan ke tabel favorites MariaDB
      fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId: currentId, action: "toggle" }),
      }).catch(() => {})
    } catch {}
  }

  const [allBooks, setAllBooks] = React.useState<BookItem[]>([])

  React.useEffect(() => {
    fetch("/api/books")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.books) && d.books.length > 0) {
          setAllBooks(d.books)
        }
      })
      .catch(() => {})
  }, [])

  // Embla Carousel with Autoplay (interval 3500ms, loop) - Wajib dipanggil sebelum early return
  const [emblaRef] = useEmblaCarousel(
    {
      loop: true,
      align: "start",
      skipSnaps: false,
    },
    [
      Autoplay({
        delay: 3500,
        stopOnInteraction: true,
        stopOnMouseEnter: true,
      }),
    ]
  )

  if (allBooks.length === 0) return null

  // First book as featured banner, remaining as carousel
  const featuredBannerBook = allBooks[0]
  const popularBooks = allBooks.slice(1)

  return (
    <section className="w-full py-8 bg-white dark:bg-neutral-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header: 'Rekomendasi Untukmu' on left, 'Lihat Semua' on right (Exact from Video Frame 1) */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
            Rekomendasi Untukmu
          </h2>

          <Link
            href="/buku?sort=populer"
            className="text-xs font-semibold text-sky-700 dark:text-sky-400 hover:underline flex items-center gap-1"
          >
            <span>Lihat Semua</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Layout: Left Featured Banner + Right Carousel (Exact from Video Frame 1) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          
          {/* Left Featured Banner Card (Span 3) */}
          <div className="lg:col-span-3">
            <Link
              href={`/buku/${featuredBannerBook.slug}`}
              onClick={() => saveRecentlyViewed(featuredBannerBook)}
              className="group relative flex flex-col justify-between h-full min-h-[360px] rounded-3xl overflow-hidden bg-gradient-to-b from-sky-900 via-slate-900 to-indigo-950 text-white p-5 shadow-lg hover:shadow-xl transition-all"
            >
              {/* Badge Recommended Picks */}
              <div className="relative z-10">
                <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white shadow-xs">
                  Recommended Picks
                </span>
              </div>

              {/* Cover in center */}
              <div className="relative z-10 my-auto py-4 flex justify-center">
                <img
                  src={featuredBannerBook.coverUrl}
                  alt={featuredBannerBook.title}
                  decoding="async"
                  fetchPriority="high"
                  className="h-44 w-32 rounded-xl object-cover shadow-2xl ring-2 ring-white/20 group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Bottom text info */}
              <div className="relative z-10 space-y-1">
                <span className="text-[11px] text-sky-300 font-medium">
                  {featuredBannerBook.loanCount || 0} dibaca
                </span>
                <span className="block text-xs text-neutral-300">
                  {featuredBannerBook.authorName}
                </span>
                <h3 className="font-heading text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-sky-300 transition-colors">
                  {featuredBannerBook.title}
                </h3>
              </div>
            </Link>
          </div>

          {/* Right Carousel of Book Cards (Span 9) */}
          <div className="lg:col-span-9 overflow-hidden touch-pan-y" ref={emblaRef}>
            <div className="flex -ml-4">
              {popularBooks.map((book) => {
                const isBookmarked = bookmarkedIds.includes(book.id)

                return (
                  <div
                    key={book.id}
                    className="flex-[0_0_50%] sm:flex-[0_0_33.33%] md:flex-[0_0_25%] pl-4 min-w-0"
                  >
                    <div className="group relative flex flex-col justify-between h-full rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3 shadow-2xs hover:shadow-md hover:border-sky-300 dark:hover:border-sky-700 transition-[border-color,box-shadow] duration-200">
                      {/* Cover Image Container */}
                      <div className="relative aspect-3/4 w-full overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-900 mb-3 shadow-2xs">
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
                            decoding="async"
                            className="relative z-1 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 pointer-events-none"
                          />

                          {/* 3D Realistic Book Spine Effect */}
                          <div className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/35 via-black/10 to-transparent z-10" />
                          <div className="pointer-events-none absolute inset-y-0 left-1 w-[1px] bg-white/25 z-10" />
                          <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-black/10 dark:ring-white/10 z-10" />

                          {/* 🌐 ID badge (From video Frame 1) */}
                          <div className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-md bg-white/95 dark:bg-neutral-900/95 sm:backdrop-blur-xs px-1.5 py-0.5 shadow-xs text-[10px] font-bold text-sky-600">
                            <Globe className="h-3 w-3" />
                            <span>ID</span>
                          </div>
                        </Link>

                        {/* Hanging Ribbon Bookmark when bookmarked */}
                        {isBookmarked && (
                          <div className="absolute -top-1 right-11 z-20 pointer-events-none drop-shadow-sm animate-fade-in">
                            <div className="h-6 w-3 bg-rose-600 rounded-b-xs shadow-xs relative">
                              <div className="absolute -bottom-1 left-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[4px] border-t-rose-600" />
                            </div>
                          </div>
                        )}

                        {/* Heart / Bookmark Button */}
                        <button
                          type="button"
                          onClick={(e) => toggleBookmark(book.id, e)}
                          className={cn(
                            "absolute top-2 right-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-white dark:bg-neutral-900 shadow-md transition-transform duration-200 active:scale-75 hover:scale-110",
                            isBookmarked ? "text-sky-600" : "text-neutral-400 hover:text-neutral-700"
                          )}
                          title={isBookmarked ? "Hapus Simpanan" : "Simpan Buku"}
                        >
                          <Heart className={cn("h-3.5 w-3.5 transition-transform duration-200", isBookmarked && "fill-sky-600 text-sky-600 scale-110")} />
                        </button>
                      </div>

                      {/* Metadata matching video: Read count, author, title */}
                      <div className="space-y-1">
                        <span className="block text-[11px] text-neutral-400 font-medium">
                          {book.loanCount || 0} dibaca
                        </span>
                        <span className="block text-xs text-neutral-600 dark:text-neutral-400 font-medium truncate">
                          {book.authorName}
                        </span>
                        <Link
                          href={`/buku/${book.slug}`}
                          onClick={() => saveRecentlyViewed(book)}
                          className="block"
                        >
                          <h3 className="font-heading text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 line-clamp-2 leading-snug group-hover:text-sky-600 transition-colors">
                            {book.title}
                          </h3>
                        </Link>
                      </div>
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
