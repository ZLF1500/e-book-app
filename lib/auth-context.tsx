"use client"

import * as React from "react"

export interface AuthUser {
  id: number
  name: string
  email: string
  nik?: string | null
  phone?: string | null
  institution?: string | null
  isVerified: boolean
  role: "member" | "admin" | "super_admin"
  avatarUrl?: string | null
}

interface AuthContextType {
  user: AuthUser | null
  isLoggedIn: boolean
  isGuest: boolean
  isLoaded: boolean
  login: (email: string, pass?: string, turnstileToken?: string) => Promise<{ success: boolean; error?: string }>
  loginWithGoogle: () => Promise<void>
  register: (name: string, email: string, pass?: string, turnstileToken?: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  verifyBiodata: (nik: string, phone: string, institution: string, otp: string, city?: string, name?: string) => Promise<{ success: boolean; error?: string }>
  updateBiodata: (data: { name?: string; nik?: string | null; phone?: string | null; institution?: string | null }) => Promise<{ success: boolean; error?: string }>
  updateAvatar: (avatarUrl: string) => Promise<{ success: boolean; error?: string; user?: AuthUser }>
  syncGoogleAvatar: () => Promise<{ success: boolean; error?: string; notLinked?: boolean; user?: AuthUser; avatarUrl?: string }>
  requestMagicLink: (
    email: string
  ) => Promise<{ success: boolean; magicLink?: string; sender?: string; senderName?: string; error?: string }>
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

const LOCAL_STORAGE_AUTH_KEY = "rsjd_auth_user_v2"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null)
  const [isLoaded, setIsLoaded] = React.useState(false)

  // Initialize on mount: check Google OAuth URL handoff first, then sync with server /api/auth/me
  React.useEffect(() => {
    let initialUser: AuthUser | null = null

    try {
      // 1. Google OAuth Hand-off: URL query param has HIGHEST priority on redirect
      if (typeof window !== "undefined") {
        const searchParams = new URLSearchParams(window.location.search)
        if (searchParams.get("google_success") === "1") {
          const authData = searchParams.get("auth_data")
          const sessionHandoff = searchParams.get("session_handoff")
          if (sessionHandoff) {
            fetch("/api/auth/session-handoff", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: sessionHandoff }),
            }).catch(() => {})
          }
          if (authData) {
            try {
              const decodedJson = atob(authData)
              const googleUser = JSON.parse(decodedJson)
              if (googleUser && googleUser.email) {
                initialUser = googleUser
                setUser(googleUser)
                localStorage.setItem(LOCAL_STORAGE_AUTH_KEY, JSON.stringify(googleUser))
                if (typeof document !== "undefined") {
                  document.cookie = `rsjd_auth_user=${encodeURIComponent(JSON.stringify(googleUser))}; path=/; max-age=2592000; SameSite=Lax`
                }
                window.history.replaceState({}, document.title, window.location.pathname)
              }
            } catch (err) {
              console.error("Failed to decode auth_data:", err)
            }
          }
        }
      }

      // 2. Cookie check
      if (!initialUser && typeof document !== "undefined") {
        const match = document.cookie.match(new RegExp("(^| )rsjd_auth_user=([^;]+)"))
        if (match && match[2]) {
          try {
            const raw = decodeURIComponent(match[2])
            const decoded = raw.startsWith("%") ? decodeURIComponent(raw) : raw
            const cookieUser = JSON.parse(decoded)
            if (cookieUser && cookieUser.email) {
              initialUser = cookieUser
              setUser(cookieUser)
              localStorage.setItem(LOCAL_STORAGE_AUTH_KEY, JSON.stringify(cookieUser))
            }
          } catch {}
        }
      }

      // 3. Fallback to localStorage
      if (!initialUser && typeof window !== "undefined") {
        const saved = localStorage.getItem(LOCAL_STORAGE_AUTH_KEY)
        if (saved && saved !== "guest") {
          try {
            const parsed = JSON.parse(saved)
            if (parsed && typeof parsed === "object" && parsed.email) {
              initialUser = parsed
              setUser(parsed)
            }
          } catch {}
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoaded(true)
    }

    // 4. Asynchronously fetch fresh data from database /api/auth/me to guarantee authoritative state
    const syncWithServer = async () => {
      try {
        const headers: Record<string, string> = {}
        if (initialUser?.id) {
          headers["x-user-id"] = String(initialUser.id)
        }
        const res = await fetch("/api/auth/me", { headers })
        if (res.ok) {
          const data = await res.json()
          if (data.success && data.user) {
            setUser(data.user)
            localStorage.setItem(LOCAL_STORAGE_AUTH_KEY, JSON.stringify(data.user))
            if (typeof document !== "undefined") {
              document.cookie = `rsjd_auth_user=${encodeURIComponent(JSON.stringify(data.user))}; path=/; max-age=2592000; SameSite=Lax`
            }
          }
        }
      } catch (err) {
        console.warn("Could not sync auth session with database:", err)
      }
    }

    syncWithServer()
  }, [])

  const login = async (
    email: string,
    pass?: string,
    turnstileToken?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase()

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password: pass, turnstileToken }),
      })

      const data = await res.json()
      if (res.ok && data.success && data.user) {
        setUser(data.user)
        localStorage.setItem(LOCAL_STORAGE_AUTH_KEY, JSON.stringify(data.user))
        if (typeof document !== "undefined") {
          document.cookie = `rsjd_auth_user=${encodeURIComponent(JSON.stringify(data.user))}; path=/; max-age=2592000; SameSite=Lax`
        }
        return { success: true }
      }

      return { success: false, error: data.error || "Gagal masuk ke akun." }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return { success: false, error: `Kendala jaringan saat masuk: ${msg}` }
    }
  }

  const loginWithGoogle = async () => {
    if (typeof window !== "undefined") {
      window.location.href = "/api/auth/google"
    }
  }

  const register = async (
    name: string,
    email: string,
    pass?: string,
    turnstileToken?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase()
    const cleanName = name.trim()

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName, email: cleanEmail, password: pass, turnstileToken }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        return { success: true }
      }

      return { success: false, error: data.error || "Pendaftaran gagal." }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return { success: false, error: `Kendala jaringan saat pendaftaran: ${msg}` }
    }
  }

  const logout = () => {
    setUser(null)
    if (typeof document !== "undefined") {
      document.cookie = "rsjd_auth_user=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;"
      document.cookie = "rsjd_session_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;"
    }
    localStorage.setItem(LOCAL_STORAGE_AUTH_KEY, "guest")
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {})
  }

  const verifyBiodata = async (
    nik: string,
    phone: string,
    institution: string,
    otp: string,
    city?: string,
    name?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user || !user.email) return { success: false, error: "Silakan masuk terlebih dahulu." }

    const cleanOtp = otp.trim()
    if (!cleanOtp || cleanOtp.length !== 6) {
      return { success: false, error: "Masukkan 6 digit kode OTP verifikasi." }
    }

    try {
      const res = await fetch("/api/auth/verify-biodata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          name: name ? name.trim() : undefined,
          nik: nik ? nik.trim() : "",
          phone: phone.trim(),
          institution: institution ? institution.trim() : "",
          city: city ? city.trim() : "",
          otpCode: cleanOtp,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success && data.user) {
        setUser(data.user)
        localStorage.setItem(LOCAL_STORAGE_AUTH_KEY, JSON.stringify(data.user))
        if (typeof document !== "undefined") {
          document.cookie = `rsjd_auth_user=${encodeURIComponent(JSON.stringify(data.user))}; path=/; max-age=2592000; SameSite=Lax`
        }
        return { success: true }
      }

      return { success: false, error: data.error || "Gagal memverifikasi kode OTP." }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return { success: false, error: `Kendala jaringan saat verifikasi: ${msg}` }
    }
  }

  const updateBiodata = async (data: {
    name?: string
    nik?: string | null
    phone?: string | null
    institution?: string | null
  }): Promise<{ success: boolean; error?: string }> => {
    if (!user || !user.email) return { success: false, error: "Silakan masuk terlebih dahulu." }

    try {
      const res = await fetch("/api/auth/update-biodata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          name: data.name,
          nik: data.nik,
          phone: data.phone,
          institution: data.institution,
        }),
      })

      const resData = await res.json()
      if (res.ok && resData.success && resData.user) {
        setUser(resData.user)
        localStorage.setItem(LOCAL_STORAGE_AUTH_KEY, JSON.stringify(resData.user))
        if (typeof document !== "undefined") {
          document.cookie = `rsjd_auth_user=${encodeURIComponent(JSON.stringify(resData.user))}; path=/; max-age=2592000; SameSite=Lax`
        }
        return { success: true }
      }

      return { success: false, error: resData.error || "Gagal memperbarui biodata." }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return { success: false, error: `Kendala jaringan: ${msg}` }
    }
  }

  const updateAvatar = async (
    avatarUrl: string
  ): Promise<{ success: boolean; error?: string; user?: AuthUser }> => {
    if (!user || !user.email) return { success: false, error: "Silakan masuk terlebih dahulu." }

    try {
      const res = await fetch("/api/auth/update-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, avatarUrl }),
      })

      const resData = await res.json()
      if (res.ok && resData.success && resData.user) {
        setUser(resData.user)
        localStorage.setItem(LOCAL_STORAGE_AUTH_KEY, JSON.stringify(resData.user))
        if (typeof document !== "undefined") {
          document.cookie = `rsjd_auth_user=${encodeURIComponent(JSON.stringify(resData.user))}; path=/; max-age=2592000; SameSite=Lax`
        }
        return { success: true, user: resData.user }
      }

      return { success: false, error: resData.error || "Gagal memperbarui foto profil." }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return { success: false, error: `Kendala jaringan: ${msg}` }
    }
  }

  const syncGoogleAvatar = async (): Promise<{
    success: boolean
    error?: string
    notLinked?: boolean
    user?: AuthUser
    avatarUrl?: string
  }> => {
    if (!user || !user.email) return { success: false, error: "Silakan masuk terlebih dahulu." }

    try {
      const res = await fetch("/api/auth/sync-google-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      })

      const resData = await res.json()
      if (res.ok && resData.success && resData.user) {
        setUser(resData.user)
        localStorage.setItem(LOCAL_STORAGE_AUTH_KEY, JSON.stringify(resData.user))
        if (typeof document !== "undefined") {
          document.cookie = `rsjd_auth_user=${encodeURIComponent(JSON.stringify(resData.user))}; path=/; max-age=2592000; SameSite=Lax`
        }
        return { success: true, user: resData.user, avatarUrl: resData.avatarUrl }
      }

      return {
        success: false,
        notLinked: resData.notLinked,
        error: resData.error || "Gagal menyinkronkan foto profil Google.",
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return { success: false, error: `Kendala jaringan: ${msg}` }
    }
  }

  const requestMagicLink = async (email: string) => {
    const token = "magic-" + Math.random().toString(36).substring(2, 10)
    const magicLink = `/reset-password?token=${token}&email=${encodeURIComponent(email)}`
    return {
      success: true,
      magicLink,
      sender: "perpusahm@rsjdatmahusada.go.id",
      senderName: "Perpustakaan Digital RSJD Atma Husada Mahakam",
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        isGuest: isLoaded ? !user : false,
        isLoaded,
        login,
        loginWithGoogle,
        register,
        logout,
        verifyBiodata,
        updateBiodata,
        updateAvatar,
        syncGoogleAvatar,
        requestMagicLink,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
