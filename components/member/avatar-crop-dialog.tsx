"use client"

import * as React from "react"
import {
  Crop,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Check,
  RefreshCw,
  Sparkles,
} from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Spinner } from "@/components/ui/spinner"

export interface AvatarCropDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageSrc: string | null
  onSaveCropped: (croppedDataUrl: string) => Promise<void>
}

// Fixed diameter for the circular crop box in the UI modal
const CROP_SIZE = 240

export function AvatarCropDialog({
  open,
  onOpenChange,
  imageSrc,
  onSaveCropped,
}: AvatarCropDialogProps) {
  const [zoom, setZoom] = React.useState<number>(1)
  const [rotation, setRotation] = React.useState<number>(0)
  const [pan, setPan] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = React.useState<boolean>(false)
  const [dragStart, setDragStart] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isSaving, setIsSaving] = React.useState<boolean>(false)
  const [imageSize, setImageSize] = React.useState<{ width: number; height: number }>({ width: 0, height: 0 })

  const containerRef = React.useRef<HTMLDivElement>(null)
  const imageRef = React.useRef<HTMLImageElement>(null)

  // Reset transform state whenever a new image is loaded
  React.useEffect(() => {
    if (open && imageSrc) {
      setZoom(1)
      setRotation(0)
      setPan({ x: 0, y: 0 })
    }
  }, [open, imageSrc])

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    setImageSize({ width: img.naturalWidth, height: img.naturalHeight })
  }

  // Calculate base display dimensions so image covers crop circle at zoom=1.0
  const { baseWidth, baseHeight } = React.useMemo(() => {
    if (!imageSize.width || !imageSize.height) {
      return { baseWidth: CROP_SIZE, baseHeight: CROP_SIZE }
    }
    const aspect = imageSize.width / imageSize.height
    if (aspect >= 1) {
      // Landscape or square: height fits crop circle, width scales proportionally
      return {
        baseHeight: CROP_SIZE,
        baseWidth: Math.round(CROP_SIZE * aspect),
      }
    } else {
      // Portrait: width fits crop circle, height scales proportionally
      return {
        baseWidth: CROP_SIZE,
        baseHeight: Math.round(CROP_SIZE / aspect),
      }
    }
  }, [imageSize])

  // Helper function to clamp pan coordinates strictly within the crop circle boundaries
  const clampPan = React.useCallback(
    (x: number, y: number, currentZoom = zoom, currentRot = rotation) => {
      // If rotated 90 or 270 degrees, visual width and height swap
      const isRotated90 = Math.abs(currentRot % 180) === 90
      const currentSpanX = (isRotated90 ? baseHeight : baseWidth) * currentZoom
      const currentSpanY = (isRotated90 ? baseWidth : baseHeight) * currentZoom

      // Maximum pan allowed so the photo never leaves any part of the crop circle
      const maxPanX = Math.max(0, (currentSpanX - CROP_SIZE) / 2)
      const maxPanY = Math.max(0, (currentSpanY - CROP_SIZE) / 2)

      const clampedX = Math.min(maxPanX, Math.max(-maxPanX, x))
      const clampedY = Math.min(maxPanY, Math.max(-maxPanY, y))

      return { x: clampedX, y: clampedY }
    },
    [baseWidth, baseHeight, zoom, rotation]
  )

  // Keep pan strictly within bounds if zoom, rotation, or image dimensions change
  React.useEffect(() => {
    setPan((prev) => {
      const clamped = clampPan(prev.x, prev.y, zoom, rotation)
      if (clamped.x === prev.x && clamped.y === prev.y) return prev
      return clamped
    })
  }, [zoom, rotation, clampPan])

  // Pointer Drag Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId)
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    const rawX = e.clientX - dragStart.x
    const rawY = e.clientY - dragStart.y
    setPan(clampPan(rawX, rawY))
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false)
    if (containerRef.current) {
      try {
        containerRef.current.releasePointerCapture(e.pointerId)
      } catch {}
    }
  }

  // Mouse wheel zoom support on viewport (min 1.0x, max 3.0x)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY * -0.0015
    setZoom((prev) => Math.min(3, Math.max(1, +(prev + delta).toFixed(2))))
  }

  // Zoom handlers
  const handleZoomChange = (values: number[]) => {
    if (values[0] !== undefined) setZoom(Math.max(1, values[0]))
  }

  const handleRotate = (direction: "cw" | "ccw") => {
    setRotation((prev) => (prev + (direction === "cw" ? 90 : -90)) % 360)
  }

  const handleReset = () => {
    setZoom(1)
    setRotation(0)
    setPan({ x: 0, y: 0 })
  }

  // Crop output generation using offscreen canvas (Target: 320x320 Retina Avatar)
  const handleSave = async () => {
    if (!imageRef.current || !imageSrc) return

    setIsSaving(true)
    try {
      const outputSize = 320
      const canvas = document.createElement("canvas")
      canvas.width = outputSize
      canvas.height = outputSize
      const ctx = canvas.getContext("2d")

      if (!ctx) {
        throw new Error("Canvas context 2D not supported")
      }

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "high"

      // Circular clip path
      ctx.save()
      ctx.beginPath()
      ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()

      // Fill background
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, outputSize, outputSize)

      const scaleFactor = outputSize / CROP_SIZE

      // 1. Move canvas origin to center
      ctx.translate(outputSize / 2, outputSize / 2)

      // 2. Apply pan in screen space
      ctx.translate(pan.x * scaleFactor, pan.y * scaleFactor)

      // 3. Apply rotation
      ctx.rotate((rotation * Math.PI) / 180)

      // 4. Draw image centered
      const img = imageRef.current
      const drawWidth = baseWidth * zoom * scaleFactor
      const drawHeight = baseHeight * zoom * scaleFactor

      ctx.drawImage(
        img,
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight
      )
      ctx.restore()

      // Export as high quality webp
      const croppedDataUrl = canvas.toDataURL("image/webp", 0.92)
      await onSaveCropped(croppedDataUrl)
      onOpenChange(false)
    } catch (err) {
      console.error("Failed to export cropped avatar:", err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-card border-border shadow-2xl space-y-4">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
            <Crop className="h-5 w-5" />
            <DialogTitle className="font-heading text-base sm:text-lg font-bold text-foreground">
              Atur & Sesuaikan Foto Profil
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Geser gambar untuk menentukan posisi terbaik, lalu atur perbesaran dan rotasi sesuai keinginan Anda.
          </DialogDescription>
        </DialogHeader>

        {/* Viewport Area with Circular Mask */}
        <div className="flex flex-col items-center justify-center pt-1">
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            className="relative h-[270px] w-[270px] rounded-2xl overflow-hidden bg-neutral-950 border-2 border-border shadow-inner cursor-grab active:cursor-grabbing select-none touch-none flex items-center justify-center"
          >
            {/* Image being dragged/zoomed/rotated */}
            {imageSrc && (
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Crop preview"
                onLoad={handleImageLoad}
                draggable={false}
                style={{
                  width: `${baseWidth}px`,
                  height: `${baseHeight}px`,
                  minWidth: `${baseWidth}px`,
                  minHeight: `${baseHeight}px`,
                  maxWidth: "none",
                  maxHeight: "none",
                  transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom})`,
                  transformOrigin: "center center",
                  userSelect: "none",
                  pointerEvents: "none",
                  transition: isDragging ? "none" : "transform 0.08s ease-out",
                }}
              />
            )}

            {/* Darkened overlay with circular transparent viewport */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div
                style={{ width: `${CROP_SIZE}px`, height: `${CROP_SIZE}px` }}
                className="rounded-full border-2 border-dashed border-sky-400/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] ring-2 ring-white/20"
              />
            </div>

            <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[10px] text-white/90 font-medium pointer-events-none">
              Geser untuk memposisikan
            </div>
          </div>
        </div>

        {/* Controls: Zoom & Rotate */}
        <div className="space-y-3 bg-muted/40 p-3.5 rounded-2xl border border-border/80">
          {/* Zoom Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span className="flex items-center gap-1.5">
                <ZoomIn className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                <span>Perbesaran (Zoom)</span>
              </span>
              <div className="flex items-center gap-1.5">
                {zoom > 1 && (
                  <button
                    type="button"
                    onClick={() => setZoom(1)}
                    className="text-[10px] px-2 py-0.5 rounded bg-card hover:bg-muted border border-border text-muted-foreground hover:text-foreground font-medium cursor-pointer transition-colors"
                    title="Kembalikan ke 1.0x"
                  >
                    Reset Zoom (1.0x)
                  </button>
                )}
                <span className="text-[11px] font-mono font-medium text-sky-600 dark:text-sky-400 w-8 text-right">
                  {zoom.toFixed(1)}x
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(1, +(z - 0.1).toFixed(2)))}
                disabled={zoom <= 1}
                className="h-7 w-7 flex items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Perkecil"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <Slider
                value={[zoom]}
                min={1}
                max={3}
                step={0.05}
                onValueChange={handleZoomChange}
                className="flex-1 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
                disabled={zoom >= 3}
                className="h-7 w-7 flex items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Perbesar"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Rotate & Reset Controls */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleRotate("ccw")}
                className="h-7.5 px-2.5 text-xs rounded-xl gap-1 border-border bg-card hover:bg-muted cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>-90°</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleRotate("cw")}
                className="h-7.5 px-2.5 text-xs rounded-xl gap-1 border-border bg-card hover:bg-muted cursor-pointer"
              >
                <RotateCw className="h-3.5 w-3.5" />
                <span>+90°</span>
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-7.5 px-2.5 text-xs rounded-xl gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Reset Posisi</span>
            </Button>
          </div>
        </div>

        {/* Live Preview Circles */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border/80 text-xs">
          <div className="space-y-0.5">
            <p className="font-semibold text-foreground flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Pratinjau Hasil</span>
            </p>
            <p className="text-[10px] text-muted-foreground">Tampilan di header dan kartu anggota</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Small size preview (32px) */}
            <div className="relative h-8 w-8 rounded-full ring-2 ring-sky-500/30 overflow-hidden bg-neutral-900 flex items-center justify-center shrink-0">
              {imageSrc && (
                <img
                  src={imageSrc}
                  alt="Small preview"
                  draggable={false}
                  style={{
                    width: `${baseWidth * (32 / CROP_SIZE)}px`,
                    height: `${baseHeight * (32 / CROP_SIZE)}px`,
                    minWidth: `${baseWidth * (32 / CROP_SIZE)}px`,
                    minHeight: `${baseHeight * (32 / CROP_SIZE)}px`,
                    maxWidth: "none",
                    maxHeight: "none",
                    transform: `translate(${pan.x * (32 / CROP_SIZE)}px, ${pan.y * (32 / CROP_SIZE)}px) rotate(${rotation}deg) scale(${zoom})`,
                    transformOrigin: "center center",
                    userSelect: "none",
                    pointerEvents: "none",
                  }}
                />
              )}
            </div>

            {/* Medium size preview (48px) */}
            <div className="relative h-12 w-12 rounded-full ring-2 ring-sky-500/40 overflow-hidden bg-neutral-900 flex items-center justify-center shrink-0">
              {imageSrc && (
                <img
                  src={imageSrc}
                  alt="Medium preview"
                  draggable={false}
                  style={{
                    width: `${baseWidth * (48 / CROP_SIZE)}px`,
                    height: `${baseHeight * (48 / CROP_SIZE)}px`,
                    minWidth: `${baseWidth * (48 / CROP_SIZE)}px`,
                    minHeight: `${baseHeight * (48 / CROP_SIZE)}px`,
                    maxWidth: "none",
                    maxHeight: "none",
                    transform: `translate(${pan.x * (48 / CROP_SIZE)}px, ${pan.y * (48 / CROP_SIZE)}px) rotate(${rotation}deg) scale(${zoom})`,
                    transformOrigin: "center center",
                    userSelect: "none",
                    pointerEvents: "none",
                  }}
                />
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row sm:justify-end gap-2 pt-2 border-t border-border/70">
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={() => onOpenChange(false)}
            className="flex-1 sm:flex-none h-10 rounded-xl text-xs"
          >
            Batal
          </Button>
          <Button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="flex-1 sm:flex-none h-10 px-5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs gap-2 shadow-md shadow-sky-600/20 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Spinner className="h-3.5 w-3.5 text-white" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>Terapkan & Simpan Foto</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
