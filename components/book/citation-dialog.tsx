"use client"

import * as React from "react"
import { Copy, Check, Quote } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface CitationBook {
  title: string
  authorName: string
  publisherName: string
  publishYear?: number | null
  isbn?: string | null
  city?: string
  slug: string
}

interface CitationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  book: CitationBook
}

type CitationStyle = "apa" | "mla" | "chicago" | "harvard"

export function CitationDialog({ open, onOpenChange, book }: CitationDialogProps) {
  const [selectedStyle, setSelectedStyle] = React.useState<CitationStyle>("apa")
  const [copied, setCopied] = React.useState(false)

  const year = book.publishYear || 2024
  const currentUrl = typeof window !== "undefined" ? window.location.href : `https://perpustakaan.rsjd.kaltimprov.go.id/buku/${book.slug}`

  // Format author name: "Dr. Danang Suhartono, Sp.KJ" -> "Suhartono, D."
  const formatAuthorAPA = (name: string) => {
    const clean = name.replace(/Dr\.|Sp\.KJ|M\.Psi|Psikolog|Prof\.|Ph\.D/gi, "").trim()
    const parts = clean.split(/\s+/)
    if (parts.length > 1) {
      const last = parts[parts.length - 1]
      const initials = parts.slice(0, parts.length - 1).map((p) => p[0] + ".").join(" ")
      return `${last}, ${initials}`
    }
    return clean
  }

  const citations: Record<CitationStyle, { title: string; desc: string; text: string }> = {
    apa: {
      title: "APA 7th Edition",
      desc: "Standar jurnal ilmu kesehatan jiwa, kedokteran, psikiatri, dan psikologi klinis.",
      text: `${formatAuthorAPA(book.authorName)} (${year}). ${book.title}. ${book.publisherName}. Diakses dari ${currentUrl}`,
    },
    mla: {
      title: "MLA 9th Edition",
      desc: "Standar publikasi ilmu humaniora, literatur umum, dan etika keperawatan.",
      text: `${book.authorName}. ${book.title}. ${book.publisherName}, ${year}. Perpustakaan Digital RSJD Atma Husada Mahakam, ${currentUrl}.`,
    },
    chicago: {
      title: "Chicago 17th Edition",
      desc: "Format sitasi gaya catatan kaki dan bibliografi untuk buku kedokteran & sejarah.",
      text: `${book.authorName}. ${year}. ${book.title}. Samarinda: ${book.publisherName}. ${currentUrl}.`,
    },
    harvard: {
      title: "Harvard Referencing",
      desc: "Format umum rujukan akademis universitas dan rumah sakit pendidikan.",
      text: `${book.authorName}, ${year}. ${book.title}. Samarinda: ${book.publisherName}. Tersedia di: <${currentUrl}> [Diakses ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}].`,
    },
  }

  const handleCopy = () => {
    const textToCopy = citations[selectedStyle].text
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 shrink-0 shadow-2xs">
            <Quote className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="font-heading text-lg font-bold text-foreground">
              Sitasi Ilmiah & Rujukan Buku
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Salin sitasi resmi untuk karya tulis ilmiah, skripsi, makalah medis, atau referensi klinis RSJD.
            </DialogDescription>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800">
          {(["apa", "mla", "chicago", "harvard"] as CitationStyle[]).map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => setSelectedStyle(style)}
              className={cn(
                "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all capitalize",
                selectedStyle === style
                  ? "bg-white dark:bg-neutral-900 text-sky-600 shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {style.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Style description */}
        <p className="text-[11px] text-muted-foreground italic">
          {citations[selectedStyle].desc}
        </p>

        {/* Citation Box */}
        <div className="relative p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-2">
          <p className="font-mono text-xs text-foreground leading-relaxed select-all">
            {citations[selectedStyle].text}
          </p>

          <div className="pt-2 flex items-center justify-between text-[11px] text-muted-foreground border-t border-neutral-200/60 dark:border-neutral-800/60">
            <span>ISBN: {book.isbn || "N/A"} &bull; Penerbit: {book.publisherName}</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Terverifikasi Resmi RSJD</span>
          </div>
        </div>

        <DialogFooter className="pt-2 sm:justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs h-10 rounded-xl"
          >
            Tutup
          </Button>

          <Button
            type="button"
            onClick={handleCopy}
            className={cn(
              "h-10 rounded-xl font-bold text-xs gap-2 transition-all",
              copied
                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                : "bg-sky-600 hover:bg-sky-500 text-white"
            )}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                <span>Sitasi Berhasil Disalin!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Salin Sitasi ({selectedStyle.toUpperCase()})</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
