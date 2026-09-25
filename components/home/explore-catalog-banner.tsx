"use client"

import * as React from "react"
import Link from "next/link"
import { BookOpen, ArrowRight, Sparkles, Filter, CheckCircle2, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
export function ExploreCatalogBanner() {
  const [categories, setCategories] = React.useState<{ id: string | number; name: string; slug: string }[]>([])
  const [totalBooks, setTotalBooks] = React.useState<number>(0)

  React.useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.categories)) {
          setCategories(d.categories)
        }
      })
      .catch(() => {})

    fetch("/api/books")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.books)) {
          setTotalBooks(d.books.length)
        }
      })
      .catch(() => {})
  }, [])

  return (
    <section className="w-full py-12 bg-gradient-to-b from-neutral-50/60 to-white dark:from-neutral-900/40 dark:to-neutral-950 border-t border-neutral-200/80 dark:border-neutral-800/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-sky-200/80 dark:border-sky-900/60 bg-gradient-to-br from-sky-50 via-white to-blue-50/50 dark:from-neutral-900 dark:via-neutral-900/90 dark:to-sky-950/30 p-6 sm:p-10 shadow-sm">
          
          {/* Decorative Background Accents */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            
            {/* Left Content Area */}
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 dark:bg-sky-950/80 px-3 py-1 text-xs font-bold text-sky-700 dark:text-sky-300">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Direktori Terbuka RSJD Atma Husada Mahakam</span>
              </div>

              <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                Jelajahi {totalBooks > 0 ? `${totalBooks}+` : "Puluhan"} Koleksi Buku & Riset Kejiwaan Lengkap
              </h2>

              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Temukan literasi kesehatan mental terlengkap dengan filter multi-kategori, pencarian penulis psikiater spesialis, rentang tahun terbit, dan akses instan format EPUB/PDF tanpa antrean eksemplar.
              </p>

              {/* Quick Feature Highlights */}
              <div className="flex flex-wrap gap-4 pt-1 text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Akses Peminjaman 1–7 Hari Bebas Antre</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Filter className="h-4 w-4 text-sky-500 shrink-0" />
                  <span>Live Filter Sidebar Multi-Dimensi</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-indigo-500 shrink-0" />
                  <span>EPUB & PDF DRM Protected</span>
                </div>
              </div>

              {/* Quick Category Shortcuts */}
              {categories.length > 0 && (
                <div className="pt-2">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                    Pilih Kategori Langsung:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.slice(0, 6).map((cat) => (
                      <Link
                        key={cat.id}
                        href={`/buku?category=${encodeURIComponent(cat.slug)}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-white dark:bg-neutral-800 px-2.5 py-1 text-xs text-neutral-700 dark:text-neutral-300 hover:border-sky-500 hover:text-sky-600 transition-colors shadow-2xs"
                      >
                        <Layers className="h-3 w-3 text-sky-600" />
                        <span>{cat.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Action Area */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0 lg:min-w-[260px]">
              <Link href="/buku" className="w-full">
                <Button className="w-full h-12 px-6 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-md shadow-sky-600/20 flex items-center justify-center gap-2 group cursor-pointer">
                  <span>Buka Katalog Lengkap</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>

              <Link href="/buku?featured=true" className="w-full">
                <Button
                  variant="outline"
                  className="w-full h-11 px-5 rounded-2xl border-neutral-300 dark:border-neutral-700 bg-white/80 dark:bg-neutral-800/80 hover:bg-white text-xs font-semibold text-neutral-800 dark:text-neutral-200 shadow-2xs"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-500 mr-1.5" />
                  <span>Koleksi Pilihan Editor</span>
                </Button>
              </Link>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}
