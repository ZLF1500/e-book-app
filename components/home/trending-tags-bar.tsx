"use client"

import * as React from "react"
import Link from "next/link"
import { Flame } from "lucide-react"
import type { TagItem } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

export function TrendingTagsBar() {
  const [tags, setTags] = React.useState<TagItem[]>([])

  const fetchTags = React.useCallback(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.tags)) {
          setTags(d.tags)
        }
      })
      .catch(() => {})
  }, [])

  React.useEffect(() => {
    fetchTags()
    window.addEventListener("tags-updated", fetchTags)
    return () => window.removeEventListener("tags-updated", fetchTags)
  }, [fetchTags])

  // Take top 14 trending tags sorted by usage_count
  const trendingTags = [...tags].sort((a, b) => b.usageCount - a.usageCount).slice(0, 14)

  if (trendingTags.length === 0) return null

  return (
    <div className="w-full border-b border-border/50 bg-muted/20 backdrop-blur-xs py-2">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center gap-3">
        {/* Label icon */}
        <div className="flex items-center gap-1.5 shrink-0 text-xs font-semibold text-sky-600 dark:text-sky-400">
          <Flame className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
          <span className="hidden sm:inline">Topik Hangat:</span>
        </div>

        {/* Scrollable horizontal pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 scroll-smooth">
          {trendingTags.map((tag) => (
            <Link
              key={tag.id}
              href={`/buku?tag=${encodeURIComponent(tag.slug)}`}
              className={cn(
                "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all",
                "bg-background/80 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-muted-foreground hover:text-sky-600",
                "border border-border/60 hover:border-sky-200 dark:hover:border-sky-800 shadow-2xs"
              )}
            >
              <span>#{tag.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
