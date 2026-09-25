import * as React from "react"
import { Skeleton } from "@/components/ui/skeleton"

export function BookCardSkeleton() {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-950 p-3 shadow-2xs space-y-3">
      {/* Cover Skeleton */}
      <Skeleton className="aspect-3/4 w-full rounded-xl" />
      
      {/* Metadata Skeleton */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-16 rounded-md" />
          <Skeleton className="h-3 w-10 rounded-md" />
        </div>
        <Skeleton className="h-4 w-5/6 rounded-md" />
        <Skeleton className="h-3 w-1/2 rounded-md" />
      </div>
    </div>
  )
}

export function BookListSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-2xl border border-border/80 bg-card shadow-2xs">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <Skeleton className="h-20 w-14 rounded-lg shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-20 rounded-md" />
          <Skeleton className="h-4 w-3/4 rounded-md" />
          <Skeleton className="h-3 w-1/3 rounded-md" />
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Skeleton className="h-8 w-24 rounded-xl" />
      </div>
    </div>
  )
}

export function LoanCardSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl border border-border bg-card shadow-xs">
      <Skeleton className="h-36 w-24 rounded-xl shrink-0 self-center sm:self-start" />
      <div className="flex flex-col justify-between flex-1 min-w-0 space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-4 w-24 rounded-md" />
          </div>
          <Skeleton className="h-5 w-4/5 rounded-md" />
          <Skeleton className="h-3.5 w-1/3 rounded-md" />
          <Skeleton className="h-2 w-full rounded-full mt-2" />
        </div>
        <div className="pt-3 border-t border-border/60 flex justify-between items-center">
          <Skeleton className="h-3 w-20 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
