import { NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import fs from "fs"
import path from "path"

export const dynamic = "force-dynamic"

const ALLOWED_EXTENSIONS = new Set([".pdf", ".epub", ".zip", ".png", ".jpg", ".jpeg", ".webp"])

function getMimeType(ext: string): string {
  switch (ext) {
    case ".pdf":
      return "application/pdf"
    case ".epub":
      return "application/epub+zip"
    case ".zip":
      return "application/zip"
    case ".png":
      return "image/png"
    case ".jpg":
    case ".jpeg":
      return "image/jpeg"
    case ".webp":
      return "image/webp"
    default:
      return "application/octet-stream"
  }
}

export async function POST(req: Request) {
  const auth = await verifyAdminSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = await req.json()
    const { uri, filePath } = body

    if (!uri && !filePath) {
      return NextResponse.json(
        { success: false, error: "URI berkas atau jalur lokal wajib disertakan." },
        { status: 400 }
      )
    }

    let targetPath = filePath ? String(filePath).trim() : ""
    if (uri && !targetPath) {
      const cleanUri = String(uri).trim()
      if (cleanUri.startsWith("file://")) {
        try {
          const parsed = new URL(cleanUri)
          targetPath = decodeURIComponent(parsed.pathname)
        } catch {
          targetPath = decodeURIComponent(cleanUri.replace(/^file:\/\//, ""))
        }
      } else {
        targetPath = decodeURIComponent(cleanUri)
      }
    }

    // Resolusi path dengan pencegahan akses file sistem sensitif
    const resolvedPath = path.resolve(targetPath)

    const cwd = process.cwd()
    const isAllowedDir =
      resolvedPath.startsWith(cwd) ||
      resolvedPath.startsWith("/run/media") ||
      resolvedPath.startsWith("/home/zoe")

    if (!isAllowedDir) {
      return NextResponse.json(
        { success: false, error: "Akses ke direktori sistem di luar lingkungan kerja ditolak demi keamanan sistem." },
        { status: 403 }
      )
    }

    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json(
        { success: false, error: `Berkas tidak ditemukan di jalur: ${resolvedPath}` },
        { status: 404 }
      )
    }

    const stat = await fs.promises.stat(resolvedPath)
    if (!stat.isFile()) {
      return NextResponse.json(
        { success: false, error: "Jalur yang dipilih bukan merupakan berkas reguler." },
        { status: 400 }
      )
    }

    const ext = path.extname(resolvedPath).toLowerCase()
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { success: false, error: `Ekstensi berkas ${ext} tidak didukung.` },
        { status: 400 }
      )
    }

    // Batas ukuran 300MB
    const MAX_SIZE = 300 * 1024 * 1024
    if (stat.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: "Ukuran berkas melebihi batas 300 MB." },
        { status: 400 }
      )
    }

    const buffer = await fs.promises.readFile(resolvedPath)
    const mimeType = getMimeType(ext)
    const baseName = path.basename(resolvedPath)

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(buffer.length),
        "X-File-Name": encodeURIComponent(baseName),
        "X-File-Size": String(buffer.length),
        "Cache-Control": "no-store",
      },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal membaca berkas lokal."
    console.error("Local file read API error:", error)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
