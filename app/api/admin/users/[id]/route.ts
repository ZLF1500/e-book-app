import { NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import { queryOne, execute } from "@/lib/db"
import { hashPassword } from "@/lib/auth-crypto"

interface TargetUser {
  id: number
  name: string
  email: string
  role: "member" | "admin" | "super_admin"
  isVerified: number
  isActive: number
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
    const targetUserId = parseInt(id, 10)
    if (!targetUserId) {
      return NextResponse.json({ success: false, error: "ID pengguna tidak valid." }, { status: 400 })
    }

    const targetUser = await queryOne<TargetUser>(
      "SELECT id, name, email, role, isVerified, isActive FROM users WHERE id = ? LIMIT 1",
      [targetUserId]
    )
    if (!targetUser) {
      return NextResponse.json({ success: false, error: "Pengguna tidak ditemukan." }, { status: 404 })
    }

    const body = await req.json()

    // 1. Role modification (Only Super Admin can change roles!)
    if (body.role !== undefined) {
      if (!auth.isSuperAdmin) {
        return NextResponse.json(
          { success: false, error: "Hanya Super Administrator yang berhak mengubah peran akun." },
          { status: 403 }
        )
      }

      if (targetUserId === auth.user.id) {
        return NextResponse.json(
          { success: false, error: "Anda tidak dapat mengubah peran akun Anda sendiri." },
          { status: 400 }
        )
      }

      const validRoles = ["member", "admin", "super_admin"]
      if (!validRoles.includes(body.role)) {
        return NextResponse.json({ success: false, error: "Peran tidak valid." }, { status: 400 })
      }

      if (body.role === "super_admin") {
        const existingSuperAdmin = await queryOne<{ id: number; name: string }>(
          "SELECT id, name FROM users WHERE role = 'super_admin' AND id != ? LIMIT 1",
          [targetUserId]
        )
        if (existingSuperAdmin) {
          return NextResponse.json(
            {
              success: false,
              error: `Super Administrator (Owner) bersifat tunggal dan sudah dipegang oleh ${existingSuperAdmin.name}. Hanya boleh ada 1 Super Administrator dalam sistem.`,
            },
            { status: 400 }
          )
        }
      }

      if (body.role === "member") {
        // Jika diturunkan ke member, status verifikasi direset ke 0 agar wajib verifikasi
        await execute("UPDATE users SET role = 'member', isVerified = 0 WHERE id = ?", [targetUserId])
        return NextResponse.json({
          success: true,
          message: `Peran pengguna ${targetUser.name} berhasil diturunkan menjadi Member. Status verifikasi direset (wajib verifikasi).`,
          role: "member",
          isVerified: false,
        })
      } else {
        // Jika diangkat menjadi admin / super_admin, otomatis bebas verifikasi (isVerified = 1)
        await execute("UPDATE users SET role = ?, isVerified = 1 WHERE id = ?", [body.role, targetUserId])
        return NextResponse.json({
          success: true,
          message: `Peran pengguna ${targetUser.name} berhasil diubah menjadi '${body.role}' (bebas verifikasi).`,
          role: body.role,
          isVerified: true,
        })
      }
    }

    // 2. Verification toggle (Hanya untuk Member)
    if (body.isVerified !== undefined) {
      if (targetUser.role !== "member") {
        return NextResponse.json(
          { success: false, error: "Staf administrator otomatis terverifikasi dan tidak memerlukan verifikasi manual." },
          { status: 400 }
        )
      }

      const newVerified = body.isVerified ? 1 : 0
      await execute("UPDATE users SET isVerified = ? WHERE id = ?", [newVerified, targetUserId])
      return NextResponse.json({
        success: true,
        message: newVerified
          ? `Pengguna ${targetUser.name} berhasil diverifikasi!`
          : `Status verifikasi pengguna ${targetUser.name} dicabut.`,
        isVerified: Boolean(newVerified),
      })
    }

    // 3. Active status toggle (Block/Unblock)
    if (body.isActive !== undefined) {
      if (targetUserId === auth.user.id) {
        return NextResponse.json({ success: false, error: "Anda tidak dapat menonaktifkan akun sendiri." }, { status: 400 })
      }
      if (targetUser.role === "super_admin") {
        return NextResponse.json({ success: false, error: "Akun Super Administrator dilindungi dan tidak dapat dinonaktifkan." }, { status: 403 })
      }
      if (targetUser.role === "admin" && !auth.isSuperAdmin) {
        return NextResponse.json({ success: false, error: "Hanya Super Administrator yang berhak mengubah status akun administrator lain." }, { status: 403 })
      }

      const newActive = body.isActive ? 1 : 0
      await execute("UPDATE users SET isActive = ? WHERE id = ?", [newActive, targetUserId])
      return NextResponse.json({
        success: true,
        message: newActive ? `Akun ${targetUser.name} telah diaktifkan.` : `Akun ${targetUser.name} telah dinonaktifkan.`,
        isActive: Boolean(newActive),
      })
    }

    // 4. Reset Password
    if (body.resetPassword !== undefined) {
      const newPassword = String(body.resetPassword || "").trim()
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: "Kata sandi baru minimal 6 karakter." },
          { status: 400 }
        )
      }

      // Jika akun target adalah admin atau super_admin, hanya Super Admin yang boleh mereset
      if (targetUser.role !== "member" && !auth.isSuperAdmin) {
        return NextResponse.json(
          { success: false, error: "Hanya Super Administrator yang berhak mereset kata sandi administrator." },
          { status: 403 }
        )
      }

      const hashedPassword = hashPassword(newPassword)
      await execute("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, targetUserId])
      return NextResponse.json({
        success: true,
        message: `Kata sandi untuk pengguna ${targetUser.name} berhasil diperbarui.`,
      })
    }

    return NextResponse.json({ success: false, error: "Tidak ada parameter perubahan." }, { status: 400 })
  } catch (err) {
    console.error("Failed to update user:", err)
    return NextResponse.json({ success: false, error: "Gagal memperbarui data pengguna." }, { status: 500 })
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
    const targetUserId = parseInt(id, 10)
    if (!targetUserId) {
      return NextResponse.json({ success: false, error: "ID pengguna tidak valid." }, { status: 400 })
    }

    if (targetUserId === auth.user.id) {
      return NextResponse.json({ success: false, error: "Anda tidak dapat menghapus akun Anda sendiri." }, { status: 400 })
    }

    const targetUser = await queryOne<TargetUser>(
      "SELECT id, name, role FROM users WHERE id = ? LIMIT 1",
      [targetUserId]
    )
    if (!targetUser) {
      return NextResponse.json({ success: false, error: "Pengguna tidak ditemukan." }, { status: 404 })
    }

    // Super Admin cannot be deleted by anyone
    if (targetUser.role === "super_admin") {
      return NextResponse.json(
        { success: false, error: "Akun Super Administrator dilindungi sistem dan tidak dapat dihapus." },
        { status: 403 }
      )
    }

    // Regular admin cannot delete other admins or super admins
    if (targetUser.role === "admin" && !auth.isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: "Hanya Super Administrator yang berhak menghapus akun sesama administrator." },
        { status: 403 }
      )
    }

    // Delete user (cascade will delete oauth_accounts, loans, favorites, etc.)
    await execute("DELETE FROM users WHERE id = ?", [targetUserId])

    return NextResponse.json({
      success: true,
      message: `Akun '${targetUser.name}' berhasil dihapus dari database perpustakaan.`,
    })
  } catch (err) {
    console.error("Failed to delete user:", err)
    return NextResponse.json({ success: false, error: "Gagal menghapus pengguna." }, { status: 500 })
  }
}
