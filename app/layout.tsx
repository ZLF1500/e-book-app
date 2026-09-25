import type { Metadata } from "next"
import { Geist_Mono, Inter, Instrument_Sans } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider } from "@/lib/auth-context"
import { SiteHeader } from "@/components/header/site-header"
import { SiteFooter } from "@/components/footer/site-footer"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"

const instrumentSansHeading = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "PerpusAHM.com — Perpustakaan Digital RS Atma Husada Mahakam Samarinda",
  description:
    "PerpusAHM.com adalah platform perpustakaan digital resmi RS Atma Husada Mahakam Samarinda. Akses e-book kesehatan jiwa, psikiatri, dan pengembangan diri tanpa antrean kuota.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  keywords: [
    "PerpusAHM",
    "PerpusAHM.com",
    "Perpustakaan Digital",
    "RS Atma Husada Mahakam",
    "RSJD Samarinda",
    "Kesehatan Jiwa",
    "E-Book Perpustakaan",
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        inter.variable,
        instrumentSansHeading.variable
      )}
    >
      <body className="min-h-screen bg-background text-foreground flex flex-col selection:bg-sky-500/20 selection:text-sky-600">
        <ThemeProvider>
          <AuthProvider>
            <TooltipProvider>
              <SiteHeader />
              <main className="flex-1">{children}</main>
              <SiteFooter />
              <Toaster position="top-center" richColors />
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}