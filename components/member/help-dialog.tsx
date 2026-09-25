"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  HelpCircle,
  Phone,
  Mail,
  Clock,
  BookOpen,
  ChevronDown,
  ChevronUp,
  MapPin,
} from "lucide-react"

interface HelpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const FAQS = [
  {
    q: "Bagaimana cara meminjam e-book di PerpusAHM?",
    a: "Buka halaman detail buku yang Anda minati, lalu klik tombol 'Pinjam E-Book'. Jika Anda belum melengkapi identitas, isi formulir biodata NIK & nomor WhatsApp terlebih dahulu. Setelah terverifikasi, pilih durasi pinjam 1–7 hari dan klik 'Konfirmasi Pinjam'.",
  },
  {
    q: "Apakah membaca buku di sini berbayar?",
    a: "Tidak! Seluruh layanan literasi digital RSJD Atma Husada Mahakam bersifat 100% gratis sebagai sarana edukasi dan referensi ilmiah kesehatan jiwa.",
  },
  {
    q: "Mengapa saya harus verifikasi NIK dan No. WhatsApp?",
    a: "Kebijakan verifikasi Anti-Bot v32 diterapkan untuk memastikan hak peminjaman e-book hanya diakses oleh pengguna manusia asli dan mencegah eksploitasi berkas digital oleh bot otomatis.",
  },
  {
    q: "Format berkas apa yang didukung di web ini?",
    a: "Aplikasi mendukung format EPUB dan PDF. Reader digital bawaan dilengkapi fitur penyesuaian ukuran font, mode gelap/terang, dan pembatas buku (bookmark).",
  },
  {
    q: "Apa yang terjadi jika masa pinjam habis?",
    a: "Akses membaca akan ditutup secara otomatis. Anda tidak akan dikenakan denda apapun dan bebas meminjam kembali buku tersebut kapan saja.",
  },
]

export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0)

  const toggleFaq = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <DialogTitle className="font-heading text-lg font-bold flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-sky-600" />
            <span>Pusat Bantuan & Kontak Pustakawan</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Pertanyaan yang sering diajukan dan kontak layanan RSJD Atma Husada Mahakam.
          </DialogDescription>
        </DialogHeader>

        {/* FAQ Accordion */}
        <div className="space-y-2 pt-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
            Tanya Jawab Populer (FAQ):
          </span>
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx
            return (
              <div
                key={idx}
                className="rounded-2xl border border-border bg-card overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between p-3 text-left text-xs font-bold text-foreground hover:text-sky-600 transition-colors"
                >
                  <span className="pr-2">{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-sky-600" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 text-xs text-muted-foreground leading-relaxed border-t border-border/50 pt-2 animate-fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Contact Info Card */}
        <div className="pt-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
            Kontak Layanan Pustakawan:
          </span>
          <div className="p-3.5 rounded-2xl bg-sky-50/60 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/80 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-sky-900 dark:text-sky-200 font-semibold">
              <Phone className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>WhatsApp Pustakawan: <strong>0811-5500-1234</strong></span>
            </div>
            <div className="flex items-center gap-2 text-sky-900 dark:text-sky-200 font-semibold">
              <Mail className="h-4 w-4 text-sky-600 shrink-0" />
              <span>Email: <strong>perpustakaan@rsjdatmahusada.go.id</strong></span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>Senin – Jumat: 08.00 – 16.00 WITA</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>Gedung Perpustakaan & Litbang RSJD Atma Husada Mahakam, Samarinda</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end pt-2 border-t border-border/80">
          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-9 px-5 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-xs"
          >
            Tutup Bantuan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
