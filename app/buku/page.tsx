import type { Metadata } from "next"
import { Suspense } from "react"
import { TrendingTagsBar } from "@/components/home/trending-tags-bar"
import { BookCatalogue } from "@/components/home/book-catalogue"

export const metadata: Metadata = {
  title: "Katalog Buku Digital | PerpusAHM.com - RSJD Atma Husada Mahakam",
  description: "Direktori lengkap buku digital kesehatan jiwa, psikiatri, dan psikologi RSJD Atma Husada Mahakam Samarinda dengan filter multi-dimensi.",
}

export default function BukuCatalogPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <TrendingTagsBar />
      <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">Memuat katalog buku...</div>}>
        <BookCatalogue />
      </Suspense>
    </div>
  )
}
