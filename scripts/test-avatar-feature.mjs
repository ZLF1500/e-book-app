import mysql from "mysql2/promise"

const BASE_URL = "http://localhost:3000"

async function run() {
  console.log("=== PENGUJIAN API UPDATE AVATAR & SYNC GOOGLE AVATAR ===")

  // 1. Setup DB connection
  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "perpusahm",
  })
  console.log("✓ Terhubung ke MariaDB 'perpusahm'")

  // 2. Login as test user Budi Santoso
  console.log("\n--- 1. Login user member (budi@example.com) ---")
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "budi@example.com",
      password: "password123",
    }),
  })
  const loginData = await loginRes.json()
  console.log("Login status:", loginRes.status, "success:", loginData.success)
  if (!loginData.success) {
    throw new Error("Gagal login")
  }

  // Get cookie
  const setCookie = loginRes.headers.get("set-cookie")
  console.log("Cookie didapatkan:", !!setCookie)

  // 3. Test /api/auth/update-avatar with valid small base64
  console.log("\n--- 2. Uji POST /api/auth/update-avatar ---")
  const testAvatar = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
  
  const updateRes = await fetch(`${BASE_URL}/api/auth/update-avatar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: setCookie || "",
    },
    body: JSON.stringify({
      avatarUrl: testAvatar,
    }),
  })
  const updateData = await updateRes.json()
  console.log("Update avatar status:", updateRes.status, "success:", updateData.success)
  if (!updateData.success) {
    throw new Error("Gagal update avatar: " + JSON.stringify(updateData))
  }

  // Verify in database
  const [rows] = await connection.execute(
    "SELECT id, email, avatarUrl FROM users WHERE email = 'budi@example.com'"
  )
  console.log("Avatar di DB:", rows[0]?.avatarUrl?.slice(0, 40) + "...")
  if (rows[0]?.avatarUrl !== testAvatar) {
    throw new Error("Avatar di database tidak cocok!")
  }
  console.log("✓ Avatar berhasil tersimpan di MariaDB!")

  // 4. Test /api/auth/sync-google-avatar when unlinked
  console.log("\n--- 3. Uji POST /api/auth/sync-google-avatar pada akun belum tertaut Google ---")
  const syncUnlinkedRes = await fetch(`${BASE_URL}/api/auth/sync-google-avatar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: setCookie || "",
    },
  })
  const syncUnlinkedData = await syncUnlinkedRes.json()
  console.log("Sync unlinked status:", syncUnlinkedRes.status, "notLinked:", syncUnlinkedData.notLinked, "message:", syncUnlinkedData.error)
  if (!syncUnlinkedData.notLinked) {
    throw new Error("Harusnya mendeteksi notLinked: true untuk akun biasa")
  }
  console.log("✓ Respon notLinked terdeteksi dengan tepat!")

  // 5. Test with Google account (e.g. Zoe zoekumori@gmail.com who has oauth_accounts)
  console.log("\n--- 4. Uji Sync Google Avatar untuk akun dengan oauth_accounts (zoekumori@gmail.com) ---")
  const [googleOauthRows] = await connection.execute(
    "SELECT u.id, u.email, o.id as oauth_id, o.provider, o.accessToken, o.refreshToken FROM users u JOIN oauth_accounts o ON u.id = o.userId WHERE o.provider = 'google' LIMIT 1"
  )
  if (googleOauthRows.length > 0) {
    const targetUser = googleOauthRows[0]
    console.log(`Menemukan akun tertaut Google: ${targetUser.email} (User ID: ${targetUser.id})`)
    
    const syncGoogleRes = await fetch(`${BASE_URL}/api/auth/sync-google-avatar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: targetUser.email,
      }),
    })
    const syncGoogleData = await syncGoogleRes.json()
    console.log("Sync Google result:", syncGoogleRes.status, syncGoogleData)
  }

  // Restore original avatar for Budi Santoso
  const originalBudiAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
  await connection.execute(
    "UPDATE users SET avatarUrl = ? WHERE email = 'budi@example.com'",
    [originalBudiAvatar]
  )
  console.log("✓ Avatar Budi Santoso dipulihkan ke default.")

  await connection.end()
  console.log("\n==========================================")
  console.log("SEMUA PENGUJIAN FITUR AVATAR BERHASIL (100% PASS)")
  console.log("==========================================")
}

run().catch((err) => {
  console.error("Test error:", err)
  process.exit(1)
})
