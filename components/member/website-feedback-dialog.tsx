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
import { FieldError } from "@/components/ui/field"
import { Star, MessageSquare, CheckCircle2, Sparkles, AlertCircle } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

interface WebsiteFeedbackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CATEGORIES = [
  "Tampilan & Desain Web",
  "Koleksi & Kelengkapan Buku",
  "Pengalaman Membaca (Reader)",
  "Kecepatan & Kemudahan Akses",
  "Lainnya",
]

export function WebsiteFeedbackDialog({
  open,
  onOpenChange,
}: WebsiteFeedbackDialogProps) {
  const { user } = useAuth()
  const [rating, setRating] = React.useState<number>(5)
  const [hoverRating, setHoverRating] = React.useState<number>(0)
  const [selectedCategory, setSelectedCategory] = React.useState<string>(CATEGORIES[0])
  const [comment, setComment] = React.useState<string>("")
  const [commentError, setCommentError] = React.useState<string>("")
  const [isSubmitted, setIsSubmitted] = React.useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim()) {
      setCommentError("Silakan tuliskan kesan, pesan, atau masukan Anda.")
      return
    }
    setCommentError("")
    setIsSubmitted(true)
    setTimeout(() => {
      setIsSubmitted(false)
      setComment("")
      onOpenChange(false)
    }, 2500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <DialogTitle className="font-heading text-lg font-bold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-sky-600" />
            <span>Ulasan Website PerpusAHM</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Bantu kami meningkatkan kualitas layanan perpustakaan digital RSJD Atma Husada Mahakam.
          </DialogDescription>
        </DialogHeader>

        {isSubmitted ? (
          <div className="py-8 text-center space-y-3 animate-fade-in">
            <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="font-heading text-base font-bold text-foreground">
              Terima Kasih atas Ulasan Anda!
            </h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Saran dan masukan Anda sangat berharga untuk terus memajukan literasi kesehatan mental di Kalimantan Timur.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4 pt-2">
            {/* Rating Stars */}
            <div className="text-center py-2 bg-muted/40 rounded-2xl border border-border/80 space-y-2">
              <span className="text-xs font-semibold text-muted-foreground block">
                Seberapa puas Anda dengan platform ini?
              </span>
              <div className="flex items-center justify-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = hoverRating ? star <= hoverRating : star <= rating
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 transition-transform hover:scale-115 active:scale-95"
                    >
                      <Star
                        className={cn(
                          "h-6 w-6 transition-colors",
                          active
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/40"
                        )}
                      />
                    </button>
                  )
                })}
              </div>
              <span className="text-[11px] font-bold text-sky-600 block">
                {rating === 5 && "Sangat Memuaskan ⭐⭐⭐⭐⭐"}
                {rating === 4 && "Memuaskan ⭐⭐⭐⭐"}
                {rating === 3 && "Cukup Baik ⭐⭐⭐"}
                {rating === 2 && "Kurang Memuaskan ⭐⭐"}
                {rating === 1 && "Perlu Banyak Perbaikan ⭐"}
              </span>
            </div>

            {/* Category selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Kategori Masukan:</label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "text-[11px] px-2.5 py-1 rounded-xl transition-all font-medium border",
                      selectedCategory === cat
                        ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                        : "bg-card hover:bg-muted text-muted-foreground border-border"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Comment Area */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Kesan, Pesan, atau Saran:</label>
              <textarea
                value={comment}
                aria-invalid={Boolean(commentError)}
                onChange={(e) => {
                  setComment(e.target.value)
                  if (commentError) setCommentError("")
                }}
                rows={3}
                placeholder="Masukkan Kesan, Pesan, atau Saran Anda..."
                className="w-full text-xs p-3 rounded-xl border border-border bg-background focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600 resize-none aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive"
              />
              {commentError && (
                <FieldError className="text-[11px] font-medium flex items-center gap-1.5 mt-1 animate-fade-in">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{commentError}</span>
                </FieldError>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/80">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-9 text-xs rounded-xl"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-9 px-4 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-xs"
              >
                Kirim Ulasan
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
