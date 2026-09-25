import { NextResponse } from "next/server"
import { verifyUserSession } from "@/lib/user-auth"
import { execute, queryOne } from "@/lib/db"

export async function POST(req: Request) {
  const auth = await verifyUserSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const { bookId, lastPage, progressPercent } = await req.json()
    const numericBookId = parseInt(String(bookId), 10)
    if (!numericBookId) {
      return NextResponse.json({ success: false, error: "ID buku tidak valid." }, { status: 400 })
    }

    const page = Math.max(1, parseInt(String(lastPage), 10) || 1)
    const percent = Math.min(100, Math.max(0, parseFloat(String(progressPercent)) || 0))

    await execute(
      `INSERT INTO reading_progress (userId, bookId, lastPage, progressPercent, updatedAt)
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         lastPage = VALUES(lastPage),
         progressPercent = VALUES(progressPercent),
         updatedAt = NOW()`,
      [auth.user.id, numericBookId, page, percent]
    )

    // Perbarui juga data lastPage pada peminjaman aktif pengguna
    await execute(
      "UPDATE loans SET lastPage = ? WHERE userId = ? AND bookId = ? AND status = 'aktif'",
      [page, auth.user.id, numericBookId]
    )

    return NextResponse.json({ success: true, lastPage: page, progressPercent: percent })
  } catch (err) {
    console.error("Failed to save reading progress:", err)
    return NextResponse.json({ success: false, error: "Gagal menyimpan progres baca." }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const auth = await verifyUserSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { searchParams } = new URL(req.url)
  const bookId = searchParams.get("bookId")
  if (!bookId) {
    return NextResponse.json({ success: false, error: "Parameter bookId wajib disertakan." }, { status: 400 })
  }

  const numericBookId = parseInt(bookId, 10)
  if (!numericBookId) {
    return NextResponse.json({ success: false, error: "ID buku tidak valid." }, { status: 400 })
  }

  try {
    const row = await queryOne<{ lastPage: number; progressPercent: number }>(
      "SELECT lastPage, progressPercent FROM reading_progress WHERE userId = ? AND bookId = ? LIMIT 1",
      [auth.user.id, numericBookId]
    )

    let finalLastPage = row?.lastPage && row.lastPage > 0 ? row.lastPage : 1
    let finalPercent = row?.progressPercent || 0

    if (finalLastPage <= 1) {
      const loanRow = await queryOne<{ lastPage: number }>(
        "SELECT lastPage FROM loans WHERE userId = ? AND bookId = ? AND lastPage > 1 ORDER BY id DESC LIMIT 1",
        [auth.user.id, numericBookId]
      )
      if (loanRow?.lastPage && loanRow.lastPage > 1) {
        finalLastPage = loanRow.lastPage
      }
    }

    return NextResponse.json({
      success: true,
      progress: { lastPage: finalLastPage, progressPercent: finalPercent },
    })
  } catch (err) {
    console.error("Failed to load reading progress:", err)
    return NextResponse.json({ success: false, error: "Gagal memuat progres baca." }, { status: 500 })
  }
}
