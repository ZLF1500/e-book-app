import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { queryOne, execute } from "@/lib/db"
import { verifySignedToken } from "@/lib/auth-crypto"

interface SessionPayload {
  id: number
  email: string
  role: string
}

interface UserRow {
  id: number
  name: string
  email: string
  nik: string | null
  phone: string | null
  institution: string | null
  isVerified: number | boolean
  role: "member" | "admin"
  avatarUrl: string | null
}

interface OAuthRow {
  id: number
  userId: number
  provider: string
  providerAccountId: string
  accessToken: string | null
  refreshToken: string | null
  expiresAt: string | Date | null
}

interface GoogleUserInfo {
  id: string
  email: string
  name: string
  picture?: string
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("rsjd_session_token")?.value

    let userId: number | null = null

    if (sessionToken) {
      const decodedPayload = verifySignedToken<SessionPayload>(sessionToken)
      if (decodedPayload?.id) {
        userId = decodedPayload.id
      }
    }

    const body = await request.json().catch(() => ({}))
    const { email } = body

    if (!userId && email && typeof email === "string") {
      const userByEmail = await queryOne<{ id: number }>(
        "SELECT id FROM users WHERE email = ? LIMIT 1",
        [email.trim().toLowerCase()]
      )
      if (userByEmail) {
        userId = userByEmail.id
      }
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Silakan masuk terlebih dahulu." },
        { status: 401 }
      )
    }

    // 1. Cari data tautan Google di tabel oauth_accounts
    const oauth = await queryOne<OAuthRow>(
      "SELECT id, userId, provider, providerAccountId, accessToken, refreshToken, expiresAt FROM oauth_accounts WHERE userId = ? AND provider = 'google' LIMIT 1",
      [userId]
    )

    if (!oauth) {
      return NextResponse.json(
        {
          success: false,
          notLinked: true,
          error: "Akun Google belum ditautkan ke akun perpustakaan ini. Silakan gunakan tombol 'Masuk dengan Google' untuk menautkan akun.",
        },
        { status: 400 }
      )
    }

    let tokenToUse = oauth.accessToken
    let googlePicture: string | null = null

    // 2. Fungsi pembantu untuk mengambil userinfo dari Google
    const fetchGooglePicture = async (accessToken: string): Promise<string | null> => {
      try {
        const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        })
        if (res.ok) {
          const data: GoogleUserInfo = await res.json()
          return data.picture || null
        }
        return null
      } catch {
        return null
      }
    }

    if (tokenToUse) {
      googlePicture = await fetchGooglePicture(tokenToUse)
    }

    // 3. Jika token lama kedaluwarsa dan ada refreshToken, perbarui token via Google OAuth token endpoint
    if (!googlePicture && oauth.refreshToken) {
      const clientId = process.env.GOOGLE_CLIENT_ID
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET

      if (clientId && clientSecret) {
        try {
          const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              refresh_token: oauth.refreshToken,
              grant_type: "refresh_token",
            }),
          })

          if (tokenRes.ok) {
            const tokenData = await tokenRes.json()
            if (tokenData.access_token) {
              const freshToken: string = tokenData.access_token
              tokenToUse = freshToken
              const newExpires = tokenData.expires_in
                ? new Date(Date.now() + tokenData.expires_in * 1000)
                : null
              await execute(
                "UPDATE oauth_accounts SET accessToken = ?, expiresAt = ? WHERE id = ?",
                [freshToken, newExpires, oauth.id]
              )
              googlePicture = await fetchGooglePicture(freshToken)
            }
          }
        } catch {
          // Abaikan jika refresh gagal
        }
      }
    }

    if (!googlePicture) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Tidak dapat mengambil foto profil dari Google. Sesi Google Anda mungkin telah berakhir, silakan coba login ulang dengan Google.",
        },
        { status: 400 }
      )
    }

    // Ubah ukuran default Google picture ke resolusi tinggi (mis. s320-c)
    const highResGooglePicture = googlePicture.replace(/=s\d+(-c)?$/, "=s320-c")

    // 4. Update avatarUrl di database MySQL
    await execute("UPDATE users SET avatarUrl = ? WHERE id = ?", [highResGooglePicture, userId])

    // Ambil data user terbaru
    const dbUser = await queryOne<UserRow>(
      "SELECT id, name, email, nik, phone, institution, isVerified, role, avatarUrl FROM users WHERE id = ? LIMIT 1",
      [userId]
    )

    if (!dbUser) {
      return NextResponse.json(
        { success: false, error: "Akun pengguna tidak ditemukan di database." },
        { status: 404 }
      )
    }

    const safeUser = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      nik: dbUser.nik,
      phone: dbUser.phone,
      institution: dbUser.institution,
      isVerified: Boolean(dbUser.isVerified),
      role: dbUser.role,
      avatarUrl: dbUser.avatarUrl,
    }

    const response = NextResponse.json({
      success: true,
      message: "Foto profil Google berhasil disinkronkan!",
      avatarUrl: highResGooglePicture,
      user: safeUser,
    })

    // Perbarui cookie profil client
    response.cookies.set("rsjd_auth_user", encodeURIComponent(JSON.stringify(safeUser)), {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
      httpOnly: false,
    })

    return response
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { success: false, error: `Gagal menyinkronkan foto profil Google: ${errorMsg}` },
      { status: 500 }
    )
  }
}
