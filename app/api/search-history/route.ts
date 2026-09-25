import { NextResponse } from "next/server"
import { verifyUserSession } from "@/lib/user-auth"
import { query, execute } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET: Ambil riwayat pencarian pengguna dari MariaDB
export async function GET() {
  const auth = await verifyUserSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: true, history: [] })
  }

  try {
    const rows = await query<{ query: string }>(
      "SELECT DISTINCT query FROM search_history WHERE userId = ? ORDER BY id DESC LIMIT 10",
      [auth.user.id]
    )

    return NextResponse.json({ success: true, history: rows.map((r) => r.query) })
  } catch (err) {
    console.error("Failed to load search history:", err)
    return NextResponse.json({ success: false, error: "Gagal memuat riwayat pencarian." }, { status: 500 })
  }
}

// POST: Simpan kata kunci pencarian ke tabel search_history di MariaDB
export async function POST(req: Request) {
  const auth = await verifyUserSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: true, message: "Aksi tamu disimpan di lokal." })
  }

  try {
    const body = await req.json()
    const { query: searchQuery } = body

    if (!searchQuery || typeof searchQuery !== "string" || !searchQuery.trim()) {
      return NextResponse.json({ success: false, error: "Query pencarian wajib disertakan." }, { status: 400 })
    }

    const cleanQuery = searchQuery.trim().slice(0, 255)

    // Hapus duplikat lama dengan query yang sama agar selalu menjadi paling baru
    await execute("DELETE FROM search_history WHERE userId = ? AND query = ?", [auth.user.id, cleanQuery])

    // Masukkan record pencarian baru
    await execute(
      "INSERT INTO search_history (userId, query, searchedAt) VALUES (?, ?, NOW())",
      [auth.user.id, cleanQuery]
    )

    return NextResponse.json({ success: true, message: "Riwayat pencarian tersimpan di database." })
  } catch (err) {
    console.error("Failed to record search history:", err)
    return NextResponse.json({ success: false, error: "Gagal mencatat riwayat pencarian." }, { status: 500 })
  }
}

// DELETE: Hapus 1 query atau bersihkan semua riwayat pencarian pengguna
export async function DELETE(req: Request) {
  const auth = await verifyUserSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: true, message: "Dihapus secara lokal." })
  }

  const { searchParams } = new URL(req.url)
  const item = searchParams.get("query")

  try {
    if (item) {
      await execute("DELETE FROM search_history WHERE userId = ? AND query = ?", [auth.user.id, item.trim()])
    } else {
      await execute("DELETE FROM search_history WHERE userId = ?", [auth.user.id])
    }

    return NextResponse.json({ success: true, message: "Riwayat pencarian berhasil dihapus dari database." })
  } catch (err) {
    console.error("Failed to delete search history:", err)
    return NextResponse.json({ success: false, error: "Gagal menghapus riwayat pencarian." }, { status: 500 })
  }
}
