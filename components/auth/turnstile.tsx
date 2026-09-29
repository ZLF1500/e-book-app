"use client"

import * as React from "react"
import { ShieldCheck } from "lucide-react"

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        params: {
          sitekey: string
          callback?: (token: string) => void
          "error-callback"?: (error?: unknown) => void
          "expired-callback"?: () => void
          theme?: "light" | "dark" | "auto"
          size?: "normal" | "compact" | "flexible"
        }
      ) => string
      reset: (widgetId?: string) => void
      remove: (widgetId?: string) => void
    }
    onloadTurnstileCallback?: () => void
  }
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void
  onError?: () => void
  onExpire?: () => void
  className?: string
  theme?: "light" | "dark" | "auto"
}

// Official Cloudflare Always-Pass Test Key for local dev/LAN testing
const CLOUDFLARE_TEST_SITE_KEY = "1x00000000000000000000AA"

export function TurnstileWidget({
  onVerify,
  onError,
  onExpire,
  className = "",
  theme = "auto",
}: TurnstileWidgetProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const widgetIdRef = React.useRef<string | null>(null)
  const [isReady, setIsReady] = React.useState(false)

  // Use refs for callbacks to avoid re-running the effect on parent state changes
  const onVerifyRef = React.useRef(onVerify)
  const onErrorRef = React.useRef(onError)
  const onExpireRef = React.useRef(onExpire)

  React.useEffect(() => {
    onVerifyRef.current = onVerify
    onErrorRef.current = onError
    onExpireRef.current = onExpire
  })

  // Fitur dapat dinonaktifkan via ENV atau jika Site Key sengaja dikosongkan / bernilai 'disabled'
  const isTurnstileDisabled =
    process.env.NEXT_PUBLIC_DISABLE_TURNSTILE === "true" ||
    process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_ENABLED === "false" ||
    !process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY ||
    process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY === "disabled"

  React.useEffect(() => {
    if (isTurnstileDisabled) {
      onVerifyRef.current("disabled-bypass")
      setIsReady(true)
    }
  }, [isTurnstileDisabled])

  const envSiteKey =
    process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || CLOUDFLARE_TEST_SITE_KEY

  React.useEffect(() => {
    if (isTurnstileDisabled) return
    let isMounted = true

    // Deteksi apakah sedang diakses via localhost atau IP lokal (LAN)
    const hostname = typeof window !== "undefined" ? window.location.hostname : ""
    const isPrivateIp =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.") ||
      hostname.endsWith(".local")

    // Jika diakses via IP LAN / localhost dan siteKey adalah key produksi (0x4...),
    // Cloudflare akan menolak domain karena IP belum didaftarkan di Cloudflare Dashboard.
    // Gunakan test site key resmi Cloudflare agar widget tetap tampil mulus dan lolos verifikasi.
    const activeSiteKey =
      isPrivateIp && envSiteKey.startsWith("0x4")
        ? CLOUDFLARE_TEST_SITE_KEY
        : envSiteKey

    const renderWidget = () => {
      if (!isMounted || !containerRef.current || !window.turnstile) return

      // Bersihkan widget sebelumnya jika ada
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {}
        widgetIdRef.current = null
      }

      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: activeSiteKey,
          callback: (token: string) => {
            if (isMounted) {
              setIsReady(true)
              onVerifyRef.current(token)
            }
          },
          "error-callback": (err?: unknown) => {
            console.warn("Turnstile widget error callback:", err)
            if (isMounted) {
              setIsReady(true)
              // Pada LAN/pengujian lokal, jangan biarkan pengguna terblokir jika Cloudflare error
              if (isPrivateIp || process.env.NODE_ENV !== "production") {
                onVerifyRef.current("test-bypass-local")
              }
              if (onErrorRef.current) onErrorRef.current()
            }
          },
          "expired-callback": () => {
            if (isMounted && onExpireRef.current) onExpireRef.current()
          },
          theme,
          size: "normal",
        })
        widgetIdRef.current = id
        setIsReady(true)
      } catch (err) {
        console.warn("Turnstile render error:", err)
        if (isMounted && (isPrivateIp || process.env.NODE_ENV !== "production")) {
          setIsReady(true)
          onVerifyRef.current("test-bypass-render-err")
        }
      }
    }

    // Fallback timeout: Jika dalam 3.5 detik Turnstile tidak siap (misal koneksi lambat/terblokir),
    // otomatis bypass di mode lokal agar pengguna tidak terjebak dalam loading terus-menerus
    const fallbackTimeout = setTimeout(() => {
      if (isMounted && !widgetIdRef.current && (isPrivateIp || process.env.NODE_ENV !== "production")) {
        console.info("Turnstile network timeout on LAN. Enabling seamless local verification.")
        setIsReady(true)
        onVerifyRef.current("test-bypass-timeout")
      }
    }, 3500)

    // Muat script Cloudflare Turnstile
    if (typeof window !== "undefined") {
      if (window.turnstile) {
        renderWidget()
      } else {
        const existingScript = document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')
        if (!existingScript) {
          const script = document.createElement("script")
          script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          script.async = true
          script.defer = true
          script.onload = () => {
            if (isMounted) renderWidget()
          }
          script.onerror = () => {
            if (isMounted && (isPrivateIp || process.env.NODE_ENV !== "production")) {
              setIsReady(true)
              onVerifyRef.current("test-bypass-script-err")
            }
          }
          document.head.appendChild(script)
        } else {
          const interval = setInterval(() => {
            if (window.turnstile) {
              clearInterval(interval)
              if (isMounted) renderWidget()
            }
          }, 100)
          setTimeout(() => clearInterval(interval), 5000)
        }
      }
    }

    return () => {
      isMounted = false
      clearTimeout(fallbackTimeout)
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {}
        widgetIdRef.current = null
      }
    }
  }, [envSiteKey, theme, isTurnstileDisabled])

  if (isTurnstileDisabled) {
    return null
  }

  return (
    <div className={`flex flex-col items-center justify-center my-2 select-none ${className}`}>
      <div ref={containerRef} className="min-h-[65px] flex items-center justify-center" />
      {!isReady && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 py-1">
          <ShieldCheck className="h-3.5 w-3.5 text-sky-600 animate-pulse" />
          <span>Memverifikasi keamanan Cloudflare Turnstile...</span>
        </div>
      )}
    </div>
  )
}
