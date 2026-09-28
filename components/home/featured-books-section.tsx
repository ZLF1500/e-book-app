"use client"

import * as React from "react"
import Link from "next/link"
import { Award, Star, BookOpen, ArrowRight, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { BookItem } from "@/lib/mock-data"
import { saveRecentlyViewed } from "@/lib/recently-viewed"

export function FeaturedBooksSection() {
  const [featuredBooks, setFeaturedBooks] = React.useState<BookItem[]>([])

  React.useEffect(() => {
    fetch("/api/books?featured=1")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.books)) {
          setFeaturedBooks(d.books.slice(0, 3))
        }
      })
      .catch(() => {})
  }, [])

  if (featuredBooks.length === 0) return null

  return (
    <section className="w-full py-10 bg-gradient-to-br from-sky-900 via-slate-900 to-indigo-950 text-white rounded-3xl my-10 overflow-hidden shadow-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-sky-400 mb-1.5">
              <Award className="h-4 w-4" />
              <span>Kurasi Khusus Tim Medis RSJD</span>
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Buku Pilihan Editor
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Rekomendasi bacaan terbaik dari dokter spesialis jiwa dan psikolog klinis untuk panduan kesehatan mental Anda.
            </p>
          </div>

          <Link
            href="/buku?featured=true"
            className="inline-flex items-center gap-1.5 rounded-xl border border-sky-400/40 bg-white/5 hover:bg-white/15 text-sky-200 hover:text-white px-3.5 py-1.5 text-xs font-semibold backdrop-blur-xs transition-all shadow-xs cursor-pointer"
          >
            <span>Semua Pilihan Editor</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Featured 3 Cards Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredBooks.map((book) => (
            <div
              key={book.id}
              className="flex flex-col justify-between rounded-2xl bg-white/10 sm:backdrop-blur-md border border-white/15 p-4 hover:border-sky-400/50 hover:bg-white/15 transition-[border-color,background-color] duration-200 group"
            >
              <div className="flex gap-4">
                <Link
                  href={`/buku/${book.slug}`}
                  onClick={() => saveRecentlyViewed(book)}
                  className="shrink-0"
                >
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    loading="lazy"
                    decoding="async"
                    className="h-32 w-24 rounded-xl object-cover shadow-lg ring-1 ring-white/20 group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                  />
                </Link>

                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Badge className="bg-sky-500 text-white text-[10px] px-2 py-0 border-0">
                      Editor&apos;s Pick
                    </Badge>
                  </div>
                  <Link
                    href={`/buku/${book.slug}`}
                    onClick={() => saveRecentlyViewed(book)}
                  >
                    <h3 className="font-heading text-sm font-bold text-white line-clamp-2 group-hover:text-sky-300 transition-colors leading-snug">
                      {book.title}
                    </h3>
                  </Link>
                  <p className="text-xs text-slate-300 line-clamp-1 mt-1">
                    {book.authorName}
                  </p>
                  {(book.reviewCount || 0) > 0 ? (
                    <div className="flex items-center gap-1 text-xs text-amber-300 mt-2 font-semibold">
                      <Star className="h-3.5 w-3.5 fill-amber-300" />
                      <span>{book.averageRating.toFixed(1)}</span>
                      <span className="text-slate-400 text-[11px]">({book.reviewCount} ulasan)</span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 mt-2 italic">
                      Belum ada ulasan
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-slate-300 flex items-center gap-1 text-[11px]">
                  <BookOpen className="h-3 w-3" />
                  {book.pageCount} hlm
                </span>
                <Link
                  href={`/buku/${book.slug}`}
                  onClick={() => saveRecentlyViewed(book)}
                >
                  <Button
                    size="sm"
                    className="h-7 px-3 text-xs bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-lg"
                  >
                    Pinjam & Baca
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
