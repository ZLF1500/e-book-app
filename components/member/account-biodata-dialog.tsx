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
import { Input } from "@/components/ui/input"
import { FieldError } from "@/components/ui/field"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/lib/auth-context"
import { AvatarCropDialog } from "@/components/member/avatar-crop-dialog"
import {
  User,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Edit3,
  CheckCircle2,
  Phone,
  Building,
  CreditCard,
  Mail,
  Eye,
  EyeOff,
  Award,
  Camera,
  RefreshCw,
  Sparkles,
} from "lucide-react"

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  )
}

interface AccountBiodataDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenKta?: () => void
}

export function AccountBiodataDialog({
  open,
  onOpenChange,
  onOpenKta,
}: AccountBiodataDialogProps) {
  const { user, updateBiodata, updateAvatar, syncGoogleAvatar } = useAuth()

  const [mode, setMode] = React.useState<"view" | "edit">("view")
  const [showNik, setShowNik] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveSuccess, setSaveSuccess] = React.useState(false)

  // Avatar crop & sync states
  const [cropImageSrc, setCropImageSrc] = React.useState<string | null>(null)
  const [isCropOpen, setIsCropOpen] = React.useState(false)
  const [isSyncingGoogle, setIsSyncingGoogle] = React.useState(false)
  const [photoFeedback, setPhotoFeedback] = React.useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Edit form states
  const [name, setName] = React.useState("")
  const [nik, setNik] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [institution, setInstitution] = React.useState("")
  const [errorMsg, setErrorMsg] = React.useState("")

  React.useEffect(() => {
    if (user) {
      setName(user.name || "")
      setNik(user.nik || "")
      setPhone(user.phone || "")
      setInstitution(user.institution || "")
    }
  }, [user, open])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setPhotoFeedback({ type: "error", message: "Silakan pilih berkas gambar (JPG, PNG, WebP)." })
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setPhotoFeedback({ type: "error", message: "Ukuran berkas gambar maksimal 10MB." })
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setCropImageSrc(reader.result as string)
      setIsCropOpen(true)
      setPhotoFeedback(null)
    }
    reader.readAsDataURL(file)

    e.target.value = ""
  }

  const handleSaveCropped = async (croppedDataUrl: string) => {
    const res = await updateAvatar(croppedDataUrl)
    if (res.success) {
      setPhotoFeedback({ type: "success", message: "Foto profil berhasil diperbarui!" })
      setTimeout(() => setPhotoFeedback(null), 4000)
    } else {
      setPhotoFeedback({ type: "error", message: res.error || "Gagal memperbarui foto profil." })
    }
  }

  const handleSyncGoogle = async () => {
    setIsSyncingGoogle(true)
    setPhotoFeedback(null)
    try {
      const res = await syncGoogleAvatar()
      if (res.success) {
        setPhotoFeedback({ type: "success", message: "Foto profil Google berhasil disinkronkan!" })
        setTimeout(() => setPhotoFeedback(null), 4000)
      } else if (res.notLinked) {
        setPhotoFeedback({
          type: "error",
          message: "Akun Google belum ditautkan. Silakan masuk lewat Google untuk menghubungkannya.",
        })
      } else {
        setPhotoFeedback({ type: "error", message: res.error || "Gagal menyinkronkan foto Google." })
      }
    } catch {
      setPhotoFeedback({ type: "error", message: "Terjadi kesalahan saat menyinkronkan foto Google." })
    } finally {
      setIsSyncingGoogle(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg("")

    if (!name.trim()) {
      setErrorMsg("Nama lengkap tidak boleh kosong.")
      return
    }

    if (nik.trim() && nik.trim().length < 4) {
      setErrorMsg("Nomor identitas minimal 4 digit jika diisi.")
      return
    }

    setIsSaving(true)
    try {
      const res = await updateBiodata({
        name: name.trim(),
        nik: nik.trim() || null,
        phone: phone.trim() || null,
        institution: institution.trim() || null,
      })

      if (res.success) {
        setSaveSuccess(true)
        setMode("view")
        setTimeout(() => setSaveSuccess(false), 3000)
      } else {
        setErrorMsg(res.error || "Gagal menyimpan perubahan.")
      }
    } catch {
      setErrorMsg("Terjadi kesalahan jaringan.")
    } finally {
      setIsSaving(false)
    }
  }

  const userNik = user?.nik
  const maskedNik = React.useMemo(() => {
    if (!userNik || !userNik.trim()) return "Belum ditambahkan"
    if (showNik) return userNik
    if (userNik.length <= 6) return userNik
    const start = userNik.slice(0, 4)
    const end = userNik.slice(-4)
    return `${start}********${end}`
  }, [userNik, showNik])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-4 sm:p-7 rounded-2xl sm:rounded-3xl border-border max-h-[90vh] overflow-y-auto shadow-2xl">
        <DialogHeader className="space-y-1.5 pr-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0 border border-sky-500/20">
              <User className="h-4.5 w-4.5" />
            </div>
            <div>
              <DialogTitle className="font-heading text-base sm:text-lg font-bold text-foreground">
                {mode === "view" ? "Biodata Akun Anggota" : "Ubah Biodata Akun"}
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-normal">
            {mode === "view"
              ? "Informasi profil dan identitas resmi peminjam literasi digital RSJD."
              : "Perbarui identitas resmi Anda untuk keperluan verifikasi hak peminjaman e-book."}
          </DialogDescription>
        </DialogHeader>

        {saveSuccess && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 animate-fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>Biodata berhasil diperbarui dan disimpan!</span>
          </div>
        )}

        {photoFeedback && (
          <div
            className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold animate-fade-in ${
              photoFeedback.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                : "bg-destructive/10 border-destructive/20 text-destructive"
            }`}
          >
            {photoFeedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
            )}
            <span className="flex-1">{photoFeedback.message}</span>
            <button
              type="button"
              onClick={() => setPhotoFeedback(null)}
              className="text-muted-foreground hover:text-foreground text-xs px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* VIEW MODE */}
        {mode === "view" && (
          <div className="space-y-4 pt-1">
            {/* User Header Card with Safe In-Card Edit Button */}
            <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-muted/40 border border-border/80">
              <div className="flex items-center gap-3 min-w-0">
                {/* Interactive Avatar with Camera Overlay */}
                <div className="relative group shrink-0">
                  <Avatar className="h-13 w-13 ring-2 ring-sky-500/20 shadow-xs">
                    <AvatarImage src={user?.avatarUrl || undefined} alt={user?.name || "Foto"} />
                    <AvatarFallback className="bg-sky-600 text-white font-bold text-base">
                      {user?.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Ganti / Crop Foto Profil"
                    className="absolute inset-0 bg-black/45 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Ganti Foto"
                    className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center shadow border-2 border-background cursor-pointer"
                  >
                    <Camera className="h-2.5 w-2.5" />
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-heading text-sm font-bold text-foreground truncate">
                    {user?.name || "Pengguna Tamu"}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  <div className="mt-1 flex items-center gap-2">
                    {user?.isVerified ? (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[10px] gap-1 px-2 py-0">
                        <ShieldCheck className="h-3 w-3" />
                        <span>
                          {user?.nik && user.nik.trim()
                            ? "Terverifikasi (NIK)"
                            : "Anggota Terverifikasi"}
                        </span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-400 text-amber-600 dark:text-amber-400 text-[10px] gap-1 px-2 py-0 bg-amber-50 dark:bg-amber-950/40">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Belum Terverifikasi</span>
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Edit Button inside Card - Safely away from dialog close 'X' */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMode("edit")}
                className="shrink-0 h-8 px-3 gap-1.5 text-xs font-semibold rounded-xl border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/50 cursor-pointer shadow-2xs"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit</span>
              </Button>
            </div>

            {/* Photo Action Buttons: Crop Foto + Sync Foto Google */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-8.5 text-xs font-semibold rounded-xl border-border bg-card hover:bg-muted/60 text-foreground cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Camera className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                <span>Ganti / Crop Foto</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSyncGoogle}
                disabled={isSyncingGoogle}
                className="h-8.5 text-xs font-semibold rounded-xl border-border bg-card hover:bg-muted/60 text-foreground cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
              >
                {isSyncingGoogle ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-sky-600" />
                    <span>Menyinkronkan...</span>
                  </>
                ) : (
                  <>
                    <GoogleIcon className="h-3.5 w-3.5" />
                    <span>Sync Foto Google</span>
                  </>
                )}
              </Button>
            </div>

            {/* Biodata Fields Grid */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CreditCard className="h-4 w-4 text-sky-600" />
                  <span>No. Identitas:</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono font-medium text-foreground">
                  <span>{maskedNik}</span>
                  {user?.nik && (
                    <button
                      type="button"
                      onClick={() => setShowNik(!showNik)}
                      className="p-1 text-muted-foreground hover:text-foreground rounded cursor-pointer"
                      title={showNik ? "Sembunyikan" : "Tampilkan"}
                    >
                      {showNik ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4 text-emerald-600" />
                  <span>No. WhatsApp:</span>
                </div>
                <span className="font-mono font-medium text-foreground">
                  {user?.phone || "Belum diisi"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building className="h-4 w-4 text-amber-600" />
                  <span>Instansi / Profesi:</span>
                </div>
                <span className="font-medium text-foreground truncate max-w-[180px] text-right">
                  {user?.institution || "Umum / Belum diisi"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4 text-indigo-600" />
                  <span>Status Email:</span>
                </div>
                <span className="font-medium text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Aktif (Google OAuth)</span>
                </span>
              </div>
            </div>

            {/* KTA Digital Trigger Button if verified */}
            {user?.isVerified && onOpenKta && (
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false)
                  onOpenKta()
                }}
                className="w-full h-10 rounded-xl border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 hover:bg-sky-100 font-bold text-xs gap-2 cursor-pointer shadow-xs"
              >
                <Award className="h-4 w-4 text-sky-600" />
                <span>Buka Kartu Tanda Anggota (KTA Digital)</span>
              </Button>
            )}

            {/* Dialog Footer Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-9 px-4 text-xs font-semibold rounded-xl"
              >
                Tutup
              </Button>
              <Button
                type="button"
                onClick={() => setMode("edit")}
                className="h-9 px-4 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-500 text-white gap-1.5 cursor-pointer shadow-xs"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Ubah Biodata</span>
              </Button>
            </div>
          </div>
        )}

        {/* EDIT MODE */}
        {mode === "edit" && (
          <form onSubmit={handleSave} noValidate className="space-y-3.5 pt-1">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between h-5">
                <span>Nama Lengkap (sesuai KTP)</span>
                <span className="text-rose-500 font-bold">*</span>
              </label>
              <Input
                value={name}
                aria-invalid={Boolean(errorMsg && !name.trim())}
                onChange={(e) => {
                  setName(e.target.value)
                  if (errorMsg) setErrorMsg("")
                }}
                placeholder="Masukkan Nama Lengkap..."
                className="h-10 text-xs rounded-xl bg-muted/20 border-border"
              />
              {errorMsg && !name.trim() && (
                <FieldError className="text-[11px] font-medium flex items-center gap-1.5 mt-1 animate-fade-in">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>Nama lengkap tidak boleh kosong.</span>
                </FieldError>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between h-5">
                <span>No. Identitas (NIK KTP)</span>
                <span className="text-[10px] text-muted-foreground font-normal bg-muted/60 px-1.5 py-0.5 rounded">Opsional</span>
              </label>
              <Input
                value={nik}
                onChange={(e) => setNik(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                maxLength={16}
                placeholder="Masukkan Nomor Induk Kependudukan (NIK)..."
                className="h-10 text-xs font-mono rounded-xl bg-muted/20 border-border"
              />
              <p className="text-[10px] text-muted-foreground">
                Opsional. Hanya diisi angka jika ingin nomor NIK tercantum di Kartu Anggota (KTA) Digital.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center h-5">
                <span>Nomor WhatsApp Aktif</span>
              </label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                maxLength={15}
                placeholder="Masukkan Nomor WhatsApp..."
                className="h-10 text-xs font-mono rounded-xl bg-muted/20 border-border"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center h-5">
                <span>Instansi / Unit Kerja / Profesi</span>
              </label>
              <Input
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="Masukkan Instansi / Profesi..."
                className="h-10 text-xs rounded-xl bg-muted/20 border-border"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMode("view")}
                disabled={isSaving}
                className="h-10 px-4 text-xs font-semibold rounded-xl"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="h-10 px-5 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-md shadow-sky-600/20 cursor-pointer"
              >
                {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        )}
        {/* Hidden File Input for Avatar */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
        />

        {/* Interactive Avatar Crop Dialog */}
        <AvatarCropDialog
          open={isCropOpen}
          onOpenChange={setIsCropOpen}
          imageSrc={cropImageSrc}
          onSaveCropped={handleSaveCropped}
        />
      </DialogContent>
    </Dialog>
  )
}
