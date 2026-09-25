import { NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import { query, queryOne, execute } from "@/lib/db"

interface BookRow {
  id: number
  title: string
  slug: string
  synopsis: string | null
  coverUrl: string | null
  authorId: number | null
  publisherId: number | null
  categoryId: number | null
  authorName: string | null
  publisherName: string | null
  categoryName: string | null
  isbn: string | null
  publishYear: number | null
  language: string
  pageCount: number
  status: "aktif" | "nonaktif"
  isFeatured: number
  loanCount: number
  averageRating: number
  pdfAvailable: number
  epubAvailable: number
  createdAt: string
  updatedAt: string
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const { id } = await params
    const bookId = parseInt(id, 10)
    if (!bookId) {
      return NextResponse.json({ success: false, error: "ID buku tidak valid." }, { status: 400 })
    }

    const book = await queryOne<BookRow>("SELECT * FROM books WHERE id = ? LIMIT 1", [bookId])
    if (!book) {
      return NextResponse.json({ success: false, error: "Buku tidak ditemukan." }, { status: 404 })
    }

    const tags = await query<{ name: string }>(
      "SELECT t.name FROM tags t JOIN book_tags bt ON t.id = bt.tagId WHERE bt.bookId = ?",
      [bookId]
    )

    return NextResponse.json({
      success: true,
      book: {
        ...book,
        tags: tags.map((t) => t.name),
        isFeatured: Boolean(book.isFeatured),
        pdfAvailable: Boolean(book.pdfAvailable),
        epubAvailable: Boolean(book.epubAvailable),
      },
    })
  } catch (err) {
    console.error("Failed to fetch book detail:", err)
    return NextResponse.json({ success: false, error: "Gagal memuat detail buku." }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const { id } = await params
    const bookId = parseInt(id, 10)
    if (!bookId) {
      return NextResponse.json({ success: false, error: "ID buku tidak valid." }, { status: 400 })
    }

    const body = await req.json()
    const {
      title,
      slug,
      synopsis,
      coverUrl,
      authorName,
      publisherName,
      categoryId,
      isbn,
      publishYear,
      language,
      pageCount,
      status,
      isFeatured,
      pdfAvailable,
      epubAvailable,
      tags,
      fileUrl,
    } = body

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ success: false, error: "Judul buku tidak boleh kosong." }, { status: 400 })
    }

    // Resolve category name
    let catName = "Umum"
    const catId = categoryId ? parseInt(String(categoryId), 10) : null
    if (catId) {
      const catRow = await queryOne<{ name: string }>("SELECT name FROM categories WHERE id = ? LIMIT 1", [catId])
      if (catRow) catName = catRow.name
    }

    // Update book table
    await execute(
      `UPDATE books SET
        title = ?,
        slug = ?,
        synopsis = ?,
        coverUrl = ?,
        authorName = ?,
        publisherName = ?,
        categoryId = ?,
        categoryName = ?,
        isbn = ?,
        publishYear = ?,
        language = ?,
        pageCount = ?,
        status = ?,
        isFeatured = ?,
        pdfAvailable = ?,
        epubAvailable = ?
       WHERE id = ?`,
      [
        title.trim(),
        slug?.trim() || `buku-${bookId}`,
        synopsis?.trim() || "",
        coverUrl?.trim() || "",
        authorName?.trim() || "Pustakawan RSJD",
        publisherName?.trim() || "Penerbit RSJD",
        catId,
        catName,
        isbn?.trim() || "-",
        parseInt(String(publishYear), 10) || 2026,
        language?.trim() || "Indonesia",
        parseInt(String(pageCount), 10) || 200,
        status === "nonaktif" ? "nonaktif" : "aktif",
        isFeatured ? 1 : 0,
        pdfAvailable ? 1 : 0,
        epubAvailable ? 1 : 0,
        bookId,
      ]
    )

    // Update book_files
    await execute("DELETE FROM book_files WHERE bookId = ?", [bookId])
    if (pdfAvailable) {
      const pdfPath = fileUrl && (fileUrl.endsWith(".pdf") || body.format === "PDF") ? fileUrl.trim() : "/sample.pdf"
      await execute("INSERT INTO book_files (bookId, format, filePath, status) VALUES (?, 'PDF', ?, 'aktif')", [bookId, pdfPath])
    }
    if (epubAvailable) {
      const epubPath = fileUrl && (fileUrl.endsWith(".epub") || body.format === "EPUB") ? fileUrl.trim() : "/sample.epub"
      await execute("INSERT INTO book_files (bookId, format, filePath, status) VALUES (?, 'EPUB', ?, 'aktif')", [bookId, epubPath])
    }

    // Update tags
    if (Array.isArray(tags)) {
      await execute("DELETE FROM book_tags WHERE bookId = ?", [bookId])
      for (const t of tags) {
        const cleanTag = String(t).trim()
        if (!cleanTag) continue
        let tagId: number | null = null
        const tagRow = await queryOne<{ id: number }>("SELECT id FROM tags WHERE name = ? LIMIT 1", [cleanTag])
        if (tagRow) {
          tagId = tagRow.id
        } else {
          const tSlug = cleanTag.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").trim()
          const tRes = await execute("INSERT INTO tags (name, slug, usageCount) VALUES (?, ?, 1)", [cleanTag, tSlug])
          tagId = tRes.insertId
        }
        if (tagId) {
          await execute("INSERT IGNORE INTO book_tags (bookId, tagId) VALUES (?, ?)", [bookId, tagId])
        }
      }
    }

    return NextResponse.json({ success: true, message: "Buku berhasil diperbarui!" })
  } catch (err) {
    console.error("Failed to update book:", err)
    return NextResponse.json({ success: false, error: "Gagal memperbarui buku." }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const { id } = await params
    const bookId = parseInt(id, 10)
    if (!bookId) {
      return NextResponse.json({ success: false, error: "ID buku tidak valid." }, { status: 400 })
    }

    const body = await req.json()

    if (body.toggleFeatured !== undefined) {
      await execute("UPDATE books SET isFeatured = NOT isFeatured WHERE id = ?", [bookId])
      const updated = await queryOne<{ isFeatured: number }>("SELECT isFeatured FROM books WHERE id = ?", [bookId])
      return NextResponse.json({
        success: true,
        message: updated?.isFeatured ? "Buku ditandai sebagai Pilihan Editor." : "Buku dilepas dari Pilihan Editor.",
        isFeatured: Boolean(updated?.isFeatured),
      })
    }

    if (body.status !== undefined) {
      const newStatus = body.status === "nonaktif" ? "nonaktif" : "aktif"
      await execute("UPDATE books SET status = ? WHERE id = ?", [newStatus, bookId])
      return NextResponse.json({
        success: true,
        message: `Status buku diubah menjadi ${newStatus}.`,
        status: newStatus,
      })
    }

    return NextResponse.json({ success: false, error: "Tidak ada aksi yang ditentukan." }, { status: 400 })
  } catch (err) {
    console.error("Failed to patch book:", err)
    return NextResponse.json({ success: false, error: "Gagal memperbarui status buku." }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const { id } = await params
    const bookId = parseInt(id, 10)
    if (!bookId) {
      return NextResponse.json({ success: false, error: "ID buku tidak valid." }, { status: 400 })
    }

    const book = await queryOne<{ id: number; title: string }>("SELECT id, title FROM books WHERE id = ? LIMIT 1", [bookId])
    if (!book) {
      return NextResponse.json({ success: false, error: "Buku tidak ditemukan." }, { status: 404 })
    }

    // Delete book (cascade handles book_tags, book_files, loans, etc.)
    await execute("DELETE FROM books WHERE id = ?", [bookId])

    return NextResponse.json({ success: true, message: `Buku '${book.title}' berhasil dihapus.` })
  } catch (err) {
    console.error("Failed to delete book:", err)
    return NextResponse.json({ success: false, error: "Gagal menghapus buku dari katalog." }, { status: 500 })
  }
}
