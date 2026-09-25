import { NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import fs from "fs"
import path from "path"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const auth = await verifyAdminSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const coverData = formData.get("cover") as string | File | null

    if (!file && !coverData) {
      return NextResponse.json({ success: false, error: "Tidak ada berkas yang diunggah." }, { status: 400 })
    }

    const publicDir = path.join(process.cwd(), "public")
    const booksDir = path.join(publicDir, "uploads", "books")
    const coversDir = path.join(publicDir, "uploads", "covers")

    await fs.promises.mkdir(booksDir, { recursive: true })
    await fs.promises.mkdir(coversDir, { recursive: true })

    const timestamp = Date.now()
    let fileUrl: string | null = null
    let coverUrl: string | null = null
    let fileName: string | null = null
    let fileSize: number | null = null
    let detectedFormat: "PDF" | "EPUB" | "UNKNOWN" = "UNKNOWN"

    const ALLOWED_BOOK_EXTS = new Set([".pdf", ".epub"])
    const ALLOWED_COVER_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"])

    // 1. Process Book File if present
    if (file && typeof file === "object" && "arrayBuffer" in file) {
      const originalName = file.name || "book.pdf"
      const ext = path.extname(originalName).toLowerCase()

      if (!ALLOWED_BOOK_EXTS.has(ext)) {
        return NextResponse.json(
          { success: false, error: `Format berkas ${ext} tidak diizinkan. Hanya berkas .pdf dan .epub yang diperbolehkan.` },
          { status: 400 }
        )
      }

      const baseName = path
        .basename(originalName, ext)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 50)

      if (ext === ".pdf") detectedFormat = "PDF"
      else if (ext === ".epub") detectedFormat = "EPUB"

      const safeFileName = `${timestamp}-${baseName}${ext}`
      const targetFilePath = path.join(booksDir, safeFileName)

      const buffer = Buffer.from(await file.arrayBuffer())
      await fs.promises.writeFile(targetFilePath, buffer)

      fileUrl = `/uploads/books/${safeFileName}`
      fileName = originalName
      fileSize = file.size
    }

    // 2. Process Cover (either Base64 string from canvas or File)
    if (coverData) {
      if (typeof coverData === "string" && coverData.startsWith("data:image/")) {
        // Base64 data URL
        const matches = coverData.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/)
        if (matches) {
          let extension = matches[1].toLowerCase() === "jpeg" ? "jpg" : matches[1].toLowerCase()
          if (!ALLOWED_COVER_EXTS.has(`.${extension}`)) {
            extension = "jpg"
          }
          const base64Data = matches[2]
          const coverFileName = `${timestamp}-cover.${extension}`
          const targetCoverPath = path.join(coversDir, coverFileName)

          await fs.promises.writeFile(targetCoverPath, Buffer.from(base64Data, "base64"))
          coverUrl = `/uploads/covers/${coverFileName}`
        }
      } else if (typeof coverData === "object" && "arrayBuffer" in coverData) {
        // File instance
        const originalCoverName = (coverData as File).name || "cover.jpg"
        const ext = path.extname(originalCoverName).toLowerCase() || ".jpg"
        if (!ALLOWED_COVER_EXTS.has(ext)) {
          return NextResponse.json(
            { success: false, error: "Format sampul buku harus berupa gambar JPG, PNG, atau WebP." },
            { status: 400 }
          )
        }
        const coverFileName = `${timestamp}-cover${ext}`
        const targetCoverPath = path.join(coversDir, coverFileName)

        const buffer = Buffer.from(await (coverData as File).arrayBuffer())
        await fs.promises.writeFile(targetCoverPath, buffer)
        coverUrl = `/uploads/covers/${coverFileName}`
      }
    }

    return NextResponse.json({
      success: true,
      fileUrl,
      coverUrl,
      fileName,
      fileSize,
      detectedFormat,
      message: "Berkas berhasil diunggah!",
    })
  } catch (err) {
    console.error("Upload error:", err)
    return NextResponse.json({ success: false, error: "Gagal memproses unggahan berkas." }, { status: 500 })
  }
}
