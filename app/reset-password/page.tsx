"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import {
  Lock,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  Check,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldError } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { AuthCardLayout } from "@/components/auth/auth-card-layout"
import { toast } from "sonner"

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""
  const emailParam = searchParams.get("email") || ""

  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSuccess, setIsSuccess] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState("")
  const [fieldErrors, setFieldErrors] = React.useState<{
    password?: string
    confirmPassword?: string
  }>({})

  // Realtime password strength calculation
  const strengthScore = React.useMemo(() => {
    if (!password) return 0
    let score = 0
    if (password.length >= 8) score += 1
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1
    if (/[0-9]/.test(password)) score += 1
    if (/[^A-Za-z0-9]/.test(password)) score += 1
    return score
  }, [password])

  const strengthLabel = React.useMemo(() => {
    switch (strengthScore) {
      case 0:
      case 1:
        return { text: "Kurang Kuat", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500" }
      case 2:
        return { text: "Cukup", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500" }
      case 3:
        return { text: "Kuat", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500" }
      case 4:
        return { text: "Sangat Kuat", color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-500" }
      default:
        return { text: "", color: "", bg: "" }
    }
  }, [strengthScore])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errors: typeof fieldErrors = {}

    if (!password) {
      errors.password = "Kata sandi baru wajib diisi."
    } else if (password.length < 8) {
      errors.password = "Kata sandi baru minimal harus 8 karakter."
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Ulangi kata sandi baru wajib diisi."
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Konfirmasi kata sandi tidak cocok. Pastikan kedua kolom sama persis."
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setErrorMessage("Silakan lengkapi atau periksa kolom yang bertanda merah.")
      return
    }

    setFieldErrors({})
    setErrorMessage("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailParam,
          token,
          password,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setIsLoading(false)
        setIsSuccess(true)
        toast.success(data.message || "Kata sandi berhasil diperbarui! Silakan masuk kembali.")
      } else {
        setIsLoading(false)
        setErrorMessage(data.error || "Gagal mengatur ulang kata sandi. Silakan coba kembali.")
      }
    } catch (err: unknown) {
      setIsLoading(false)
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMessage(`Kendala jaringan saat memperbarui kata sandi: ${msg}`)
    }
  }

  return (
    <AuthCardLayout
      title="Atur Ulang Kata Sandi"
      subtitle={
        emailParam
          ? `Membuat kata sandi baru untuk akun ${emailParam}.`
          : "Masukkan kata sandi baru yang aman untuk melindungi akun perpustakaan Anda."
      }
    >
      {/* Security Source Badge */}
      <div className="p-3 rounded-2xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/80 text-[11px] text-sky-900 dark:text-sky-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
          <span>Verifikasi Keamanan: <strong>PerpusAHM</strong></span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300/50">
          Terverifikasi
        </span>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {!isSuccess ? (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* New Password Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Kata Sandi Baru</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Masukkan Kata Sandi Baru..."
                value={password}
                aria-invalid={Boolean(fieldErrors.password)}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }))
                }}
                className="pl-9 pr-9 h-11 rounded-2xl text-xs sm:text-sm bg-muted/20 border-border"
              />
              <Lock className="h-4 w-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {fieldErrors.password && (
              <FieldError className="text-[11px] font-medium flex items-center gap-1.5 mt-1 animate-fade-in">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{fieldErrors.password}</span>
              </FieldError>
            )}

            {/* Password Strength Indicator */}
            {password.length > 0 && (
              <div className="space-y-1 pt-1 animate-fade-in">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Kekuatan Sandi:</span>
                  <span className={`font-bold ${strengthLabel.color}`}>{strengthLabel.text}</span>
                </div>
                <div className="grid grid-cols-4 gap-1 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${strengthScore >= 1 ? strengthLabel.bg : "bg-transparent"}`} />
                  <div className={`h-full rounded-full transition-all ${strengthScore >= 2 ? strengthLabel.bg : "bg-transparent"}`} />
                  <div className={`h-full rounded-full transition-all ${strengthScore >= 3 ? strengthLabel.bg : "bg-transparent"}`} />
                  <div className={`h-full rounded-full transition-all ${strengthScore >= 4 ? strengthLabel.bg : "bg-transparent"}`} />
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Ulangi Kata Sandi Baru</label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Masukkan Konfirmasi Kata Sandi Baru..."
                value={confirmPassword}
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }))
                }}
                className="pl-9 pr-9 h-11 rounded-2xl text-xs sm:text-sm bg-muted/20 border-border"
              />
              <Lock className="h-4 w-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="p-1 text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {fieldErrors.confirmPassword && (
              <FieldError className="text-[11px] font-medium flex items-center gap-1.5 mt-1 animate-fade-in">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{fieldErrors.confirmPassword}</span>
              </FieldError>
            )}

            {confirmPassword.length > 0 && (
              <div className="text-[11px] pt-0.5">
                {password === confirmPassword ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    <span>Kata sandi cocok</span>
                  </span>
                ) : (
                  <span className="text-rose-500 font-semibold">
                    Kata sandi belum sama
                  </span>
                )}
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-2xl bg-sky-600 hover:bg-sky-500 font-bold text-xs sm:text-sm text-white transition-all shadow-md mt-2 cursor-pointer"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Spinner className="h-4 w-4" />
                <span>Menyimpan Sandi Baru...</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>Simpan & Perbarui Kata Sandi</span>
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </form>
      ) : (
        <div className="space-y-4 animate-fade-in text-center py-3">
          <div className="h-14 w-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-heading text-lg font-bold text-foreground">
              Kata Sandi Berhasil Diperbarui!
            </h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Akun Anda sekarang telah dilindungi dengan kata sandi baru. Silakan masuk kembali ke perpustakaan digital.
            </p>
          </div>

          <div className="pt-2">
            <Link href="/masuk">
              <Button className="w-full h-11 rounded-2xl bg-sky-600 hover:bg-sky-500 font-bold text-xs sm:text-sm text-white transition-all shadow-md cursor-pointer">
                <span>Masuk ke Akun Anda Sekarang</span>
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </AuthCardLayout>
  )
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-[85vh] flex items-center justify-center text-xs text-muted-foreground">
          <Spinner className="h-6 w-6 mr-2" />
          <span>Memuat halaman reset sandi...</span>
        </div>
      }
    >
      <ResetPasswordContent />
    </React.Suspense>
  )
}
