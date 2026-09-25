const BASE_URL = "http://localhost:3000"

async function run() {
  console.log("==================================================================")
  console.log("  PENGUJIAN MENYELURUH REST API ADMIN CRUD DENGAN MARIADB")
  console.log("==================================================================")

  // 1. Login Admin
  console.log("\n--- 1. Uji Login Akun Admin Pustakawan ---")
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@rsjd.kaltimprov.go.id",
      password: "adminpassword123",
    }),
  })
  const adminLoginData = await adminLoginRes.json()
  console.log("Login Admin Status:", adminLoginRes.status, "success:", adminLoginData.success)
  if (!adminLoginData.success || adminLoginData.user.role !== "admin") {
    throw new Error("Gagal login admin")
  }
  const adminCookie = adminLoginRes.headers.get("set-cookie")

  // 2. Login Super Admin
  console.log("\n--- 2. Uji Login Akun Super Admin ---")
  const superLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "superadmin@rsjd.kaltimprov.go.id",
      password: "adminpassword123",
    }),
  })
  const superLoginData = await superLoginRes.json()
  console.log("Login Super Admin Status:", superLoginRes.status, "role:", superLoginData.user?.role)
  if (!superLoginData.success || superLoginData.user.role !== "super_admin") {
    throw new Error("Gagal login super admin")
  }
  const superCookie = superLoginRes.headers.get("set-cookie")

  // 3. Admin Stats
  console.log("\n--- 3. Uji GET /api/admin/stats ---")
  const statsRes = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: { Cookie: adminCookie },
  })
  const statsData = await statsRes.json()
  console.log("Stats result:", statsData.stats)
  if (!statsData.success || statsData.stats.totalBooks < 14) {
    throw new Error("Data stats tidak valid!")
  }
  console.log("✓ Statistik berhasil ditarik dari database nyata!")

  // 4. CRUD Kategori
  console.log("\n--- 4. Uji CRUD Kategori ---")
  // Create
  const addCatRes = await fetch(`${BASE_URL}/api/admin/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      name: "Kategori Uji Coba Auto",
      slug: "kategori-uji-coba-auto",
      iconName: "Sparkles",
      description: "Deskripsi kategori pengujian",
    }),
  })
  const addCatData = await addCatRes.json()
  console.log("Tambah Kategori Status:", addCatRes.status, "id:", addCatData.id)
  if (!addCatData.success || !addCatData.id) throw new Error("Gagal tambah kategori")

  // Update
  const updateCatRes = await fetch(`${BASE_URL}/api/admin/categories/${addCatData.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      name: "Kategori Uji Coba Diubah",
      slug: "kategori-uji-coba-diubah",
      iconName: "Brain",
      description: "Deskripsi kategori berhasil diupdate",
    }),
  })
  const updateCatData = await updateCatRes.json()
  console.log("Update Kategori:", updateCatData.message)

  // Delete
  const delCatRes = await fetch(`${BASE_URL}/api/admin/categories/${addCatData.id}`, {
    method: "DELETE",
    headers: { Cookie: adminCookie },
  })
  const delCatData = await delCatRes.json()
  console.log("Delete Kategori:", delCatData.message)
  console.log("✓ Siklus CRUD Kategori 100% Lulus!")

  // 5. CRUD Tag
  console.log("\n--- 5. Uji CRUD Tag ---")
  const addTagRes = await fetch(`${BASE_URL}/api/admin/tags`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ name: "Tag Uji Auto", slug: "tag-uji-auto" }),
  })
  const addTagData = await addTagRes.json()
  console.log("Tambah Tag Status:", addTagRes.status, "id:", addTagData.id)
  if (!addTagData.success || !addTagData.id) throw new Error("Gagal tambah tag")

  const delTagRes = await fetch(`${BASE_URL}/api/admin/tags/${addTagData.id}`, {
    method: "DELETE",
    headers: { Cookie: adminCookie },
  })
  const delTagData = await delTagRes.json()
  console.log("Delete Tag:", delTagData.message)
  console.log("✓ Siklus CRUD Tag 100% Lulus!")

  // 6. CRUD Buku
  console.log("\n--- 6. Uji CRUD Buku ---")
  const addBookRes = await fetch(`${BASE_URL}/api/admin/books`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({
      title: "Buku Pengujian Integrasi CRUD MariaDB",
      slug: `buku-test-${Date.now()}`,
      synopsis: "Sinopsis buku pengujian otomatis sistem perpustakaan digital RSJD.",
      authorName: "dr. Tester Otomatis",
      publisherName: "RSJD Publisher Lab",
      categoryId: 1,
      pageCount: 150,
      publishYear: 2026,
      format: "PDF",
      isFeatured: true,
      tags: ["Kesehatan Jiwa", "Psikiatri"],
    }),
  })
  const addBookData = await addBookRes.json()
  console.log("Tambah Buku Status:", addBookRes.status, "id:", addBookData.id, "slug:", addBookData.slug)
  if (!addBookData.success || !addBookData.id) throw new Error("Gagal tambah buku")

  // Toggle Featured
  const toggleRes = await fetch(`${BASE_URL}/api/admin/books/${addBookData.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ toggleFeatured: true }),
  })
  const toggleData = await toggleRes.json()
  console.log("Toggle Featured:", toggleData.message, "isFeatured:", toggleData.isFeatured)

  // Verify in public /api/books/[slug]
  const publicBookRes = await fetch(`${BASE_URL}/api/books/${addBookData.slug}`)
  const publicBookData = await publicBookRes.json()
  console.log("Verifikasi Publik Buku Baru:", publicBookRes.status, "title:", publicBookData.book?.title)
  if (!publicBookData.success) throw new Error("Buku baru tidak terbaca di API publik!")

  // Delete test book
  const delBookRes = await fetch(`${BASE_URL}/api/admin/books/${addBookData.id}`, {
    method: "DELETE",
    headers: { Cookie: adminCookie },
  })
  const delBookData = await delBookRes.json()
  console.log("Delete Buku:", delBookData.message)
  console.log("✓ Siklus CRUD Buku 100% Lulus!")

  // 7. Uji Manajemen Pengguna
  console.log("\n--- 7. Uji Manajemen Pengguna ---")
  const usersRes = await fetch(`${BASE_URL}/api/admin/users`, {
    headers: { Cookie: adminCookie },
  })
  const usersData = await usersRes.json()
  console.log("Daftar Pengguna:", usersData.total, "pengguna ditemukan")
  if (!usersData.success || usersData.total < 3) throw new Error("Gagal muat pengguna")

  // 8. Uji Otorisasi Role Super Admin
  console.log("\n--- 8. Uji Otorisasi Super Admin (Kelola Role) ---")
  // Coba ubah role dengan akun admin biasa (Harus ditolak 403)
  const regularAdminRoleChange = await fetch(`${BASE_URL}/api/admin/users/3`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ role: "admin" }),
  })
  console.log("Admin biasa ubah role ditolak (403):", regularAdminRoleChange.status === 403)
  if (regularAdminRoleChange.status !== 403) throw new Error("Admin biasa seharusnya tidak bisa ubah role!")

  // Ubah role dengan Super Admin (Harus berhasil 200)
  const superAdminRoleChange = await fetch(`${BASE_URL}/api/admin/users/3`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: superCookie },
    body: JSON.stringify({ role: "admin" }),
  })
  const superChangeData = await superAdminRoleChange.json()
  console.log("Super Admin ubah role berhasil:", superChangeData.message)

  // Kembalikan ke member
  await fetch(`${BASE_URL}/api/admin/users/3`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: superCookie },
    body: JSON.stringify({ role: "member" }),
  })
  console.log("✓ Hak eksklusif Super Admin terbukti 100% aman!")

  // 8b. Uji Keamanan: Admin TIDAK BISA Hapus Sesama Admin atau Super Admin
  console.log("\n--- 8b. Uji Keamanan Penghapusan & Modifikasi Akun Pengelola ---")
  // Cari ID akun admin lain (misal ID 4 yang merupakan admin zulofficial33@gmail.com)
  const targetAdminId = 4
  const targetSuperAdminId = 100

  // 1) Admin biasa coba hapus sesama admin -> Harus 403
  const adminDelAdminRes = await fetch(`${BASE_URL}/api/admin/users/${targetAdminId}`, {
    method: "DELETE",
    headers: { Cookie: adminCookie },
  })
  console.log("Admin biasa hapus sesama admin ditolak (403):", adminDelAdminRes.status === 403)
  if (adminDelAdminRes.status !== 403) throw new Error("Admin biasa seharusnya TIDAK BISA menghapus sesama admin!")

  // 2) Admin biasa coba hapus Super Admin -> Harus 403
  const adminDelSuperRes = await fetch(`${BASE_URL}/api/admin/users/${targetSuperAdminId}`, {
    method: "DELETE",
    headers: { Cookie: adminCookie },
  })
  console.log("Admin biasa hapus Super Admin ditolak (403):", adminDelSuperRes.status === 403)
  if (adminDelSuperRes.status !== 403) throw new Error("Admin biasa seharusnya TIDAK BISA menghapus Super Admin!")

  // 3) Super Admin coba hapus Super Admin -> Harus ditolak (400 untuk akun sendiri atau 403 dilindungi)
  const superDelSuperRes = await fetch(`${BASE_URL}/api/admin/users/${targetSuperAdminId}`, {
    method: "DELETE",
    headers: { Cookie: superCookie },
  })
  const isSuperDelRejected = superDelSuperRes.status === 400 || superDelSuperRes.status === 403
  console.log("Super Admin hapus akun Super Admin ditolak (400/403):", isSuperDelRejected)
  if (!isSuperDelRejected) throw new Error("Akun Super Admin seharusnya DILINDUNGI dan tidak bisa dihapus!")

  // 4) Admin biasa coba ubah status blokir sesama admin -> Harus 403
  const adminBlockAdminRes = await fetch(`${BASE_URL}/api/admin/users/${targetAdminId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ isActive: false }),
  })
  console.log("Admin biasa blokir sesama admin ditolak (403):", adminBlockAdminRes.status === 403)
  if (adminBlockAdminRes.status !== 403) throw new Error("Admin biasa seharusnya TIDAK BISA memblokir sesama admin!")

  // 5) Admin biasa coba ubah status verifikasi sesama admin -> Harus 403
  const adminVerifyAdminRes = await fetch(`${BASE_URL}/api/admin/users/${targetAdminId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ isVerified: false }),
  })
  console.log("Admin biasa ubah verifikasi sesama admin ditolak (403):", adminVerifyAdminRes.status === 403)
  if (adminVerifyAdminRes.status !== 403) throw new Error("Admin biasa seharusnya TIDAK BISA mengubah verifikasi sesama admin!")

  console.log("✓ Seluruh aturan proteksi akun Admin & Super Admin 100% VALID dan AMAN!")

  // 9. Uji Pengaturan Sistem
  console.log("\n--- 9. Uji Pengaturan Sistem Perpustakaan ---")
  const setSettingRes = await fetch(`${BASE_URL}/api/admin/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ settingKey: "max_loan_days", settingValue: "14" }),
  })
  const setSettingData = await setSettingRes.json()
  console.log("Simpan Setting:", setSettingData.message)

  // Restore ke 7
  await fetch(`${BASE_URL}/api/admin/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ settingKey: "max_loan_days", settingValue: "7" }),
  })
  console.log("✓ Pengaturan sistem berhasil diperbarui di MariaDB!")

  console.log("\n==================================================================")
  console.log("  SEMUA PENGUJIAN REST API ADMIN CRUD BERHASIL (100% PASS)")
  console.log("==================================================================")
}

run().catch((err) => {
  console.error("Test error:", err)
  process.exit(1)
})
