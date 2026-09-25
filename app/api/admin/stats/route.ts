import { NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import { queryOne } from "@/lib/db"

export async function GET() {
  const auth = await verifyAdminSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const [booksCount, membersCount, categoriesCount, loansCount, reportsCount] = await Promise.all([
      queryOne<{ count: number }>("SELECT COUNT(*) as count FROM books WHERE status = 'aktif'"),
      queryOne<{ count: number }>("SELECT COUNT(*) as count FROM users WHERE role = 'member'"),
      queryOne<{ count: number }>("SELECT COUNT(*) as count FROM categories"),
      queryOne<{ count: number }>("SELECT COUNT(*) as count FROM loans WHERE status = 'aktif'"),
      queryOne<{ count: number }>("SELECT COUNT(*) as count FROM book_reports WHERE status = 'baru'"),
    ])

    return NextResponse.json({
      success: true,
      stats: {
        totalBooks: booksCount?.count || 0,
        totalMembers: membersCount?.count || 0,
        totalCategories: categoriesCount?.count || 0,
        activeLoans: loansCount?.count || 0,
        newReports: reportsCount?.count || 0,
      },
      currentUser: auth.user,
      isSuperAdmin: auth.isSuperAdmin,
    })
  } catch (err) {
    console.error("Failed to load admin stats:", err)
    return NextResponse.json(
      { success: false, error: "Gagal memuat statistik sistem perpustakaan." },
      { status: 500 }
    )
  }
}
