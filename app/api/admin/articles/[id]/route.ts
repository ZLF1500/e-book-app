import { NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import { query, queryOne } from "@/lib/db"

interface ArticleRow {
  id: number
  title: string
  slug: string
  thumbnailUrl: string | null
  excerpt: string
  content: string | null
  authorName: string
  readTime: string
  category: string
  publishedAt: string
  createdAt: string
  updatedAt: string
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

// PATCH: Perbarui artikel yang ada
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const { id } = await params
    const articleId = parseInt(id, 10)
    if (isNaN(articleId)) {
      return NextResponse.json({ success: false, error: "ID artikel tidak valid." }, { status: 400 })
    }

    const existing = await queryOne<ArticleRow>(
      "SELECT * FROM articles WHERE id = ? LIMIT 1",
      [articleId]
    )
    if (!existing) {
      return NextResponse.json({ success: false, error: "Artikel tidak ditemukan." }, { status: 404 })
    }

    const body = await request.json()
    const {
      title,
      slug: customSlug,
      thumbnailUrl,
      excerpt,
      content,
      authorName,
      readTime,
      category,
    } = body

    const updatedTitle = title !== undefined ? title.trim() : existing.title
    if (!updatedTitle) {
      return NextResponse.json({ success: false, error: "Judul artikel tidak boleh kosong." }, { status: 400 })
    }

    let updatedSlug = existing.slug
    if (customSlug && customSlug.trim() && customSlug.trim() !== existing.slug) {
      updatedSlug = generateSlug(customSlug)
      // Check duplicate
      const duplicate = await queryOne<{ id: number }>(
        "SELECT id FROM articles WHERE slug = ? AND id != ? LIMIT 1",
        [updatedSlug, articleId]
      )
      if (duplicate) {
        updatedSlug = `${updatedSlug}-${Date.now().toString().slice(-4)}`
      }
    }

    const updatedExcerpt = excerpt !== undefined ? excerpt.trim() : existing.excerpt
    const updatedContent = content !== undefined ? content.trim() : (existing.content || "")
    const updatedAuthor = authorName !== undefined ? authorName.trim() : existing.authorName
    const updatedReadTime = readTime !== undefined ? readTime.trim() : existing.readTime
    const updatedCategory = category !== undefined ? category.trim() : existing.category
    const updatedThumbnail = thumbnailUrl !== undefined ? thumbnailUrl.trim() : existing.thumbnailUrl

    await query(
      `UPDATE articles 
       SET title = ?, slug = ?, thumbnailUrl = ?, excerpt = ?, content = ?, authorName = ?, readTime = ?, category = ?, updatedAt = NOW()
       WHERE id = ?`,
      [
        updatedTitle,
        updatedSlug,
        updatedThumbnail,
        updatedExcerpt,
        updatedContent,
        updatedAuthor,
        updatedReadTime,
        updatedCategory,
        articleId,
      ]
    )

    const updated = await queryOne<ArticleRow>(
      "SELECT * FROM articles WHERE id = ? LIMIT 1",
      [articleId]
    )

    return NextResponse.json({
      success: true,
      message: "Artikel berhasil diperbarui!",
      article: updated,
    })
  } catch (err: any) {
    console.error("Admin PATCH /api/admin/articles/[id] error:", err)
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memperbarui artikel." },
      { status: 500 }
    )
  }
}

// DELETE: Hapus artikel
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const { id } = await params
    const articleId = parseInt(id, 10)
    if (isNaN(articleId)) {
      return NextResponse.json({ success: false, error: "ID artikel tidak valid." }, { status: 400 })
    }

    const existing = await queryOne<ArticleRow>(
      "SELECT id, title FROM articles WHERE id = ? LIMIT 1",
      [articleId]
    )
    if (!existing) {
      return NextResponse.json({ success: false, error: "Artikel tidak ditemukan." }, { status: 404 })
    }

    await query("DELETE FROM articles WHERE id = ?", [articleId])

    return NextResponse.json({
      success: true,
      message: `Artikel "${existing.title}" berhasil dihapus.`,
    })
  } catch (err: any) {
    console.error("Admin DELETE /api/admin/articles/[id] error:", err)
    return NextResponse.json(
      { success: false, error: err.message || "Gagal menghapus artikel." },
      { status: 500 }
    )
  }
}
