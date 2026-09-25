import mysql from "mysql2/promise"

const BASE_URL = "http://localhost:3000"

async function runTests() {
  console.log("==================================================================")
  console.log("  PENGUJIAN MENYELURUH ALUR AUTENTIKASI DENGAN MYSQL NATIVE LIVE")
  console.log("==================================================================\n")

  // Koneksi langsung ke MySQL untuk verifikasi tabel
  const db = await mysql.createConnection({
    host: "localhost",
    port: 3306,
    user: "root",
    password: "",
    database: "perpusahm",
  })
  console.log("✓ Koneksi langsung ke database 'perpusahm' berhasil.\n")

  let passedTests = 0
  let failedTests = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`)
      passedTests++
    } else {
      console.error(`  [FAIL] ${message}`)
      failedTests++
    }
  }

  // Helper fetch with cookies
  let currentSessionCookie = ""

  // TEST 1: Login dengan email yang belum terdaftar (Harus ditolak 404)
  console.log("--- 1. UJI LOGIN EMAIL TIDAK TERDAFTAR ---")
  const res1 = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "pengguna_palsu_99999@example.com",
      password: "password123",
      turnstileToken: "test-bypass",
    }),
  })
  const data1 = await res1.json()
  assert(res1.status === 404, `Status 404 saat email belum terdaftar (dapat: ${res1.status})`)
  assert(data1.success === false, "Respons success: false")
  assert(data1.error.includes("belum terdaftar"), `Pesan error: ${data1.error}`)

  // TEST 2: Login akun Admin dengan kata sandi salah (Harus ditolak 401)
  console.log("\n--- 2. UJI LOGIN KATA SANDI SALAH ---")
  const res2 = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@rsjd.kaltimprov.go.id",
      password: "sandiyangsalah123",
      turnstileToken: "test-bypass",
    }),
  })
  const data2 = await res2.json()
  assert(res2.status === 401, `Status 401 saat kata sandi salah (dapat: ${res2.status})`)
  assert(data2.success === false, "Respons success: false")
  assert(data2.error.includes("Kata sandi yang Anda masukkan salah"), `Pesan: ${data2.error}`)

  // TEST 3: Login akun Admin resmi (Harus berhasil 200)
  console.log("\n--- 3. UJI LOGIN AKUN ADMIN RESMI ---")
  const res3 = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@rsjd.kaltimprov.go.id",
      password: "adminpassword123",
      turnstileToken: "test-bypass",
    }),
  })
  const data3 = await res3.json()
  assert(res3.status === 200, `Status 200 login admin berhasil`)
  assert(data3.success === true, "Respons success: true")
  assert(data3.user.role === "admin", `Role adalah 'admin'`)
  assert(data3.user.email === "admin@rsjd.kaltimprov.go.id", `Email admin sesuai`)

  // TEST 4: Login akun Member Budi (Harus berhasil 200)
  console.log("\n--- 4. UJI LOGIN MEMBER BUDI SANTOSO ---")
  const res4 = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "budi@example.com",
      password: "password123",
      turnstileToken: "test-bypass",
    }),
  })
  const data4 = await res4.json()
  assert(res4.status === 200, `Status 200 login member berhasil`)
  assert(data4.success === true, "Respons success: true")
  assert(data4.user.role === "member", `Role adalah 'member'`)
  assert(data4.user.isVerified === true, `isVerified bernilai true`)

  // TEST 5: Registrasi akun pembaca baru via /api/auth/register
  console.log("\n--- 5. UJI REGISTRASI AKUN BARU ---")
  const testEmail = `pembaca_${Date.now()}@rsjdtest.id`
  const testPassword = "PasswordAman2026!"
  const testName = "Dokter Residen RSJD"

  const res5 = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: testName,
      email: testEmail,
      password: testPassword,
      turnstileToken: "test-bypass",
    }),
  })
  const data5 = await res5.json()
  const rawCookie = res5.headers.get("set-cookie") || ""
  currentSessionCookie = rawCookie
    .split(",")
    .map((c) => c.split(";")[0])
    .join("; ")

  assert(res5.status === 200, `Status 200 registrasi berhasil`)
  assert(data5.success === true, "Respons success: true")
  assert(data5.user.email === testEmail, `Email terdaftar: ${testEmail}`)
  assert(data5.user.role === "member", `Role default adalah 'member'`)

  // Verifikasi langsung di tabel users MySQL
  const [dbUserRows] = await db.query("SELECT * FROM users WHERE email = ? LIMIT 1", [testEmail])
  assert(dbUserRows.length === 1, "Data akun pembaca baru TERSIMPAN di tabel users MySQL!")
  assert(dbUserRows[0].name === testName, "Nama tersimpan sesuai di MySQL")

  // TEST 6: Registrasi ulang dengan email yang sama (Harus ditolak duplikat)
  console.log("\n--- 6. UJI CEGAH DUPLIKASI EMAIL DI PENDAFTARAN ---")
  const res6 = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Orang Lain",
      email: testEmail,
      password: "passwordLain123",
      turnstileToken: "test-bypass",
    }),
  })
  const data6 = await res6.json()
  assert(res6.status === 409, `Status 409 Conflict email duplikat ditolak (dapat: ${res6.status})`)
  assert(data6.success === false, "Respons success: false")
  assert(data6.error.includes("sudah terdaftar"), `Pesan: ${data6.error}`)

  // TEST 6.5: Login akun baru via /api/auth/login (Alur resmi: Daftar -> Form Masuk -> Login)
  console.log("\n--- 6.5. UJI LOGIN AKUN BARU DARI FORM MASUK ---")
  const resLoginNew = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      turnstileToken: "test-bypass",
    }),
  })
  const dataLoginNew = await resLoginNew.json()
  const rawCookieNew = resLoginNew.headers.get("set-cookie") || ""
  currentSessionCookie = rawCookieNew
    .split(",")
    .map((c) => c.split(";")[0])
    .join("; ")
  assert(resLoginNew.status === 200, "Status 200 login akun baru berhasil")
  assert(dataLoginNew.success === true, "Respons login akun baru success: true")

  // TEST 7: Verifikasi Sesi Aktif via /api/auth/me
  console.log("\n--- 7. UJI SESI /api/auth/me DENGAN COOKIE HTTPONLY ---")
  const res7 = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: currentSessionCookie },
  })
  const data7 = await res7.json()
  assert(res7.status === 200, `Status 200 verifikasi sesi berhasil`)
  assert(data7.success === true, "Sesi valid")
  assert(data7.user.email === testEmail, `User dari database MySQL cocok (${data7.user.email})`)

  // TEST 8: Permintaan Lupa Password via /api/auth/forgot-password
  console.log("\n--- 8. UJI LUPA PASSWORD & PENYIMPANAN TOKEN DI MYSQL ---")
  const res8 = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      turnstileToken: "test-bypass",
    }),
  })
  const data8 = await res8.json()
  assert(res8.status === 200, `Status 200 permohonan reset sandi berhasil`)
  assert(data8.success === true, "Respons reset sandi success: true")
  assert(Boolean(data8.token), `Token reset berhasil dibuat: ${data8.token}`)

  // Cek token di tabel password_reset_tokens MySQL
  const [tokenRows] = await db.query(
    "SELECT * FROM password_reset_tokens WHERE email = ? LIMIT 1",
    [testEmail]
  )
  assert(tokenRows.length === 1, "Token reset TERSIMPAN di tabel password_reset_tokens MySQL!")
  assert(tokenRows[0].token === data8.token, "Token di database cocok dengan token API")

  // TEST 9: Reset Kata Sandi Baru via /api/auth/reset-password
  console.log("\n--- 9. UJI RESET KATA SANDI BARU & PEMBARUAN DI MYSQL ---")
  const newPassword = "SandiBaruDokter2026!#"
  const res9 = await fetch(`${BASE_URL}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      token: data8.token,
      password: newPassword,
    }),
  })
  const data9 = await res9.json()
  assert(res9.status === 200, `Status 200 reset sandi berhasil`)
  assert(data9.success === true, "Respons success: true")

  // Cek apakah token sudah dihapus dari tabel (single-use)
  const [tokenAfterRows] = await db.query(
    "SELECT * FROM password_reset_tokens WHERE email = ? LIMIT 1",
    [testEmail]
  )
  assert(tokenAfterRows.length === 0, "Token reset otomatis DIHAPUS dari MySQL setelah dipakai (single-use)!")

  // TEST 10: Login dengan Kata Sandi Baru
  console.log("\n--- 10. UJI LOGIN DENGAN KATA SANDI BARU ---")
  const res10 = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: newPassword,
      turnstileToken: "test-bypass",
    }),
  })
  const data10 = await res10.json()
  assert(res10.status === 200, `Status 200 login dengan kata sandi baru BERHASIL!`)
  assert(data10.success === true, "Respons login baru success: true")

  // TEST 11: Pengiriman OTP via /api/auth/otp/send
  console.log("\n--- 11. UJI PENGIRIMAN KODE OTP KE MYSQL ---")
  const res11 = await fetch(`${BASE_URL}/api/auth/otp/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: testEmail,
      channel: "email",
      purpose: "borrow_verification",
      turnstileToken: "test-bypass",
    }),
  })
  const data11 = await res11.json()
  assert(res11.status === 200, `Status 200 pengiriman OTP berhasil`)
  assert(data11.success === true, "Respons OTP send success: true")

  // Ambil OTP langsung dari tabel verification_otps di MySQL
  const [otpRows] = await db.query(
    "SELECT * FROM verification_otps WHERE identifier = ? ORDER BY id DESC LIMIT 1",
    [testEmail]
  )
  assert(otpRows.length === 1, "Kode OTP 6 digit TERSIMPAN di tabel verification_otps MySQL!")
  const validOtp = otpRows[0].otpCode
  console.log(`  -> Kode OTP di database MySQL: ${validOtp}`)

  // TEST 12: Verifikasi OTP Salah vs OTP Benar
  console.log("\n--- 12. UJI VERIFIKASI KODE OTP ---")
  // Coba OTP salah
  const res12Wrong = await fetch(`${BASE_URL}/api/auth/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: testEmail,
      otpCode: "000000",
      purpose: "borrow_verification",
    }),
  })
  const data12Wrong = await res12Wrong.json()
  assert(res12Wrong.status === 400, "OTP salah DITOLAK (HTTP 400)")
  assert(data12Wrong.success === false, "Respons OTP salah success: false")

  // Coba OTP benar
  const res12Right = await fetch(`${BASE_URL}/api/auth/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: testEmail,
      otpCode: validOtp,
      purpose: "borrow_verification",
    }),
  })
  const data12Right = await res12Right.json()
  assert(res12Right.status === 200, "OTP benar DITERIMA (HTTP 200)")
  assert(data12Right.success === true, "Respons OTP benar success: true")

  // TEST 13: Verifikasi Biodata Peminjam via /api/auth/verify-biodata
  console.log("\n--- 13. UJI VERIFIKASI BIODATA PEMINJAM & PERSISTENSI KE MYSQL ---")
  // Buat OTP baru untuk alur biodata
  await db.query("INSERT INTO verification_otps (identifier, otpCode, expiresAt) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))", [testEmail, "888999"])

  const nikBaru = `647204${Date.now().toString().slice(-10)}`
  const res13 = await fetch(`${BASE_URL}/api/auth/verify-biodata`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      nik: nikBaru,
      phone: "081299887766",
      institution: "Departemen Psikiatri RSJD Atma Husada Mahakam",
      otpCode: "888999",
    }),
  })
  const data13 = await res13.json()
  assert(res13.status === 200, "Status 200 verifikasi biodata berhasil")
  assert(data13.success === true, "Verifikasi biodata success: true")
  assert(data13.user.isVerified === true, "User berstatus isVerified: true")

  // Cek tabel users MySQL untuk memastikan update NIK & isVerified
  const [updatedDbRows] = await db.query("SELECT nik, phone, institution, isVerified FROM users WHERE email = ? LIMIT 1", [testEmail])
  assert(updatedDbRows[0].nik === nikBaru, `NIK di MySQL tersimpan: ${updatedDbRows[0].nik}`)
  assert(updatedDbRows[0].phone === "081299887766", `No HP di MySQL tersimpan: ${updatedDbRows[0].phone}`)
  assert(updatedDbRows[0].isVerified === 1, `Status isVerified di MySQL tersimpan bernilai 1 (Terverifikasi)!`)

  // TEST 14: Logout Akun via /api/auth/logout
  console.log("\n--- 14. UJI LOGOUT AKUN ---")
  const res14 = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: "POST",
  })
  assert(res14.status === 200, "Status 200 logout berhasil")

  // Bersihkan data user uji coba dari database
  await db.query("DELETE FROM users WHERE email = ?", [testEmail])
  console.log(`\n✓ Data uji coba '${testEmail}' berhasil dibersihkan dari database.`)

  await db.end()

  console.log("\n==================================================================")
  console.log(`  HASIL AKHIR: ${passedTests} LULUS, ${failedTests} GAGAL`)
  console.log("==================================================================")

  if (failedTests > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error("FATAL ERROR IN TEST SUITE:", err)
  process.exit(1)
})
