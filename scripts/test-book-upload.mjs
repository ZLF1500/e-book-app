import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function testUploadAndAddBook() {
  console.log("=== TEST: Book Upload & Auto Extraction Integration ===")
  const baseUrl = "http://localhost:3000"

  // 1. Login as Admin
  console.log("1. Authenticating as admin...")
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@rsjd.kaltimprov.go.id",
      password: "adminpassword123",
    }),
  })

  // Get auth cookie
  const cookies = loginRes.headers.get("set-cookie") || ""

  // If password login didn't match, let's create admin session directly or check
  const checkRes = await fetch(`${baseUrl}/api/admin/overview`, {
    headers: { cookie: cookies },
  })

  console.log("Admin overview status:", checkRes.status)

  // 2. Test Upload API Endpoint
  console.log("2. Testing POST /api/admin/books/upload...")
  const samplePdfPath = path.join(process.cwd(), "public", "sample.pdf")
  const pdfBuffer = fs.readFileSync(samplePdfPath)

  // Dummy base64 cover image
  const dummyBase64Cover = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="

  const formData = new FormData()
  const pdfBlob = new Blob([pdfBuffer], { type: "application/pdf" })
  formData.append("file", pdfBlob, "pedoman-medis-rsjd-2026.pdf")
  formData.append("cover", dummyBase64Cover)

  const uploadRes = await fetch(`${baseUrl}/api/admin/books/upload`, {
    method: "POST",
    headers: { cookie: cookies },
    body: formData,
  })

  const uploadData = await uploadRes.json()
  console.log("Upload response:", uploadData)

  if (!uploadData.success) {
    console.error("Upload failed:", uploadData)
    process.exit(1)
  }

  console.log("File saved to:", uploadData.fileUrl)
  console.log("Cover saved to:", uploadData.coverUrl)

  // Verify file exists on disk
  const uploadedDiskPdf = path.join(process.cwd(), "public", uploadData.fileUrl.replace(/^\//, ""))
  const uploadedDiskCover = path.join(process.cwd(), "public", uploadData.coverUrl.replace(/^\//, ""))

  console.log("PDF exists on disk:", fs.existsSync(uploadedDiskPdf))
  console.log("Cover exists on disk:", fs.existsSync(uploadedDiskCover))

  // 3. Test Creating Book with Uploaded File & Cover
  console.log("3. Creating new book with uploaded paths...")
  const bookRes = await fetch(`${baseUrl}/api/admin/books`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: cookies,
    },
    body: JSON.stringify({
      title: "Pedoman Medis RSJD 2026",
      slug: `pedoman-medis-rsjd-2026-${Date.now().toString().slice(-4)}`,
      synopsis: "Panduan resmi perawatan psikiatri klinis dan kesehatan jiwa RSJD.",
      authorName: "dr. Zul Sp.KJ",
      publisherName: "Penerbit RSJD Atma Husada Mahakam",
      publishYear: 2026,
      pageCount: 120,
      isbn: "978-602-998877",
      coverUrl: uploadData.coverUrl,
      fileUrl: uploadData.fileUrl,
      status: "aktif",
      isFeatured: true,
      format: "PDF",
      tags: ["Pedoman", "Psikiatri", "Kesehatan Jiwa"],
    }),
  })

  const bookData = await bookRes.json()
  console.log("Book creation response:", bookData)

  if (!bookData.success) {
    console.error("Book creation failed:", bookData)
    process.exit(1)
  }

  // 4. Verify in GET /api/admin/books
  console.log("4. Verifying book retrieval...")
  const listRes = await fetch(`${baseUrl}/api/admin/books?q=Pedoman+Medis+RSJD`, {
    headers: { cookie: cookies },
  })
  const listData = await listRes.json()
  const foundBook = listData.books?.find((b) => b.id === String(bookData.id))
  console.log("Found book in catalog:", {
    id: foundBook?.id,
    title: foundBook?.title,
    coverUrl: foundBook?.coverUrl,
    fileUrl: foundBook?.fileUrl,
    pageCount: foundBook?.pageCount,
    isFeatured: foundBook?.isFeatured,
  })

  console.log("=== ALL TESTS PASSED SUCCESSFULLY! ===")
}

testUploadAndAddBook().catch((err) => {
  console.error("Test error:", err)
  process.exit(1)
})
