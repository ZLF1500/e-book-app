import { NextResponse } from "next/server"
import { verifyUserSession } from "@/lib/user-auth"
import { query, queryOne, execute } from "@/lib/db"

interface UserLoanRow {
  id: number
  userId: number
  bookId: number
  durationDays: number
  borrowedAt: string
  dueAt: string
  status: "aktif" | "kembali" | "terlambat"
  bookTitle: string
  bookSlug: string
  bookCover: string | null
  authorName: string | null
  categoryName: string | null
  pageCount: number
  lastPage?: number
  progressPercent?: number
}

// GET: Ambil daftar semua buku yang dipinjam oleh pengguna yang sedang login
export async function GET() {
  const auth = await verifyUserSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    // 1. Update otomatis peminjaman yang sudah melewati tanggal jatuh tempo
    await execute(
      "UPDATE loans SET status = 'kembali' WHERE userId = ? AND status = 'aktif' AND dueAt < NOW()",
      [auth.user.id]
    )

    // 2. Ambil data peminjaman pengguna dengan detail buku dan progres membaca riil
    const rows = await query<UserLoanRow>(
      `SELECT l.id, l.userId, l.bookId, l.durationDays, l.borrowedAt, l.dueAt, l.status,
              b.title as bookTitle, b.slug as bookSlug, b.coverUrl as bookCover,
              b.authorName, b.categoryName, b.pageCount,
              COALESCE(l.lastPage, rp.lastPage, 1) as lastPage,
              COALESCE(rp.progressPercent, 0) as progressPercent
       FROM loans l
       JOIN books b ON l.bookId = b.id
       LEFT JOIN reading_progress rp ON rp.userId = l.userId AND rp.bookId = l.bookId
       WHERE l.userId = ?
       ORDER BY l.borrowedAt DESC`,
      [auth.user.id]
    )

    // Hitung persentase akurat jika belum terhitung
    const loansWithAccuratePercent = rows.map((r) => {
      const page = r.lastPage || 1
      const total = r.pageCount || 1
      const percent = r.progressPercent && r.progressPercent > 0
        ? r.progressPercent
        : Math.min(100, Math.round((page / total) * 100))
      return {
        ...r,
        lastPage: page,
        progressPercent: percent,
      }
    })

    return NextResponse.json({
      success: true,
      loans: loansWithAccuratePercent,
      totalActive: loansWithAccuratePercent.filter((r) => r.status === "aktif").length,
    })
  } catch (err) {
    console.error("Failed to fetch user loans:", err)
    return NextResponse.json({ success: false, error: "Gagal memuat daftar peminjaman." }, { status: 500 })
  }
}

// POST: Catat peminjaman buku baru atau registrasi hak baca
export async function POST(req: Request) {
  const auth = await verifyUserSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = await req.json()
    const { bookId, durationDays = 7 } = body

    if (!bookId) {
      return NextResponse.json({ success: false, error: "ID buku atau slug wajib disertakan." }, { status: 400 })
    }

    // 1. Cari buku berdasarkan ID angka (bisa berawalan 'b'), slug, atau judul
    let targetBookId: number | null = null
    const rawIdStr = String(bookId).trim()
    const cleanNumericStr = rawIdStr.replace(/^b/i, "")
    const parsedId = parseInt(cleanNumericStr, 10)

    if (!isNaN(parsedId) && parsedId > 0) {
      const bookById = await queryOne<{ id: number; title: string }>(
        "SELECT id, title FROM books WHERE id = ? LIMIT 1",
        [parsedId]
      )
      if (bookById) targetBookId = bookById.id
    }

    if (!targetBookId) {
      const bookBySlug = await queryOne<{ id: number; title: string }>(
        "SELECT id, title FROM books WHERE slug = ? OR slug = ? LIMIT 1",
        [rawIdStr, cleanNumericStr]
      )
      if (bookBySlug) targetBookId = bookBySlug.id
    }

    if (!targetBookId) {
      const bookByTitle = await queryOne<{ id: number; title: string }>(
        "SELECT id, title FROM books WHERE title = ? LIMIT 1",
        [rawIdStr]
      )
      if (bookByTitle) targetBookId = bookByTitle.id
    }

    if (!targetBookId) {
      return NextResponse.json({ success: false, error: "Buku tidak ditemukan dalam katalog perpustakaan." }, { status: 404 })
    }

    const days = Math.max(1, Math.min(30, parseInt(String(durationDays), 10) || 7))

    // 2. Ambil progres membaca buku sebelumnya jika ada (agar TIDAK ter-reset ke halaman 1)
    const existingProgress = await queryOne<{ lastPage: number; progressPercent: number }>(
      "SELECT lastPage, progressPercent FROM reading_progress WHERE userId = ? AND bookId = ? LIMIT 1",
      [auth.user.id, targetBookId]
    )
    const previousLoan = await queryOne<{ lastPage: number }>(
      "SELECT lastPage FROM loans WHERE userId = ? AND bookId = ? AND lastPage > 1 ORDER BY id DESC LIMIT 1",
      [auth.user.id, targetBookId]
    )

    const initialPage = Math.max(
      existingProgress?.lastPage && existingProgress.lastPage > 0 ? existingProgress.lastPage : 1,
      previousLoan?.lastPage && previousLoan.lastPage > 0 ? previousLoan.lastPage : 1
    )
    const initialPercent = existingProgress?.progressPercent || 0

    // 3. Cek apakah pengguna sudah memiliki peminjaman aktif untuk buku ini
    const existingActiveLoan = await queryOne<{ id: number; dueAt: string; lastPage: number }>(
      "SELECT id, dueAt, lastPage FROM loans WHERE userId = ? AND bookId = ? AND status = 'aktif' AND dueAt > NOW() LIMIT 1",
      [auth.user.id, targetBookId]
    )

    if (existingActiveLoan) {
      // Peminjaman sudah aktif, kembalikan data peminjaman
      return NextResponse.json({
        success: true,
        loanId: existingActiveLoan.id,
        lastPage: existingActiveLoan.lastPage || initialPage,
        progressPercent: initialPercent,
        message: "Anda sudah memiliki akses peminjaman aktif untuk buku ini.",
        isExisting: true,
      })
    }

    // 4. Masukkan record peminjaman baru ke MariaDB dengan lastPage yang diteruskan
    const result = await execute(
      `INSERT INTO loans (userId, bookId, durationDays, borrowedAt, dueAt, status, lastPage)
       VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? DAY), 'aktif', ?)`,
      [auth.user.id, targetBookId, days, days, initialPage]
    )

    // 5. Perbarui counter loanCount di tabel books HANYA jika akun ini belum pernah meminjam buku ini (1 kontribusi baca per akun)
    const priorLoans = await queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM loans WHERE userId = ? AND bookId = ? AND id != ?",
      [auth.user.id, targetBookId, result.insertId]
    )
    if (!priorLoans || priorLoans.count === 0) {
      await execute("UPDATE books SET loanCount = loanCount + 1 WHERE id = ?", [targetBookId])
    }

    // Buat notifikasi peminjaman
    try {
      const bookData = await queryOne<{ title: string; slug: string }>(
        "SELECT title, slug FROM books WHERE id = ? LIMIT 1",
        [targetBookId]
      )
      if (bookData) {
        const { createNotification } = await import("@/lib/notifications")
        await createNotification({
          userId: auth.user.id,
          title: "Peminjaman Buku Berhasil",
          message: `Buku "${bookData.title}" berhasil dipinjam untuk ${days} hari. Selamat membaca!`,
          type: "loan",
          link: `/baca/${targetBookId}`,
        })
      }
    } catch (notifErr) {
      console.warn("Gagal mengirim notifikasi pinjam:", notifErr)
    }

    return NextResponse.json({
      success: true,
      loanId: result.insertId,
      lastPage: initialPage,
      progressPercent: initialPercent,
      message: "Peminjaman buku berhasil dicatat dalam basis data!",
    })
  } catch (err) {
    console.error("Failed to create loan:", err)
    return NextResponse.json({ success: false, error: "Gagal memproses peminjaman buku." }, { status: 500 })
  }
}

// PATCH: Kembalikan buku atau perpanjang
export async function PATCH(req: Request) {
  const auth = await verifyUserSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = await req.json()
    const { loanId, action = "kembali" } = body

    if (!loanId) {
      return NextResponse.json({ success: false, error: "ID peminjaman wajib disertakan." }, { status: 400 })
    }

    if (action === "kembali") {
      // Ambil progres membaca terkini pengguna untuk buku ini sebelum dikembalikan
      const loanRow = await queryOne<{ bookId: number; lastPage: number }>(
        "SELECT bookId, lastPage FROM loans WHERE id = ? AND userId = ? LIMIT 1",
        [loanId, auth.user.id]
      )

      let finalPage = loanRow?.lastPage || 1
      if (loanRow) {
        const rp = await queryOne<{ lastPage: number }>(
          "SELECT lastPage FROM reading_progress WHERE userId = ? AND bookId = ? LIMIT 1",
          [auth.user.id, loanRow.bookId]
        )
        if (rp?.lastPage && rp.lastPage > 0) {
          finalPage = rp.lastPage
        }
      }

      await execute(
        "UPDATE loans SET status = 'kembali', lastPage = ? WHERE id = ? AND userId = ?",
        [finalPage, loanId, auth.user.id]
      )

      // Notifikasi pengembalian buku
      if (loanRow) {
        try {
          const bookData = await queryOne<{ title: string }>(
            "SELECT title FROM books WHERE id = ? LIMIT 1",
            [loanRow.bookId]
          )
          if (bookData) {
            const { createNotification } = await import("@/lib/notifications")
            await createNotification({
              userId: auth.user.id,
              title: "Buku Berhasil Dikembalikan",
              message: `Buku "${bookData.title}" telah berhasil dikembalikan ke katalog perpustakaan.`,
              type: "loan",
              link: "/pinjaman",
            })
          }
        } catch (notifErr) {
          console.warn("Gagal mengirim notifikasi kembali:", notifErr)
        }
      }

      return NextResponse.json({ success: true, lastPage: finalPage, message: "Buku berhasil dikembalikan!" })
    }

    return NextResponse.json({ success: false, error: "Aksi tidak dikenal." }, { status: 400 })
  } catch (err) {
    console.error("Failed to update loan:", err)
    return NextResponse.json({ success: false, error: "Gagal memperbarui peminjaman." }, { status: 500 })
  }
}
