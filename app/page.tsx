import { TrendingTagsBar } from "@/components/home/trending-tags-bar"
import { PopularBooksCarousel } from "@/components/home/popular-books-carousel"
import { QuickCategoryRow } from "@/components/home/quick-category-row"
import { RecentlyViewedSection } from "@/components/home/recently-viewed-section"
import { FeaturedBooksSection } from "@/components/home/featured-books-section"
import { ExploreCatalogBanner } from "@/components/home/explore-catalog-banner"
import { ArticlesSection } from "@/components/home/articles-section"

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* 3.0.0 Baris Tag Populer (Pill Tipis Tepat di Bawah Header) */}
      <TrendingTagsBar />

      {/* 3.0 Carousel Cover Buku Populer (Auto-slide 3-4s, Tanpa Navigasi Panah/Dots) */}
      <PopularBooksCarousel />

      {/* 3.0.1 Baris Ikon Kategori Cepat (Ala Gramedia) */}
      <QuickCategoryRow />

      {/* 3.0.2 Baru Saja Dilihat (Ala Gramedia, Hide Jika Kosong) */}
      <RecentlyViewedSection />

      {/* Buku Pilihan Editor (Featured) */}
      <FeaturedBooksSection />

      {/* Banner CTA Eksplorasi Katalog Lengkap (/buku) */}
      <ExploreCatalogBanner />

      {/* Blog & Artikel Edukasi Kesehatan Jiwa RSJD */}
      <ArticlesSection />
    </div>
  )
}
