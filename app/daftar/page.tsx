"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Lock, Mail, User, ArrowRight, ShieldCheck, Check, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldError } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { AuthCardLayout } from "@/components/auth/auth-card-layout"
import { TurnstileWidget } from "@/components/auth/turnstile"
import { useAuth } from "@/lib/auth-context"

function DaftarForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTarget = searchParams.get("redirect") || "/buku"
  const { register } = useAuth()

  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [turnstileToken, setTurnstileToken] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState("")
  const [fieldErrors, setFieldErrors] = React.useState<{
    name?: string
    email?: string
    password?: string
    confirmPassword?: string
  }>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errors: typeof fieldErrors = {}

    if (!email.trim()) {
      errors.email = "Alamat email wajib diisi."
    } else if (!email.includes("@") || !email.includes(".")) {
      errors.email = "Format alamat email tidak valid."
    }
    if (!name.trim()) {
      errors.name = "Nama lengkap wajib diisi."
    }
    if (!password) {
      errors.password = "Kata sandi wajib diisi."
    } else if (password.length < 8) {
      errors.password = "Kata sandi minimal harus 8 karakter."
    }
    if (!confirmPassword) {
      errors.confirmPassword = "Ulangi kata sandi wajib diisi."
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Konfirmasi kata sandi tidak cocok."
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
      const res = await register(name, email, password, turnstileToken)
      if (res.success) {
        router.push(`/masuk?registered=1&email=${encodeURIComponent(email.trim())}`)
      } else {
        setErrorMessage(res.error || "Pendaftaran gagal. Silakan periksa kembali data Anda.")
      }
    } catch {
      setErrorMessage("Terjadi kesalahan sistem. Silakan coba kembali.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = () => {
    setIsGoogleLoading(true)
    window.location.href = `/api/auth/google?redirect=${encodeURIComponent(redirectTarget)}`
  }

  return (
    <AuthCardLayout
      title="Daftar Akun PerpusAHM"
      subtitle="Bergabunglah dengan ribuan pembaca dan nikmati akses ribuan literatur digital secara gratis."
    >
      {errorMessage && (
        <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2 animate-fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
        {/* Email Field */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground">Alamat Email</label>
          <div className="relative">
            <Input
              type="email"
              placeholder="Masukkan Email..."
              value={email}
              aria-invalid={Boolean(fieldErrors.email)}
              onChange={(e) => {
                setEmail(e.target.value)
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }))
              }}
              className="pl-9 h-10 rounded-xl text-xs bg-muted/20 border-border focus-visible:bg-background transition-colors"
            />
            <Mail className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
          {fieldErrors.email && (
            <FieldError className="text-[11px] font-medium flex items-center gap-1.5 mt-0.5 animate-fade-in">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{fieldErrors.email}</span>
            </FieldError>
          )}
        </div>

        {/* Nama Lengkap */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground">Nama Lengkap</label>
          <div className="relative">
            <Input
              type="text"
              placeholder="Masukkan Nama Lengkap..."
              value={name}
              aria-invalid={Boolean(fieldErrors.name)}
              onChange={(e) => {
                setName(e.target.value)
                if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }))
              }}
              className="pl-9 h-10 rounded-xl text-xs bg-muted/20 border-border focus-visible:bg-background transition-colors"
            />
            <User className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
          {fieldErrors.name && (
            <FieldError className="text-[11px] font-medium flex items-center gap-1.5 mt-0.5 animate-fade-in">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{fieldErrors.name}</span>
            </FieldError>
          )}
        </div>

        {/* Password & Confirm Password (Grid 2 Cols like Gramedia reference) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Kata Sandi</label>
            <div className="relative">
              <Input
                type="password"
                placeholder="Masukkan Password..."
                value={password}
                aria-invalid={Boolean(fieldErrors.password)}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }))
                }}
                className="pl-9 h-10 rounded-xl text-xs bg-muted/20 border-border focus-visible:bg-background transition-colors"
              />
              <Lock className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            {fieldErrors.password && (
              <FieldError className="text-[11px] font-medium flex items-center gap-1.5 mt-0.5 animate-fade-in">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{fieldErrors.password}</span>
              </FieldError>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Konfirmasi Kata Sandi</label>
            <div className="relative">
              <Input
                type="password"
                placeholder="Masukkan Konfirmasi Password..."
                value={confirmPassword}
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }))
                }}
                className="pl-9 h-10 rounded-xl text-xs bg-muted/20 border-border focus-visible:bg-background transition-colors"
              />
              <Lock className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            {fieldErrors.confirmPassword && (
              <FieldError className="text-[11px] font-medium flex items-center gap-1.5 mt-0.5 animate-fade-in">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{fieldErrors.confirmPassword}</span>
              </FieldError>
            )}
          </div>
        </div>

        {/* Security Requirement Hints */}
        <div className="space-y-1 text-[11px] text-muted-foreground pt-0.5">
          <div className="flex items-center gap-1.5">
            <Check className={`h-3.5 w-3.5 shrink-0 ${password.length >= 8 ? "text-emerald-500 font-bold" : "text-muted-foreground/60"}`} />
            <span>Minimum 8 karakter</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className={`h-3.5 w-3.5 shrink-0 ${password && password === confirmPassword ? "text-emerald-500 font-bold" : "text-muted-foreground/60"}`} />
            <span>Konfirmasi kata sandi harus sesuai</span>
          </div>
        </div>

        {/* Anti-Bot Verification Notice */}
        <div className="p-3 rounded-2xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/80 text-[11px] text-sky-800 dark:text-sky-200 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <ShieldCheck className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
            <span>Verifikasi Anti-Bot</span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Untuk menjaga keamanan koleksi buku dan mencegah spam otomatis, peminjam cukup memverifikasi nomor WhatsApp dan kode OTP saat pertama kali meminjam buku.
          </p>
        </div>

        {/* Widget Keamanan Cloudflare Turnstile */}
        <TurnstileWidget onVerify={setTurnstileToken} />

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 rounded-2xl bg-sky-600 hover:bg-sky-500 font-bold text-xs sm:text-sm text-white transition-all shadow-md cursor-pointer mt-1"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Spinner className="h-4 w-4" />
              <span>Mendaftarkan akun...</span>
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span>Daftar</span>
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>

        {/* Divider "Atau" */}
        <div className="relative flex items-center justify-center py-1">
          <div className="border-t border-border w-full" />
          <span className="bg-background sm:bg-card px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold shrink-0">
            Atau
          </span>
        </div>

        {/* Google OAuth Button */}
        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading || isLoading}
          className="w-full h-11 rounded-2xl border-border bg-background hover:bg-muted font-medium text-xs sm:text-sm flex items-center justify-center gap-3 transition-all cursor-pointer"
        >
          {isGoogleLoading ? (
            <Spinner className="h-4 w-4" />
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
              />
            </svg>
          )}
          <span>Daftar dengan Google</span>
        </Button>
      </form>

      {/* Footer Switch to Login */}
      <p className="text-center text-xs text-muted-foreground pt-1">
        Sudah punya akun?{" "}
        <Link
          href={redirectTarget !== "/buku" ? `/masuk?redirect=${encodeURIComponent(redirectTarget)}` : "/masuk"}
          className="font-bold text-sky-600 dark:text-sky-400 hover:underline"
        >
          Masuk
        </Link>
      </p>
    </AuthCardLayout>
  )
}

export default function DaftarPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Spinner className="h-6 w-6" />
        </div>
      }
    >
      <DaftarForm />
    </React.Suspense>
  )
}
