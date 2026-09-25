import type { BookItem } from "@/lib/mock-data"

export const RECENTLY_VIEWED_KEY = "rsjd_recently_viewed_books"
export const RECENTLY_VIEWED_EVENT = "recently-viewed-updated"

export interface RecentlyViewedBook {
  id: string
  title: string
  slug: string
  coverUrl: string
  authorName: string
  categoryName: string
  loanCount: number
  averageRating: number
  language: string
  status: string
  formats?: any
  synopsis?: string
}

/**
 * Normalizes any partial book into a standardized RecentlyViewedBook summary.
 */
export function normalizeRecentBook(book: any): RecentlyViewedBook | null {
  if (!book || (!book.id && !book.slug)) return null
  const id = String(book.id || book.slug)
  const slug = String(book.slug || book.id)
  return {
    id,
    slug,
    title: String(book.title || "Buku Tanpa Judul"),
    coverUrl: String(book.coverUrl || "/placeholder.svg"),
    authorName: String(book.authorName || "Penulis Tidak Diketahui"),
    categoryName: String(book.categoryName || "Umum"),
    loanCount: typeof book.loanCount === "number" ? book.loanCount : 0,
    averageRating: typeof book.averageRating === "number" ? book.averageRating : 5.0,
    language: String(book.language || "Indonesia"),
    status: String(book.status || "aktif"),
    formats: book.formats,
    synopsis: book.synopsis,
  }
}

/**
 * Save a book to Recently Viewed in localStorage and dispatch update events.
 * Works seamlessly for dynamic MySQL/MariaDB books.
 */
export function saveRecentlyViewed(book: any) {
  if (typeof window === "undefined" || !book) return

  const normalized = normalizeRecentBook(book)
  if (!normalized) return

  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY)
    let list: any[] = []
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          list = parsed
        }
      } catch {
        list = []
      }
    }

    // Filter out existing instances of this book
    const filtered = list.filter((item) => {
      if (!item) return false
      if (typeof item === "string") {
        return item !== normalized.id && item !== normalized.slug
      }
      if (typeof item === "object") {
        return String(item.id) !== normalized.id && String(item.slug) !== normalized.slug
      }
      return true
    })

    const updated = [normalized, ...filtered].slice(0, 12)
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated))

    // Broadcast across components & tabs
    window.dispatchEvent(new CustomEvent(RECENTLY_VIEWED_EVENT, { detail: normalized }))

    // Sinkronisasi asinkron ke tabel recently_viewed di MariaDB
    fetch("/api/recently-viewed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId: normalized.id }),
    }).catch(() => {})
  } catch (err) {
    console.error("Failed to save recently viewed book:", err)
  }
}

/**
 * Synchronously load stored books from localStorage.
 */
export function getStoredRecentlyViewed(): RecentlyViewedBook[] {
  if (typeof window === "undefined") return []

  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    const results: RecentlyViewedBook[] = []

    for (const item of parsed) {
      if (!item) continue

      // Item is already an object saved with our standardized structure
      if (typeof item === "object" && (item.id || item.slug) && item.title) {
        const normalized = normalizeRecentBook(item)
        if (normalized) results.push(normalized)
      }
    }

    return results.slice(0, 10)
  } catch {
    return []
  }
}

/**
 * Resolves any missing/legacy string IDs in localStorage by querying /api/books.
 * Updates localStorage to full object representations so future reads are instant.
 */
export async function syncRecentlyViewedWithDatabase(): Promise<RecentlyViewedBook[]> {
  if (typeof window === "undefined") return []

  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return []

    const hasLegacyStrings = parsed.some((item) => typeof item === "string")

    // If all are already valid objects, return them
    if (!hasLegacyStrings) {
      return getStoredRecentlyViewed()
    }

    // Fetch live catalog to resolve legacy strings (e.g. uploaded books like "38")
    const res = await fetch("/api/books")
    const data = await res.json()
    const liveBooks: BookItem[] = data.success && Array.isArray(data.books) ? data.books : []
    const combinedPool = liveBooks

    const resolved: RecentlyViewedBook[] = []

    for (const item of parsed) {
      if (!item) continue
      if (typeof item === "object" && item.title) {
        const norm = normalizeRecentBook(item)
        if (norm) resolved.push(norm)
      } else if (typeof item === "string") {
        const match = combinedPool.find((b) => String(b.id) === item || b.slug === item)
        if (match) {
          const norm = normalizeRecentBook(match)
          if (norm) resolved.push(norm)
        }
      }
    }

    // Gabungkan riwayat dari tabel recently_viewed di MariaDB
    try {
      const dbRes = await fetch("/api/recently-viewed")
      const dbData = await dbRes.json()
      if (dbData.success && Array.isArray(dbData.books)) {
        for (const dbBook of dbData.books) {
          if (!resolved.some((r) => r.id === String(dbBook.id))) {
            const norm = normalizeRecentBook(dbBook)
            if (norm) resolved.push(norm)
          }
        }
      }
    } catch {}

    // Persist upgraded objects back to localStorage
    if (resolved.length > 0) {
      localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(resolved))
    }

    return resolved.slice(0, 10)
  } catch {
    return getStoredRecentlyViewed()
  }
}
