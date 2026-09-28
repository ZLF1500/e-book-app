import { NextResponse } from "next/server"
import { verifySignedToken } from "@/lib/auth-crypto"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { token } = body

    if (!token || typeof token !== "string") {
      return NextResponse.json({ success: false, error: "Token sesi tidak valid." }, { status: 400 })
    }

    const decoded = verifySignedToken<{ id: number; email: string }>(token)
    if (!decoded || !decoded.id) {
      return NextResponse.json(
        { success: false, error: "Token sesi tidak sah atau tanda tangan tidak valid." },
        { status: 401 }
      )
    }

    const proto = request.headers.get("x-forwarded-proto") || ""
    const isHttps = proto === "https" || process.env.NODE_ENV === "production"

    const response = NextResponse.json({ success: true })

    response.cookies.set("rsjd_session_token", token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 hari
      path: "/",
    })

    return response
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { success: false, error: `Gagal memproses sesi: ${errorMsg}` },
      { status: 500 }
    )
  }
}
