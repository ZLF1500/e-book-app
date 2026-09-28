"use client"

import * as React from "react"
import { ArrowRight, BookOpen, Calendar, Clock, Share2, Sparkles, User } from "lucide-react"
import { ArticleItem } from "@/lib/mock-data"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function ArticlesSection() {
  const [articles, setArticles] = React.useState<(ArticleItem & { content: string[] })[]>([])
  const [selectedArticle, setSelectedArticle] = React.useState<(ArticleItem & { content: string[] }) | null>(null)
  const [showAll, setShowAll] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    let mounted = true
    fetch("/api/articles")
      .then((res) => res.json())
      .then((data) => {
        if (mounted && data.success && Array.isArray(data.articles)) {
          setArticles(data.articles)
        }
      })
      .catch((err) => console.error("Error fetching articles:", err))
      .finally(() => {
        if (mounted) setIsLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const displayedArticles = showAll ? articles : articles.slice(0, 4)

  if (!isLoading && articles.length === 0) return null

  const handleShare = (title: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href)
      toast.success("Tautan artikel berhasil disalin ke clipboard!")
    } else {
      toast.info(`Membaca artikel: ${title}`)
    }
  }

  return (
    <section id="blog" className="w-full py-10 bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 scroll-mt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header: 'Blog' on left, 'Lihat Semua' on right */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
              Blog & Edukasi
            </h2>
            <span className="hidden sm:inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
              Kesehatan Jiwa
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-semibold text-sky-700 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{showAll ? "Tampilkan Lebih Sedikit" : "Lihat Semua"}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* 4-Column Article Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayedArticles.map((article) => (
            <div
              key={article.id}
              onClick={() => setSelectedArticle(article)}
              className="group flex flex-col justify-between rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-2xs hover:shadow-md hover:border-sky-300 dark:hover:border-sky-700 transition-[border-color,box-shadow] duration-200 cursor-pointer content-visibility-auto"
            >
              {/* Thumbnail with bottom-right badge */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                <img
                  src={article.thumbnailUrl}
                  alt={article.title}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                />
                <div className="absolute bottom-2.5 right-2.5">
                  <span className="rounded-full bg-black/75 sm:backdrop-blur-xs px-2 py-0.5 text-[9px] font-semibold text-white">
                    {article.category}
                  </span>
                </div>
              </div>

              {/* Text content */}
              <div className="flex flex-col flex-1 p-4 justify-between space-y-3">
                <div className="space-y-1.5">
                  <h3 className="font-heading text-sm font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-sky-600 transition-colors leading-snug line-clamp-2">
                    {article.title}
                  </h3>

                  <p className="text-xs text-neutral-500 leading-relaxed line-clamp-3">
                    {article.excerpt}
                  </p>
                </div>

                <div className="pt-2 border-t border-neutral-150 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
                  <span>{article.publishedAt}</span>
                  <span className="text-sky-600 font-semibold group-hover:underline">
                    Baca Selengkapnya
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Article Detail Reading Dialog */}
      <Dialog open={!!selectedArticle} onOpenChange={(open) => !open && setSelectedArticle(null)}>
        {selectedArticle && (
          <DialogContent className="max-w-2xl p-6 rounded-3xl border-border max-h-[90vh] overflow-y-auto flex flex-col gap-4">
            <DialogHeader className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-sky-100 dark:bg-sky-950/80 px-2.5 py-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-300">
                  {selectedArticle.category}
                </span>
                <span className="text-xs text-muted-foreground">• {selectedArticle.readTime}</span>
              </div>
              <DialogTitle className="font-heading text-xl font-bold leading-snug text-foreground">
                {selectedArticle.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground flex items-center gap-3 pt-1">
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-sky-600" />
                  {selectedArticle.authorName}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {selectedArticle.publishedAt}
                </span>
              </DialogDescription>
            </DialogHeader>

            <div className="relative aspect-video w-full rounded-2xl overflow-hidden shrink-0 shadow-xs bg-muted">
              <img
                src={selectedArticle.thumbnailUrl}
                alt={selectedArticle.title}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-foreground/90 leading-relaxed">
              {selectedArticle.content.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border mt-2">
              <button
                type="button"
                onClick={() => handleShare(selectedArticle.title)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-sky-600 transition-colors"
              >
                <Share2 className="h-4 w-4" />
                <span>Bagikan Artikel</span>
              </button>

              <Button
                size="sm"
                onClick={() => setSelectedArticle(null)}
                className="h-9 px-5 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-xs"
              >
                Tutup Bacaan
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </section>
  )
}
