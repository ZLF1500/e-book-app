"use client"

import * as React from "react"
import Link from "next/link"
import { Lock, Sparkles, LogIn, UserPlus } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"

interface GuestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  actionType?: "pinjam" | "ulasan" | "bookmark" | "umum"
  customMessage?: string
}

export function GuestModal({
  open,
  onOpenChange,
  actionType = "umum",
  customMessage,
}: GuestModalProps) {
  const getDetails = () => {
    switch (actionType) {
      case "pinjam":
        return {
          title: "Masuk untuk Meminjam E-Book",
          desc: "Akun tamu belum dapat meminjam e-book. Silakan masuk atau daftar anggota terlebih dahulu untuk menikmati akses peminjaman gratis 1–7 hari.",
        }
      case "ulasan":
        return {
          title: "Masuk untuk Memberi Ulasan",
          desc: "Ulasan dan rating buku hanya dapat diberikan oleh anggota terdaftar untuk menjaga objektivitas dan mutu literasi perpustakaan RSJD.",
        }
      case "bookmark":
        return {
          title: "Masuk untuk Menyimpan Favorit",
          desc: "Tandai dan simpan buku favorit Anda ke daftar bacaan pribadi dengan masuk ke akun anggota.",
        }
      default:
        return {
          title: "Akses Anggota Perpustakaan RSJD",
          desc: customMessage || "Fitur ini khusus untuk anggota terdaftar Perpustakaan Digital RSJD Atma Husada Mahakam. Silakan masuk atau daftar akun baru.",
        }
    }
  }

  const details = getDetails()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-card border-border space-y-4">
        <DialogHeader className="space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200/50 dark:border-sky-800/50 shadow-xs mb-1">
            <Lock className="h-6 w-6" />
          </div>
          <DialogTitle className="font-heading text-lg font-bold text-foreground">
            {details.title}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {details.desc}
          </DialogDescription>
        </DialogHeader>

        <div className="pt-2 flex flex-col gap-2.5">
          <Link href="/masuk" onClick={() => onOpenChange(false)}>
            <Button className="w-full h-10 rounded-xl bg-sky-600 hover:bg-sky-500 font-bold text-xs text-white shadow-xs gap-1.5">
              <LogIn className="h-4 w-4" />
              <span>Masuk ke Akun Anda</span>
            </Button>
          </Link>
          <Link href="/daftar" onClick={() => onOpenChange(false)}>
            <Button variant="outline" className="w-full h-10 rounded-xl text-xs font-semibold gap-1.5">
              <UserPlus className="h-4 w-4" />
              <span>Daftar Akun Baru (Gratis)</span>
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  )
}
