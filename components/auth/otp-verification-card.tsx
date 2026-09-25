"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Mail,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Send,
  MessageCircle,
  Phone,
  HelpCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp"
import { toast } from "sonner"
import { TurnstileWidget } from "@/components/auth/turnstile"

export interface OtpVerificationCardProps {
  initialIdentifier?: string
  purpose?: "reset_password" | "register" | "login" | "general"
  title?: string
  subtitle?: string
  onVerified?: (token: string, identifier: string, nextUrl?: string) => void
  onBack?: () => void
  embedded?: boolean
}

export function OtpVerificationCard({
  initialIdentifier = "",
  purpose = "reset_password",
  title = "Verifikasi Kode OTP",
  subtitle,
  onVerified,
  onBack,
  embedded = false,
}: OtpVerificationCardProps) {
  const router = useRouter()

  const [step, setStep] = React.useState<"select_channel" | "input_otp">(
    initialIdentifier ? "select_channel" : "select_channel"
  )
  const [selectedChannel, setSelectedChannel] = React.useState<"email" | "whatsapp">("email")
  const [identifier, setIdentifier] = React.useState(initialIdentifier)
  const [phone, setPhone] = React.useState("")
  const [otpValue, setOtpValue] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [isVerifying, setIsVerifying] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState("")
  const [resendCountdown, setResendCountdown] = React.useState(60)
  const [isSuccess, setIsSuccess] = React.useState(false)
  const [sentToEmail, setSentToEmail] = React.useState("")
  const [turnstileToken, setTurnstileToken] = React.useState("")

  // Resend Countdown Timer
  React.useEffect(() => {
    if (step === "input_otp" && resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown((prev) => prev - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [step, resendCountdown])

  // Kirim Kode OTP
  const handleSendOtp = async (targetEmail = identifier) => {
    if (!targetEmail.trim() || !targetEmail.includes("@")) {
      setErrorMessage("Silakan masukkan alamat email yang valid.")
      return
    }

    setIsLoading(true)
    setErrorMessage("")

    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: targetEmail.trim(),
          channel: "email",
          purpose,
          turnstileToken,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Gagal mengirimkan kode OTP.")
        return
      }

      setSentToEmail(targetEmail.trim())
      setStep("input_otp")
      setResendCountdown(60)
      setOtpValue("")
      toast.success(`Kode OTP 6-digit berhasil dikirim ke ${targetEmail.trim()}!`)
    } catch {
      setErrorMessage("Terjadi gangguan koneksi server. Silakan coba lagi.")
    } finally {
      setIsLoading(false)
    }
  }

  // Verifikasi Kode OTP
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otpValue

    if (code.length < 6) {
      setErrorMessage("Silakan lengkapi seluruh 6 digit kode OTP.")
      return
    }

    setIsVerifying(true)
    setErrorMessage("")

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: sentToEmail || identifier,
          otpCode: code,
          purpose,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Kode OTP salah atau kedaluwarsa.")
        return
      }

      setIsSuccess(true)
      toast.success("Verifikasi OTP berhasil terautentikasi!")

      if (onVerified) {
        onVerified(data.token, sentToEmail || identifier, data.nextUrl)
      } else if (data.nextUrl) {
        setTimeout(() => {
          router.push(data.nextUrl)
        }, 800)
      }
    } catch {
      setErrorMessage("Terjadi gangguan koneksi server saat verifikasi.")
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div
      className={
        embedded
          ? "space-y-4"
          : "rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6"
      }
    >
      {/* Header Info (hanya tampil jika tidak embedded dalam layout lain) */}
      {!embedded && (
        <div className="text-center space-y-1.5">
          <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
            {subtitle ||
              (step === "select_channel"
                ? "Pilih saluran pengiriman kode verifikasi keamanan akun perpustakaan Anda."
                : `Masukkan 6 digit kode OTP yang dikirimkan ke ${sentToEmail || identifier}.`)}
          </p>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2 animate-shake">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: PILIHAN METODE VERIFIKASI (MULTI-CHANNEL SELECTOR)                 */}
      {/* ========================================================================= */}
      {step === "select_channel" && !isSuccess && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground block">
              Pilih Saluran Verifikasi OTP:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* OPSI 1: EMAIL RESMI (AKTIF & TERHUBUNG) */}
              <button
                type="button"
                onClick={() => setSelectedChannel("email")}
                className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                  selectedChannel === "email"
                    ? "border-sky-500 bg-sky-50/50 dark:bg-sky-950/40 ring-1 ring-sky-500 shadow-xs"
                    : "border-border bg-background hover:bg-muted/40"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="h-9 w-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0">
                    <Mail className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    ● Aktif
                  </span>
                </div>
                <div className="mt-3">
                  <span className="font-heading font-bold text-xs text-foreground block">
                    Email Resmi
                  </span>
                  <span className="text-[10px] text-muted-foreground leading-tight block mt-0.5">
                    Kirim kode 6-digit langsung ke inbox Gmail / Yahoo via Google SMTP
                  </span>
                </div>
              </button>

              {/* OPSI 2: WHATSAPP / NOMOR HP (SEGERA HADIR) */}
              <button
                type="button"
                onClick={() => {
                  setSelectedChannel("whatsapp")
                  toast.info(
                    "Kanal WhatsApp sedang dipersiapkan dengan WhatsApp Business API resmi RSJD Atma Husada Mahakam. Untuk saat ini silakan gunakan metode Email."
                  )
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                  selectedChannel === "whatsapp"
                    ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 ring-1 ring-emerald-500 shadow-xs"
                    : "border-border bg-background hover:bg-muted/40 opacity-80"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    Segera Hadir
                  </span>
                </div>
                <div className="mt-3">
                  <span className="font-heading font-bold text-xs text-foreground block">
                    Nomor HP / WhatsApp
                  </span>
                  <span className="text-[10px] text-muted-foreground leading-tight block mt-0.5">
                    Kirim instan via WhatsApp RSJD (Dalam tahap integrasi API)
                  </span>
                </div>
              </button>

            </div>
          </div>

          {/* Conditional Input based on selected channel */}
          {selectedChannel === "email" ? (
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-foreground">
                Alamat Email Penerima OTP:
              </label>
              <div className="relative">
                <Input
                  type="email"
                  placeholder="Masukkan Email..."
                  value={identifier}
                  aria-invalid={Boolean(errorMessage && (!identifier.trim() || !identifier.includes("@")))}
                  onChange={(e) => {
                    setIdentifier(e.target.value)
                    if (errorMessage) setErrorMessage("")
                  }}
                  className="pl-9 h-10 rounded-xl text-xs bg-muted/20 border-border"
                />
                <Mail className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              {/* Verified Sender Info */}
              <div className="p-3 rounded-2xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/80 text-[11px] text-sky-900 dark:text-sky-200 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
                  <span>Pengirim Resmi: <strong>perpusahm@gmail.com</strong></span>
                </div>
                <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300">
                  Google SMTP 465
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-foreground">
                Nomor WhatsApp / Seluler:
              </label>
              <div className="relative">
                <Input
                  type="tel"
                  inputMode="numeric"
                  maxLength={15}
                  placeholder="Masukkan Nomor WhatsApp..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  className="pl-9 h-10 rounded-xl text-xs bg-muted/20 border-border font-mono"
                />
                <Phone className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
                <HelpCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <span className="text-[11px] leading-relaxed">
                  WhatsApp Business API RSJD Atma Husada Mahakam sedang dalam proses verifikasi nomor resmi. Silakan beralih ke pilihan <strong>Email Resmi</strong> untuk melanjutkan.
                </span>
              </div>
            </div>
          )}

          {/* Widget Keamanan Cloudflare Turnstile */}
          <TurnstileWidget onVerify={setTurnstileToken} />

          {/* Action Button */}
          <Button
            type="button"
            disabled={isLoading || selectedChannel === "whatsapp"}
            onClick={() => handleSendOtp(identifier)}
            className="w-full h-11 rounded-2xl bg-sky-600 hover:bg-sky-500 font-bold text-xs sm:text-sm text-white transition-all shadow-md mt-2 cursor-pointer"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Spinner className="h-4 w-4" />
                <span>Mengirim Kode OTP ke Email...</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                <span>Kirim Kode OTP (6 Digit)</span>
              </span>
            )}
          </Button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: INPUT KODE OTP 6-DIGIT                                             */}
      {/* ========================================================================= */}
      {step === "input_otp" && !isSuccess && (
        <div className="space-y-5 animate-fade-in">
          {/* Target Banner */}
          <div className="p-3 rounded-2xl bg-muted/60 border border-border flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-sky-600" />
              <span className="text-foreground">
                Terkirim ke: <strong>{sentToEmail || identifier}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setStep("select_channel")
                setErrorMessage("")
              }}
              className="text-[11px] font-bold text-sky-600 hover:underline cursor-pointer"
            >
              Ubah Email
            </button>
          </div>

          {/* 6 Digit InputOTP Component */}
          <div className="space-y-3 py-1">
            <label className="text-xs font-bold text-foreground block text-center">
              Ketik 6 Digit Kode OTP:
            </label>
            <div className="flex items-center justify-center">
              <InputOTP
                maxLength={6}
                value={otpValue}
                onChange={(val) => {
                  setOtpValue(val)
                  setErrorMessage("")
                  if (val.length === 6) {
                    handleVerifyOtp(val)
                  }
                }}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="h-12 w-10 sm:h-14 sm:w-12 text-lg sm:text-xl font-mono font-bold bg-background" />
                  <InputOTPSlot index={1} className="h-12 w-10 sm:h-14 sm:w-12 text-lg sm:text-xl font-mono font-bold bg-background" />
                  <InputOTPSlot index={2} className="h-12 w-10 sm:h-14 sm:w-12 text-lg sm:text-xl font-mono font-bold bg-background" />
                </InputOTPGroup>
                <InputOTPSeparator className="mx-1 sm:mx-2 text-muted-foreground" />
                <InputOTPGroup>
                  <InputOTPSlot index={3} className="h-12 w-10 sm:h-14 sm:w-12 text-lg sm:text-xl font-mono font-bold bg-background" />
                  <InputOTPSlot index={4} className="h-12 w-10 sm:h-14 sm:w-12 text-lg sm:text-xl font-mono font-bold bg-background" />
                  <InputOTPSlot index={5} className="h-12 w-10 sm:h-14 sm:w-12 text-lg sm:text-xl font-mono font-bold bg-background" />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          {/* Resend Timer & Action */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>Kode berlaku 10 menit</span>
            </span>

            <button
              type="button"
              disabled={resendCountdown > 0 || isLoading}
              onClick={() => handleSendOtp(sentToEmail || identifier)}
              className="inline-flex items-center gap-1 font-bold text-sky-600 dark:text-sky-400 hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>
                {resendCountdown > 0
                  ? `Kirim Ulang OTP (${resendCountdown}s)`
                  : "Kirim Ulang Kode OTP"}
              </span>
            </button>
          </div>

          {/* Helpful Spam Filter Advice */}
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-[11px] leading-relaxed flex items-start gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <span>Belum melihat email OTP di Inbox? Cek juga folder <strong>Spam / Junk</strong> di Gmail Anda, lalu klik <strong>&ldquo;Bukan Spam&rdquo;</strong>.</span>
            </div>
          </div>

          {/* Verify Button */}
          <Button
            type="button"
            disabled={isVerifying || otpValue.length < 6}
            onClick={() => handleVerifyOtp()}
            className="w-full h-11 rounded-2xl bg-sky-600 hover:bg-sky-500 font-bold text-xs sm:text-sm text-white transition-all shadow-md cursor-pointer"
          >
            {isVerifying ? (
              <span className="flex items-center gap-2">
                <Spinner className="h-4 w-4" />
                <span>Memverifikasi Kode OTP...</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>Verifikasi Kode OTP</span>
                <ShieldCheck className="h-4 w-4" />
              </span>
            )}
          </Button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: VERIFICATION SUCCESS STATE                                         */}
      {/* ========================================================================= */}
      {isSuccess && (
        <div className="text-center space-y-4 py-4 animate-fade-in">
          <div className="h-16 w-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-heading text-lg sm:text-xl font-bold text-foreground">
              Verifikasi OTP Berhasil!
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xs mx-auto">
              Identitas email Anda telah terkonfirmasi secara aman oleh sistem keamanan PerpusAHM RSJD Atma Husada Mahakam.
            </p>
          </div>
        </div>
      )}

      {/* Back Button */}
      {onBack && !isSuccess && (
        <div className="pt-2 border-t border-border text-center">
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            &larr; Kembali
          </button>
        </div>
      )}
    </div>
  )
}
