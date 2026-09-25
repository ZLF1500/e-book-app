"use client"

import * as React from "react"
import Link from "next/link"
import { Sparkles, ArrowRight, BookOpen, Layers, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface CuratedShelf {
  id: string
  title: string
  subtitle: string
  icon: string
  themeColor: string
  categoryFilter: string
  tag: string
  bookCount: number
  description: string
}

const THEMATIC_SHELVES: CuratedShelf[] = [
  {
    id: "shelf-stress",
    title: "Manajemen Stres & Anti-Burnout",
    subtitle: "Paket Literasi Pemulihan Mental",
    icon: "🧠",
    themeColor: "from-sky-500/20 to-blue-600/10 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300",
    categoryFilter: "manajemen-stres-burnout",
    tag: "Burnout",
    bookCount: 8,
    description: "Kumpulan panduan praktis mengenali kelelahan emosional kerja dan teknik regulasi sistem saraf mandiri.",
  },
  {
    id: "shelf-parenting",
    title: "Pengasuhan Anak & Remaja",
    subtitle: "Edukasi Keluarga Tangguh",
    icon: "👨‍👩‍👧",
    themeColor: "from-amber-500/20 to-orange-600/10 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300",
    categoryFilter: "parenting-perkembangan-anak",
    tag: "Pola Asuh",
    bookCount: 6,
    description: "Menavigasi perubahan emosi remaja, komunikasi tanpa bentakan, dan membangun kedekatan batin orang tua-anak.",
  },
  {
    id: "shelf-mindfulness",
    title: "Ketenangan Jiwa & Tidur Nyenyak",
    subtitle: "Mindfulness & Self-Compassion",
    icon: "🌿",
    themeColor: "from-emerald-500/20 to-teal-600/10 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300",
    categoryFilter: "pengembangan-diri-mindfulness",
    tag: "Mindfulness",
    bookCount: 7,
    description: "Latihan kesadaran penuh, terapi penerimaan diri (ACT), dan higiene tidur untuk meredakan kecemasan berlebih.",
  },
  {
    id: "shelf-clinical",
    title: "Referensi Psikiatri & Medis",
    subtitle: "Kurasi Spesialis Kejiwaan RSJD",
    icon: "🏥",
    themeColor: "from-purple-500/20 to-indigo-600/10 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300",
    categoryFilter: "kesehatan-jiwa-psikiatri",
    tag: "Depresi",
    bookCount: 9,
    description: "Rujukan akademis klinis bagi residen, perawat, tenaga medis, dan praktisi kesehatan mental terstandar.",
  },
]

export function CuratedShelvesSection() {
  const [shelves, setShelves] = React.useState(THEMATIC_SHELVES)

  React.useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.categories)) {
          setShelves((prev) =>
            prev.map((s) => {
              const matched = d.categories.find(
                (c: { slug: string; name: string; bookCount: number }) =>
                  c.slug === s.categoryFilter ||
                  c.name.toLowerCase() === s.title.toLowerCase()
              )
              return matched ? { ...s, bookCount: matched.bookCount } : s
            })
          )
        }
      })
      .catch(() => {})
  }, [])

  return (
    <section className="w-full py-8 bg-neutral-50/70 dark:bg-neutral-900/30 border-y border-neutral-200/80 dark:border-neutral-800/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Rak Tematik Kurasi Pustakawan</span>
            </div>
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
              Paket Bacaan Tematik Pilihan
            </h2>
          </div>
          <p className="text-xs text-muted-foreground max-w-md">
            Kurasi terfokus oleh tim medis & pustakawan RSJD Atma Husada Mahakam untuk solusi spesifik kesehatan mental Anda.
          </p>
        </div>

        {/* 4 Thematic Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {shelves.map((shelf) => (
            <Link
              key={shelf.id}
              href={`/buku?category=${encodeURIComponent(shelf.categoryFilter)}`}
              className={cn(
                "group relative flex flex-col justify-between p-5 rounded-3xl border bg-gradient-to-b transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
                shelf.themeColor,
                "bg-white dark:bg-neutral-900"
              )}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-3xl p-2 rounded-2xl bg-white dark:bg-neutral-800 shadow-xs border border-border/60">
                    {shelf.icon}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-bold bg-white/80 dark:bg-neutral-800/80">
                    {shelf.bookCount} Buku Siap Akses
                  </Badge>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {shelf.subtitle}
                  </span>
                  <h3 className="font-heading text-base font-bold text-foreground group-hover:text-sky-600 transition-colors mt-0.5">
                    {shelf.title}
                  </h3>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {shelf.description}
                </p>
              </div>

              <div className="pt-4 mt-2 border-t border-border/50 flex items-center justify-between text-xs font-bold text-sky-600 dark:text-sky-400 group-hover:translate-x-0.5 transition-transform">
                <span>Buka Paket Bacaan</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
