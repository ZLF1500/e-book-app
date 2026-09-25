"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { OtpVerificationCard } from "@/components/auth/otp-verification-card"
import { AuthCardLayout } from "@/components/auth/auth-card-layout"
import { Spinner } from "@/components/ui/spinner"

function VerifikasiContent() {
  const searchParams = useSearchParams()
  const emailParam = searchParams.get("email") || ""
  const purposeParam =
    (searchParams.get("purpose") as
      | "reset_password"
      | "register"
      | "login"
      | "general") || "reset_password"

  return (
    <AuthCardLayout
      title="Verifikasi Kode OTP"
      subtitle="Konfirmasi kepemilikan akun Anda secara aman melalui kode OTP 6 digit."
    >
      <div className="space-y-4">
        {/* Verification Card with Channel Selector */}
        <OtpVerificationCard
          embedded={true}
          initialIdentifier={emailParam}
          purpose={purposeParam}
          title="Verifikasi Kode OTP"
          subtitle="Konfirmasi kepemilikan akun Anda secara aman melalui kode OTP 6 digit."
        />

        {/* Back Link (Consistent with other auth pages) */}
        <div className="pt-3 border-t border-border/70 text-center">
          <Link
            href="/masuk"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Kembali ke Halaman Masuk</span>
          </Link>
        </div>
      </div>
    </AuthCardLayout>
  )
}

export default function VerifikasiPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-[85vh] flex items-center justify-center text-xs text-muted-foreground">
          <Spinner className="h-6 w-6 mr-2" />
          <span>Memuat halaman verifikasi OTP...</span>
        </div>
      }
    >
      <VerifikasiContent />
    </React.Suspense>
  )
}
