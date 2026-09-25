"use client"

import * as React from "react"
import {
  ShieldCheck,
  Printer,
  Award,
  Check,
  AlertCircle,
  Sparkles,
  ExternalLink,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"

interface DigitalMemberCardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenBiodata?: () => void
}

export function DigitalMemberCardDialog({
  open,
  onOpenChange,
  onOpenBiodata,
}: DigitalMemberCardDialogProps) {
  const { user } = useAuth()
  const cardRef = React.useRef<HTMLDivElement>(null)

  const memberName = user?.name?.trim() || "Anggota Perpustakaan"
  const hasNik = Boolean(user?.nik && user.nik.trim())
  const rawNik = user?.nik?.trim() || ""
  const maskedNik = hasNik
    ? rawNik.length >= 8
      ? `${rawNik.slice(0, 4)}********${rawNik.slice(-4)}`
      : rawNik
    : null

  const memberInstitution = user?.institution?.trim() || "Masyarakat Umum"
  const memberId = user?.id
    ? `RSJD-LIB-2026-${String(user.id).padStart(4, "0")}`
    : "RSJD-LIB-2026-0001"

  const isVerified = Boolean(user?.isVerified)
  const verificationBadgeText = isVerified
    ? hasNik
      ? "Terverifikasi (NIK)"
      : "Anggota Terverifikasi"
    : "Belum Terverifikasi"

  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-3.5 sm:p-7 rounded-2xl sm:rounded-3xl bg-card border-border space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl">
        <DialogHeader className="text-center sm:text-left">
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 mb-1">
            <Award className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-widest">KTA Digital Resmi</span>
          </div>
          <DialogTitle className="font-heading text-lg sm:text-xl font-bold text-foreground">
            Kartu Tanda Anggota (KTA) Digital
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Identitas digital resmi anggota terverifikasi Perpustakaan RSJD Atma Husada Mahakam Samarinda.
          </DialogDescription>
        </DialogHeader>

        {/* THE DIGITAL CARD (PREMIUM SMART CARD DESIGN) */}
        <div
          ref={cardRef}
          className="relative overflow-hidden rounded-2xl sm:rounded-[24px] bg-gradient-to-br from-[#071326] via-[#0b1d3a] to-[#040d1a] p-4 sm:p-6 text-white shadow-2xl border border-sky-400/30 select-none transition-all w-full max-w-[440px] mx-auto group hover:border-sky-400/50"
        >
          {/* Radial Holographic Sheen Overlay */}
          <div className="absolute -right-16 -bottom-16 h-56 w-56 rounded-full bg-sky-500/15 blur-3xl pointer-events-none" />
          <div className="absolute -left-12 -top-12 h-44 w-44 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky-400/10 via-transparent to-transparent pointer-events-none" />

          {/* Background Watermark Crest */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
            <img src="/logo.png" alt="Watermark" className="h-44 w-44 object-contain grayscale" />
          </div>

          {/* Card Header: Brand Logo & Smart Chip */}
          <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-0.5 border border-white/30 shadow-md shrink-0">
                <img src="/logo.png" alt="Logo RSJD" className="h-full w-full object-contain" />
              </div>
              <div>
                <h4 className="text-[11px] font-black tracking-wider uppercase text-white leading-tight">
                  RS. Atma Husada Mahakam
                </h4>
                <p className="text-[9px] text-sky-300 font-semibold tracking-wide">
                  PerpusAHM.com &bull; Perpustakaan Digital
                </p>
              </div>
            </div>

            {/* Realistic Gold EMV Smart Chip */}
            <div className="flex h-7 w-9 rounded-md bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-500 p-1 shadow-inner border border-amber-300/80 shrink-0">
              <div className="h-full w-full rounded-xs border border-amber-700/50 grid grid-cols-2 gap-0.5 opacity-80">
                <div className="border-r border-amber-700/50" />
                <div />
              </div>
            </div>
          </div>

          {/* Card Body: Member Name & Verification Badge */}
          <div className="relative z-10 py-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-[8px] uppercase tracking-widest text-sky-300/70 font-bold block">
                  Nama Anggota
                </span>
                <p className="text-sm sm:text-base font-extrabold text-white tracking-wide truncate">
                  {memberName}
                </p>
              </div>

              {/* Dynamic Status Badge */}
              <div
                className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-extrabold shrink-0 border ${
                  isVerified
                    ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300"
                    : "bg-amber-500/20 border-amber-400/40 text-amber-300"
                }`}
              >
                {isVerified ? (
                  <ShieldCheck className="h-3 w-3 shrink-0" />
                ) : (
                  <AlertCircle className="h-3 w-3 shrink-0" />
                )}
                <span>{verificationBadgeText}</span>
              </div>
            </div>

            {/* Grid: Member ID & NIK */}
            <div className="grid grid-cols-2 gap-3 pt-0.5">
              <div>
                <span className="text-[8px] uppercase tracking-widest text-sky-300/70 font-bold block">
                  Nomor Anggota (ID)
                </span>
                <p className="font-mono text-xs font-bold text-sky-200 tracking-wide">
                  {memberId}
                </p>
              </div>

              <div>
                <span className="text-[8px] uppercase tracking-widest text-sky-300/70 font-bold block">
                  No. Identitas (NIK)
                </span>
                {hasNik ? (
                  <p className="font-mono text-xs font-semibold text-slate-200 tracking-wide">
                    {maskedNik}
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400 font-medium italic">
                    Belum Ditambahkan
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Card Footer: Instansi & Pure SVG QR Code */}
          <div className="relative z-10 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
            <div className="space-y-0.5 min-w-0 flex-1">
              <span className="text-[8px] uppercase tracking-widest text-sky-300/70 font-bold block">
                Instansi / Domisili
              </span>
              <p className="text-[11px] text-white/90 font-medium truncate max-w-[210px]">
                {memberInstitution}
              </p>
              <span className="text-[8px] text-sky-300/60 block font-mono">
                Status: Anggota Aktif Seumur Hidup
              </span>
            </div>

            {/* Crisp Pure SVG QR Code */}
            <div className="p-1.5 rounded-xl bg-white shadow-lg shrink-0">
              <svg
                viewBox="0 0 29 29"
                className="h-10 w-10 text-neutral-950 fill-current"
                shapeRendering="crispEdges"
              >
                {/* Position Finder Patterns */}
                <path d="M0,0 h7 v7 h-7 z M1,1 v5 h5 v-5 z M2,2 h3 v3 h-3 z" />
                <path d="M22,0 h7 v7 h-7 z M23,1 v5 h5 v-5 z M24,2 h3 v3 h-3 z" />
                <path d="M0,22 h7 v7 h-7 z M1,23 v5 h5 v-5 z M2,24 h3 v3 h-3 z" />
                {/* Synthetic data matrix bits */}
                <path d="M9,2 h2 v2 h-2 z M13,2 h1 v1 h-1 z M16,1 h3 v1 h-3 z M18,3 h2 v1 h-2 z M9,5 h1 v2 h-1 z M12,4 h3 v2 h-3 z M17,5 h2 v2 h-2 z M9,9 h2 v2 h-2 z M13,8 h2 v2 h-2 z M17,9 h3 v1 h-3 z M22,9 h2 v2 h-2 z M26,8 h2 v1 h-2 z M2,9 h3 v1 h-3 z M6,10 h2 v2 h-2 z M10,12 h1 v3 h-1 z M13,12 h3 v1 h-3 z M18,12 h2 v2 h-2 z M22,13 h3 v2 h-3 z M27,12 h1 v3 h-1 z M1,14 h2 v1 h-2 z M5,14 h1 v2 h-1 z M8,16 h3 v1 h-3 z M13,15 h2 v3 h-2 z M16,16 h2 v2 h-2 z M20,16 h1 v2 h-1 z M24,16 h2 v2 h-2 z M9,19 h2 v2 h-2 z M12,19 h3 v1 h-3 z M17,19 h2 v2 h-2 z M21,19 h3 v1 h-3 z M26,19 h2 v2 h-2 z M9,23 h3 v1 h-3 z M14,22 h2 v2 h-2 z M18,23 h2 v1 h-2 z M22,23 h1 v3 h-1 z M25,23 h3 v1 h-3 z M9,26 h2 v2 h-2 z M13,25 h3 v2 h-3 z M18,26 h2 v2 h-2 z M22,27 h3 v1 h-3 z M27,26 h1 v2 h-1 z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Optional NIK Info Banner if NIK is not yet added */}
        {!hasNik && (
          <div className="p-3 rounded-2xl bg-muted/40 border border-border flex items-center justify-between gap-2 text-xs">
            <div className="space-y-0.5 text-muted-foreground text-[11px]">
              <span className="font-semibold text-foreground block">Nomor NIK belum tercantum?</span>
              <p>NIK bersifat opsional. Jika Anda ingin mencantumkannya, silakan lengkapi di formulir biodata.</p>
            </div>
            {onOpenBiodata && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false)
                  onOpenBiodata()
                }}
                className="shrink-0 h-8 px-2.5 text-xs font-bold text-sky-600 dark:text-sky-400 border-sky-300 dark:border-sky-800 hover:bg-sky-50 dark:hover:bg-sky-950/40 cursor-pointer"
              >
                <span>Lengkapi</span>
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        )}

        <DialogFooter className="pt-2 sm:justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs h-10 rounded-xl cursor-pointer"
          >
            Tutup
          </Button>

          <Button
            type="button"
            onClick={handlePrint}
            className="h-10 rounded-xl bg-sky-600 hover:bg-sky-500 font-bold text-xs text-white gap-1.5 cursor-pointer shadow-md"
          >
            <Printer className="h-4 w-4" />
            <span>Cetak / Simpan PDF KTA</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
