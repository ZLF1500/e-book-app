import { NextResponse } from "next/server"
import { verifyAdminSession } from "@/lib/admin-auth"
import { query, execute } from "@/lib/db"

export async function GET() {
  const auth = await verifyAdminSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const rows = await query<{ settingKey: string; settingValue: string }>(
      "SELECT settingKey, settingValue FROM app_settings"
    )

    const settings: Record<string, string> = {}
    rows.forEach((r) => {
      settings[r.settingKey] = r.settingValue
    })

    return NextResponse.json({ success: true, settings })
  } catch (err) {
    console.error("Failed to load app settings:", err)
    return NextResponse.json({ success: false, error: "Gagal memuat pengaturan sistem." }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await verifyAdminSession()
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = await req.json()
    const { settingKey, settingValue } = body

    if (!settingKey || settingValue === undefined) {
      return NextResponse.json({ success: false, error: "Kunci dan nilai pengaturan wajib diisi." }, { status: 400 })
    }

    await execute(
      "INSERT INTO app_settings (settingKey, settingValue) VALUES (?, ?) ON DUPLICATE KEY UPDATE settingValue = VALUES(settingValue)",
      [settingKey, String(settingValue)]
    )

    return NextResponse.json({
      success: true,
      message: "Pengaturan berhasil disimpan!",
    })
  } catch (err) {
    console.error("Failed to save setting:", err)
    return NextResponse.json({ success: false, error: "Gagal menyimpan pengaturan." }, { status: 500 })
  }
}
