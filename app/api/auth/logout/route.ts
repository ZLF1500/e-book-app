import { NextResponse } from "next/server"

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Berhasil keluar dari akun." })
  response.cookies.delete("rsjd_session_token")
  response.cookies.delete("rsjd_auth_user")
  return response
}
