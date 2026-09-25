import { NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import { query, execute, queryOne } from "@/lib/db"

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
  tagNames?: string | null
}

export async function GET(req: Request) {
  const auth = await verifyAdminSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get("q") || ""
    const categoryId = searchParams.get("category") || ""
    const status = searchParams.get("status") || ""

    let sql = `
      SELECT b.*,
             (SELECT filePath FROM book_files WHERE bookId = b.id AND format = 'PDF' LIMIT 1) as pdfFilePath,
             (SELECT filePath FROM book_files WHERE bookId = b.id AND format = 'EPUB' LIMIT 1) as epubFilePath,
             (SELECT GROUP_CONCAT(t.name SEPARATOR ', ')
              FROM book_tags bt
              JOIN tags t ON bt.tagId = t.id
              WHERE bt.bookId = b.id) as tagNames
      FROM books b
      WHERE 1=1
    `
    const params: (string | number)[] = []

    if (search.trim()) {
      sql += " AND (b.title LIKE ? OR b.authorName LIKE ? OR b.isbn LIKE ?)"
      const wild = `%${search.trim()}%`
      params.push(wild, wild, wild)
    }

    if (categoryId && categoryId !== "all") {
      sql += " AND b.categoryId = ?"
      params.push(parseInt(categoryId, 10))
    }

    if (status && status !== "all") {
      sql += " AND b.status = ?"
      params.push(status)
    }

    sql += " ORDER BY b.createdAt DESC, b.id DESC"

    const rows = await query<BookRow>(sql, params)

    const books = rows.map((r) => ({
      id: String(r.id),
      title: r.title,
      slug: r.slug,
      synopsis: r.synopsis || "",
      coverUrl: r.coverUrl || "/placeholder.jpg",
      authorId: r.authorId ? `a${r.authorId}` : "a1",
      authorName: r.authorName || "Pustakawan RSJD",
      publisherId: r.publisherId ? `p${r.publisherId}` : "p1",
      publisherName: r.publisherName || "Penerbit RSJD",
      categoryId: r.categoryId ? String(r.categoryId) : "1",
      categoryName: r.categoryName || "Umum",
      isbn: r.isbn || "-",
      publishYear: r.publishYear || 2026,
      language: r.language || "Indonesia",
      pageCount: r.pageCount || 200,
      status: r.status,
      isFeatured: Boolean(r.isFeatured),
      loanCount: r.loanCount || 0,
      averageRating: r.averageRating || 5.0,
      tags: r.tagNames ? r.tagNames.split(", ").map((t) => t.trim()) : [],
      fileUrl: (r as unknown as { pdfFilePath?: string; epubFilePath?: string }).pdfFilePath || (r as unknown as { pdfFilePath?: string; epubFilePath?: string }).epubFilePath || null,
      formats: {
        pdf: { available: Boolean(r.pdfAvailable), status: "aktif" },
        epub: { available: Boolean(r.epubAvailable), status: "aktif" },
      },
    }))

    return NextResponse.json({ success: true, books, total: books.length })
  } catch (err) {
    console.error("Failed to load admin books:", err)
    return NextResponse.json({ success: false, error: "Gagal memuat katalog buku." }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await verifyAdminSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = await req.json()
    const {
      title,
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
      format,
      tags,
      fileUrl,
    } = body

    let { slug } = body

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ success: false, error: "Judul buku wajib diisi." }, { status: 400 })
    }

    if (!slug || typeof slug !== "string" || !slug.trim()) {
      slug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .trim()
    }

    // Duplicate & Slug unique check
    const duplicateBook = await queryOne<{ id: number; title: string }>(
      "SELECT id, title FROM books WHERE LOWER(TRIM(title)) = ? OR slug = ? LIMIT 1",
      [title.trim().toLowerCase(), slug.trim()]
    )

    if (duplicateBook) {
      if (body.skipIfDuplicate) {
        return NextResponse.json({
          success: true,
          skipped: true,
          message: `Buku "${duplicateBook.title}" sudah ada di basis data (ID: #${duplicateBook.id}), otomatis dilewati.`,
          bookId: duplicateBook.id,
        })
      }
      if (!body.allowDuplicate) {
        return NextResponse.json(
          {
            success: false,
            error: `Buku dengan judul serupa sudah ada di katalog ("${duplicateBook.title}"). Fitur auto-skip aktif untuk mencegah duplikasi.`,
            isDuplicate: true,
            existingBookId: duplicateBook.id,
          },
          { status: 409 }
        )
      }
      slug = `${slug}-${Date.now().toString().slice(-4)}`
    }

    // Resolve category
    let catId = categoryId ? parseInt(String(categoryId), 10) : null
    let catName = "Umum"
    if (catId) {
      const catRow = await queryOne<{ name: string }>("SELECT name FROM categories WHERE id = ? LIMIT 1", [catId])
      if (catRow) catName = catRow.name
    } else {
      const firstCat = await queryOne<{ id: number; name: string }>("SELECT id, name FROM categories LIMIT 1")
      if (firstCat) {
        catId = firstCat.id
        catName = firstCat.name
      }
    }

    // Resolve Author
    const cleanAuthor = authorName?.trim() || "Pustakawan RSJD"
    let authorId: number | null = null
    const existingAuthor = await queryOne<{ id: number }>(
      "SELECT id FROM authors WHERE name = ? LIMIT 1",
      [cleanAuthor]
    )
    if (existingAuthor) {
      authorId = existingAuthor.id
    } else {
      const authorRes = await execute(
        "INSERT INTO authors (name, bio, photoUrl) VALUES (?, ?, ?)",
        [cleanAuthor, "Penulis / Kontributor Perpustakaan RSJD", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"]
      )
      authorId = authorRes.insertId
    }

    // Resolve Publisher
    const cleanPub = publisherName?.trim() || "Penerbit RSJD Atma Husada Mahakam"
    let publisherId: number | null = null
    const existingPub = await queryOne<{ id: number }>(
      "SELECT id FROM publishers WHERE name = ? LIMIT 1",
      [cleanPub]
    )
    if (existingPub) {
      publisherId = existingPub.id
    } else {
      const pubRes = await execute("INSERT INTO publishers (name) VALUES (?)", [cleanPub])
      publisherId = pubRes.insertId
    }

    const pdfAvail = format === "PDF" || format === "BOTH" || body.pdfAvailable ? 1 : 0
    const epubAvail = format === "EPUB" || format === "BOTH" || body.epubAvailable ? 1 : 0

    // Insert Book
    const bookResult = await execute(
      `INSERT INTO books (
        title, slug, synopsis, coverUrl,
        authorId, publisherId, categoryId,
        authorName, publisherName, categoryName,
        isbn, publishYear, language, pageCount,
        status, isFeatured, loanCount, averageRating, reviewCount,
        pdfAvailable, epubAvailable
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0.0, 0, ?, ?)`,
      [
        title.trim(),
        slug.trim(),
        synopsis?.trim() || "",
        coverUrl?.trim() || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
        authorId,
        publisherId,
        catId,
        cleanAuthor,
        cleanPub,
        catName,
        isbn?.trim() || `978-602-${Math.floor(100000 + Math.random() * 900000)}`,
        parseInt(String(publishYear), 10) || new Date().getFullYear(),
        language?.trim() || "Indonesia",
        parseInt(String(pageCount), 10) || 200,
        status === "nonaktif" ? "nonaktif" : "aktif",
        isFeatured ? 1 : 0,
        pdfAvail,
        epubAvail,
      ]
    )

    const newBookId = bookResult.insertId

    // Insert book files
    if (pdfAvail) {
      const pdfPath = fileUrl && (fileUrl.endsWith(".pdf") || format === "PDF") ? fileUrl.trim() : "/sample.pdf"
      await execute(
        "INSERT INTO book_files (bookId, format, filePath, status) VALUES (?, 'PDF', ?, 'aktif')",
        [newBookId, pdfPath]
      )
    }
    if (epubAvail) {
      const epubPath = fileUrl && (fileUrl.endsWith(".epub") || format === "EPUB") ? fileUrl.trim() : "/sample.epub"
      await execute(
        "INSERT INTO book_files (bookId, format, filePath, status) VALUES (?, 'EPUB', ?, 'aktif')",
        [newBookId, epubPath]
      )
    }

    // Process Tags
    if (Array.isArray(tags) && tags.length > 0) {
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
          await execute("INSERT IGNORE INTO book_tags (bookId, tagId) VALUES (?, ?)", [newBookId, tagId])
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Buku baru berhasil ditambahkan ke katalog!",
      id: newBookId,
      slug,
    })
  } catch (err) {
    console.error("Failed to add book:", err)
    return NextResponse.json({ success: false, error: "Gagal menyimpan buku baru." }, { status: 500 })
  }
}
