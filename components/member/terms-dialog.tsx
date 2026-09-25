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
import { FileText, Shield, Clock, BookOpen, UserCheck, AlertCircle } from "lucide-react"

interface TermsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TermsDialog({ open, onOpenChange }: TermsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <DialogTitle className="font-heading text-lg font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-sky-600" />
            <span>Syarat & Ketentuan Layanan</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Perpustakaan Digital RSJD Atma Husada Mahakam Samarinda (PerpusAHM.com)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs text-muted-foreground leading-relaxed">
          {/* Section 1 */}
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 space-y-1.5">
            <div className="flex items-center gap-2 font-heading font-bold text-foreground text-xs">
              <BookOpen className="h-4 w-4 text-sky-600" />
              <span>1. Akses Bebas Biaya & Tanpa Antrean</span>
            </div>
            <p>
              Seluruh buku digital, referensi klinis, dan monograf psikiatri yang disediakan oleh Perpustakaan RSJD Atma Husada Mahakam dapat diakses dan dipinjam secara gratis tanpa dipungut biaya apapun bagi civitas rumah sakit maupun masyarakat umum.
            </p>
          </div>

          {/* Section 2 */}
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 space-y-1.5">
            <div className="flex items-center gap-2 font-heading font-bold text-foreground text-xs">
              <Clock className="h-4 w-4 text-emerald-600" />
              <span>2. Durasi Peminjaman E-Book</span>
            </div>
            <p>
              Durasi peminjaman dapat dipilih langsung oleh anggota antara <strong>1 hingga 7 hari kalender</strong>. Ketika masa peminjaman berakhir, akses reader akan tertutup secara otomatis tanpa dikenakan denda keterlambatan. Anggota dipersilakan meminjam kembali sewaktu-waktu.
            </p>
          </div>

          {/* Section 3 */}
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 space-y-1.5">
            <div className="flex items-center gap-2 font-heading font-bold text-foreground text-xs">
              <Shield className="h-4 w-4 text-amber-600" />
              <span>3. Perlindungan Hak Cipta & DRM Protected</span>
            </div>
            <p>
              Seluruh berkas digital (EPUB & PDF) dilindungi oleh hak cipta penerbit dan RSJD Atma Husada Mahakam. Pengguna dilarang keras membobol proteksi DRM, mengunduh secara ilegal untuk tujuan komersial, memperbanyak, atau mendistribusikan ulang tanpa izin tertulis dari pemegang hak cipta.
            </p>
          </div>

          {/* Section 4 */}
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 space-y-1.5">
            <div className="flex items-center gap-2 font-heading font-bold text-foreground text-xs">
              <UserCheck className="h-4 w-4 text-indigo-600" />
              <span>4. Validasi Identitas (Kebijakan Anti-Bot v32)</span>
            </div>
            <p>
              Untuk mencegah eksploitasi otomatis oleh bot atau perayap web liar (*web crawler*), pengguna diwajibkan melengkapi biodata NIK resmi dan nomor WhatsApp aktif sebelum melakukan peminjaman buku pertama kali. Data pribadi dilindungi sesuai UU Perlindungan Data Pribadi (UU PDP).
            </p>
          </div>

          {/* Section 5 */}
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 space-y-1.5">
            <div className="flex items-center gap-2 font-heading font-bold text-foreground text-xs">
              <AlertCircle className="h-4 w-4 text-rose-600" />
              <span>5. Etika Komentar & Ulasan Publik</span>
            </div>
            <p>
              Pengguna diharapkan memberikan ulasan dan rating yang objektif, sopan, dan berbobot akademis atau edukatif. Tim pustakawan berhak menyunting atau menghapus ulasan yang memuat unsur SARA, pornografi, ujaran kebencian, atau spam.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end pt-2 border-t border-border/80">
          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-9 px-5 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-xs"
          >
            Saya Mengerti
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
