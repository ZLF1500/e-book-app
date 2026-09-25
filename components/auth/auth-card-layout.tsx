"use client"

import * as React from "react"
import Link from "next/link"

interface AuthCardLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export function AuthCardLayout({ children, title, subtitle }: AuthCardLayoutProps) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-0 sm:py-8 sm:px-6 lg:px-8 bg-background sm:bg-radial-[at_top_center] sm:from-sky-50/50 sm:via-background sm:to-muted/30 dark:sm:from-sky-950/20 dark:sm:via-background dark:sm:to-neutral-950 transition-colors">
      
      {/* MOBILE BRAND HEADER (Hanya tampil di HP: bersih, elegan, tanpa kartu melayang) */}
      <header className="lg:hidden w-full pt-8 pb-3 px-5 flex justify-center items-center">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-white p-0.5 ring-1 ring-border shadow-2xs flex items-center justify-center group-hover:scale-105 transition-transform">
            <img
              src="/logo.png"
              alt="Logo RS Atma Husada Mahakam"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1 leading-none">
              <span className="font-heading text-lg font-black tracking-tight text-foreground">
                Perpus<span className="text-sky-600">AHM</span>
              </span>
              <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-1 py-0.2 rounded-md border border-sky-200 dark:border-sky-800 leading-none">
                .com
              </span>
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground tracking-wide block mt-0.5">
              RS Atma Husada Mahakam
            </span>
          </div>
        </Link>
      </header>

      {/* ADAPTIVE CONTAINER (Di HP: Full-Bleed Tanpa Card. Di Desktop/Tablet: Split-Card Mewah) */}
      <div className="w-full flex-1 sm:flex-initial max-w-full sm:max-w-xl lg:max-w-5xl rounded-none sm:rounded-[32px] border-0 sm:border sm:border-border/80 bg-background sm:bg-card text-card-foreground shadow-none sm:shadow-xl sm:shadow-sky-950/5 dark:sm:shadow-none overflow-hidden transition-all flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-0 sm:min-h-[580px]">
          
          {/* SISI KIRI: BRANDING & ILUSTRASI BACAAN (Hanya tampil di Desktop >= lg) */}
          <div className="hidden lg:flex lg:col-span-5 bg-muted/20 dark:bg-neutral-900/40 p-8 lg:p-10 flex-col justify-between items-center border-r border-border/70 text-center">
            {/* Logo Brand Desktop */}
            <div className="w-full flex justify-start">
              <Link href="/" className="inline-flex items-center gap-2.5 group">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-white p-0.5 ring-1 ring-border shadow-2xs flex items-center justify-center group-hover:scale-105 transition-transform">
                  <img
                    src="/logo.png"
                    alt="Logo RS Atma Husada Mahakam"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1 leading-none">
                    <span className="font-heading text-lg font-black tracking-tight text-foreground">
                      Perpus<span className="text-sky-600">AHM</span>
                    </span>
                    <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-1 py-0.2 rounded-md border border-sky-200 dark:border-sky-800 leading-none">
                      .com
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground tracking-wide block mt-0.5">
                    RS Atma Husada Mahakam
                  </span>
                </div>
              </Link>
            </div>

            {/* Ilustrasi Membaca */}
            <div className="my-auto max-w-[260px] w-full">
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-white/70 dark:bg-white/5 border border-border/60 shadow-xs p-2">
                <img
                  src="/auth-illustration.jpg"
                  alt="Ilustrasi Membaca PerpusAHM"
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
            </div>

            {/* Footer Kiri: Sosial Media & Kontak Desktop */}
            <div className="w-full space-y-2 pt-2">
              <div className="flex items-center justify-center gap-3 text-muted-foreground">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-7 w-7 rounded-lg border border-border bg-background hover:bg-muted hover:text-foreground flex items-center justify-center transition-colors"
                  aria-label="Facebook PerpusAHM"
                >
                  <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a
                  href="https://x.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-7 w-7 rounded-lg border border-border bg-background hover:bg-muted hover:text-foreground flex items-center justify-center transition-colors"
                  aria-label="X (Twitter) PerpusAHM"
                >
                  <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-7 w-7 rounded-lg border border-border bg-background hover:bg-muted hover:text-foreground flex items-center justify-center transition-colors"
                  aria-label="Instagram PerpusAHM"
                >
                  <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a
                  href="https://tiktok.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-7 w-7 rounded-lg border border-border bg-background hover:bg-muted hover:text-foreground flex items-center justify-center transition-colors"
                  aria-label="TikTok PerpusAHM"
                >
                  <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                  </svg>
                </a>
              </div>

              <div className="text-[10px] text-muted-foreground leading-tight space-y-0.5">
                <p className="font-medium text-sky-600 dark:text-sky-400">
                  kontak@perpusahm.com &bull; (0541) 743364
                </p>
                <p>&copy; 2026 PerpusAHM &bull; RS Atma Husada Mahakam</p>
              </div>
            </div>
          </div>

          {/* SISI KANAN / MOBILE CONTENT: FORMULIR OTENTIKASI */}
          <div className="lg:col-span-7 px-5 py-4 sm:p-8 lg:p-12 flex flex-col justify-center bg-background sm:bg-card">
            <div className="max-w-md w-full mx-auto space-y-5">
              {/* Header Title Form */}
              <div className="space-y-1.5 text-center lg:text-left">
                <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {subtitle}
                  </p>
                )}
              </div>

              {/* Form Content */}
              {children}
            </div>
          </div>

        </div>
      </div>

      {/* MOBILE FOOTER (Hanya tampil di HP) */}
      <footer className="lg:hidden w-full py-6 text-center text-[10px] text-muted-foreground/80 space-y-1 px-4">
        <p className="font-medium text-sky-600 dark:text-sky-400">
          kontak@perpusahm.com &bull; (0541) 743364
        </p>
        <p>&copy; 2026 PerpusAHM &bull; RS Atma Husada Mahakam</p>
      </footer>
    </div>
  )
}
