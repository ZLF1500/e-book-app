"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Mail,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Inbox,
  Send,
  AlertCircle,
  HelpCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldError } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { OtpVerificationCard } from "@/components/auth/otp-verification-card"
import { AuthCardLayout } from "@/components/auth/auth-card-layout"
import { TurnstileWidget } from "@/components/auth/turnstile"
import { toast } from "sonner"

export default function LupaPasswordPage() {
  const router = useRouter()
  const [verificationMode, setVerificationMode] = React.useState<"otp" | "link">("otp")
  const [email, setEmail] = React.useState("")
  const [turnstileToken, setTurnstileToken] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [magicLink, setMagicLink] = React.useState<string | null>(null)
  const [errorMessage, setErrorMessage] = React.useState("")
  const [emailError, setEmailError] = React.useState("")
  const [resendCountdown, setResendCountdown] = React.useState(0)

  // Countdown timer for resend
  React.useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCountdown])

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!email.trim()) {
      setEmailError("Alamat email terdaftar wajib diisi.")
      return
    } else if (!email.includes("@") || !email.includes(".")) {
      setEmailError("Format email tidak valid (contoh: nama@email.com).")
      return
    }

    setEmailError("")
    setIsLoading(true)
    setErrorMessage("")

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, turnstileToken }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setErrorMessage(data.error || "Gagal memproses permintaan reset sandi.")
        return
      }

      setMagicLink(data.magicLink)
      setResendCountdown(60)

      if (data.delivered) {
        toast.success(`Email reset sandi berhasil dikirim ke ${email}!`)
      } else {
        toast.success(`Tautan reset berhasil dibuat dan dikirim ke ${email}!`)
      }
    } catch {
      setErrorMessage("Terjadi gangguan koneksi server. Silakan coba kembali.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthCardLayout
      title="Lupa Kata Sandi"
      subtitle={
        magicLink
          ? "Email pemulihan kata sandi telah diproses dan dikirim ke alamat email Anda."
          : verificationMode === "link"
          ? "Silakan masukkan email terdaftar. Kami akan mengirimkan link yang akan mengarahkan kamu untuk atur ulang kata sandi."
          : "Pilih saluran penerimaan kode OTP (Email atau WhatsApp) untuk mengatur ulang kata sandi akun Anda."
      }
    >
      {/* Selector Mode (Tautan Email vs Kode OTP) */}
      {!magicLink && (
        <div className="flex items-center p-1 rounded-2xl bg-muted/60 border border-border">
          <button
            type="button"
            onClick={() => setVerificationMode("link")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              verificationMode === "link"
                ? "bg-background text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Tautan Email</span>
          </button>
          <button
            type="button"
            onClick={() => setVerificationMode("otp")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              verificationMode === "otp"
                ? "bg-background text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-sky-500" />
            <span>Kode OTP (6 Digit)</span>
          </button>
        </div>
      )}

      {/* ERROR MESSAGE ALERT */}
      {errorMessage && (
        <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* OPTION 1: LINK RESET (MATCHING GRAMEDIA REFERENCE) */}
      {verificationMode === "link" && !magicLink && (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">
              Email
            </label>
            <div className="relative">
              <Input
                type="email"
                placeholder="Masukkan Email..."
                value={email}
                aria-invalid={Boolean(emailError)}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (emailError) setEmailError("")
                }}
                className="pl-9 h-11 rounded-2xl text-xs sm:text-sm bg-muted/20 border-border"
              />
              <Mail className="h-4 w-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
            {emailError && (
              <FieldError className="text-[11px] font-medium flex items-center gap-1.5 mt-1 animate-fade-in">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{emailError}</span>
              </FieldError>
            )}
          </div>

          <div className="p-3 rounded-2xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200/70 dark:border-sky-800/70 text-[11px] text-sky-900 dark:text-sky-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold">
              <ShieldCheck className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <span>Pengirim Resmi:</span>
            </div>
            <span className="font-mono text-[11px] font-bold text-sky-700 dark:text-sky-300">
              perpusahm@gmail.com
            </span>
          </div>

          {/* Widget Keamanan Cloudflare Turnstile */}
          <TurnstileWidget onVerify={setTurnstileToken} />

          <Button
            type="submit"
            disabled={isLoading || !email.trim()}
            className="w-full h-11 rounded-2xl bg-sky-600 hover:bg-sky-500 font-bold text-xs sm:text-sm text-white transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Spinner className="h-4 w-4" />
                <span>Mengirim Link...</span>
              </span>
            ) : (
              <span>Kirim</span>
            )}
          </Button>
        </form>
      )}

      {/* OPTION 2: OTP RESET */}
      {verificationMode === "otp" && !magicLink && (
        <div className="space-y-4">
          <OtpVerificationCard
            embedded={true}
            initialIdentifier={email}
            purpose="reset_password"
            title="Verifikasi Kode OTP"
            subtitle="Pilih saluran penerimaan kode OTP (Email atau WhatsApp) untuk mengatur ulang kata sandi akun Anda."
            onVerified={(token, verifiedEmail, nextUrl) => {
              if (nextUrl) {
                router.push(nextUrl)
              } else {
                router.push(`/reset-password?token=${token}&email=${encodeURIComponent(verifiedEmail)}`)
              }
            }}
          />
        </div>
      )}

      {/* STEP 2: LINK HAS BEEN SENT */}
      {magicLink && (
        <div className="space-y-5 text-center py-2 animate-fade-in">
          <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
            <Mail className="h-8 w-8" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 items-center justify-center text-[9px] text-white font-bold">✓</span>
            </span>
          </div>

          <div className="space-y-1.5">
            <h3 className="font-heading text-lg sm:text-xl font-bold text-foreground">
              Tautan Reset Berhasil Dikirim!
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Kami telah mengirimkan tautan untuk atur ulang kata sandi ke alamat email:
            </p>
            <div className="inline-block font-mono text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-3.5 py-1.5 rounded-xl border border-sky-200 dark:border-sky-800">
              {email}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-muted/30 border border-border/80 text-left space-y-2 text-xs">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <Inbox className="h-4 w-4 text-sky-600 shrink-0" />
              <span>Petunjuk Pemulihan Akun</span>
            </div>
            <ul className="text-muted-foreground text-[11px] leading-relaxed space-y-1.5 list-disc list-inside">
              <li>Buka aplikasi atau webmail Anda (Gmail, Yahoo, Outlook, dll).</li>
              <li>Cari email dari <strong>Perpustakaan Digital RSJD Atma Husada Mahakam</strong>.</li>
              <li>Klik tautan di dalam email untuk mengatur kata sandi baru.</li>
            </ul>

            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] flex items-start gap-2 mt-2">
              <HelpCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600" />
              <span>
                Tidak menemukan email? Periksa folder <strong>Spam</strong> atau <strong>Promosi</strong>. Tautan ini berlaku selama 15 menit.
              </span>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            <a
              href="https://mail.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full h-11 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-sky-600/20 transition-all cursor-pointer"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Buka Gmail Sekarang</span>
            </a>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                disabled={resendCountdown > 0 || isLoading}
                onClick={() => handleSubmit()}
                className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer inline-flex items-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>
                  {resendCountdown > 0
                    ? `Kirim Ulang (${resendCountdown}s)`
                    : "Kirim Ulang Email"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMagicLink(null)
                  setEmail("")
                  setErrorMessage("")
                }}
                className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer"
              >
                Gunakan Email Lain
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER TAUTAN KEMBALI (KONSISTEN & SERAGAM DI SEMUA MODE) */}
      <div className="pt-3 border-t border-border/70 text-center">
        <Link
          href="/masuk"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>Kembali ke Halaman Masuk</span>
        </Link>
      </div>
    </AuthCardLayout>
  )
}
