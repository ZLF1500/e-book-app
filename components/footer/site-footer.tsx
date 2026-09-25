"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { PhoneCall } from "lucide-react"
import { HelpDialog } from "@/components/member/help-dialog"
import { TermsDialog } from "@/components/member/terms-dialog"

export function SiteFooter() {
  const pathname = usePathname()
  const isAuthPage =
    pathname === "/masuk" ||
    pathname === "/daftar" ||
    pathname === "/lupa-password" ||
    pathname === "/reset-password" ||
    pathname === "/verifikasi"

  const [isHelpOpen, setIsHelpOpen] = React.useState(false)
  const [isTermsOpen, setIsTermsOpen] = React.useState(false)

  const isReaderPage = pathname?.startsWith("/baca/")
  const isAdminPage = pathname === "/admin" || pathname?.startsWith("/admin/")

  if (isAuthPage || isReaderPage || isAdminPage) {
    return null
  }

  return (
    <>
      <footer className="w-full border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 mt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            
            {/* Col 1: Brand & Desc (Span 2) */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-white p-0.5 ring-1 ring-border shadow-xs flex items-center justify-center">
                  <img
                    src="/logo.png"
                    alt="Logo RS Atma Husada Mahakam"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1 leading-none">
                    <span className="font-heading text-base font-black tracking-tight text-neutral-900 dark:text-neutral-100">
                      Perpus<span className="text-sky-600">AHM</span>
                    </span>
                    <span className="text-[9px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-1 py-0.2 rounded-md border border-sky-200 dark:border-sky-800 leading-none">
                      .com
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-medium mt-0.5">
                    RS Atma Husada Mahakam Samarinda
                  </span>
                </div>
              </div>

              <p className="text-xs leading-relaxed text-neutral-500 max-w-sm">
                Platform perpustakaan e-book modern yang menyediakan ribuan koleksi buku digital kesehatan jiwa, psikiatri, dan pengembangan diri untuk berbagai kalangan.
              </p>

              {/* Hotline 24 Jam RSJD */}
              <div className="inline-flex items-center gap-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 px-3 py-1.5 text-xs text-sky-800 dark:text-sky-200 font-semibold">
                <PhoneCall className="h-3.5 w-3.5 text-sky-600" />
                <span>Hotline RSJD 24 Jam: (0541) 743364</span>
              </div>
            </div>

            {/* Col 2: Jelajahi */}
            <div className="space-y-3">
              <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                Jelajahi
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href="/buku" className="hover:text-sky-600 transition-colors">
                    Semua Buku
                  </Link>
                </li>
                <li>
                  <Link href="/buku?sort=populer" className="hover:text-sky-600 transition-colors">
                    Terpopuler
                  </Link>
                </li>
                <li>
                  <Link href="/buku?sort=terbaru" className="hover:text-sky-600 transition-colors">
                    Rilis Terbaru
                  </Link>
                </li>
                <li>
                  <Link href="/pinjaman" className="hover:text-sky-600 transition-colors">
                    Pinjaman Saya
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Tentang */}
            <div className="space-y-3">
              <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                Tentang
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href="/tentang" className="hover:text-sky-600 transition-colors">
                    Tentang Kami
                  </Link>
                </li>
                <li>
                  <Link href="/#blog" className="hover:text-sky-600 transition-colors">
                    Blog & Artikel
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setIsHelpOpen(true)}
                    className="hover:text-sky-600 transition-colors text-left"
                  >
                    FAQ
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setIsHelpOpen(true)}
                    className="hover:text-sky-600 transition-colors text-left"
                  >
                    Kontak Pustakawan
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 4: Bantuan */}
            <div className="space-y-3">
              <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                Bantuan & Hukum
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button
                    type="button"
                    onClick={() => setIsTermsOpen(true)}
                    className="hover:text-sky-600 transition-colors text-left"
                  >
                    Syarat & Ketentuan
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setIsTermsOpen(true)}
                    className="hover:text-sky-600 transition-colors text-left"
                  >
                    Kebijakan Privasi
                  </button>
                </li>
                <li>
                  <Link href="/admin" className="hover:text-sky-600 transition-colors font-medium text-neutral-400">
                    Panel Pustakawan
                  </Link>
                </li>
              </ul>
            </div>

          </div>

          {/* Bottom Copyright */}
          <div className="mt-12 pt-6 border-t border-neutral-150 dark:border-neutral-800 text-xs text-neutral-400 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>
              &copy; {new Date().getFullYear()} RSJD Atma Husada Mahakam. Hak Cipta Dilindungi.
            </p>
            <span className="text-[11px] text-neutral-400">
              Jl. Kakap No. 23, Samarinda, Kalimantan Timur
            </span>
          </div>
        </div>
      </footer>

      {/* Interactive Modal Dialogs */}
      <HelpDialog open={isHelpOpen} onOpenChange={setIsHelpOpen} />
      <TermsDialog open={isTermsOpen} onOpenChange={setIsTermsOpen} />
    </>
  )
}
