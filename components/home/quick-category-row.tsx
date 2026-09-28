"use client"

import * as React from "react"
import Link from "next/link"
import {
  Brain,
  HeartHandshake,
  Sparkles,
  Activity,
  Users,
  Apple,
  Smile,
  ShieldAlert,
  BookOpen,
  Compass,
  ArrowRight,
} from "lucide-react"

import type { CategoryItem } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

// Curated high-resolution imagery for Top Categories (Gramedia & RuangBaca style)
const POPULAR_CATEGORY_TILES = [
  {
    name: "Kesehatan Jiwa & Psikiatri",
    slug: "kesehatan-jiwa-psikiatri",
    imageUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=80",
    badge: "Populer",
  },
  {
    name: "Mindfulness & Pengembangan Diri",
    slug: "pengembangan-diri-mindfulness",
    imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&auto=format&fit=crop&q=80",
    badge: "Tren",
  },
  {
    name: "Manajemen Stres & Anti-Burnout",
    slug: "manajemen-stres-burnout",
    imageUrl: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=600&auto=format&fit=crop&q=80",
    badge: "Terlaris",
  },
  {
    name: "Parenting & Keluarga Tangguh",
    slug: "parenting-perkembangan-anak",
    imageUrl: "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=600&auto=format&fit=crop&q=80",
    badge: "Favorit",
  },
  {
    name: "Sastra, Novel & Biblioterapi",
    slug: "sastra-novel-fiksi",
    imageUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80",
    badge: "Pilihan",
  },
]

// Icon mapping helper for pills
const ICON_MAP: Record<string, React.ReactNode> = {
  Brain: <Brain className="h-4 w-4 text-sky-600" />,
  HeartHandshake: <HeartHandshake className="h-4 w-4 text-indigo-600" />,
  Sparkles: <Sparkles className="h-4 w-4 text-amber-500" />,
  Activity: <Activity className="h-4 w-4 text-rose-500" />,
  Users: <Users className="h-4 w-4 text-teal-600" />,
  Apple: <Apple className="h-4 w-4 text-emerald-600" />,
  Smile: <Smile className="h-4 w-4 text-orange-500" />,
  ShieldAlert: <ShieldAlert className="h-4 w-4 text-blue-600" />,
  BookOpen: <BookOpen className="h-4 w-4 text-purple-600" />,
  Compass: <Compass className="h-4 w-4 text-cyan-600" />,
}

export function QuickCategoryRow() {
  const [categories, setCategories] = React.useState<CategoryItem[]>([])

  React.useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.categories)) {
          setCategories(d.categories)
        }
      })
      .catch(() => {})
  }, [])

  return (
    <section className="w-full py-6 sm:py-8 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* 1. KATEGORI TERLARIS (Gramedia / RuangBaca Visual Tiles Style) */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
              Kategori Terlaris
            </h2>
            <Link
              href="/buku"
              className="text-xs font-semibold text-sky-700 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 flex items-center gap-1 group"
            >
              <span>Lihat Semua</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {POPULAR_CATEGORY_TILES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/buku?category=${encodeURIComponent(cat.slug)}`}
                className="group relative h-28 sm:h-32 rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-[transform,box-shadow] duration-200 active:scale-[0.98] border border-neutral-200/60 dark:border-neutral-800/60 hover:-translate-y-1"
              >
                <img
                  src={cat.imageUrl}
                  alt={cat.name}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                />
                {/* Subtle dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10 group-hover:from-black/90 transition-colors" />

                <div className="relative z-10 h-full p-3 sm:p-3.5 flex flex-col justify-end">
                  <h4 className="font-heading text-xs sm:text-sm font-bold text-white leading-snug group-hover:text-sky-300 transition-colors line-clamp-2">
                    {cat.name}
                  </h4>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 2. CHIPS SEMUA KATEGORI (Pill Tipis Bersih) */}
        <div className="pt-2">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 scroll-smooth">
            <span className="text-xs font-bold text-neutral-400 shrink-0 uppercase tracking-wider mr-1">
              Jelajahi:
            </span>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/buku?category=${encodeURIComponent(cat.slug)}`}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-all duration-200",
                  "bg-neutral-100/80 dark:bg-neutral-900/80 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-neutral-700 dark:text-neutral-300 hover:text-sky-600",
                  "border border-neutral-200/70 dark:border-neutral-800/70 hover:border-sky-300 dark:hover:border-sky-700"
                )}
              >
                <span className="shrink-0">{ICON_MAP[cat.iconName] ?? <Brain className="h-3.5 w-3.5 text-sky-600" />}</span>
                <span>{cat.name}</span>
                <span className="text-[10px] text-neutral-400 font-normal">({cat.bookCount})</span>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}
