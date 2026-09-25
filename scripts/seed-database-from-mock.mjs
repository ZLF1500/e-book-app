import mysql from "mysql2/promise"
import {
  INITIAL_CATEGORIES,
  POPULAR_AUTHORS,
  POPULAR_PUBLISHERS,
  POPULAR_TAGS,
  BOOKS_DATA,
  ARTICLES_DATA,
} from "../lib/mock-data.ts"

async function runSeed() {
  console.log("=== MEMULAI SEEDING DATABASE DARI MOCK DATA KE MARIADB ===")

  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "perpusahm",
  })
  console.log("✓ Terhubung ke database MariaDB 'perpusahm'")

  // 1. Pastikan Super Admin dan Admin ada
  console.log("\n1. Menyiapkan Akun Super Admin & Admin...")
  // Hash password 'adminpassword123'
  const adminPasswordHash =
    "0119834709ed2b660175ea49de8de69a:b04ca0f87d580ad6f6f57d73ffd18a186870a4e417a66558c92ff8383dcf0ee16671b963d02a7b6e8cb06367a3c2e1007172ae83c218cc818ab08d60b56874f3"

  await connection.execute(
    `INSERT INTO users (id, name, email, password, nik, phone, institution, isVerified, avatarUrl, role, isActive)
     VALUES (100, 'Super Admin RSJD', 'superadmin@rsjd.kaltimprov.go.id', ?, '6472010000000001', '081155009999', 'Direksi RSJD Atma Husada Mahakam', 1, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80', 'super_admin', 1)
     ON DUPLICATE KEY UPDATE role = 'super_admin', isVerified = 1, isActive = 1`,
    [adminPasswordHash]
  )
  console.log("✓ Akun Super Admin siap: superadmin@rsjd.kaltimprov.go.id")

  // Pastikan admin@rsjd.kaltimprov.go.id role admin
  await connection.execute(
    `UPDATE users SET role = 'admin' WHERE email = 'admin@rsjd.kaltimprov.go.id'`
  )
  console.log("✓ Akun Admin siap: admin@rsjd.kaltimprov.go.id")

  // 2. Kategori
  console.log("\n2. Mengisi Data Kategori...")
  for (const cat of INITIAL_CATEGORIES) {
    const id = parseInt(cat.id, 10) || null
    await connection.execute(
      `INSERT INTO categories (id, name, slug, iconName, description)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), iconName = VALUES(iconName), description = VALUES(description)`,
      [id, cat.name, cat.slug, cat.iconName, cat.description || ""]
    )
  }
  console.log(`✓ ${INITIAL_CATEGORIES.length} Kategori berhasil disimpan`)

  // 3. Penulis (Authors)
  console.log("\n3. Mengisi Data Penulis (Authors)...")
  for (const author of POPULAR_AUTHORS) {
    const id = parseInt(author.id.replace(/\D/g, ""), 10) || null
    await connection.execute(
      `INSERT INTO authors (id, name, bio, photoUrl)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), bio = VALUES(bio), photoUrl = VALUES(photoUrl)`,
      [id, author.name, author.bio || author.title, author.photoUrl]
    )
  }
  console.log(`✓ ${POPULAR_AUTHORS.length} Penulis berhasil disimpan`)

  // 4. Penerbit (Publishers)
  console.log("\n4. Mengisi Data Penerbit (Publishers)...")
  for (const pub of POPULAR_PUBLISHERS) {
    const id = parseInt(pub.id.replace(/\D/g, ""), 10) || null
    await connection.execute(
      `INSERT INTO publishers (id, name)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      [id, pub.name]
    )
  }
  console.log(`✓ ${POPULAR_PUBLISHERS.length} Penerbit berhasil disimpan`)

  // 5. Tags
  console.log("\n5. Mengisi Data Tags...")
  const allTagNames = new Set(POPULAR_TAGS.map((t) => t.name))
  BOOKS_DATA.forEach((b) => b.tags.forEach((t) => allTagNames.add(t)))

  for (const tagName of allTagNames) {
    const slug = tagName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .trim()
    await connection.execute(
      `INSERT INTO tags (name, slug, usageCount)
       VALUES (?, ?, 0)
       ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      [tagName, slug]
    )
  }
  console.log(`✓ ${allTagNames.size} Tags berhasil disimpan`)

  // Ambil mapping tag name -> tag ID
  const [tagRows] = await connection.execute("SELECT id, name FROM tags")
  const tagMap = new Map()
  tagRows.forEach((r) => tagMap.set(r.name.toLowerCase(), r.id))

  // 6. Buku (Books)
  console.log("\n6. Mengisi Data 14 Buku Digital...")
  for (const book of BOOKS_DATA) {
    const bookNumericId = parseInt(book.id.replace(/\D/g, ""), 10) || null
    const authorNumId = parseInt(book.authorId.replace(/\D/g, ""), 10) || null
    const pubNumId = parseInt(book.publisherId.replace(/\D/g, ""), 10) || null
    const catNumId = parseInt(book.categoryId.replace(/\D/g, ""), 10) || null

    await connection.execute(
      `INSERT INTO books (
        id, title, slug, synopsis, coverUrl,
        authorId, publisherId, categoryId,
        authorName, publisherName, categoryName,
        isbn, publishYear, language, pageCount,
        status, isFeatured, loanCount, averageRating,
        pdfAvailable, epubAvailable
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        synopsis = VALUES(synopsis),
        coverUrl = VALUES(coverUrl),
        authorName = VALUES(authorName),
        publisherName = VALUES(publisherName),
        categoryName = VALUES(categoryName),
        pageCount = VALUES(pageCount),
        isFeatured = VALUES(isFeatured),
        pdfAvailable = VALUES(pdfAvailable),
        epubAvailable = VALUES(epubAvailable)`,
      [
        bookNumericId,
        book.title,
        book.slug,
        book.synopsis,
        book.coverUrl,
        authorNumId,
        pubNumId,
        catNumId,
        book.authorName,
        book.publisherName,
        book.categoryName,
        book.isbn,
        book.publishYear,
        book.language,
        book.pageCount,
        book.status,
        book.isFeatured ? 1 : 0,
        book.loanCount || 0,
        book.averageRating || 5.0,
        book.formats.pdf.available ? 1 : 0,
        book.formats.epub.available ? 1 : 0,
      ]
    )

    // Book Tags
    if (book.tags && book.tags.length > 0) {
      for (const tName of book.tags) {
        const tagId = tagMap.get(tName.toLowerCase())
        if (tagId && bookNumericId) {
          await connection.execute(
            `INSERT IGNORE INTO book_tags (bookId, tagId) VALUES (?, ?)`,
            [bookNumericId, tagId]
          )
        }
      }
    }

    // Book Files
    if (bookNumericId) {
      if (book.formats.pdf.available) {
        await connection.execute(
          `INSERT INTO book_files (bookId, format, filePath, status)
           VALUES (?, 'PDF', '/sample.pdf', 'aktif')
           ON DUPLICATE KEY UPDATE status = 'aktif'`,
          [bookNumericId]
        )
      }
      if (book.formats.epub.available) {
        await connection.execute(
          `INSERT INTO book_files (bookId, format, filePath, status)
           VALUES (?, 'EPUB', '/sample.epub', 'aktif')
           ON DUPLICATE KEY UPDATE status = 'aktif'`,
          [bookNumericId]
        )
      }
    }
  }
  console.log(`✓ ${BOOKS_DATA.length} Buku lengkap berhasil disimpan dan direlasikan ke MariaDB`)

  // Update tag usage counts
  await connection.execute(`
    UPDATE tags t
    SET usageCount = (SELECT COUNT(*) FROM book_tags bt WHERE bt.tagId = t.id)
  `)

  // 7. Artikel
  console.log("\n7. Mengisi Data Artikel...")
  for (const art of ARTICLES_DATA) {
    await connection.execute(
      `INSERT INTO articles (title, slug, thumbnailUrl, excerpt, authorName, readTime, category, publishedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE title = VALUES(title), excerpt = VALUES(excerpt)`,
      [
        art.title,
        art.slug,
        art.thumbnailUrl,
        art.excerpt,
        art.authorName,
        art.readTime,
        art.category,
      ]
    )
  }
  console.log(`✓ ${ARTICLES_DATA.length} Artikel berhasil disimpan`)

  // Cek total akhir
  const [bCount] = await connection.execute("SELECT COUNT(*) as c FROM books")
  const [cCount] = await connection.execute("SELECT COUNT(*) as c FROM categories")
  const [tCount] = await connection.execute("SELECT COUNT(*) as c FROM tags")
  const [uCount] = await connection.execute("SELECT COUNT(*) as c FROM users")
  const [aCount] = await connection.execute("SELECT COUNT(*) as c FROM articles")

  console.log("\n===========================================")
  console.log(`STATUS DATABASE SETELAH SEEDING:`)
  console.log(`- Buku: ${bCount[0].c} baris`)
  console.log(`- Kategori: ${cCount[0].c} baris`)
  console.log(`- Tag: ${tCount[0].c} baris`)
  console.log(`- Pengguna: ${uCount[0].c} baris`)
  console.log(`- Artikel: ${aCount[0].c} baris`)
  console.log("===========================================")

  await connection.end()
}

runSeed().catch((err) => {
  console.error("Gagal melakukan seeding:", err)
  process.exit(1)
})
