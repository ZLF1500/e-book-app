"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Mail,
  Key,
  ShieldCheck,
  Check,
  Copy,
  ExternalLink,
  Sparkles,
  Server,
  AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"

interface SmtpSetupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const GMAIL_ENV_SNIPPET = `# Konfigurasi SMTP Pengiriman Email Nyata (Gmail Gateway)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="email_anda@gmail.com"
SMTP_PASS="xxxx xxxx xxxx xxxx"
SMTP_FROM='"PerpusAHM RSJD Atma Husada" <perpusahm@rsjdatmahusada.go.id>'`

const RSJD_ENV_SNIPPET = `# Konfigurasi SMTP Webmail Server Resmi RSJD
SMTP_HOST="mail.rsjdatmahusada.go.id"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="perpusahm@rsjdatmahusada.go.id"
SMTP_PASS="password_akun_webmail"
SMTP_FROM='"PerpusAHM RSJD Atma Husada" <perpusahm@rsjdatmahusada.go.id>'`

export function SmtpSetupModal({ open, onOpenChange }: SmtpSetupModalProps) {
  const [copiedType, setCopiedType] = React.useState<"gmail" | "rsjd" | null>(null)
  const [activeTab, setActiveTab] = React.useState<"gmail" | "rsjd">("gmail")

  const copyToClipboard = (text: string, type: "gmail" | "rsjd") => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopiedType(type)
    toast.success("Snippet konfigurasi SMTP disalin ke clipboard!")
    setTimeout(() => setCopiedType(null), 2500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 shrink-0 shadow-2xs">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="font-heading text-lg font-bold text-foreground">
              Panduan Kirim Email Nyata ke Inbox
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cara mengaktifkan pengiriman email langsung ke Gmail/Yahoo pengguna menggunakan SMTP.
            </DialogDescription>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-muted/60 border border-border text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("gmail")}
            className={`flex-1 py-1.5 px-3 rounded-lg font-bold transition-all ${
              activeTab === "gmail"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Metode 1: Google Mail (Paling Praktis)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rsjd")}
            className={`flex-1 py-1.5 px-3 rounded-lg font-bold transition-all ${
              activeTab === "rsjd"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Metode 2: Server RSJD (Domain Resmi)
          </button>
        </div>

        {activeTab === "gmail" ? (
          <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
            <div className="p-3.5 rounded-2xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-foreground space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-sky-900 dark:text-sky-200 text-xs">
                <Sparkles className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                <span>3 Langkah Menggunakan Gmail App Password (Gratis):</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-xs text-neutral-700 dark:text-neutral-300">
                <li>
                  Buka akun Google Anda di{" "}
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-600 underline font-semibold inline-flex items-center gap-0.5"
                  >
                    myaccount.google.com/apppasswords <ExternalLink className="h-3 w-3" />
                  </a>.
                </li>
                <li>Buat Sandi Aplikasi baru dengan nama misalnya <strong>PerpusAHM</strong>.</li>
                <li>Google akan memberikan <strong>16 karakter sandi</strong> (misal: `abcd efgh ijkl mnop`).</li>
              </ol>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground text-[11px] uppercase tracking-wider">
                  Tambahkan ke file .env di root proyek:
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(GMAIL_ENV_SNIPPET, "gmail")}
                  className="text-sky-600 hover:text-sky-700 font-bold flex items-center gap-1 text-[11px] cursor-pointer"
                >
                  {copiedType === "gmail" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedType === "gmail" ? "Tersalin!" : "Salin .env"}</span>
                </button>
              </div>
              <pre className="p-3 rounded-xl bg-neutral-900 text-neutral-100 font-mono text-[11px] overflow-x-auto leading-relaxed border border-neutral-800">
                {GMAIL_ENV_SNIPPET}
              </pre>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
            <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-foreground space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-200 text-xs">
                <Server className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span>Menggunakan Server Mail Resmi RSJD Atma Husada Mahakam:</span>
              </div>
              <p className="text-xs text-neutral-700 dark:text-neutral-300">
                Jika tim IT RSJD telah memberikan akun kotak surat resmi `perpusahm@rsjdatmahusada.go.id`, Anda dapat langsung menghubungkannya ke port SSL 465.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground text-[11px] uppercase tracking-wider">
                  Tambahkan ke file .env:
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(RSJD_ENV_SNIPPET, "rsjd")}
                  className="text-sky-600 hover:text-sky-700 font-bold flex items-center gap-1 text-[11px] cursor-pointer"
                >
                  {copiedType === "rsjd" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedType === "rsjd" ? "Tersalin!" : "Salin .env"}</span>
                </button>
              </div>
              <pre className="p-3 rounded-xl bg-neutral-900 text-neutral-100 font-mono text-[11px] overflow-x-auto leading-relaxed border border-neutral-800">
                {RSJD_ENV_SNIPPET}
              </pre>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end pt-2 border-t border-border">
          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-9 px-5 rounded-xl bg-sky-600 hover:bg-sky-500 font-bold text-xs text-white shadow-xs cursor-pointer"
          >
            Saya Mengerti
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
