"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Lock, Mail, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldError } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { AuthCardLayout } from "@/components/auth/auth-card-layout"
import { TurnstileWidget } from "@/components/auth/turnstile"
import { useAuth } from "@/lib/auth-context"

function MasukForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTarget = searchParams.get("redirect") || "/buku"
  const { login } = useAuth()

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [turnstileToken, setTurnstileToken] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState("")
  const [successMessage, setSuccessMessage] = React.useState("")
  const [fieldErrors, setFieldErrors] = React.useState<{
    email?: string
    password?: string
  }>({})

  React.useEffect(() => {
    const registeredParam = searchParams.get("registered")
    const emailParam = searchParams.get("email")
    if (registeredParam === "1") {
      setSuccessMessage("Pendaftaran akun berhasil! Silakan masukkan kata sandi untuk masuk.")
      if (emailParam) {
        setEmail(emailParam)
      }
    }

    const errorParam = searchParams.get("error")
    const detailsParam = searchParams.get("details")
    if (errorParam) {
      if (errorParam === "internal_oauth_error") {
        const decoded = detailsParam ? decodeURIComponent(detailsParam) : ""
        if (decoded.includes("fetch failed") || decoded.includes("fetch") || decoded.includes("network")) {
          setErrorMessage("Koneksi ke Google terputus sesaat saat pertukaran token. Silakan coba klik 'Masuk dengan Google' sekali lagi.")
        } else if (decoded.includes("Access denied") || decoded.includes("ECONNREFUSED")) {
          setErrorMessage(`Kendala Database MySQL: ${decoded}. Pastikan database 'perpusahm' aktif.`)
        } else {
          setErrorMessage(decoded ? `Gagal masuk: ${decoded}` : "Gagal menghubungkan akun Google ke sistem. Silakan coba kembali.")
        }
      } else if (errorParam === "google_token_failed") {
        setErrorMessage("Gagal menukar token otorisasi dari Google. Silakan coba kembali.")
      } else if (errorParam === "google_not_configured") {
        setErrorMessage("Google OAuth belum dikonfigurasi secara lengkap di .env.")
      } else if (errorParam === "google_email_missing") {
        setErrorMessage("Izin akses alamat email dari Google tidak diberikan.")
      } else {
        setErrorMessage(`Kendala autentikasi Google: ${errorParam}`)
      }
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errors: typeof fieldErrors = {}

    if (!email.trim()) {
      errors.email = "Alamat email wajib diisi."
    } else if (!email.includes("@") || !email.includes(".")) {
      errors.email = "Format email tidak valid (contoh: nama@email.com)."
    }

    if (!password) {
      errors.password = "Kata sandi wajib diisi."
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setErrorMessage("Silakan lengkapi kolom yang bertanda merah.")
      return
    }

    setFieldErrors({})
    setErrorMessage("")
    setIsLoading(true)

    try {
      const res = await login(email, password, turnstileToken)
      if (res.success) {
        router.push(redirectTarget)
      } else {
        setErrorMessage(res.error || "Gagal masuk. Periksa kembali email dan password Anda.")
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
      title="Masuk Akun PerpusAHM"
      subtitle="Silakan masukkan email dan kata sandi untuk mengakses seluruh koleksi literatur digital."
    >
      {successMessage && (
        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2 animate-fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form Masuk */}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Email Field */}
        <div className="space-y-1.5">
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
              className="pl-9 h-11 rounded-xl text-xs bg-muted/20 border-border focus-visible:bg-background transition-colors"
            />
            <Mail className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
          {fieldErrors.email && (
            <FieldError className="text-[11px] font-medium flex items-center gap-1.5 mt-1 animate-fade-in">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{fieldErrors.email}</span>
            </FieldError>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground">Kata Sandi</label>
            <Link
              href="/lupa-password"
              className="text-[11px] font-medium text-sky-600 dark:text-sky-400 hover:underline"
            >
              Lupa Kata Sandi?
            </Link>
          </div>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Masukkan Password..."
              value={password}
              aria-invalid={Boolean(fieldErrors.password)}
              onChange={(e) => {
                setPassword(e.target.value)
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }))
              }}
              className="pl-9 pr-9 h-11 rounded-xl text-xs bg-muted/20 border-border focus-visible:bg-background transition-colors"
            />
            <Lock className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="p-1 text-muted-foreground hover:text-foreground absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
              aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            >
              {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
          {fieldErrors.password && (
            <FieldError className="text-[11px] font-medium flex items-center gap-1.5 mt-1 animate-fade-in">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{fieldErrors.password}</span>
            </FieldError>
          )}
        </div>

        {/* Widget Keamanan Cloudflare Turnstile */}
        <TurnstileWidget onVerify={setTurnstileToken} />

        {/* Tombol Masuk */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 rounded-2xl bg-sky-600 hover:bg-sky-500 font-bold text-xs sm:text-sm text-white transition-all shadow-md cursor-pointer mt-1"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Spinner className="h-4 w-4" />
              <span>Memverifikasi akun...</span>
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span>Masuk</span>
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
          <span>Masuk dengan Google</span>
        </Button>
      </form>

      {/* Footer Switch to Register */}
      <p className="text-center text-xs text-muted-foreground pt-1">
        Belum punya akun?{" "}
        <Link
          href={redirectTarget !== "/buku" ? `/daftar?redirect=${encodeURIComponent(redirectTarget)}` : "/daftar"}
          className="font-bold text-sky-600 dark:text-sky-400 hover:underline"
        >
          Daftar Sekarang
        </Link>
      </p>
    </AuthCardLayout>
  )
}

export default function MasukPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Spinner className="h-6 w-6" />
        </div>
      }
    >
      <MasukForm />
    </React.Suspense>
  )
}
