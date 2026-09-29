"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
  BookOpen,
  FileText,
  Search,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  Users,
  AlertTriangle,
  AlertCircle,
  Settings,
  Shield,
  ShieldCheck,
  Tag,
  FolderTree,
  Check,
  X,
  Lock,
  UserCheck,
  UserX,
  RefreshCw,
  Sparkles,
  ArrowUpDown,
  BookMarked,
  Layers,
  Crown,
  PenTool,
  UploadCloud,
  FileUp,
  ImagePlus,
  FileCheck,
  Eye,
  Archive,
  ChevronDown,
  ChevronUp,
  Moon,
  Sun,
  LogOut,
  ExternalLink,
  UserPlus,
  KeyRound,
  EyeOff,
  ArrowRightLeft,
  Newspaper,
  Clock,
  Calendar,
  User,
  Save,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { FieldError } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { extractPdfCoverAndMeta, generateCleanSlug, lookupKnownSeries, isBlacklistedWatermark } from "@/lib/pdf-extractor"

interface AdminBookItem {
  id: string
  title: string
  slug: string
  synopsis: string
  coverUrl: string
  fileUrl?: string | null
  authorName: string
  publisherName: string
  categoryId: string
  categoryName: string
  isbn: string
  publishYear: number
  language: string
  pageCount: number
  status: "aktif" | "nonaktif"
  isFeatured: boolean
  loanCount: number
  averageRating: number
  tags: string[]
  formats: {
    pdf: { available: boolean; status: string }
    epub: { available: boolean; status: string }
  }
}

interface BatchBookItem {
  id: string
  file: File
  fileName: string
  fileSizeBytes: number
  coverUrl: string
  title: string
  slug: string
  authorName: string
  publisherName: string
  categoryId: string
  categoryName: string
  publishYear: string
  pageCount: string
  format: "PDF" | "EPUB"
  tagsInput: string
  synopsis: string
  status: "pending" | "extracting" | "ready" | "saving" | "success" | "error" | "skipped"
  errorMessage?: string
  isExpanded?: boolean
  isDuplicate?: boolean
  duplicateReason?: string
}

interface CategoryItem {
  id: number
  name: string
  slug: string
  iconName: string
  description: string
  bookCount: number
}

interface TagItem {
  id: number
  name: string
  slug: string
  usageCount: number
}

interface UserItem {
  id: number
  name: string
  email: string
  nik: string | null
  phone: string | null
  institution: string | null
  isVerified: boolean
  role: "member" | "admin" | "super_admin"
  avatarUrl: string | null
  isActive: boolean
  createdAt: string
  borrowCount: number
}

interface LoanItem {
  id: number
  userId: number
  bookId: number
  durationDays: number
  borrowedAt: string
  dueAt: string
  status: "aktif" | "kembali" | "terlambat"
  userName: string
  userEmail: string
  userNik: string | null
  userAvatar?: string | null
  bookTitle: string
  bookSlug?: string
  bookCover: string | null
  categoryName?: string | null
}

interface ReportItem {
  id: number
  bookId: number
  userId: number | null
  format: string
  message: string
  status: "baru" | "diproses" | "selesai"
  createdAt: string
  bookTitle: string
  bookSlug?: string
  coverUrl?: string | null
  reporterName: string | null
  reporterEmail?: string | null
}

interface AdminArticleItem {
  id: number
  title: string
  slug: string
  thumbnailUrl: string
  excerpt: string
  content: string
  authorName: string
  readTime: string
  category: string
  publishedAt: string
  createdAt: string
  updatedAt: string
}

const ARTICLE_PRESET_CATEGORIES = [
  "Tips Kesehatan Jiwa",
  "Psikologi Praktis",
  "Berita Perpustakaan",
  "Psikologi Kerja",
  "Parenting & Anak",
  "Edukasi Medis & Terapi",
  "Relaksasi & Mindfulness",
]

const CATEGORY_ICON_OPTIONS = [
  "Brain",
  "Stethoscope",
  "HeartHandshake",
  "Pill",
  "Building2",
  "BookOpen",
  "Sparkles",
  "Shield",
  "Bookmark",
  "FileText",
]

export default function AdminPage() {
  const { user, isGuest, logout } = useAuth()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const isSuperAdmin = user?.role === "super_admin"

  // Helper to ensure all admin API requests contain active user identification headers even if cookies are dropped on plain HTTP
  const getAdminAuthHeaders = React.useCallback(
    (extra?: HeadersInit): HeadersInit => {
      let uid = user?.id
      if (!uid && typeof window !== "undefined") {
        try {
          const saved = localStorage.getItem("rsjd_auth_user_v2")
          if (saved && saved !== "guest") {
            const parsed = JSON.parse(saved)
            if (parsed?.id) uid = Number(parsed.id)
          }
        } catch {}
        if (!uid) {
          const match = document.cookie.match(/(^| )rsjd_auth_user=([^;]+)/)
          if (match && match[2]) {
            try {
              const raw = decodeURIComponent(match[2])
              const decoded = raw.startsWith("%") ? decodeURIComponent(raw) : raw
              const parsed = JSON.parse(decoded)
              if (parsed?.id) uid = Number(parsed.id)
            } catch {}
          }
        }
      }
      const headers = new Headers(extra || {})
      if (uid && !headers.has("x-user-id")) {
        headers.set("x-user-id", String(uid))
      }
      return headers
    },
    [user]
  )

  const adminFetch = React.useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = getAdminAuthHeaders(init?.headers)
      return fetch(input, { ...init, headers })
    },
    [getAdminAuthHeaders]
  )

  const [activeTab, setActiveTab] = React.useState<
    "buku" | "kategori" | "tag" | "artikel" | "pengguna" | "peminjam" | "laporan" | "pengaturan" | "tim-admin"
  >("buku")

  // Data lists
  const [booksList, setBooksList] = React.useState<AdminBookItem[]>([])
  const [categoriesList, setCategoriesList] = React.useState<CategoryItem[]>([])
  const [tagsList, setTagsList] = React.useState<TagItem[]>([])
  const [usersList, setUsersList] = React.useState<UserItem[]>([])
  const [loansList, setLoansList] = React.useState<LoanItem[]>([])
  const [reportsList, setReportsList] = React.useState<ReportItem[]>([])
  const [reportStatusFilter, setReportStatusFilter] = React.useState<"all" | "baru" | "diproses" | "selesai">("all")
  const [articlesList, setArticlesList] = React.useState<AdminArticleItem[]>([])
  const [maxLoanDays, setMaxLoanDays] = React.useState<number>(7)

  const handleUpdateReportStatus = async (reportId: number, newStatus: "baru" | "diproses" | "selesai") => {
    try {
      const res = await adminFetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reportId, status: newStatus }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setReportsList((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
        )
        toast.success(`Status laporan berhasil diubah ke: ${newStatus.toUpperCase()}`)
      } else {
        toast.error(data.error || "Gagal memperbarui status laporan.")
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan.")
    }
  }

  const handleDeleteReport = async (reportId: number) => {
    if (!confirm("Hapus catatan laporan kendala ini?")) return
    try {
      const res = await adminFetch(`/api/admin/reports?id=${reportId}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setReportsList((prev) => prev.filter((r) => r.id !== reportId))
        toast.success("Laporan berhasil dihapus.")
      } else {
        toast.error(data.error || "Gagal menghapus laporan.")
      }
    } catch {
      toast.error("Gagal menghubungi server.")
    }
  }

  // Filters & Search for Articles
  const [articleSearch, setArticleSearch] = React.useState("")
  const [articleCategoryFilter, setArticleCategoryFilter] = React.useState("all")
  const [isArticleModalOpen, setIsArticleModalOpen] = React.useState(false)
  const [editingArticle, setEditingArticle] = React.useState<AdminArticleItem | null>(null)
  const [articleForm, setArticleForm] = React.useState({
    title: "",
    slug: "",
    thumbnailUrl: "",
    excerpt: "",
    content: "",
    authorName: "",
    readTime: "4 menit baca",
    category: "Tips Kesehatan Jiwa",
  })
  const [articleModalError, setArticleModalError] = React.useState("")
  const [isArticleSubmitting, setIsArticleSubmitting] = React.useState(false)
  const [deleteArticleModalItem, setDeleteArticleModalItem] = React.useState<AdminArticleItem | null>(null)
  const [previewArticleModalItem, setPreviewArticleModalItem] = React.useState<AdminArticleItem | null>(null)

  // Loading & feedback states
  const [isLoadingData, setIsLoadingData] = React.useState(true)
  const [saveSuccessMessage, setSaveSuccessMessage] = React.useState("")
  const [errorMessage, setErrorMessage] = React.useState("")
  const [isProcessing, setIsProcessing] = React.useState(false)

  // Filters & Search
  const [searchTerm, setSearchTerm] = React.useState("")
  const [bookCategoryFilter, setBookCategoryFilter] = React.useState("all")
  const [userRoleFilter, setUserRoleFilter] = React.useState("all")
  const [loanSearch, setLoanSearch] = React.useState("")
  const [loanStatusFilter, setLoanStatusFilter] = React.useState("all")

  // --- MODAL STATES ---
  // Book Add/Edit Modal
  const [isBookModalOpen, setIsBookModalOpen] = React.useState(false)
  const [editingBookId, setEditingBookId] = React.useState<string | null>(null)
  const [bookModalTab, setBookModalTab] = React.useState<"auto" | "manual">("auto")
  const [isExtractingPdf, setIsExtractingPdf] = React.useState(false)
  const [extractionStatus, setExtractionStatus] = React.useState<string>("")
  const [uploadedBookFile, setUploadedBookFile] = React.useState<File | null>(null)
  const [bookFileDragOver, setBookFileDragOver] = React.useState(false)
  const bookFileInputRef = React.useRef<HTMLInputElement | null>(null)
  const coverImageInputRef = React.useRef<HTMLInputElement | null>(null)

  const [bookForm, setBookForm] = React.useState({
    title: "",
    slug: "",
    synopsis: "",
    authorName: "",
    publisherName: "",
    categoryId: "",
    publishYear: "",
    pageCount: "",
    isbn: "",
    coverUrl: "",
    format: "PDF" as "PDF" | "EPUB" | "BOTH",
    status: "aktif" as "aktif" | "nonaktif",
    isFeatured: false,
    tagsInput: "",
    fileUrl: "",
    fileName: "",
    fileSizeBytes: 0,
  })
  const [bookFormErrors, setBookFormErrors] = React.useState<Record<string, string>>({})

  // Batch Upload States (ZIP / Multi-file)
  const [isBatchMode, setIsBatchMode] = React.useState<boolean>(false)
  const [batchQueue, setBatchQueue] = React.useState<BatchBookItem[]>([])
  const [batchProgress, setBatchProgress] = React.useState<{ current: number; total: number; message: string }>({
    current: 0,
    total: 0,
    message: "",
  })
  const [autoSkipDuplicates, setAutoSkipDuplicates] = React.useState<boolean>(true)
  const [allowSingleDuplicate, setAllowSingleDuplicate] = React.useState<boolean>(false)

  // Category Add/Edit Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = React.useState(false)
  const [editingCategoryId, setEditingCategoryId] = React.useState<number | null>(null)
  const [categoryForm, setCategoryForm] = React.useState({
    name: "",
    slug: "",
    iconName: "Brain",
    description: "",
  })

  // Quick Category Inline Modal (digunakan langsung dari dalam modal buku)
  const [isQuickCatOpen, setIsQuickCatOpen] = React.useState(false)
  const [quickCatForm, setQuickCatForm] = React.useState({ name: "", description: "" })
  const [isQuickCatSubmitting, setIsQuickCatSubmitting] = React.useState(false)
  const [quickCatError, setQuickCatError] = React.useState("")

  // Tag Add/Edit Modal
  const [isTagModalOpen, setIsTagModalOpen] = React.useState(false)
  const [editingTagId, setEditingTagId] = React.useState<number | null>(null)
  const [tagForm, setTagForm] = React.useState({ name: "", slug: "" })

  // User Role Change Modal
  const [roleModalUser, setRoleModalUser] = React.useState<UserItem | null>(null)
  const [selectedNewRole, setSelectedNewRole] = React.useState<"member" | "admin" | "super_admin">("member")

  // Super Admin: Admin Team Management States
  const [adminRoleFilter, setAdminRoleFilter] = React.useState<string>("all")
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = React.useState(false)
  const [newAdminForm, setNewAdminForm] = React.useState({
    name: "",
    email: "",
    password: "",
    role: "admin" as "admin" | "super_admin",
    nik: "",
    phone: "",
    institution: "Pustakawan RSJD",
    isVerified: true,
  })
  const [showAdminPassword, setShowAdminPassword] = React.useState(false)
  const [addAdminError, setAddAdminError] = React.useState("")

  // Super Admin: Reset Password Modal
  const [resetPasswordModalUser, setResetPasswordModalUser] = React.useState<UserItem | null>(null)
  const [newResetPassword, setNewResetPassword] = React.useState("")
  const [showResetPassword, setShowResetPassword] = React.useState(false)
  const [resetPasswordError, setResetPasswordError] = React.useState("")

  // Super Admin: Transfer Ownership Modal States
  const [transferOwnerModalUser, setTransferOwnerModalUser] = React.useState<UserItem | null>(null)
  const [transferPassword, setTransferPassword] = React.useState("")
  const [showTransferPassword, setShowTransferPassword] = React.useState(false)
  const [transferAgreed, setTransferAgreed] = React.useState(false)
  const [transferError, setTransferError] = React.useState("")

  // Reusable Delete Confirmation Dialog State
  const [deleteModal, setDeleteModal] = React.useState<{
    isOpen: boolean
    title: string
    description: string
    itemName: string
    itemType: string
    onConfirm: () => Promise<void> | void
  } | null>(null)

  // Fetch all administrative data from MariaDB
  const fetchAdminData = React.useCallback(async () => {
    setIsLoadingData(true)
    try {
      const [bRes, cRes, tRes, uRes, lRes, rRes, sRes, aRes] = await Promise.all([
        adminFetch("/api/admin/books"),
        adminFetch("/api/admin/categories"),
        adminFetch("/api/admin/tags"),
        adminFetch("/api/admin/users"),
        adminFetch("/api/admin/loans"),
        adminFetch("/api/admin/reports"),
        adminFetch("/api/admin/settings"),
        adminFetch("/api/admin/articles"),
      ])

      if (bRes.ok) {
        const d = await bRes.json()
        if (d.success) setBooksList(d.books)
      }
      if (cRes.ok) {
        const d = await cRes.json()
        if (d.success) setCategoriesList(d.categories)
      }
      if (tRes.ok) {
        const d = await tRes.json()
        if (d.success) setTagsList(d.tags)
      }
      if (uRes.ok) {
        const d = await uRes.json()
        if (d.success) setUsersList(d.users)
      }
      if (lRes.ok) {
        const d = await lRes.json()
        if (d.success) setLoansList(d.loans)
      }
      if (rRes.ok) {
        const d = await rRes.json()
        if (d.success) setReportsList(d.reports)
      }
      if (sRes.ok) {
        const d = await sRes.json()
        if (d.success && d.settings?.max_loan_days) {
          setMaxLoanDays(parseInt(d.settings.max_loan_days, 10) || 7)
        }
      }
      if (aRes && aRes.ok) {
        const d = await aRes.json()
        if (d.success) setArticlesList(d.articles)
      }
    } catch (err) {
      console.error("Failed to load admin data:", err)
      setErrorMessage("Gagal memuat data dari database.")
    } finally {
      setIsLoadingData(false)
    }
  }, [adminFetch])

  React.useEffect(() => {
    if (!isGuest && (user?.role === "admin" || user?.role === "super_admin")) {
      fetchAdminData()
    }
  }, [user, isGuest, fetchAdminData])

  const showSuccess = (msg: string) => {
    setSaveSuccessMessage(msg)
    setTimeout(() => setSaveSuccessMessage(""), 4000)
  }

  // --- DUPLICATE BOOK DETECTION HELPER ---
  const checkIsBookDuplicate = React.useCallback(
    (title?: string, slug?: string, fileName?: string) => {
      if (!title && !slug && !fileName) return null

      const normalize = (str: string) =>
        str
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
          .trim()

      const cleanT = title ? normalize(title) : ""
      const cleanS = slug ? normalize(slug) : (title ? normalize(generateCleanSlug(title)) : "")
      const cleanFn = fileName ? normalize(fileName.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ")) : ""

      return (
        booksList.find((b) => {
          const bTitle = normalize(b.title)
          const bSlug = normalize(b.slug)
          return (
            (cleanT && bTitle === cleanT) ||
            (cleanS && bSlug === cleanS) ||
            (cleanFn && (bTitle === cleanFn || bSlug === cleanFn))
          )
        }) || null
      )
    },
    [booksList]
  )

  const duplicateMatch = React.useMemo(() => {
    if (editingBookId || isBatchMode || !isBookModalOpen) return null
    return checkIsBookDuplicate(bookForm.title, bookForm.slug, uploadedBookFile?.name)
  }, [bookForm.title, bookForm.slug, uploadedBookFile?.name, editingBookId, isBatchMode, isBookModalOpen, checkIsBookDuplicate])

  // --- BOOK ACTIONS ---
  const processBookFile = async (file: File) => {
    const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf"
    const isEpub = file.name.toLowerCase().endsWith(".epub") || file.type === "application/epub+zip"

    if (!isPdf && !isEpub) {
      setErrorMessage("Format berkas harus berupa PDF (.pdf) atau EPUB (.epub).")
      return
    }

    setUploadedBookFile(file)

    if (file.size === 0) {
      setExtractionStatus(
        "⚠️ Berkas terbaca 0 bytes (Sandbox Browser Flatpak). Silakan klik kotak di atas untuk memilih berkas lewat dialog sistem."
      )
      setErrorMessage(
        "Berkas terbaca 0 bytes karena isolasi keamanan Flatpak peramban pada partisi eksternal (/run/media). Silakan klik area unggah untuk memilih berkas langsung lewat pemilih berkas sistem (File Chooser)."
      )
      return
    }

    const cleanFileName = file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[_-]+/g, " ")
      .trim()

    const autoTitle = cleanFileName
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ")

    const autoSlug = cleanFileName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .trim()

    const isManual = bookModalTab === "manual"

    setBookForm((prev) => ({
      ...prev,
      fileName: file.name,
      fileSizeBytes: file.size,
      title: prev.title.trim() ? prev.title : autoTitle,
      slug: prev.slug.trim() ? prev.slug : autoSlug,
      format: isPdf ? "PDF" : "EPUB",
    }))

    if (isPdf) {
      setIsExtractingPdf(true)
      setExtractionStatus(
        isManual
          ? "Sedang mengekstrak sampul halaman depan & menghitung jumlah halaman (Mode Manual)..."
          : "Sedang membaca dokumen, mengekstrak sampul, dan menganalisis teks (Mode Cerdas)..."
      )
      try {
        const result = await extractPdfCoverAndMeta(file)

        if (isManual) {
          // MODE MANUAL: HANYA EKSTRAK SAMPUL DAN JUMLAH HALAMAN!
          // Informasi teks (judul, penulis, penerbit, sinopsis, kategori) tidak di-auto-write
          setBookForm((prev) => ({
            ...prev,
            coverUrl: result.coverDataUrl || prev.coverUrl,
            pageCount: String(result.pageCount),
            fileName: file.name,
            fileSizeBytes: file.size,
            format: "PDF",
          }))
          setExtractionStatus(
            `✨ Sampul & ${result.pageCount} halaman berhasil diekstrak otomatis. Silakan lengkapi informasi buku secara manual.`
          )
        } else {
          // MODE AUTO WRITE LENGKAP:
          let matchedCategoryId = ""
          if (result.suggestedCategorySlug) {
            const foundCat = categoriesList.find(
              (c) =>
                c.slug === result.suggestedCategorySlug ||
                c.name.toLowerCase().includes(result.suggestedCategoryName?.toLowerCase() || "")
            )
            if (foundCat) {
              matchedCategoryId = String(foundCat.id)
            }
          }

          const newTitle = result.metadataTitle || autoTitle
          const newSlug = generateCleanSlug(newTitle)

          setBookForm((prev) => {
            let authorToSet = result.metadataAuthor || prev.authorName
            if (!authorToSet) {
              authorToSet = result.detectedType === "medical" ? "Tim Medis RSJD" : ""
            }

            let publisherToSet = result.metadataPublisher || prev.publisherName
            if (!publisherToSet || publisherToSet.includes("RSJD")) {
              if (result.detectedType === "fiction") {
                publisherToSet = result.metadataPublisher || "Penerbit Independen / Terjemahan"
              } else if (result.detectedType === "general") {
                publisherToSet = result.metadataPublisher || "Penerbit Umum"
              }
            }

            return {
              ...prev,
              coverUrl: result.coverDataUrl,
              pageCount: String(result.pageCount),
              publishYear: result.extractedYear ? String(result.extractedYear) : prev.publishYear,
              title: newTitle,
              slug: newSlug,
              authorName: authorToSet,
              publisherName: publisherToSet,
              categoryId: matchedCategoryId || prev.categoryId || (categoriesList[0] ? String(categoriesList[0].id) : ""),
              synopsis: result.extractedSynopsis || prev.synopsis,
              tagsInput:
                result.suggestedTags && result.suggestedTags.length > 0
                  ? result.suggestedTags.join(", ")
                  : prev.tagsInput,
            }
          })
          setExtractionStatus(`✨ ${result.detectedSummary}`)
        }
      } catch (err: unknown) {
        console.error("PDF extraction error:", err)
        const msg = err instanceof Error ? err.message : ""
        if (msg.includes("0 bytes") || file.size === 0) {
          setExtractionStatus("⚠️ Berkas kosong (0 bytes). Silakan klik area kotak unggah untuk memilih berkas via pemilih sistem.")
          setErrorMessage("Peramban gagal membaca konten berkas (0 bytes) karena batasan sandbox Flatpak Linux. Silakan klik kotak unggah untuk memilih berkas secara langsung.")
        } else {
          setExtractionStatus("Gagal mengekstrak sampul secara otomatis. Anda tetap dapat memilih foto sampul manual.")
        }
      } finally {
        setIsExtractingPdf(false)
      }
    } else {
      setExtractionStatus(
        isManual
          ? "✨ Berkas EPUB terdeteksi. Silakan lengkapi informasi buku secara manual."
          : "Berkas EPUB terdeteksi. Format berkas otomatis diatur ke EPUB."
      )
    }
  }

  // --- BATCH (ZIP / MULTI-FILE) PROCESSING ---
  const processIncomingBookFiles = async (files: File[]) => {
    if (files.length === 0) return

    const hasZip = files.some(
      (f) =>
        f.name.toLowerCase().endsWith(".zip") ||
        f.type === "application/zip" ||
        f.type === "application/x-zip-compressed"
    )

    if (hasZip || files.length > 1) {
      await processBatchFiles(files)
    } else {
      setIsBatchMode(false)
      setBatchQueue([])
      await processBookFile(files[0])
    }
  }

  const processBatchFiles = async (files: File[]) => {
    setIsBatchMode(true)
    setIsExtractingPdf(true)
    setExtractionStatus("Sedang membuka arsip ZIP / memeriksa berkas massal...")

    const collectedFiles: File[] = []

    for (const f of files) {
      const isZip =
        f.name.toLowerCase().endsWith(".zip") ||
        f.type === "application/zip" ||
        f.type === "application/x-zip-compressed"

      if (isZip) {
        try {
          const JSZip = (await import("jszip")).default
          const zip = await JSZip.loadAsync(f)
          const entries = Object.values(zip.files)

          for (const entry of entries) {
            if (entry.dir) continue
            const baseName = entry.name.split("/").pop() || entry.name
            const lower = baseName.toLowerCase()

            // Abaikan file sampah Mac OS / hidden
            if (entry.name.includes("__MACOSX") || baseName.startsWith("._") || baseName.startsWith(".DS_Store")) {
              continue
            }

            if (lower.endsWith(".pdf") || lower.endsWith(".epub")) {
              const blob = await entry.async("blob")
              const extractedFile = new File([blob], baseName, {
                type: lower.endsWith(".pdf") ? "application/pdf" : "application/epub+zip",
              })
              collectedFiles.push(extractedFile)
            }
          }
        } catch (zipErr) {
          console.error("Gagal membaca berkas ZIP:", zipErr)
          setErrorMessage("Berkas ZIP tidak dapat diekstrak atau korup.")
        }
      } else if (f.name.toLowerCase().endsWith(".pdf") || f.name.toLowerCase().endsWith(".epub")) {
        collectedFiles.push(f)
      }
    }

    if (collectedFiles.length === 0) {
      setIsExtractingPdf(false)
      setIsBatchMode(false)
      setErrorMessage("Tidak ditemukan berkas PDF atau EPUB yang valid di dalam berkas/arsip ZIP.")
      return
    }

    if (collectedFiles.length === 1) {
      setIsBatchMode(false)
      setBatchQueue([])
      await processBookFile(collectedFiles[0])
      return
    }

    // Urutkan buku secara natural (Volume 1, Volume 2, Volume 10, dll.)
    collectedFiles.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
    )

    const isManual = bookModalTab === "manual"

    const initialQueue: BatchBookItem[] = collectedFiles.map((file, idx) => {
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim()
      const fnYearMatch = file.name.match(/(?:[\s\(_\-\[])\b(19[7-9]\d|20[0-2]\d)\b(?:[\s\)_\]\-\.])/i)
      const initialYear = fnYearMatch ? fnYearMatch[1] : String(new Date().getFullYear())

      return {
        id: `batch-${Date.now()}-${idx}`,
        file,
        fileName: file.name,
        fileSizeBytes: file.size,
        coverUrl: "",
        title: cleanName,
        slug: generateCleanSlug(cleanName),
        authorName: isManual ? (bookForm.authorName || "") : "",
        publisherName: isManual ? (bookForm.publisherName || "Penerbit RSJD Atma Husada Mahakam") : "Penerbit RSJD Atma Husada Mahakam",
        categoryId: bookForm.categoryId || (categoriesList[0] ? String(categoriesList[0].id) : ""),
        categoryName: categoriesList.find((c) => String(c.id) === (bookForm.categoryId || String(categoriesList[0]?.id)))?.name || "",
        publishYear: initialYear,
        pageCount: "200",
        format: file.name.toLowerCase().endsWith(".epub") ? "EPUB" : "PDF",
        tagsInput: isManual ? (bookForm.tagsInput || "") : "Novel, Literasi",
        synopsis: "",
        status: "pending",
        isExpanded: false,
      }
    })

    setBatchQueue(initialQueue)
    setExtractionStatus(
      isManual
        ? `Ditemukan ${initialQueue.length} berkas beruntun. Mengekstrak sampul & jumlah halaman...`
        : `Ditemukan ${initialQueue.length} buku. Mengekstrak sampul & info dari tiap buku...`
    )

    // Proses ekstraksi berurutan satu per satu agar memori dan CPU tetap lancar
    for (let i = 0; i < initialQueue.length; i++) {
      const item = initialQueue[i]
      setBatchQueue((prev) =>
        prev.map((b, idx) => (idx === i ? { ...b, status: "extracting" } : b))
      )
      setExtractionStatus(
        isManual
          ? `Mengekstrak sampul & halaman (${i + 1}/${initialQueue.length}): ${item.fileName}...`
          : `Mengekstrak (${i + 1}/${initialQueue.length}): ${item.fileName}...`
      )

      if (item.format === "PDF") {
        try {
          const result = await extractPdfCoverAndMeta(item.file)

          if (isManual) {
            // MODE MANUAL: HANYA EKSTRAK SAMPUL DAN JUMLAH HALAMAN!
            // Tidak auto-write judul, penulis, sinopsis, dsb.
            setBatchQueue((prev) =>
              prev.map((b, idx) =>
                idx === i
                  ? {
                      ...b,
                      coverUrl: result.coverDataUrl,
                      pageCount: String(result.pageCount),
                      status: "ready",
                    }
                  : b
              )
            )
          } else {
            // MODE AUTO: Ekstraksi cerdas lengkap
            const finalTitle = result.metadataTitle || item.title
            const finalSlug = generateCleanSlug(finalTitle)

            let matchedCatId = item.categoryId
            if (result.suggestedCategorySlug) {
              const found = categoriesList.find(
                (c) =>
                  c.slug === result.suggestedCategorySlug ||
                  c.name.toLowerCase().includes(result.suggestedCategoryName?.toLowerCase() || "")
              )
              if (found) matchedCatId = String(found.id)
            }

            let authorToSet = result.metadataAuthor
            if (!authorToSet) {
              authorToSet = result.detectedType === "medical" ? "Tim Medis RSJD" : ""
            }

            let publisherToSet = result.metadataPublisher
            if (!publisherToSet || publisherToSet.includes("RSJD")) {
              publisherToSet =
                result.detectedType === "fiction"
                  ? "Penerbit Independen / Terjemahan"
                  : "Penerbit Umum"
            }

            setBatchQueue((prev) =>
              prev.map((b, idx) =>
                idx === i
                  ? {
                      ...b,
                      coverUrl: result.coverDataUrl,
                      title: finalTitle,
                      slug: finalSlug,
                      authorName: authorToSet || b.authorName,
                      publisherName: publisherToSet || b.publisherName,
                      categoryId: matchedCatId,
                      publishYear: result.extractedYear ? String(result.extractedYear) : b.publishYear,
                      pageCount: String(result.pageCount),
                      tagsInput: result.suggestedTags?.join(", ") || b.tagsInput,
                      synopsis: result.extractedSynopsis || b.synopsis,
                      status: "ready",
                    }
                  : b
              )
            )
          }
        } catch (err) {
          console.error("Batch extraction error:", item.fileName, err)
          setBatchQueue((prev) =>
            prev.map((b, idx) => (idx === i ? { ...b, status: "ready" } : b))
          )
        }
      } else {
        setBatchQueue((prev) =>
          prev.map((b, idx) => (idx === i ? { ...b, status: "ready" } : b))
        )
      }
    }

    // Resolusi Seri Dominan (Batch Series Inheritance)
    // HANYA dijalankan pada Mode Auto Write
    if (!isManual) {
      setBatchQueue((currentQueue) => {
        const seriesTally: Record<string, { count: number; sampleTitle: string; sampleFileName: string }> = {}

        for (const item of currentQueue) {
          const foundMatch = lookupKnownSeries(item.title, item.fileName)
          if (foundMatch) {
            const sName = foundMatch.series.name
            if (!seriesTally[sName]) {
              seriesTally[sName] = { count: 0, sampleTitle: item.title, sampleFileName: item.fileName }
            }
            seriesTally[sName].count++
          }
        }

        let dominantSeriesKey: string | null = null
        let highestCount = 0
        for (const sName in seriesTally) {
          if (seriesTally[sName].count > highestCount) {
            highestCount = seriesTally[sName].count
            dominantSeriesKey = sName
          }
        }

        if (dominantSeriesKey && highestCount >= 2) {
          const sample = seriesTally[dominantSeriesKey]
          const resolvedMatch = lookupKnownSeries(sample.sampleTitle, sample.sampleFileName)
          if (resolvedMatch) {
            const { series } = resolvedMatch

            let matchedCatId = ""
            const foundCat = categoriesList.find(
              (c) =>
                c.slug === series.categorySlug ||
                c.name.toLowerCase().includes(series.categoryName.toLowerCase())
            )
            if (foundCat) matchedCatId = String(foundCat.id)

            return currentQueue.map((item) => {
              const isGenericTitle = /^(?:Volume|Vol\.?|Jilid)\s*\d+$/i.test(item.title.trim())
              const isGenericAuthor = !item.authorName || item.authorName === "Tim Medis RSJD" || isBlacklistedWatermark(item.authorName)

              if (isGenericTitle || isGenericAuthor) {
                const volMatch = `${item.fileName} ${item.title}`.match(/(?:volume|vol\.?|v|jilid)\s*(\d+(?:\.\d+)?)/i)
                const vol = volMatch ? volMatch[1] : undefined
                const cleanTitle = vol ? `${series.canonicalTitle} - Volume ${vol}` : series.canonicalTitle
                const year = series.getYearForVolume ? series.getYearForVolume(vol) : series.firstPublishedYear

                return {
                  ...item,
                  title: cleanTitle,
                  slug: generateCleanSlug(cleanTitle),
                  authorName: series.author,
                  publisherName: series.publisher,
                  categoryId: matchedCatId || item.categoryId,
                  publishYear: String(year),
                  tagsInput: series.tags.join(", "),
                  synopsis: (!item.synopsis || item.synopsis.startsWith("Prolog Cerita:") || item.synopsis.includes("bakadame.com"))
                    ? series.synopsis
                    : item.synopsis,
                  status: "ready",
                }
              }
              return item
            })
          }
        }

        return currentQueue
      })
    }

    // Resolusi Duplikasi & Auto-Skip Duplikat (tetap berlaku untuk kedua mode!)
    setBatchQueue((currentQueue) => {
      const seenTitlesOrSlugs = new Set<string>()
      let duplicateCount = 0

      const checkedQueue = currentQueue.map((item) => {
        // 1. Cek terhadap database katalog perpustakaan yang sudah ada
        const existingInDb = checkIsBookDuplicate(item.title, item.slug, item.fileName)
        if (existingInDb) {
          duplicateCount++
          return {
            ...item,
            status: autoSkipDuplicates ? ("skipped" as const) : item.status,
            isDuplicate: true,
            duplicateReason: `Buku sudah ada di katalog ("${existingInDb.title}")`,
          }
        }

        // 2. Cek terhadap duplikat di dalam batch arsip itu sendiri
        const normTitle = item.title.toLowerCase().replace(/[^a-z0-9]/g, "")
        const normSlug = (item.slug || generateCleanSlug(item.title)).toLowerCase().replace(/[^a-z0-9]/g, "")
        if (seenTitlesOrSlugs.has(normTitle) || (normSlug && seenTitlesOrSlugs.has(normSlug))) {
          duplicateCount++
          return {
            ...item,
            status: autoSkipDuplicates ? ("skipped" as const) : item.status,
            isDuplicate: true,
            duplicateReason: "Duplikat di dalam berkas/arsip ini",
          }
        }

        if (normTitle) seenTitlesOrSlugs.add(normTitle)
        if (normSlug) seenTitlesOrSlugs.add(normSlug)
        return item
      })

      return checkedQueue
    })

    setIsExtractingPdf(false)
    setExtractionStatus(
      isManual
        ? `✨ Selesai mengekstrak sampul & jumlah halaman untuk ${initialQueue.length} berkas beruntun. Mode Manual aktif: lengkapi info buku secara manual lalu klik 'Simpan'.`
        : `✨ Selesai memproses ${initialQueue.length} berkas buku. Periksa antrean dan klik 'Simpan Semua'.`
    )
  }

  const applyBatchBulkField = (
    field: "categoryId" | "authorName" | "publisherName" | "publishYear" | "tagsInput",
    value: string
  ) => {
    setBatchQueue((prev) =>
      prev.map((item) => ({
        ...item,
        [field]: value,
        ...(field === "categoryId"
          ? { categoryName: categoriesList.find((c) => String(c.id) === value)?.name || "" }
          : {}),
      }))
    )
  }

  const updateBatchItem = (id: string, updates: Partial<BatchBookItem>) => {
    setBatchQueue((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    )
  }

  const removeBatchItem = (id: string) => {
    setBatchQueue((prev) => {
      const next = prev.filter((b) => b.id !== id)
      if (next.length === 0) {
        setIsBatchMode(false)
        setExtractionStatus("")
      }
      return next
    })
  }

  const toggleAutoSkipDuplicates = (newValue: boolean) => {
    setAutoSkipDuplicates(newValue)
    if (isBatchMode && batchQueue.length > 0) {
      setBatchQueue((prev) =>
        prev.map((item) => {
          if (item.isDuplicate && item.status !== "success" && item.status !== "saving") {
            return {
              ...item,
              status: newValue ? ("skipped" as const) : ("ready" as const),
            }
          }
          return item
        })
      )
    }
  }

  const autoCompleteBatchItem = (id: string) => {
    const item = batchQueue.find((b) => b.id === id)
    if (!item) return

    // 1. Coba match langsung
    let match = lookupKnownSeries(item.title, item.fileName)

    // 2. Jika judul generic (misal "Volume 1.pdf"), cari seri yang ada di buku lain dalam antrean batch
    if (!match) {
      for (const other of batchQueue) {
        if (other.id !== id) {
          const otherMatch = lookupKnownSeries(other.title, other.fileName)
          if (otherMatch) {
            match = otherMatch
            break
          }
        }
      }
    }

    if (match) {
      const { series } = match
      const volMatch = `${item.fileName} ${item.title}`.match(/(?:volume|vol\.?|v|jilid)\s*(\d+(?:\.\d+)?)/i)
      const vol = volMatch ? volMatch[1] : undefined
      const cleanTitle = vol ? `${series.canonicalTitle} - Volume ${vol}` : series.canonicalTitle
      const year = series.getYearForVolume ? series.getYearForVolume(vol) : series.firstPublishedYear

      const matchedCat = categoriesList.find(
        (c) =>
          c.slug === series.categorySlug ||
          c.name.toLowerCase().includes(series.categoryName.toLowerCase())
      )
      updateBatchItem(id, {
        title: cleanTitle,
        slug: generateCleanSlug(cleanTitle),
        authorName: series.author,
        publisherName: series.publisher,
        publishYear: String(year),
        categoryId: matchedCat ? String(matchedCat.id) : item.categoryId,
        tagsInput: series.tags.join(", "),
        synopsis: series.synopsis,
      })
    }
  }

  const handleSaveBatch = async () => {
    if (batchQueue.length === 0) return
    const itemsToSave = batchQueue.filter(
      (b) => b.status !== "success" && (autoSkipDuplicates ? b.status !== "skipped" : true)
    )

    if (itemsToSave.length === 0) {
      showSuccess("Semua buku telah tersimpan atau dilewati karena terdeteksi duplikat.")
      return
    }

    setIsProcessing(true)

    let savedCount = 0
    let skippedCount = 0
    let failCount = 0

    for (let i = 0; i < batchQueue.length; i++) {
      const item = batchQueue[i]
      if (item.status === "success" || (autoSkipDuplicates && item.status === "skipped")) {
        if (item.status === "skipped") skippedCount++
        continue
      }

      setBatchProgress({
        current: savedCount + 1,
        total: itemsToSave.length,
        message: `Menyimpan (${savedCount + 1}/${itemsToSave.length}): "${item.title}"...`,
      })

      setBatchQueue((prev) =>
        prev.map((b, idx) => (idx === i ? { ...b, status: "saving" } : b))
      )

      try {
        let finalFileUrl: string | null = null
        let finalCoverUrl: string = item.coverUrl

        // 1. Upload file and cover
        const formData = new FormData()
        formData.append("file", item.file)
        if (item.coverUrl && item.coverUrl.startsWith("data:image/")) {
          formData.append("cover", item.coverUrl)
        }

        const uploadRes = await adminFetch("/api/admin/books/upload", {
          method: "POST",
          body: formData,
        })
        const uploadData = await uploadRes.json()
        if (!uploadRes.ok || !uploadData.success) {
          throw new Error(uploadData.error || "Gagal mengunggah berkas buku.")
        }
        if (uploadData.fileUrl) finalFileUrl = uploadData.fileUrl
        if (uploadData.coverUrl) finalCoverUrl = uploadData.coverUrl

        const tagsArray = item.tagsInput
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)

        const payload = {
          title: item.title.trim() || item.fileName,
          slug: item.slug.trim() || generateCleanSlug(item.title),
          synopsis:
            item.synopsis.trim() || `Buku ${item.title} tersedia untuk dibaca di perpustakaan digital.`,
          authorName: item.authorName.trim() || "Penulis",
          publisherName: item.publisherName.trim() || "Penerbit",
          categoryId: item.categoryId ? parseInt(item.categoryId, 10) : null,
          publishYear: parseInt(item.publishYear, 10) || 2026,
          pageCount: parseInt(item.pageCount, 10) || 200,
          isbn: "",
          coverUrl: finalCoverUrl.trim(),
          fileUrl: finalFileUrl ? finalFileUrl.trim() : null,
          status: "aktif",
          isFeatured: false,
          pdfAvailable: item.format === "PDF",
          epubAvailable: item.format === "EPUB",
          tags: tagsArray,
          skipIfDuplicate: autoSkipDuplicates,
        }

        const saveRes = await adminFetch("/api/admin/books", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const saveData = await saveRes.json()

        if (!saveRes.ok && !saveData.skipped) {
          throw new Error(saveData.error || "Gagal menyimpan buku ke database.")
        }

        if (saveData.skipped) {
          skippedCount++
          setBatchQueue((prev) =>
            prev.map((b, idx) =>
              idx === i
                ? {
                    ...b,
                    status: "skipped",
                    isDuplicate: true,
                    duplicateReason: saveData.message || "Buku sudah ada di katalog",
                  }
                : b
            )
          )
        } else if (saveData.success) {
          savedCount++
          setBatchQueue((prev) =>
            prev.map((b, idx) => (idx === i ? { ...b, status: "success" } : b))
          )
        } else {
          failCount++
          setBatchQueue((prev) =>
            prev.map((b, idx) =>
              idx === i
                ? { ...b, status: "error", errorMessage: saveData.error || "Gagal menyimpan" }
                : b
            )
          )
        }
      } catch (err: unknown) {
        failCount++
        const msg = err instanceof Error ? err.message : "Kesalahan koneksi"
        setBatchQueue((prev) =>
          prev.map((b, idx) => (idx === i ? { ...b, status: "error", errorMessage: msg } : b))
        )
      }
    }

    setIsProcessing(false)
    setBatchProgress({ current: 0, total: 0, message: "" })
    await fetchAdminData()

    if (savedCount > 0) {
      showSuccess(
        `🎉 Sukses menambahkan ${savedCount} buku ke katalog! ${failCount > 0 ? `(${failCount} gagal)` : ""}`
      )
    }
  }

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Berkas harus berupa gambar (JPG, PNG, atau WebP).")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setBookForm((prev) => ({ ...prev, coverUrl: reader.result as string }))
      }
    }
    reader.readAsDataURL(file)
  }

  const handleAutoCompleteBookInfo = () => {
    const query = (bookForm.title || uploadedBookFile?.name || bookForm.slug || "").trim()
    if (!query) {
      setExtractionStatus("Ketikkan judul buku atau unggah berkas PDF terlebih dahulu untuk melengkapi otomatis.")
      return
    }

    const match = lookupKnownSeries(query, uploadedBookFile?.name)
    if (match) {
      const { series, cleanTitle } = match
      const matchedCat = categoriesList.find(
        (c) =>
          c.slug === series.categorySlug ||
          c.name.toLowerCase().includes(series.categoryName.toLowerCase())
      )

      setBookForm((prev) => ({
        ...prev,
        title: cleanTitle,
        slug: generateCleanSlug(cleanTitle),
        authorName: series.author,
        publisherName: series.publisher,
        publishYear: match.estimatedYear ? String(match.estimatedYear) : (series.firstPublishedYear ? String(series.firstPublishedYear) : prev.publishYear),
        categoryId: matchedCat ? String(matchedCat.id) : prev.categoryId,
        tagsInput: series.tags.join(", "),
        synopsis: series.synopsis,
      }))
      setExtractionStatus(`✨ Berhasil melengkapi informasi & sinopsis resmi: "${series.name}"`)
    } else {
      const cleanSlug = generateCleanSlug(bookForm.title || query)
      setBookForm((prev) => ({
        ...prev,
        slug: cleanSlug || prev.slug,
      }))
      setExtractionStatus(`✨ Format judul & slug diperbarui (${cleanSlug}). Anda dapat mengisi sinopsis dan penulis secara spesifik.`)
    }
  }

  const handleOpenAddBook = () => {
    setEditingBookId(null)
    setBookModalTab("auto")
    setUploadedBookFile(null)
    setIsBatchMode(false)
    setBatchQueue([])
    setBatchProgress({ current: 0, total: 0, message: "" })
    setExtractionStatus("")
    setIsExtractingPdf(false)
    setBookForm({
      title: "",
      slug: "",
      synopsis: "",
      authorName: "",
      publisherName: "",
      categoryId: "",
      publishYear: "",
      pageCount: "",
      isbn: "",
      coverUrl: "",
      format: "PDF",
      status: "aktif",
      isFeatured: false,
      tagsInput: "",
      fileUrl: "",
      fileName: "",
      fileSizeBytes: 0,
    })
    setBookFormErrors({})
    setAllowSingleDuplicate(false)
    setIsBookModalOpen(true)
  }

  const handleOpenEditBook = (book: AdminBookItem) => {
    setEditingBookId(book.id)
    setBookModalTab("manual")
    setUploadedBookFile(null)
    setIsBatchMode(false)
    setBatchQueue([])
    setBatchProgress({ current: 0, total: 0, message: "" })
    setExtractionStatus("")
    setIsExtractingPdf(false)
    setBookForm({
      title: book.title,
      slug: book.slug,
      synopsis: book.synopsis,
      authorName: book.authorName,
      publisherName: book.publisherName,
      categoryId: book.categoryId,
      publishYear: String(book.publishYear),
      pageCount: String(book.pageCount),
      isbn: book.isbn,
      coverUrl: book.coverUrl,
      format: book.formats.pdf.available && book.formats.epub.available ? "BOTH" : book.formats.epub.available ? "EPUB" : "PDF",
      status: book.status,
      isFeatured: book.isFeatured,
      tagsInput: book.tags.join(", "),
      fileUrl: book.fileUrl || "",
      fileName: "",
      fileSizeBytes: 0,
    })
    setBookFormErrors({})
    setAllowSingleDuplicate(false)
    setIsBookModalOpen(true)
  }

  const handleCreateQuickCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickCatForm.name.trim()) {
      setQuickCatError("Nama kategori wajib diisi.")
      return
    }
    setIsQuickCatSubmitting(true)
    setQuickCatError("")
    try {
      const res = await adminFetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: quickCatForm.name.trim(),
          description: quickCatForm.description.trim(),
          iconName: "BookOpen",
        }),
      })
      const data = await res.json()
      if (data.success) {
        const cRes = await adminFetch("/api/admin/categories")
        const cData = await cRes.json()
        if (cData.success && Array.isArray(cData.categories)) {
          setCategoriesList(cData.categories)
        }
        setBookForm((prev) => ({ ...prev, categoryId: String(data.id) }))
        setSaveSuccessMessage(`Kategori "${quickCatForm.name.trim()}" berhasil dibuat & dipilih!`)
        setIsQuickCatOpen(false)
        setQuickCatForm({ name: "", description: "" })
      } else {
        setQuickCatError(data.error || "Gagal membuat kategori baru.")
      }
    } catch {
      setQuickCatError("Terjadi kesalahan jaringan saat membuat kategori.")
    } finally {
      setIsQuickCatSubmitting(false)
    }
  }

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault()
    const errors: Record<string, string> = {}
    if (!bookForm.title.trim()) errors.title = "Judul buku wajib diisi."
    if (!bookForm.authorName.trim()) errors.author = "Nama penulis wajib diisi."
    if (!bookForm.synopsis.trim()) errors.synopsis = "Sinopsis buku wajib diisi."

    if (!editingBookId && duplicateMatch && autoSkipDuplicates && !allowSingleDuplicate) {
      setErrorMessage(
        `Buku serupa sudah terdaftar di katalog: "${duplicateMatch.title}". Fitur Auto-Skip aktif untuk mencegah duplikasi. Centang opsi 'Izinkan Simpan Duplikat' di bawah jika Anda ingin tetap menambahkannya.`
      )
      return
    }

    setIsProcessing(true)
    try {
      let finalFileUrl = bookForm.fileUrl
      let finalCoverUrl = bookForm.coverUrl

      // If user uploaded a new book file or has base64 cover from PDF/image upload
      if (uploadedBookFile || (bookForm.coverUrl && bookForm.coverUrl.startsWith("data:image/"))) {
        const formData = new FormData()
        if (uploadedBookFile) {
          formData.append("file", uploadedBookFile)
        }
        if (bookForm.coverUrl && bookForm.coverUrl.startsWith("data:image/")) {
          formData.append("cover", bookForm.coverUrl)
        }

        const uploadRes = await adminFetch("/api/admin/books/upload", {
          method: "POST",
          body: formData,
        })
        const uploadData = await uploadRes.json()
        if (uploadData.success) {
          if (uploadData.fileUrl) finalFileUrl = uploadData.fileUrl
          if (uploadData.coverUrl) finalCoverUrl = uploadData.coverUrl
        } else {
          console.warn("Upload notice:", uploadData.error)
        }
      }

      const tagsArray = bookForm.tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)

      const payload = {
        title: bookForm.title.trim(),
        slug: bookForm.slug.trim(),
        synopsis: bookForm.synopsis.trim(),
        authorName: bookForm.authorName.trim(),
        publisherName: bookForm.publisherName.trim(),
        categoryId: bookForm.categoryId ? parseInt(bookForm.categoryId, 10) : null,
        publishYear: parseInt(bookForm.publishYear, 10) || 2026,
        pageCount: parseInt(bookForm.pageCount, 10) || 200,
        isbn: bookForm.isbn.trim(),
        coverUrl: finalCoverUrl.trim(),
        fileUrl: finalFileUrl ? finalFileUrl.trim() : null,
        status: bookForm.status,
        isFeatured: bookForm.isFeatured,
        pdfAvailable: bookForm.format === "PDF" || bookForm.format === "BOTH",
        epubAvailable: bookForm.format === "EPUB" || bookForm.format === "BOTH",
        tags: tagsArray,
        allowDuplicate: allowSingleDuplicate,
        skipIfDuplicate: autoSkipDuplicates,
      }

      const url = editingBookId ? `/api/admin/books/${editingBookId}` : "/api/admin/books"
      const method = editingBookId ? "PUT" : "POST"

      const res = await adminFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (data.skipped) {
        setIsBookModalOpen(false)
        showSuccess(data.message || "Buku sudah ada di katalog dan otomatis dilewati.")
        return
      }

      if (data.success) {
        setIsBookModalOpen(false)
        showSuccess(data.message || "Buku berhasil disimpan!")
        fetchAdminData()
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("books-updated"))
          window.dispatchEvent(new Event("tags-updated"))
        }
      } else {
        setErrorMessage(data.error || "Gagal menyimpan buku.")
      }
    } catch {
      setErrorMessage("Terjadi kesalahan jaringan.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleToggleFeatured = async (id: string) => {
    try {
      const res = await adminFetch(`/api/admin/books/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toggleFeatured: true }),
      })
      const data = await res.json()
      if (data.success) {
        setBooksList((prev) =>
          prev.map((b) => (b.id === id ? { ...b, isFeatured: data.isFeatured } : b))
        )
        showSuccess(data.message)
      }
    } catch {
      setErrorMessage("Gagal memperbarui status Pilihan Editor.")
    }
  }

  const handleDeleteBook = (id: string, title: string) => {
    setDeleteModal({
      isOpen: true,
      title: "Hapus Buku dari Katalog",
      description: "Apakah Anda yakin ingin menghapus buku ini secara permanen dari basis data perpustakaan digital?",
      itemName: title,
      itemType: "Buku",
      onConfirm: async () => {
        try {
          const res = await adminFetch(`/api/admin/books/${id}`, { method: "DELETE" })
          const data = await res.json()
          if (data.success) {
            setBooksList((prev) => prev.filter((b) => b.id !== id))
            showSuccess(data.message || "Buku berhasil dihapus.")
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("books-updated"))
              window.dispatchEvent(new Event("tags-updated"))
            }
          } else {
            setErrorMessage(data.error || "Gagal menghapus buku.")
          }
        } catch {
          setErrorMessage("Gagal menghapus buku.")
        }
      },
    })
  }

  // --- CATEGORY ACTIONS ---
  const handleOpenAddCategory = () => {
    setEditingCategoryId(null)
    setCategoryForm({ name: "", slug: "", iconName: "Brain", description: "" })
    setIsCategoryModalOpen(true)
  }

  const handleOpenEditCategory = (cat: CategoryItem) => {
    setEditingCategoryId(cat.id)
    setCategoryForm({
      name: cat.name,
      slug: cat.slug,
      iconName: cat.iconName || "BookOpen",
      description: cat.description || "",
    })
    setIsCategoryModalOpen(true)
  }

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryForm.name.trim()) return

    setIsProcessing(true)
    try {
      const url = editingCategoryId ? `/api/admin/categories/${editingCategoryId}` : "/api/admin/categories"
      const method = editingCategoryId ? "PUT" : "POST"

      const res = await adminFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categoryForm),
      })
      const data = await res.json()

      if (data.success) {
        setIsCategoryModalOpen(false)
        showSuccess(data.message || "Kategori berhasil disimpan!")
        fetchAdminData()
      } else {
        setErrorMessage(data.error || "Gagal menyimpan kategori.")
      }
    } catch {
      setErrorMessage("Terjadi kesalahan jaringan.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeleteCategory = (id: number, name: string) => {
    setDeleteModal({
      isOpen: true,
      title: "Hapus Kategori",
      description: "Hapus kategori ini? Seluruh buku yang terhubung pada kategori ini akan otomatis dialihkan ke kategori default.",
      itemName: name,
      itemType: "Kategori",
      onConfirm: async () => {
        try {
          const res = await adminFetch(`/api/admin/categories/${id}`, { method: "DELETE" })
          const data = await res.json()
          if (data.success) {
            showSuccess(data.message)
            fetchAdminData()
          } else {
            setErrorMessage(data.error || "Gagal menghapus kategori.")
          }
        } catch {
          setErrorMessage("Gagal menghapus kategori.")
        }
      },
    })
  }

  // --- TAG ACTIONS ---
  const handleOpenAddTag = () => {
    setEditingTagId(null)
    setTagForm({ name: "", slug: "" })
    setIsTagModalOpen(true)
  }

  const handleOpenEditTag = (tag: TagItem) => {
    setEditingTagId(tag.id)
    setTagForm({ name: tag.name, slug: tag.slug })
    setIsTagModalOpen(true)
  }

  const handleSaveTag = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tagForm.name.trim()) return

    setIsProcessing(true)
    try {
      const url = editingTagId ? `/api/admin/tags/${editingTagId}` : "/api/admin/tags"
      const method = editingTagId ? "PUT" : "POST"

      const res = await adminFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tagForm),
      })
      const data = await res.json()

      if (data.success) {
        setIsTagModalOpen(false)
        showSuccess(data.message || "Tag berhasil disimpan!")
        fetchAdminData()
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("tags-updated"))
        }
      } else {
        setErrorMessage(data.error || "Gagal menyimpan tag.")
      }
    } catch {
      setErrorMessage("Terjadi kesalahan jaringan.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeleteTag = (id: number, name: string) => {
    setDeleteModal({
      isOpen: true,
      title: "Hapus Tag Topik",
      description: "Apakah Anda yakin ingin menghapus tag topik ini dari basis data perpustakaan?",
      itemName: name,
      itemType: "Tag Topik",
      onConfirm: async () => {
        try {
          const res = await adminFetch(`/api/admin/tags/${id}`, { method: "DELETE" })
          const data = await res.json()
          if (data.success) {
            showSuccess(data.message)
            fetchAdminData()
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("tags-updated"))
            }
          } else {
            setErrorMessage(data.error || "Gagal menghapus tag.")
          }
        } catch {
          setErrorMessage("Gagal menghapus tag.")
        }
      },
    })
  }

  // --- ARTICLE / BLOG ACTIONS ---
  const handleOpenAddArticle = () => {
    setEditingArticle(null)
    setArticleForm({
      title: "",
      slug: "",
      thumbnailUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&auto=format&fit=crop&q=80",
      excerpt: "",
      content: "",
      authorName: user?.name || "Pustakawan RSJD",
      readTime: "4 menit baca",
      category: "Tips Kesehatan Jiwa",
    })
    setArticleModalError("")
    setIsArticleModalOpen(true)
  }

  const handleOpenEditArticle = (art: AdminArticleItem) => {
    setEditingArticle(art)
    setArticleForm({
      title: art.title,
      slug: art.slug,
      thumbnailUrl: art.thumbnailUrl || "",
      excerpt: art.excerpt,
      content: art.content || "",
      authorName: art.authorName,
      readTime: art.readTime || "4 menit baca",
      category: art.category || "Tips Kesehatan Jiwa",
    })
    setArticleModalError("")
    setIsArticleModalOpen(true)
  }

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!articleForm.title.trim()) {
      setArticleModalError("Judul artikel wajib diisi.")
      return
    }
    if (!articleForm.excerpt.trim()) {
      setArticleModalError("Ringkasan / excerpt artikel wajib diisi.")
      return
    }

    setIsArticleSubmitting(true)
    setArticleModalError("")

    try {
      if (editingArticle) {
        const res = await adminFetch(`/api/admin/articles/${editingArticle.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(articleForm),
        })
        const data = await res.json()
        if (data.success && data.article) {
          setArticlesList((prev) =>
            prev.map((a) => (a.id === editingArticle.id ? data.article : a))
          )
          setIsArticleModalOpen(false)
          showSuccess(data.message || "Artikel edukasi berhasil diperbarui!")
        } else {
          setArticleModalError(data.error || "Gagal memperbarui artikel.")
        }
      } else {
        const res = await adminFetch("/api/admin/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(articleForm),
        })
        const data = await res.json()
        if (data.success && data.article) {
          setArticlesList((prev) => [data.article, ...prev])
          setIsArticleModalOpen(false)
          showSuccess(data.message || "Artikel edukasi berhasil diterbitkan!")
        } else {
          setArticleModalError(data.error || "Gagal menerbitkan artikel baru.")
        }
      }
    } catch {
      setArticleModalError("Terjadi kesalahan jaringan saat menyimpan artikel.")
    } finally {
      setIsArticleSubmitting(false)
    }
  }

  const handleConfirmDeleteArticle = async () => {
    if (!deleteArticleModalItem) return
    setIsProcessing(true)
    try {
      const res = await adminFetch(`/api/admin/articles/${deleteArticleModalItem.id}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (data.success) {
        setArticlesList((prev) => prev.filter((a) => a.id !== deleteArticleModalItem.id))
        setDeleteArticleModalItem(null)
        showSuccess(data.message || "Artikel berhasil dihapus.")
      } else {
        setErrorMessage(data.error || "Gagal menghapus artikel.")
      }
    } catch {
      setErrorMessage("Terjadi kesalahan saat menghapus artikel.")
    } finally {
      setIsProcessing(false)
    }
  }

  // --- USER ACTIONS ---
  const handleToggleUserVerification = async (u: UserItem) => {
    if (u.role !== "member" && !isSuperAdmin) {
      setErrorMessage("Hanya Super Administrator yang berhak mengubah status verifikasi pengelola.")
      return
    }
    try {
      const res = await adminFetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVerified: !u.isVerified }),
      })
      const data = await res.json()
      if (data.success) {
        setUsersList((prev) =>
          prev.map((item) => (item.id === u.id ? { ...item, isVerified: !u.isVerified } : item))
        )
        showSuccess(data.message)
      } else {
        setErrorMessage(data.error || "Gagal mengubah status verifikasi.")
      }
    } catch {
      setErrorMessage("Gagal memperbarui pengguna.")
    }
  }

  const handleToggleUserActive = async (u: UserItem) => {
    if (u.role === "super_admin") {
      setErrorMessage("Akun Super Administrator dilindungi dan tidak dapat dinonaktifkan.")
      return
    }
    if (u.role !== "member" && !isSuperAdmin) {
      setErrorMessage("Hanya Super Administrator yang berhak mengubah status akun pengelola.")
      return
    }
    try {
      const res = await adminFetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !u.isActive }),
      })
      const data = await res.json()
      if (data.success) {
        setUsersList((prev) =>
          prev.map((item) => (item.id === u.id ? { ...item, isActive: !u.isActive } : item))
        )
        showSuccess(data.message)
      } else {
        setErrorMessage(data.error || "Gagal mengubah status aktif.")
      }
    } catch {
      setErrorMessage("Gagal memperbarui pengguna.")
    }
  }

  const handleSaveUserRole = async () => {
    if (!roleModalUser) return
    setIsProcessing(true)
    try {
      const res = await adminFetch(`/api/admin/users/${roleModalUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedNewRole }),
      })
      const data = await res.json()
      if (data.success) {
        const isNowVerified = selectedNewRole === "member" ? false : true
        setUsersList((prev) =>
          prev.map((item) =>
            item.id === roleModalUser.id
              ? { ...item, role: selectedNewRole, isVerified: isNowVerified }
              : item
          )
        )
        setRoleModalUser(null)
        showSuccess(data.message)
      } else {
        setErrorMessage(data.error || "Gagal mengubah peran.")
      }
    } catch {
      setErrorMessage("Gagal mengubah peran pengguna.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeleteUser = async (u: UserItem) => {
    if (u.id === user?.id) {
      setErrorMessage("Anda tidak dapat menghapus akun Anda sendiri.")
      return
    }
    if (u.role === "super_admin") {
      setErrorMessage("Akun Super Administrator dilindungi sistem dan tidak dapat dihapus.")
      return
    }
    if (u.role !== "member" && !isSuperAdmin) {
      setErrorMessage("Hanya Super Administrator yang berhak menghapus akun administrator.")
      return
    }
    setDeleteModal({
      isOpen: true,
      title: "Hapus Akun Pengguna",
      description: `Apakah Anda yakin ingin menghapus akun '${u.name}' (${u.email}) secara permanen? Seluruh data riwayat peminjaman dan preferensi akun ini akan dibersihkan.`,
      itemName: `${u.name} (${u.email})`,
      itemType: "Pengguna",
      onConfirm: async () => {
        try {
          const res = await adminFetch(`/api/admin/users/${u.id}`, { method: "DELETE" })
          const data = await res.json()
          if (data.success) {
            setUsersList((prev) => prev.filter((item) => item.id !== u.id))
            showSuccess(data.message)
          } else {
            setErrorMessage(data.error || "Gagal menghapus pengguna.")
          }
        } catch {
          setErrorMessage("Gagal menghapus pengguna.")
        }
      },
    })
  }

  // --- SUPER ADMIN: ADMIN TEAM MANAGEMENT ACTIONS ---
  const generateRandomPassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*"
    let pass = ""
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return pass
  }

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAdminForm.name.trim()) {
      setAddAdminError("Nama lengkap wajib diisi.")
      return
    }
    if (!newAdminForm.email.trim() || !newAdminForm.email.includes("@")) {
      setAddAdminError("Alamat email tidak valid.")
      return
    }
    if (!newAdminForm.password || newAdminForm.password.length < 6) {
      setAddAdminError("Kata sandi minimal 6 karakter.")
      return
    }

    setIsProcessing(true)
    setAddAdminError("")

    try {
      const res = await adminFetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAdminForm),
      })
      const data = await res.json()
      if (data.success && data.user) {
        setUsersList((prev) => [data.user, ...prev])
        setIsAddAdminModalOpen(false)
        setNewAdminForm({
          name: "",
          email: "",
          password: "",
          role: "admin",
          nik: "",
          phone: "",
          institution: "Pustakawan RSJD",
          isVerified: true,
        })
        showSuccess(data.message || "Akun pengelola baru berhasil dibuat!")
      } else {
        setAddAdminError(data.error || "Gagal membuat akun administrator.")
      }
    } catch {
      setAddAdminError("Terjadi kesalahan jaringan saat membuat akun.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetPasswordModalUser) return
    if (!newResetPassword || newResetPassword.length < 6) {
      setResetPasswordError("Kata sandi baru minimal 6 karakter.")
      return
    }

    setIsProcessing(true)
    setResetPasswordError("")

    try {
      const res = await adminFetch(`/api/admin/users/${resetPasswordModalUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetPassword: newResetPassword }),
      })
      const data = await res.json()
      if (data.success) {
        setResetPasswordModalUser(null)
        setNewResetPassword("")
        showSuccess(data.message || "Kata sandi berhasil diperbarui!")
      } else {
        setResetPasswordError(data.error || "Gagal mereset kata sandi.")
      }
    } catch {
      setResetPasswordError("Terjadi kesalahan jaringan saat mereset kata sandi.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleTransferOwnership = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!transferOwnerModalUser) return
    if (!transferAgreed) {
      setTransferError("Anda wajib mencentang persetujuan pemindahan hak kepemilikan.")
      return
    }
    if (!transferPassword.trim()) {
      setTransferError("Kata sandi akun Anda wajib diisi untuk verifikasi keamanan.")
      return
    }

    setIsProcessing(true)
    setTransferError("")

    try {
      const res = await adminFetch("/api/admin/transfer-ownership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: transferOwnerModalUser.id,
          password: transferPassword,
        }),
      })
      const data = await res.json()
      if (data.success) {
        showSuccess(data.message || "Kepemilikan Super Administrator berhasil dialihkan!")
        setTransferOwnerModalUser(null)
        setTransferPassword("")
        setTransferAgreed(false)
        // Refresh & reload to apply new role
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        setTransferError(data.error || "Gagal mentransfer kepemilikan.")
      }
    } catch {
      setTransferError("Terjadi kesalahan jaringan saat memproses transfer.")
    } finally {
      setIsProcessing(false)
    }
  }

  // --- LOAN ACTIONS ---
  const handleMarkLoanReturned = async (loanId: number) => {
    try {
      const res = await adminFetch("/api/admin/loans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: loanId, status: "kembali" }),
      })
      const data = await res.json()
      if (data.success) {
        setLoansList((prev) =>
          prev.map((l) => (l.id === loanId ? { ...l, status: "kembali" } : l))
        )
        showSuccess(data.message || "Peminjaman ditandai telah kembali.")
      }
    } catch {
      setErrorMessage("Gagal memperbarui status peminjaman.")
    }
  }

  const handleExtendLoan = async (loanId: number) => {
    try {
      const res = await adminFetch("/api/admin/loans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: loanId, action: "extend" }),
      })
      const data = await res.json()
      if (data.success) {
        showSuccess(data.message || "Masa peminjaman berhasil diperpanjang 7 hari!")
        fetchAdminData()
      } else {
        setErrorMessage(data.error || "Gagal memperpanjang masa pinjam.")
      }
    } catch {
      setErrorMessage("Gagal memperpanjang masa peminjaman.")
    }
  }

  const handleDeleteLoan = (loan: LoanItem) => {
    setDeleteModal({
      isOpen: true,
      title: "Hapus Catatan Peminjaman",
      description: "Apakah Anda yakin ingin menghapus catatan sirkulasi peminjaman ini secara permanen dari basis data?",
      itemName: `"${loan.bookTitle}" (Peminjam: ${loan.userName})`,
      itemType: "Peminjaman",
      onConfirm: async () => {
        try {
          const res = await adminFetch(`/api/admin/loans?id=${loan.id}`, { method: "DELETE" })
          const data = await res.json()
          if (data.success) {
            setLoansList((prev) => prev.filter((l) => l.id !== loan.id))
            try {
              const LOCAL_STORAGE_LOANS_KEY = "rsjd_user_loans_v1"
              const saved = localStorage.getItem(LOCAL_STORAGE_LOANS_KEY)
              if (saved) {
                const list = JSON.parse(saved)
                const updated = list.filter(
                  (l: { id: string | number; bookId?: string | number }) =>
                    String(l.id) !== String(loan.id) &&
                    String(l.bookId) !== String(loan.bookId)
                )
                localStorage.setItem(LOCAL_STORAGE_LOANS_KEY, JSON.stringify(updated))
              }
              window.dispatchEvent(new Event("loans-updated"))
            } catch {}
            showSuccess(data.message || "Catatan peminjaman berhasil dihapus.")
          } else {
            setErrorMessage(data.error || "Gagal menghapus catatan peminjaman.")
          }
        } catch {
          setErrorMessage("Terjadi kesalahan jaringan.")
        }
      },
    })
  }

  // --- SETTINGS ACTIONS ---
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    const daysNum = Number(maxLoanDays)
    if (isNaN(daysNum) || daysNum < 1 || daysNum > 30) {
      setErrorMessage("Durasi peminjaman standar harus berada di antara 1 sampai 30 hari.")
      return
    }
    setIsProcessing(true)
    try {
      const res = await adminFetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settingKey: "max_loan_days", settingValue: daysNum }),
      })
      const data = await res.json()
      if (data.success) {
        showSuccess("Pengaturan masa pinjam berhasil disimpan!")
      } else {
        setErrorMessage(data.error || "Gagal menyimpan pengaturan.")
      }
    } catch {
      setErrorMessage("Gagal menyimpan pengaturan.")
    } finally {
      setIsProcessing(false)
    }
  }

  const filteredBooks = booksList.filter((b) => {
    const matchSearch =
      b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.authorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.isbn.toLowerCase().includes(searchTerm.toLowerCase())
    const matchCat = bookCategoryFilter === "all" || b.categoryId === bookCategoryFilter
    return matchSearch && matchCat
  })

  const filteredLoans = loansList.filter((l) => {
    const matchSearch =
      !loanSearch.trim() ||
      l.bookTitle.toLowerCase().includes(loanSearch.toLowerCase()) ||
      l.userName.toLowerCase().includes(loanSearch.toLowerCase()) ||
      l.userEmail.toLowerCase().includes(loanSearch.toLowerCase()) ||
      (l.userNik && l.userNik.includes(loanSearch.trim()))
    const matchStatus = loanStatusFilter === "all" || l.status === loanStatusFilter
    return matchSearch && matchStatus
  })

  const filteredUsers = usersList.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.nik && u.nik.includes(searchTerm)) ||
      (u.institution && u.institution.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchRole = userRoleFilter === "all" || u.role === userRoleFilter
    return matchSearch && matchRole
  })

  const adminTeamMembers = React.useMemo(() => {
    return usersList.filter((u) => u.role === "admin" || u.role === "super_admin")
  }, [usersList])

  const filteredAdminTeam = React.useMemo(() => {
    return adminTeamMembers.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.nik && u.nik.includes(searchTerm)) ||
        (u.institution && u.institution.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchRole = adminRoleFilter === "all" || u.role === adminRoleFilter
      return matchSearch && matchRole
    })
  }, [adminTeamMembers, searchTerm, adminRoleFilter])

  const filteredArticles = React.useMemo(() => {
    return articlesList.filter((a) => {
      const q = articleSearch.toLowerCase().trim()
      const matchSearch =
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.authorName.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
      const matchCat = articleCategoryFilter === "all" || a.category === articleCategoryFilter
      return matchSearch && matchCat
    })
  }, [articlesList, articleSearch, articleCategoryFilter])

  // Access Guard
  if (isGuest || (user?.role !== "admin" && user?.role !== "super_admin")) {
    return (
      <div className="min-h-[82vh] flex items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl border border-destructive/30 bg-card text-center space-y-5 shadow-xl">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mx-auto">
            <Shield className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <Badge variant="outline" className="border-destructive/30 text-destructive text-xs">
              <Lock className="h-3 w-3 mr-1" />
              <span>Akses Terbatas Administrator</span>
            </Badge>
            <h2 className="font-heading text-xl font-bold text-foreground">
              Panel Pengelola Perpustakaan RSJD
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Halaman ini hanya dapat diakses oleh Pustakawan dan Administrator resmi RSJD Atma Husada Mahakam.
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Link href={isGuest ? "/masuk?redirect=/admin" : "/buku"}>
              <Button className="w-full h-10 rounded-xl bg-sky-600 hover:bg-sky-500 font-bold text-xs text-white">
                {isGuest ? "Masuk Akun Pengelola" : "Kembali ke Katalog"}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/20 text-foreground flex flex-col">
      {/* TOPBAR KHUSUS ADMIN PORTAL */}
      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-card/90 backdrop-blur-md shadow-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          {/* Brand & Database Status */}
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-2.5 group">
              <div className="relative h-9 w-9 rounded-xl bg-white p-0.5 ring-1 ring-border shadow-2xs flex items-center justify-center shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="Logo RSJD" className="h-full w-full object-contain" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="font-heading text-base font-black tracking-tight text-foreground">
                    Perpus<span className="text-primary">AHM</span>
                  </span>
                  <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0 rounded-md border-primary/30 text-primary bg-primary/5">
                    Admin
                  </Badge>
                </div>
                <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
                  RSJD Atma Husada Mahakam
                </span>
              </div>
            </Link>

            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-border/60">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">MariaDB Terhubung</span>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-8 w-8 p-0 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
              title="Ganti Tema (Gelap / Terang)"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-sky-400" />
              <span className="sr-only">Ganti Tema</span>
            </Button>

            <div className="h-4 w-px bg-border mx-0.5 hidden sm:block" />

            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8 rounded-xl border border-border bg-muted/30">
                <AvatarImage src={user?.avatarUrl || ""} alt={user?.name || "Admin"} />
                <AvatarFallback className="text-[11px] font-bold bg-primary/10 text-primary">
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : "AD"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col text-left leading-none">
                <span className="text-xs font-bold text-foreground truncate max-w-[130px]">
                  {user?.name || "dr. Admin"}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5 capitalize">
                  {user?.role === "super_admin" ? "Super Admin" : "Pustakawan"}
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                logout()
                router.push("/masuk")
              }}
              className="h-8 w-8 p-0 sm:h-8 sm:w-auto sm:px-2.5 text-xs rounded-xl text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 gap-1.5 cursor-pointer"
              title="Keluar dari Akun Admin"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </Button>
          </div>
        </div>
      </header>

      {/* MAIN ADMIN DASHBOARD CONTENT */}
      <main className="flex-1 py-6 sm:py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          
          {/* HEADER & PROFILE BADGE */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-3xl border border-border shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
                  Panel Kontrol Perpustakaan Digital
                </h1>
                {isSuperAdmin ? (
                  <Badge className="bg-purple-600 hover:bg-purple-600 text-white text-[10px] gap-1 px-2 py-0.5 shadow-xs">
                    <Crown className="h-3 w-3" />
                    <span>Super Admin</span>
                  </Badge>
                ) : (
                  <Badge className="bg-sky-600 hover:bg-sky-600 text-white text-[10px] gap-1 px-2 py-0.5">
                    <Shield className="h-3 w-3" />
                    <span>Admin Pustakawan</span>
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                RSJD Atma Husada Mahakam &bull; Terhubung Langsung ke Basis Data MariaDB Resmi
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAdminData}
                disabled={isLoadingData}
                className="w-full sm:w-40 h-9 px-3 text-xs font-semibold rounded-xl gap-1.5 cursor-pointer justify-center whitespace-nowrap shadow-xs"
              >
                <RefreshCw className={cn("h-3.5 w-3.5 shrink-0", isLoadingData && "animate-spin")} />
                <span className="truncate">Segarkan Data</span>
              </Button>
              <Link href="/buku" target="_blank" className="w-full sm:w-auto block">
                <Button variant="outline" size="sm" className="w-full sm:w-40 h-9 px-3 text-xs font-semibold rounded-xl gap-1.5 cursor-pointer justify-center whitespace-nowrap shadow-xs">
                  <BookOpen className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                  <span className="truncate">Katalog Publik</span>
                </Button>
              </Link>
            </div>
          </div>

        {/* TOP SUMMARY STATS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-2xs flex items-center justify-between">
            <div>
              <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
                {booksList.length}
              </h2>
              <span className="text-[11px] text-muted-foreground font-medium">Buku di Database</span>
            </div>
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-2xs flex items-center justify-between">
            <div>
              <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
                {categoriesList.length}
              </h2>
              <span className="text-[11px] text-muted-foreground font-medium">Kategori Aktif</span>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <FolderTree className="h-5 w-5" />
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-2xs flex items-center justify-between">
            <div>
              <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
                {usersList.length}
              </h2>
              <span className="text-[11px] text-muted-foreground font-medium">Total Akun Terdaftar</span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Users className="h-5 w-5" />
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-2xs flex items-center justify-between">
            <div>
              <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
                {loansList.filter((l) => l.status === "aktif").length}
              </h2>
              <span className="text-[11px] text-muted-foreground font-medium">Peminjaman Berjalan</span>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <BookMarked className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* FEEDBACK ALERTS */}
        {saveSuccessMessage && (
          <div className="animate-fade-in p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{saveSuccessMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setSaveSuccessMessage("")}
              className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="animate-fade-in p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage("")}
              className="p-1 hover:bg-destructive/20 rounded cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* MAIN NAVIGATION TABS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex lg:flex-wrap items-center gap-2 border-b border-border pb-3.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setActiveTab("buku"); setSearchTerm("") }}
            className={cn(
              "flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl transition-all truncate cursor-pointer whitespace-nowrap shadow-xs",
              activeTab === "buku"
                ? "bg-sky-600 text-white shadow-xs font-bold border border-sky-600"
                : "text-muted-foreground hover:text-foreground hover:bg-muted bg-muted/40 border border-border/70 font-medium"
            )}
          >
            <BookOpen className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Buku ({booksList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab("kategori"); setSearchTerm("") }}
            className={cn(
              "flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl transition-all truncate cursor-pointer whitespace-nowrap shadow-xs",
              activeTab === "kategori"
                ? "bg-sky-600 text-white shadow-xs font-bold border border-sky-600"
                : "text-muted-foreground hover:text-foreground hover:bg-muted bg-muted/40 border border-border/70 font-medium"
            )}
          >
            <FolderTree className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Kategori ({categoriesList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab("tag"); setSearchTerm("") }}
            className={cn(
              "flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl transition-all truncate cursor-pointer whitespace-nowrap shadow-xs",
              activeTab === "tag"
                ? "bg-sky-600 text-white shadow-xs font-bold border border-sky-600"
                : "text-muted-foreground hover:text-foreground hover:bg-muted bg-muted/40 border border-border/70 font-medium"
            )}
          >
            <Tag className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Tag Topik ({tagsList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab("artikel"); setSearchTerm("") }}
            className={cn(
              "flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl transition-all truncate cursor-pointer whitespace-nowrap shadow-xs",
              activeTab === "artikel"
                ? "bg-sky-600 text-white shadow-xs font-bold border border-sky-600"
                : "text-muted-foreground hover:text-foreground hover:bg-muted bg-muted/40 border border-border/70 font-medium"
            )}
          >
            <Newspaper className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Blog ({articlesList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab("pengguna"); setSearchTerm("") }}
            className={cn(
              "flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl transition-all truncate cursor-pointer whitespace-nowrap shadow-xs",
              activeTab === "pengguna"
                ? "bg-sky-600 text-white shadow-xs font-bold border border-sky-600"
                : "text-muted-foreground hover:text-foreground hover:bg-muted bg-muted/40 border border-border/70 font-medium"
            )}
          >
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Pengguna ({usersList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab("peminjam"); setSearchTerm("") }}
            className={cn(
              "flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl transition-all truncate cursor-pointer whitespace-nowrap shadow-xs",
              activeTab === "peminjam"
                ? "bg-sky-600 text-white shadow-xs font-bold border border-sky-600"
                : "text-muted-foreground hover:text-foreground hover:bg-muted bg-muted/40 border border-border/70 font-medium"
            )}
          >
            <BookMarked className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Peminjaman ({loansList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab("laporan"); setSearchTerm("") }}
            className={cn(
              "flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl transition-all truncate cursor-pointer whitespace-nowrap shadow-xs relative",
              activeTab === "laporan"
                ? "bg-sky-600 text-white shadow-xs font-bold border border-sky-600"
                : "text-muted-foreground hover:text-foreground hover:bg-muted bg-muted/40 border border-border/70 font-medium"
            )}
          >
            <AlertTriangle className={cn("h-3.5 w-3.5 shrink-0", reportsList.some(r => r.status === "baru") && "text-amber-500")} />
            <span className="truncate">Laporan ({reportsList.length})</span>
            {reportsList.filter(r => r.status === "baru").length > 0 && (
              <span className="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold shrink-0">
                {reportsList.filter(r => r.status === "baru").length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("pengaturan")}
            className={cn(
              "flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl transition-all truncate cursor-pointer whitespace-nowrap shadow-xs",
              activeTab === "pengaturan"
                ? "bg-sky-600 text-white shadow-xs font-bold border border-sky-600"
                : "text-muted-foreground hover:text-foreground hover:bg-muted bg-muted/40 border border-border/70 font-medium"
            )}
          >
            <Settings className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Pengaturan</span>
          </button>

          {/* TAB: TIM ADMIN (KHUSUS SUPER ADMIN) */}
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => { setActiveTab("tim-admin"); setSearchTerm("") }}
              className={cn(
                "col-span-2 sm:col-span-4 lg:col-span-1 flex items-center justify-center gap-1.5 h-10 px-3.5 rounded-xl transition-all truncate cursor-pointer whitespace-nowrap shadow-xs",
                activeTab === "tim-admin"
                  ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-600 text-white shadow-xs font-bold border border-purple-500/60"
                  : "text-purple-600 dark:text-purple-400 hover:text-purple-700 hover:bg-purple-500/10 font-semibold border border-purple-300/60 dark:border-purple-800/60 bg-purple-500/5"
              )}
            >
              <Crown className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Kelola Tim Admin ({adminTeamMembers.length})</span>
            </button>
          )}
        </div>

        {/* ================================================================= */}
        {/* TAB 1: MANAJEMEN BUKU */}
        {/* ================================================================= */}
        {activeTab === "buku" && (
          <div className="space-y-4 animate-fade-in">
            {/* Search, Filter & Add Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1 max-w-xl">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Masukkan kata kunci pencarian (judul, penulis, ISBN)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9.5 rounded-xl text-xs bg-card border-border"
                  />
                </div>
                <Select value={bookCategoryFilter} onValueChange={setBookCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-56 h-9.5 rounded-xl bg-card border-border text-xs font-medium">
                    <SelectValue placeholder="--- Semua Kategori ---" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border bg-popover text-xs max-h-72">
                    <SelectItem value="all">Semua Kategori</SelectItem>
                    {categoriesList.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleOpenAddBook}
                className="w-full sm:w-auto h-9.5 px-4 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white gap-2 shadow-xs cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Tambah Buku Baru</span>
              </Button>
            </div>

            {/* Books Container: Desktop Table & Mobile Cards */}
            <div className="rounded-2xl border border-border bg-card shadow-2xs overflow-hidden">
              {/* DESKTOP TABLE (hidden md:block) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="p-3.5">Judul Buku</th>
                      <th className="p-3.5">Kategori</th>
                      <th className="p-3.5">Penulis</th>
                      <th className="p-3.5 text-center">Format</th>
                      <th className="p-3.5 text-center">Pilihan</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredBooks.map((book) => (
                      <tr key={book.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <img
                              src={book.coverUrl}
                              alt=""
                              className="h-10 w-7.5 object-cover rounded shadow-2xs shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="font-bold text-foreground line-clamp-1">
                                {book.title}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                /{book.slug}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/50 dark:border-sky-800/50">
                            {book.categoryName}
                          </span>
                        </td>

                        <td className="p-3.5 text-muted-foreground font-medium">
                          {book.authorName}
                        </td>

                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {book.formats.pdf.available && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400">
                                PDF
                              </span>
                            )}
                            {book.formats.epub.available && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400">
                                EPUB
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center">
                            <Switch
                              checked={book.isFeatured}
                              onCheckedChange={() => handleToggleFeatured(book.id)}
                              title={book.isFeatured ? "Buku Pilihan (Aktif)" : "Bukan Pilihan"}
                              className="cursor-pointer"
                            />
                          </div>
                        </td>

                        <td className="p-3.5 text-center">
                          <Badge
                            className={cn(
                              "text-[10px] px-2 py-0.5 font-bold",
                              book.status === "aktif"
                                ? "bg-emerald-600/90 text-white"
                                : "bg-neutral-500/80 text-white"
                            )}
                          >
                            {book.status === "aktif" ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </td>

                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Link
                              href={`/buku/${book.slug}`}
                              target="_blank"
                              className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
                              title="Lihat Halaman Buku (Tab Baru)"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenEditBook(book)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg cursor-pointer"
                              title="Edit Buku"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteBook(book.id, book.title)}
                              className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                              title="Hapus Buku"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS (block md:hidden) */}
              <div className="block md:hidden divide-y divide-border">
                {filteredBooks.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    Tidak ada buku yang cocok dengan pencarian atau filter.
                  </div>
                ) : (
                  filteredBooks.map((book) => (
                    <div key={book.id} className="p-4 space-y-3 bg-card hover:bg-muted/10 transition-colors">
                      <div className="flex items-start gap-3">
                        <img
                          src={book.coverUrl}
                          alt=""
                          className="h-20 w-14 object-cover rounded-xl shadow-xs shrink-0 ring-1 ring-border"
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <h4 className="font-bold text-sm text-foreground line-clamp-2 leading-tight">
                            {book.title}
                          </h4>
                          <p className="text-xs text-muted-foreground line-clamp-1">{book.authorName}</p>
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/50 dark:border-sky-800/50">
                              {book.categoryName}
                            </span>
                            {book.formats.pdf.available && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400">
                                PDF
                              </span>
                            )}
                            {book.formats.epub.available && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400">
                                EPUB
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground font-medium">Pilihan:</span>
                            <Switch
                              size="sm"
                              checked={book.isFeatured}
                              onCheckedChange={() => handleToggleFeatured(book.id)}
                              className="cursor-pointer"
                            />
                          </div>
                          <Badge
                            className={cn(
                              "text-[9px] px-1.5 py-0 font-bold",
                              book.status === "aktif"
                                ? "bg-emerald-600/90 text-white"
                                : "bg-neutral-500/80 text-white"
                            )}
                          >
                            {book.status === "aktif" ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-1">
                          <Link
                            href={`/buku/${book.slug}`}
                            target="_blank"
                            className="h-7.5 w-7.5 flex items-center justify-center rounded-lg text-muted-foreground hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
                            title="Lihat Halaman Buku"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEditBook(book)}
                            className="h-7.5 px-2.5 text-xs rounded-lg gap-1 border-border text-foreground hover:bg-muted cursor-pointer"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>Edit</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteBook(book.id, book.title)}
                            className="h-7.5 w-7.5 p-0 text-destructive/70 hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: KATEGORI */}
        {/* ================================================================= */}
        {activeTab === "kategori" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-heading text-sm font-bold text-foreground">
                  Daftar Kategori Literatur
                </h3>
                <p className="text-xs text-muted-foreground">
                  Kelola kategori pengelompokan e-book yang tampil di navigasi katalog publik.
                </p>
              </div>
              <Button
                onClick={handleOpenAddCategory}
                className="h-9 px-3.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tambah Kategori</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categoriesList.map((cat) => (
                <div
                  key={cat.id}
                  className="p-4 rounded-2xl border border-border bg-card shadow-2xs flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8.5 w-8.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-xs">
                        <FolderTree className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-foreground line-clamp-1">
                          {cat.name}
                        </h4>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          /{cat.slug}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-muted/40 shrink-0">
                      {cat.bookCount} Buku
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {cat.description || "Tidak ada deskripsi."}
                  </p>

                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border/60">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEditCategory(cat)}
                      className="h-7.5 px-2.5 text-xs rounded-lg gap-1 cursor-pointer"
                    >
                      <Edit3 className="h-3 w-3" />
                      <span>Edit</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      className="h-7.5 px-2.5 text-xs rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Hapus</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: TAG TOPIK */}
        {/* ================================================================= */}
        {activeTab === "tag" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-heading text-sm font-bold text-foreground">
                  Daftar Tag Kata Kunci
                </h3>
                <p className="text-xs text-muted-foreground">
                  Tag digunakan pembaca untuk menelusuri topik spesifik buku digital.
                </p>
              </div>
              <Button
                onClick={handleOpenAddTag}
                className="h-9 px-3.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tambah Tag</span>
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 p-4 rounded-2xl border border-border bg-card shadow-2xs">
              {tagsList.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/40 border border-border text-xs group hover:border-sky-300 dark:hover:border-sky-800 transition-colors"
                >
                  <Tag className="h-3 w-3 text-sky-600" />
                  <span className="font-medium text-foreground">{t.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-background font-mono text-muted-foreground">
                    {t.usageCount}
                  </span>
                  <div className="flex items-center gap-0.5 ml-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditTag(t)}
                      className="p-1 text-muted-foreground hover:text-foreground rounded cursor-pointer"
                      title="Edit Tag"
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTag(t.id, t.name)}
                      className="p-1 text-destructive/70 hover:text-destructive rounded cursor-pointer"
                      title="Hapus Tag"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB: BLOG & EDUKASI */}
        {/* ================================================================= */}
        {activeTab === "artikel" && (
          <div className="space-y-4 animate-fade-in">
            {/* Header & Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-heading text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  <Newspaper className="h-4 w-4 text-sky-600" />
                  <span>Artikel & Blog Edukasi ({articlesList.length})</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Publikasikan artikel literasi kesehatan jiwa, tips psikologi praktis, dan wawasan biblioterapi untuk masyarakat.
                </p>
              </div>
              <Button
                onClick={handleOpenAddArticle}
                className="h-9 px-3.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white gap-1.5 cursor-pointer shadow-xs shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tulis Artikel Baru</span>
              </Button>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1 max-w-xl">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Cari judul artikel, penulis, atau ringkasan..."
                    value={articleSearch}
                    onChange={(e) => setArticleSearch(e.target.value)}
                    className="pl-9 h-9.5 rounded-xl text-xs bg-card border-border"
                  />
                  {articleSearch && (
                    <button
                      type="button"
                      onClick={() => setArticleSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <Select value={articleCategoryFilter} onValueChange={setArticleCategoryFilter}>
                  <SelectTrigger className="h-9.5 w-full sm:w-[200px] rounded-xl text-xs bg-card border-border">
                    <SelectValue placeholder="Semua Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kategori</SelectItem>
                    {ARTICLE_PRESET_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="text-xs text-muted-foreground font-medium self-end sm:self-auto">
                Menampilkan <strong>{filteredArticles.length}</strong> dari <strong>{articlesList.length}</strong> artikel
              </div>
            </div>

            {/* Articles Grid */}
            {filteredArticles.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card/50">
                <Newspaper className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <h4 className="font-heading text-sm font-bold text-foreground">
                  {articlesList.length === 0 ? "Belum Ada Artikel yang Diterbitkan" : "Tidak Ada Artikel yang Cocok"}
                </h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                  {articlesList.length === 0
                    ? "Mulai buat artikel edukasi pertama untuk memberikan wawasan kesehatan mental bagi pembaca PerpusAHM."
                    : "Coba ubah kata kunci pencarian atau reset filter kategori artikel Anda."}
                </p>
                {articlesList.length === 0 ? (
                  <Button
                    onClick={handleOpenAddArticle}
                    className="h-9 px-4 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Tulis Artikel Pertama</span>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setArticleSearch("")
                      setArticleCategoryFilter("all")
                    }}
                    className="h-8.5 px-3 rounded-xl text-xs"
                  >
                    Reset Filter
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredArticles.map((art) => (
                  <div
                    key={art.id}
                    className="group flex flex-col justify-between rounded-2xl border border-border bg-card overflow-hidden shadow-2xs hover:shadow-md hover:border-sky-300 dark:hover:border-sky-700 transition-all duration-300"
                  >
                    {/* Thumbnail & Category Badge */}
                    <div className="relative aspect-16/9 w-full overflow-hidden bg-muted">
                      <img
                        src={art.thumbnailUrl || "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&auto=format&fit=crop&q=80"}
                        alt={art.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute top-2.5 left-2.5">
                        <span className="rounded-full bg-black/75 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-semibold text-white shadow-xs">
                          {art.category}
                        </span>
                      </div>
                      <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-md text-[10px] text-white">
                        <Clock className="h-3 w-3" />
                        <span>{art.readTime}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                      <div className="space-y-1.5">
                        <h4 className="font-heading text-sm font-bold text-foreground group-hover:text-sky-600 transition-colors line-clamp-2 leading-snug">
                          {art.title}
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {art.excerpt}
                        </p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-border/60">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1 truncate max-w-[150px]">
                            <User className="h-3 w-3 text-sky-600 shrink-0" />
                            <span className="truncate">{art.authorName}</span>
                          </span>
                          <span className="flex items-center gap-1 shrink-0">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {new Date(art.publishedAt).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </span>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-end gap-1.5 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPreviewArticleModalItem(art)}
                            className="h-7.5 px-2.5 text-xs rounded-lg gap-1 cursor-pointer"
                            title="Pratinjau Artikel"
                          >
                            <Eye className="h-3 w-3 text-sky-600" />
                            <span>Pratinjau</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEditArticle(art)}
                            className="h-7.5 px-2.5 text-xs rounded-lg gap-1 cursor-pointer"
                            title="Edit Artikel"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>Edit</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteArticleModalItem(art)}
                            className="h-7.5 px-2.5 text-xs rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer"
                            title="Hapus Artikel"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Hapus</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: PENGGUNA */}
        {/* ================================================================= */}
        {activeTab === "pengguna" && (
          <div className="space-y-4 animate-fade-in">
            {/* Search & Role Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1 max-w-lg">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Masukkan kata kunci pencarian (nama, email, NIK)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9.5 rounded-xl text-xs bg-card border-border"
                  />
                </div>
                <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                  <SelectTrigger className="w-full sm:w-44 h-9.5 rounded-xl bg-card border-border text-xs font-medium">
                    <SelectValue placeholder="--- Semua Peran ---" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border bg-popover text-xs">
                    <SelectItem value="all">Semua Peran</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isSuperAdmin && (
                <Badge className="bg-purple-600/15 border-purple-500/30 text-purple-600 dark:text-purple-400 text-xs px-3 py-1 gap-1.5 self-start sm:self-auto">
                  <Crown className="h-3.5 w-3.5" />
                  <span>Mode Kelola Admin Aktif</span>
                </Badge>
              )}
            </div>

            {/* Users Container: Desktop Table & Mobile Cards */}
            <div className="rounded-2xl border border-border bg-card shadow-2xs overflow-hidden">
              {/* DESKTOP TABLE (hidden md:block) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="p-3.5">Pengguna</th>
                      <th className="p-3.5">Identitas & Kontak</th>
                      <th className="p-3.5">Peran</th>
                      <th className="p-3.5 text-center">Verifikasi</th>
                      <th className="p-3.5 text-center">Status Akun</th>
                      <th className="p-3.5 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredUsers.map((u) => {
                      const isSelf = u.id === user?.id
                      const isTargetSuperAdmin = u.role === "super_admin"
                      const isTargetAdmin = u.role === "admin"
                      // Super Admin can manage members and other admins (not self, not super admin).
                      // Regular Admin can ONLY manage regular members!
                      const canManageStatus = isSuperAdmin ? (!isSelf && !isTargetSuperAdmin) : (u.role === "member")
                      const canDelete = isSuperAdmin ? (!isSelf && !isTargetSuperAdmin) : (u.role === "member")

                      return (
                        <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3.5">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-8.5 w-8.5 ring-1 ring-border shrink-0">
                                <AvatarImage
                                  src={u.avatarUrl || undefined}
                                  alt={u.name}
                                  referrerPolicy="no-referrer"
                                  className="object-cover"
                                />
                                <AvatarFallback className="bg-sky-600 text-white font-bold text-xs uppercase">
                                  {u.name?.charAt(0) || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <span className="font-bold text-foreground line-clamp-1">
                                  {u.name}
                                </span>
                                <span className="text-[10px] text-muted-foreground">{u.email}</span>
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div className="space-y-0.5 text-[11px]">
                              <div className="font-mono text-muted-foreground">
                                NIK: {u.nik || "-"}
                              </div>
                              <div className="text-muted-foreground">
                                {u.institution || "Masyarakat Umum"} &bull; {u.phone || "-"}
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5">
                            {u.role === "super_admin" ? (
                              <Badge className="bg-purple-600 hover:bg-purple-600 text-white text-[10px] gap-1 px-2 py-0">
                                <Crown className="h-2.5 w-2.5" />
                                <span>Super Admin</span>
                              </Badge>
                            ) : u.role === "admin" ? (
                              <Badge className="bg-sky-600 hover:bg-sky-600 text-white text-[10px] gap-1 px-2 py-0">
                                <Shield className="h-2.5 w-2.5" />
                                <span>Admin</span>
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground px-2 py-0">
                                Member
                              </Badge>
                            )}
                          </td>

                          <td className="p-3.5 text-center">
                            {u.role === "admin" || u.role === "super_admin" ? (
                              <span
                                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400 inline-block select-none"
                                title="Akun staf administrator otomatis terverifikasi sebagai pengelola sistem"
                              >
                                ✓ Terverifikasi Admin
                              </span>
                            ) : canManageStatus ? (
                              <button
                                type="button"
                                onClick={() => handleToggleUserVerification(u)}
                                className={cn(
                                  "px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer",
                                  u.isVerified
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                                    : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                                )}
                                title="Klik untuk mengubah status verifikasi member"
                              >
                                {u.isVerified ? "✓ Terverifikasi" : "Belum Verifikasi"}
                              </button>
                            ) : (
                              <span
                                className={cn(
                                  "px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors inline-block select-none opacity-85",
                                  u.isVerified
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                    : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                                )}
                              >
                                {u.isVerified ? "✓ Terverifikasi" : "Belum Verifikasi"}
                              </span>
                            )}
                          </td>

                          <td className="p-3.5 text-center">
                            {canManageStatus ? (
                              <button
                                type="button"
                                onClick={() => handleToggleUserActive(u)}
                                className={cn(
                                  "px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer",
                                  u.isActive
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                                    : "bg-neutral-600 hover:bg-neutral-700 text-white border-transparent"
                                )}
                                title="Klik untuk mengubah status aktif/blokir"
                              >
                                {u.isActive ? "Aktif" : "Diblokir"}
                              </button>
                            ) : (
                              <span
                                className={cn(
                                  "px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors inline-block select-none opacity-85",
                                  u.isActive
                                    ? "bg-emerald-600 text-white border-transparent"
                                    : "bg-neutral-600 text-white border-transparent"
                                )}
                                title={
                                  isTargetSuperAdmin
                                    ? "Akun Super Administrator tidak dapat dinonaktifkan"
                                    : isTargetAdmin && !isSuperAdmin
                                    ? "Hanya Super Administrator yang berhak memblokir akun admin"
                                    : undefined
                                }
                              >
                                {u.isActive ? "Aktif" : "Diblokir"}
                              </span>
                            )}
                          </td>

                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Ubah Peran: Hanya Super Admin dan bukan dirinya sendiri atau sesama super admin */}
                              {isSuperAdmin && !isSelf && !isTargetSuperAdmin && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setRoleModalUser(u)
                                    setSelectedNewRole(u.role)
                                  }}
                                  className="h-7 px-2 text-[10px] rounded-lg gap-1 border-purple-300 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50 cursor-pointer"
                                  title="Ubah Peran Pengguna"
                                >
                                  <Shield className="h-3 w-3" />
                                  <span>Peran</span>
                                </Button>
                              )}

                              {/* Hapus: Hanya jika diizinkan (Super Admin ke admin/member, atau Admin ke member) */}
                              {canDelete ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteUser(u)}
                                  className="h-7 w-7 p-0 text-destructive/70 hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                  title="Hapus Akun"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 italic px-1.5 py-0.5 select-none"
                                  title={
                                    isSelf
                                      ? "Akun Anda saat ini"
                                      : isTargetSuperAdmin
                                      ? "Akun Super Admin dilindungi sistem"
                                      : "Hanya Super Administrator yang dapat mengelola akun admin"
                                  }
                                >
                                  {isSelf ? (
                                    "Akun Anda"
                                  ) : isTargetSuperAdmin ? (
                                    <>
                                      <Shield className="h-3 w-3 text-purple-500/70" />
                                      <span>Dilindungi</span>
                                    </>
                                  ) : (
                                    <>
                                      <Lock className="h-2.5 w-2.5" />
                                      <span>Super Admin</span>
                                    </>
                                  )}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS (block md:hidden) */}
              <div className="block md:hidden divide-y divide-border">
                {filteredUsers.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    Tidak ada pengguna yang cocok dengan filter atau kata kunci.
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelf = u.id === user?.id
                    const isTargetSuperAdmin = u.role === "super_admin"
                    const isTargetAdmin = u.role === "admin"
                    const canManageStatus = isSuperAdmin ? (!isSelf && !isTargetSuperAdmin) : (u.role === "member")
                    const canDelete = isSuperAdmin ? (!isSelf && !isTargetSuperAdmin) : (u.role === "member")

                    return (
                      <div key={u.id} className="p-4 space-y-3 bg-card hover:bg-muted/10 transition-colors">
                        {/* Header: Avatar, Name, Email, Role */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <Avatar className="h-10 w-10 ring-1 ring-border shrink-0">
                              <AvatarImage
                                src={u.avatarUrl || undefined}
                                alt={u.name}
                                referrerPolicy="no-referrer"
                                className="object-cover"
                              />
                              <AvatarFallback className="bg-sky-600 text-white font-bold text-xs uppercase">
                                {u.name?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-sm text-foreground truncate">{u.name}</div>
                              <div className="text-[11px] text-muted-foreground truncate">{u.email}</div>
                            </div>
                          </div>

                          <div>
                            {u.role === "super_admin" ? (
                              <Badge className="bg-purple-600 text-white text-[10px] gap-1 px-2 py-0.5">
                                <Crown className="h-2.5 w-2.5" />
                                <span>Super Admin</span>
                              </Badge>
                            ) : u.role === "admin" ? (
                              <Badge className="bg-sky-600 text-white text-[10px] gap-1 px-2 py-0.5">
                                <Shield className="h-2.5 w-2.5" />
                                <span>Admin</span>
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground px-2 py-0.5">
                                Member
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Details Grid */}
                        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 text-[11px] space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">NIK:</span>
                            <span className="font-mono text-foreground font-medium">{u.nik || "-"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Instansi:</span>
                            <span className="text-foreground truncate max-w-[200px]">{u.institution || "Masyarakat Umum"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Telepon:</span>
                            <span className="text-foreground">{u.phone || "-"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Peminjaman:</span>
                            <span className="text-foreground font-semibold">{u.borrowCount} buku</span>
                          </div>
                        </div>

                        {/* Actions Footer */}
                        <div className="flex items-center justify-between pt-1 border-t border-border/60 text-xs">
                          <div className="flex items-center gap-2">
                            {u.role === "admin" || u.role === "super_admin" ? (
                              <span
                                className="px-2.5 py-1 rounded-full text-[10px] font-bold border border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400 inline-block select-none"
                                title="Akun staf administrator otomatis terverifikasi sebagai pengelola sistem"
                              >
                                ✓ Terverifikasi Admin
                              </span>
                            ) : canManageStatus ? (
                              <button
                                type="button"
                                onClick={() => handleToggleUserVerification(u)}
                                className={cn(
                                  "px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors cursor-pointer",
                                  u.isVerified
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                    : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                                )}
                              >
                                {u.isVerified ? "✓ Terverifikasi" : "Belum Verifikasi"}
                              </button>
                            ) : (
                              <span
                                className={cn(
                                  "px-2.5 py-1 rounded-full text-[10px] font-bold border inline-block opacity-85",
                                  u.isVerified
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                    : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                                )}
                              >
                                {u.isVerified ? "✓ Terverifikasi" : "Belum Verifikasi"}
                              </span>
                            )}

                            {canManageStatus ? (
                              <button
                                type="button"
                                onClick={() => handleToggleUserActive(u)}
                                className={cn(
                                  "px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors cursor-pointer",
                                  u.isActive
                                    ? "bg-emerald-600 text-white border-transparent"
                                    : "bg-neutral-600 text-white border-transparent"
                                )}
                              >
                                {u.isActive ? "Aktif" : "Diblokir"}
                              </button>
                            ) : (
                              <span
                                className={cn(
                                  "px-2.5 py-1 rounded-full text-[10px] font-bold border inline-block opacity-85",
                                  u.isActive
                                    ? "bg-emerald-600 text-white border-transparent"
                                    : "bg-neutral-600 text-white border-transparent"
                                )}
                              >
                                {u.isActive ? "Aktif" : "Diblokir"}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            {isSuperAdmin && !isSelf && !isTargetSuperAdmin && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setRoleModalUser(u)
                                  setSelectedNewRole(u.role)
                                }}
                                className="h-7 px-2 text-[10px] rounded-lg gap-1 border-purple-300 text-purple-700 dark:text-purple-300 hover:bg-purple-50 cursor-pointer shrink-0"
                              >
                                <Shield className="h-3 w-3" />
                                <span>Peran</span>
                              </Button>
                            )}

                            {canDelete ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteUser(u)}
                                className="h-7 w-7 p-0 text-destructive/70 hover:text-destructive hover:bg-destructive/10 cursor-pointer shrink-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            ) : (
                              <span className="text-[10px] text-muted-foreground/60 italic px-1 shrink-0">
                                {isSelf ? "Akun Anda" : isTargetSuperAdmin ? "Dilindungi" : "Super Admin"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 5: PEMINJAMAN */}
        {/* ================================================================= */}
        {activeTab === "peminjam" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                  <BookMarked className="w-4 h-4 text-primary" />
                  <span>Monitoring Peminjaman E-Book Aktif</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Pantau sirkulasi hak baca digital seluruh anggota perpustakaan dan batas waktu jatuh tempo secara real-time.
                </p>
              </div>

              {/* Quick Summary Badges */}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs rounded-xl px-3 py-1 font-medium bg-card">
                  Total: <span className="font-bold ml-1 text-foreground">{loansList.length}</span>
                </Badge>
                <Badge className="text-xs rounded-xl px-3 py-1 font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                  Aktif: <span className="font-bold ml-1">{loansList.filter((l) => l.status === "aktif").length}</span>
                </Badge>
                <Badge variant="outline" className="text-xs rounded-xl px-3 py-1 font-medium text-muted-foreground bg-card">
                  Selesai: <span className="font-bold ml-1 text-foreground">{loansList.filter((l) => l.status === "kembali").length}</span>
                </Badge>
              </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-3 rounded-2xl border border-border">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={loanSearch}
                  onChange={(e) => setLoanSearch(e.target.value)}
                  placeholder="Masukkan kata kunci pencarian (peminjam, email, judul)..."
                  className="pl-9 h-9 text-xs rounded-xl bg-muted/20 border-border"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select value={loanStatusFilter} onValueChange={setLoanStatusFilter}>
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-card border-border min-w-[150px]">
                    <SelectValue placeholder="--- Semua Status Peminjaman ---" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border bg-popover text-xs">
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="aktif">Sedang Dipinjam (Aktif)</SelectItem>
                    <SelectItem value="kembali">Selesai / Dikembalikan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card shadow-2xs overflow-hidden">
              {/* DESKTOP TABLE (hidden md:block) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="p-3.5">Buku Dipinjam</th>
                      <th className="p-3.5">Peminjam</th>
                      <th className="p-3.5 text-center">Durasi</th>
                      <th className="p-3.5">Tanggal Pinjam</th>
                      <th className="p-3.5">Jatuh Tempo</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredLoans.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          {loanSearch || loanStatusFilter !== "all"
                            ? "Tidak ada data peminjaman yang cocok dengan filter."
                            : "Belum ada data peminjaman buku digital yang sedang berjalan."}
                        </td>
                      </tr>
                    ) : (
                      filteredLoans.map((loan) => {
                        const isExpired = new Date(loan.dueAt).getTime() < Date.now()
                        const diffDays = Math.ceil(
                          (new Date(loan.dueAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                        )

                        return (
                          <tr key={loan.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-12 rounded-lg overflow-hidden border border-border bg-muted/40 shrink-0 shadow-xs">
                                  {loan.bookCover ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={loan.bookCover}
                                      alt={loan.bookTitle}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                      <BookOpen className="w-4 h-4 opacity-40" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 max-w-xs">
                                  <span className="font-bold text-foreground line-clamp-1">
                                    {loan.bookTitle}
                                  </span>
                                  {loan.categoryName && (
                                    <span className="text-[10px] text-muted-foreground">
                                      {loan.categoryName}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5">
                              <div className="flex items-center gap-2.5">
                                <Avatar className="w-8 h-8 rounded-xl border border-border shrink-0">
                                  <AvatarImage
                                    src={loan.userAvatar || ""}
                                    alt={loan.userName}
                                    referrerPolicy="no-referrer"
                                    className="object-cover"
                                  />
                                  <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary rounded-xl">
                                    {loan.userName?.slice(0, 2).toUpperCase() || "US"}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <span className="font-medium text-foreground block">{loan.userName}</span>
                                  <div className="text-[10px] text-muted-foreground">{loan.userEmail}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5 text-center font-mono font-medium">
                              {loan.durationDays} hari
                            </td>
                            <td className="p-3.5 text-muted-foreground font-mono text-[11px]">
                              {loan.borrowedAt ? new Date(loan.borrowedAt).toLocaleDateString("id-ID") : "-"}
                            </td>
                            <td className="p-3.5 font-mono text-[11px]">
                              <div>
                                <span className={cn("font-semibold block", isExpired ? "text-rose-500" : "text-amber-600 dark:text-amber-400")}>
                                  {loan.dueAt ? new Date(loan.dueAt).toLocaleDateString("id-ID") : "-"}
                                </span>
                                {loan.status === "aktif" && (
                                  <span className={cn("text-[9px] font-sans font-medium", isExpired ? "text-rose-500" : "text-muted-foreground")}>
                                    {isExpired ? "Jatuh Tempo" : `Sisa ${diffDays} hari`}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3.5 text-center">
                              <Badge
                                className={cn(
                                  "text-[10px] px-2.5 py-0.5 rounded-lg font-semibold",
                                  loan.status === "aktif"
                                    ? isExpired
                                      ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                      : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                    : "bg-muted text-muted-foreground border-border"
                                )}
                              >
                                {loan.status === "aktif" ? (isExpired ? "Terlambat" : "Dipinjam") : "Kembali"}
                              </Badge>
                            </td>
                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {loan.status === "aktif" && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleMarkLoanReturned(loan.id)}
                                      className="h-7 px-2.5 text-[10px] rounded-lg gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                                      title="Tandai buku telah dikembalikan"
                                    >
                                      <Check className="w-3 h-3" />
                                      <span>Selesai</span>
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleExtendLoan(loan.id)}
                                      className="h-7 px-2 text-[10px] rounded-lg border-sky-500/30 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 cursor-pointer"
                                      title="Perpanjang 7 hari"
                                    >
                                      +7h
                                    </Button>
                                  </>
                                )}

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteLoan(loan)}
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                                  title="Hapus catatan peminjaman"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS (block md:hidden) */}
              <div className="block md:hidden divide-y divide-border">
                {filteredLoans.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    Belum ada data peminjaman buku digital yang sedang berjalan.
                  </div>
                ) : (
                  filteredLoans.map((loan) => {
                    const isExpired = new Date(loan.dueAt).getTime() < Date.now()
                    const diffDays = Math.ceil(
                      (new Date(loan.dueAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                    )

                    return (
                      <div key={loan.id} className="p-4 space-y-3 bg-card">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-10 h-13 rounded-lg overflow-hidden border border-border bg-muted/40 shrink-0">
                              {loan.bookCover ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={loan.bookCover}
                                  alt={loan.bookTitle}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                  <BookOpen className="w-4 h-4 opacity-40" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-xs text-foreground line-clamp-2">
                                {loan.bookTitle}
                              </h4>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {loan.userName}
                              </p>
                            </div>
                          </div>

                          <Badge
                            className={cn(
                              "text-[10px] px-2 py-0.5 shrink-0 rounded-lg",
                              loan.status === "aktif"
                                ? isExpired
                                  ? "bg-rose-500/15 text-rose-600 border-rose-500/20"
                                  : "bg-emerald-500/15 text-emerald-600 border-emerald-500/20"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {loan.status === "aktif" ? (isExpired ? "Terlambat" : "Dipinjam") : "Kembali"}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 rounded-xl bg-muted/40 border border-border/60">
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Tgl Pinjam:</span>
                            <span className="font-mono">{loan.borrowedAt ? new Date(loan.borrowedAt).toLocaleDateString("id-ID") : "-"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Jatuh Tempo:</span>
                            <span className={cn("font-mono font-semibold", isExpired ? "text-rose-500" : "text-amber-600 dark:text-amber-400")}>
                              {loan.dueAt ? new Date(loan.dueAt).toLocaleDateString("id-ID") : "-"}
                            </span>
                            {loan.status === "aktif" && (
                              <span className="text-[9px] text-muted-foreground block">
                                ({isExpired ? "Lewat" : `Sisa ${diffDays}h`})
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="pt-1 flex items-center justify-between gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteLoan(loan)}
                            className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            <span>Hapus</span>
                          </Button>

                          {loan.status === "aktif" && (
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleExtendLoan(loan.id)}
                                className="h-8 px-2.5 text-xs rounded-lg border-sky-500/30 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10"
                              >
                                +7 Hari
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkLoanReturned(loan.id)}
                                className="h-8 px-3 text-xs rounded-lg gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                              >
                                <Check className="h-3.5 w-3.5" />
                                <span>Selesai</span>
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 6: LAPORAN BERKAS */}
        {/* ================================================================= */}
        {activeTab === "laporan" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-heading text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span>Laporan Kendala / Kerusakan Berkas Buku ({reportsList.length})</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Umpan balik dari pembaca terkait halaman kosong, font rusak, atau berkas buku tidak terbaca.
                </p>
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { key: "all", label: "Semua", count: reportsList.length },
                  { key: "baru", label: "Baru", count: reportsList.filter(r => r.status === "baru").length },
                  { key: "diproses", label: "Diproses", count: reportsList.filter(r => r.status === "diproses").length },
                  { key: "selesai", label: "Selesai", count: reportsList.filter(r => r.status === "selesai").length },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setReportStatusFilter(item.key as any)}
                    className={cn(
                      "px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer border",
                      reportStatusFilter === item.key
                        ? "bg-foreground text-background border-foreground shadow-2xs"
                        : "border-border/60 hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <span>{item.label}</span>
                    <span className="ml-1 opacity-75 text-[11px]">({item.count})</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card shadow-2xs overflow-hidden">
              {/* DESKTOP TABLE (hidden md:block) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="p-3.5">Buku</th>
                      <th className="p-3.5">Format</th>
                      <th className="p-3.5">Deskripsi Masalah</th>
                      <th className="p-3.5">Pelapor</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {reportsList.filter(r => reportStatusFilter === "all" || r.status === reportStatusFilter).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-10 text-center text-muted-foreground space-y-1">
                          <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto opacity-70 mb-1" />
                          <p className="font-semibold text-foreground">Tidak ada laporan kerusakan berkas buku.</p>
                          <p className="text-[11px]">Semua berkas buku dalam kondisi baik atau laporan telah terselesaikan.</p>
                        </td>
                      </tr>
                    ) : (
                      reportsList
                        .filter(r => reportStatusFilter === "all" || r.status === reportStatusFilter)
                        .map((r) => (
                          <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3.5 max-w-[220px]">
                              <div className="flex items-center gap-2.5">
                                {r.coverUrl && (
                                  <img
                                    src={r.coverUrl}
                                    alt={r.bookTitle}
                                    className="h-10 w-7.5 rounded object-cover border border-border shrink-0 shadow-2xs"
                                  />
                                )}
                                <div className="min-w-0">
                                  <p className="font-bold text-foreground line-clamp-2 leading-tight">
                                    {r.bookTitle}
                                  </p>
                                  {r.bookSlug && (
                                    <Link
                                      href={`/buku/${r.bookSlug}`}
                                      target="_blank"
                                      className="text-[10px] text-sky-600 hover:underline flex items-center gap-0.5 mt-0.5"
                                    >
                                      <span>Buka Buku</span>
                                      <ExternalLink className="h-2.5 w-2.5" />
                                    </Link>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded bg-muted text-[10px] font-mono font-bold">
                                {r.format}
                              </span>
                            </td>
                            <td className="p-3.5 text-muted-foreground max-w-sm">
                              <p className="text-foreground text-xs leading-relaxed font-medium">{r.message}</p>
                              <span className="text-[10px] text-muted-foreground font-mono block mt-1">
                                {r.createdAt ? new Date(r.createdAt).toLocaleString("id-ID") : "-"}
                              </span>
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <p className="font-medium text-foreground">{r.reporterName || "Tamu Anonim"}</p>
                              {r.reporterEmail && (
                                <p className="text-[10px] text-muted-foreground">{r.reporterEmail}</p>
                              )}
                            </td>
                            <td className="p-3.5 text-center whitespace-nowrap">
                              <Select
                                value={r.status}
                                onValueChange={(val) => handleUpdateReportStatus(r.id, val as any)}
                              >
                                <SelectTrigger
                                  className={cn(
                                    "h-7 w-28 text-[11px] font-bold rounded-lg border shadow-2xs mx-auto",
                                    r.status === "selesai" && "bg-emerald-500/10 border-emerald-300 text-emerald-700 dark:text-emerald-400 dark:border-emerald-700",
                                    r.status === "diproses" && "bg-sky-500/10 border-sky-300 text-sky-700 dark:text-sky-400 dark:border-sky-700",
                                    r.status === "baru" && "bg-amber-500/10 border-amber-300 text-amber-700 dark:text-amber-400 dark:border-amber-700"
                                  )}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="baru">Baru</SelectItem>
                                  <SelectItem value="diproses">Diproses</SelectItem>
                                  <SelectItem value="selesai">Selesai</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-3.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {r.status !== "selesai" && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateReportStatus(r.id, "selesai")}
                                    className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg cursor-pointer transition-colors"
                                    title="Tandai Selesai (Kirim Notifikasi ke Pelapor)"
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteReport(r.id)}
                                  className="p-1.5 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer transition-colors"
                                  title="Hapus Catatan Laporan"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS (block md:hidden) */}
              <div className="block md:hidden divide-y divide-border">
                {reportsList.filter(r => reportStatusFilter === "all" || r.status === reportStatusFilter).length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    Tidak ada laporan kerusakan berkas buku saat ini.
                  </div>
                ) : (
                  reportsList
                    .filter(r => reportStatusFilter === "all" || r.status === reportStatusFilter)
                    .map((r) => (
                      <div key={r.id} className="p-4 space-y-2.5 bg-card">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-sm text-foreground line-clamp-1">{r.bookTitle}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono font-bold">
                                {r.format}
                              </span>
                              {r.bookSlug && (
                                <Link
                                  href={`/buku/${r.bookSlug}`}
                                  target="_blank"
                                  className="text-[10px] text-sky-600 hover:underline flex items-center gap-0.5"
                                >
                                  <span>Buka Buku</span>
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </Link>
                              )}
                            </div>
                          </div>

                          <Select
                            value={r.status}
                            onValueChange={(val) => handleUpdateReportStatus(r.id, val as any)}
                          >
                            <SelectTrigger className="h-7 w-24 text-[10px] font-bold rounded-lg border">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="baru">Baru</SelectItem>
                              <SelectItem value="diproses">Diproses</SelectItem>
                              <SelectItem value="selesai">Selesai</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <p className="text-xs text-foreground p-3 rounded-xl bg-muted/40 border border-border/50 leading-relaxed font-medium">
                          {r.message}
                        </p>

                        <div className="text-[11px] text-muted-foreground flex justify-between items-center pt-1">
                          <span>Pelapor: <strong className="text-foreground font-medium">{r.reporterName || "Tamu"}</strong></span>
                          <div className="flex items-center gap-2">
                            {r.status !== "selesai" && (
                              <button
                                type="button"
                                onClick={() => handleUpdateReportStatus(r.id, "selesai")}
                                className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Selesaikan</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteReport(r.id)}
                              className="text-destructive/70 hover:text-destructive p-1 rounded cursor-pointer"
                              title="Hapus"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 7: PENGATURAN */}
        {/* ================================================================= */}
        {activeTab === "pengaturan" && (
          <div className="space-y-4 animate-fade-in max-w-2xl">
            <div className="p-6 rounded-3xl border border-border bg-card shadow-xs space-y-5">
              <div>
                <h3 className="font-heading text-base font-bold text-foreground">
                  Kebijakan Peminjaman E-Book Digital
                </h3>
                <p className="text-xs text-muted-foreground">
                  Konfigurasi aturan durasi peminjaman literasi digital RSJD Atma Husada Mahakam.
                </p>
              </div>

              <form noValidate onSubmit={handleSaveSettings} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">
                      Durasi Peminjaman Standar (Hari)
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      Batas valid: 1 – 30 hari
                    </span>
                  </div>

                  <div className="relative">
                    <Input
                      type="number"
                      value={maxLoanDays === 0 ? "" : maxLoanDays}
                      onChange={(e) => {
                        const val = e.target.value === "" ? 0 : parseInt(e.target.value, 10)
                        setMaxLoanDays(isNaN(val) ? 0 : val)
                      }}
                      placeholder="Masukkan durasi 1-30..."
                      className={cn(
                        "h-10 rounded-xl text-xs bg-muted/20 border-border pr-14 transition-colors",
                        (maxLoanDays < 1 || maxLoanDays > 30) && "border-red-500/80 focus-visible:ring-red-500/30 text-red-600 dark:text-red-400"
                      )}
                    />
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-xs font-medium text-muted-foreground">
                      Hari
                    </div>
                  </div>

                  {/* Preset quick buttons */}
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="text-[11px] text-muted-foreground mr-1">Rekomendasi:</span>
                    {[3, 7, 14, 30].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setMaxLoanDays(preset)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer",
                          maxLoanDays === preset
                            ? "bg-sky-600 text-white border-sky-600 shadow-2xs"
                            : "bg-muted/40 border-border/80 text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {preset} Hari
                      </button>
                    ))}
                  </div>

                  {maxLoanDays < 1 || maxLoanDays > 30 ? (
                    <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center gap-2 text-xs animate-fade-in">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>
                        Durasi peminjaman harus berada di antara <strong>1</strong> sampai <strong>30</strong> hari.
                      </span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      Hak akses baca online akan otomatis kedaluwarsa setelah jangka waktu ini berakhir.
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isProcessing || maxLoanDays < 1 || maxLoanDays > 30}
                  className="h-10 px-5 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? "Menyimpan..." : "Simpan Pengaturan"}
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 8: KELOLA TIM ADMINISTRATOR (KHUSUS SUPER ADMIN) */}
        {/* ================================================================= */}
        {activeTab === "tim-admin" && isSuperAdmin && (
          <div className="space-y-5 animate-fade-in">
            {/* Header & Privilege Explanation Banner */}
            <div className="p-6 rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-indigo-500/5 to-transparent dark:from-purple-950/20 dark:via-indigo-950/20 relative overflow-hidden shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-600 text-white text-[10px] px-2 py-0.5 font-bold gap-1 shadow-xs">
                      <Crown className="h-3 w-3" />
                      <span>Super Administrator • Owner</span>
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">• Pemegang Kendali Tertinggi</span>
                  </div>
                  <h3 className="font-heading text-lg sm:text-xl font-bold text-foreground">
                    Manajemen Tim Administrator Perpustakaan
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Sebagai Super Administrator (Owner tunggal sistem), Anda memegang otoritas tertinggi untuk
                    mendaftarkan akun staf Admin Pustakawan, mengatur status akses, serta mereset kredensial login staf pengelola.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={() => {
                    setAddAdminError("")
                    setNewAdminForm({
                      name: "",
                      email: "",
                      password: "",
                      role: "admin",
                      nik: "",
                      phone: "",
                      institution: "Pustakawan RSJD",
                      isVerified: true,
                    })
                    setIsAddAdminModalOpen(true)
                  }}
                  className="h-10 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 text-white font-bold text-xs shadow-md shadow-purple-600/20 gap-2 shrink-0 cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Tambah Admin Baru</span>
                </Button>
              </div>

              {/* Quick Stat Pill Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 mt-5 border-t border-purple-500/10">
                <div className="p-3 rounded-2xl bg-card border border-border/80 shadow-2xs">
                  <span className="text-[10px] text-muted-foreground font-medium block">Total Tim Pengelola</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-heading text-lg font-bold text-foreground">{adminTeamMembers.length}</span>
                    <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-card border border-border/80 shadow-2xs">
                  <span className="text-[10px] text-muted-foreground font-medium block">Super Admin (Owner)</span>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-heading text-lg font-bold text-purple-600 dark:text-purple-400">1</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-purple-400 text-purple-600 font-bold">
                        Tunggal
                      </Badge>
                    </div>
                    <Crown className="h-4 w-4 text-purple-600" />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-card border border-border/80 shadow-2xs">
                  <span className="text-[10px] text-muted-foreground font-medium block">Admin Pustakawan</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-heading text-lg font-bold text-sky-600 dark:text-sky-400">
                      {adminTeamMembers.filter((u) => u.role === "admin").length}
                    </span>
                    <Shield className="h-4 w-4 text-sky-600" />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-card border border-border/80 shadow-2xs">
                  <span className="text-[10px] text-muted-foreground font-medium block">Akun Aktif</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-heading text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {adminTeamMembers.filter((u) => u.isActive).length}
                    </span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1 max-w-lg">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Cari admin (nama, email, NIK/NIP, unit)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9.5 rounded-xl text-xs bg-card border-border"
                  />
                </div>
                <Select value={adminRoleFilter} onValueChange={setAdminRoleFilter}>
                  <SelectTrigger className="w-full sm:w-44 h-9.5 rounded-xl bg-card border-border text-xs font-medium">
                    <SelectValue placeholder="--- Semua Peran ---" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border bg-popover text-xs">
                    <SelectItem value="all">Semua Tingkatan</SelectItem>
                    <SelectItem value="super_admin">Super Administrator</SelectItem>
                    <SelectItem value="admin">Admin Pustakawan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="text-xs text-muted-foreground self-start sm:self-auto">
                Menampilkan <strong className="text-foreground">{filteredAdminTeam.length}</strong> pengelola
              </div>
            </div>

            {/* Admin Table / Cards */}
            <div className="rounded-2xl border border-border bg-card shadow-2xs overflow-hidden">
              {/* DESKTOP TABLE */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="p-3.5">Administrator</th>
                      <th className="p-3.5">Jabatan & Instansi</th>
                      <th className="p-3.5">Tingkatan Hak Akses</th>
                      <th className="p-3.5 text-center">Status Akun</th>
                      <th className="p-3.5 text-center">Aksi Manajemen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredAdminTeam.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-xs text-muted-foreground">
                          Tidak ditemukan data administrator yang sesuai.
                        </td>
                      </tr>
                    ) : (
                      filteredAdminTeam.map((u) => {
                        const isSelf = u.id === user?.id
                        const isTargetSuperAdmin = u.role === "super_admin"

                        return (
                          <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="relative">
                                  <Avatar className="h-9 w-9 ring-1 ring-border shrink-0">
                                    <AvatarImage
                                      src={u.avatarUrl || undefined}
                                      alt={u.name}
                                      referrerPolicy="no-referrer"
                                      className="object-cover"
                                    />
                                    <AvatarFallback className="bg-purple-600 text-white font-bold text-xs uppercase">
                                      {u.name?.charAt(0) || "A"}
                                    </AvatarFallback>
                                  </Avatar>
                                  {isTargetSuperAdmin && (
                                    <div className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 p-0.5 rounded-full shadow-xs">
                                      <Crown className="h-2.5 w-2.5" />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-foreground line-clamp-1">{u.name}</span>
                                    {isSelf && (
                                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-emerald-600 border-emerald-500/30 bg-emerald-500/10 font-bold">
                                        Anda
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-muted-foreground">{u.email}</span>
                                </div>
                              </div>
                            </td>

                            <td className="p-3.5">
                              <div className="space-y-0.5 text-[11px]">
                                <div className="font-medium text-foreground">
                                  {u.institution || "Pustakawan RSJD Atma Husada"}
                                </div>
                                <div className="text-muted-foreground text-[10px]">
                                  NIP/NIK: {u.nik || "-"} &bull; {u.phone || "Tidak ada telepon"}
                                </div>
                              </div>
                            </td>

                            <td className="p-3.5">
                              {u.role === "super_admin" ? (
                                <Badge className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-600 hover:to-indigo-600 text-white text-[10px] gap-1 px-2.5 py-0.5 font-bold shadow-xs">
                                  <Crown className="h-2.5 w-2.5" />
                                  <span>Super Administrator</span>
                                </Badge>
                              ) : (
                                <Badge className="bg-sky-600 hover:bg-sky-600 text-white text-[10px] gap-1 px-2.5 py-0.5 font-semibold">
                                  <Shield className="h-2.5 w-2.5" />
                                  <span>Admin Pustakawan</span>
                                </Badge>
                              )}
                            </td>

                            <td className="p-3.5 text-center">
                              {isSelf ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 inline-block">
                                  ✓ Sesi Aktif
                                </span>
                              ) : isTargetSuperAdmin ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 inline-block" title="Akun Super Admin dilindungi">
                                  ✓ Dilindungi
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleUserActive(u)}
                                  className={cn(
                                    "px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer",
                                    u.isActive
                                      ? "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                                      : "bg-neutral-600 hover:bg-neutral-700 text-white border-transparent"
                                  )}
                                  title="Klik untuk mengubah status aktif / tangguhkan"
                                >
                                  {u.isActive ? "Aktif" : "Ditangguhkan"}
                                </button>
                              )}
                            </td>

                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Ubah Peran */}
                                {!isSelf && !isTargetSuperAdmin && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setRoleModalUser(u)
                                      setSelectedNewRole(u.role)
                                    }}
                                    className="h-7 px-2 text-[10px] rounded-lg gap-1 border-purple-300 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50 cursor-pointer"
                                    title="Ubah Tingkatan Peran Akun"
                                  >
                                    <Shield className="h-3 w-3" />
                                    <span>Peran</span>
                                  </Button>
                                )}

                                {/* Reset Password */}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setResetPasswordError("")
                                    setNewResetPassword("")
                                    setShowResetPassword(false)
                                    setResetPasswordModalUser(u)
                                  }}
                                  className="h-7 px-2 text-[10px] rounded-lg gap-1 border-sky-300 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/50 cursor-pointer"
                                  title="Reset Kata Sandi Akun Ini"
                                >
                                  <KeyRound className="h-3 w-3" />
                                  <span>Reset Sandi</span>
                                </Button>

                                {/* Transfer Kepemilikan Super Admin (Owner) */}
                                {!isSelf && !isTargetSuperAdmin && u.isActive && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setTransferError("")
                                      setTransferPassword("")
                                      setShowTransferPassword(false)
                                      setTransferAgreed(false)
                                      setTransferOwnerModalUser(u)
                                    }}
                                    className="h-7 px-2 text-[10px] rounded-lg gap-1 border-amber-400 text-amber-800 dark:text-amber-300 hover:bg-amber-500/10 cursor-pointer font-bold shadow-2xs"
                                    title="Alihkan Hak Kepemilikan Super Administrator (Owner) kepada staf ini"
                                  >
                                    <Crown className="h-3 w-3 text-amber-500" />
                                    <span>Transfer Owner</span>
                                  </Button>
                                )}

                                {/* Hapus Admin */}
                                {!isSelf && !isTargetSuperAdmin && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteUser(u)}
                                    className="h-7 w-7 p-0 text-destructive/70 hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                    title="Hapus Administrator"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS */}
              <div className="block md:hidden divide-y divide-border">
                {filteredAdminTeam.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    Tidak ditemukan data administrator.
                  </div>
                ) : (
                  filteredAdminTeam.map((u) => {
                    const isSelf = u.id === user?.id
                    const isTargetSuperAdmin = u.role === "super_admin"

                    return (
                      <div key={u.id} className="p-4 space-y-3 bg-card hover:bg-muted/10 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <Avatar className="h-10 w-10 ring-1 ring-border shrink-0">
                              <AvatarImage src={u.avatarUrl || undefined} alt={u.name} referrerPolicy="no-referrer" className="object-cover" />
                              <AvatarFallback className="bg-purple-600 text-white font-bold text-xs uppercase">
                                {u.name?.charAt(0) || "A"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-sm text-foreground truncate">{u.name}</span>
                                {isSelf && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-emerald-600 border-emerald-500/30 bg-emerald-500/10 font-bold">
                                    Anda
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground truncate">{u.email}</div>
                            </div>
                          </div>

                          <div>
                            {u.role === "super_admin" ? (
                              <Badge className="bg-purple-600 text-white text-[10px] gap-1 px-2 py-0.5">
                                <Crown className="h-2.5 w-2.5" />
                                <span>Super Admin</span>
                              </Badge>
                            ) : (
                              <Badge className="bg-sky-600 text-white text-[10px] gap-1 px-2 py-0.5">
                                <Shield className="h-2.5 w-2.5" />
                                <span>Admin</span>
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 text-[11px] space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Instansi / Unit:</span>
                            <span className="text-foreground font-medium truncate max-w-[200px]">{u.institution || "Pustakawan RSJD"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">NIK / NIP:</span>
                            <span className="font-mono text-foreground font-medium">{u.nik || "-"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Telepon:</span>
                            <span className="text-foreground">{u.phone || "-"}</span>
                          </div>
                        </div>

                        <div className="space-y-2.5 pt-2.5 border-t border-border/60 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-medium text-muted-foreground">Status Akun:</span>
                            {isSelf ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-600">
                                Sesi Aktif
                              </span>
                            ) : isTargetSuperAdmin ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-purple-500/30 bg-purple-500/10 text-purple-600">
                                Dilindungi
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleUserActive(u)}
                                className={cn(
                                  "px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer",
                                  u.isActive ? "bg-emerald-600 text-white border-transparent" : "bg-neutral-600 text-white border-transparent"
                                )}
                              >
                                {u.isActive ? "Aktif" : "Ditangguhkan"}
                              </button>
                            )}
                          </div>

                          <div className="flex items-center justify-end gap-1.5 flex-wrap pt-0.5">
                            {!isSelf && !isTargetSuperAdmin && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setRoleModalUser(u)
                                  setSelectedNewRole(u.role)
                                }}
                                className="h-7.5 px-2.5 text-[11px] rounded-lg gap-1 border-purple-300 text-purple-700 dark:text-purple-300 hover:bg-purple-50 cursor-pointer shrink-0"
                              >
                                <Shield className="h-3 w-3" />
                                <span>Peran</span>
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setResetPasswordError("")
                                setNewResetPassword("")
                                setShowResetPassword(false)
                                setResetPasswordModalUser(u)
                              }}
                              className="h-7.5 px-2.5 text-[11px] rounded-lg gap-1 border-sky-300 text-sky-700 dark:text-sky-300 hover:bg-sky-50 cursor-pointer shrink-0"
                            >
                              <KeyRound className="h-3 w-3" />
                              <span>Reset Sandi</span>
                            </Button>

                            {!isSelf && !isTargetSuperAdmin && u.isActive && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setTransferError("")
                                  setTransferPassword("")
                                  setShowTransferPassword(false)
                                  setTransferAgreed(false)
                                  setTransferOwnerModalUser(u)
                                }}
                                className="h-7.5 px-2.5 text-[11px] rounded-lg gap-1 border-amber-400 text-amber-800 dark:text-amber-300 hover:bg-amber-500/10 cursor-pointer font-bold shadow-2xs shrink-0"
                                title="Transfer Kepemilikan Super Administrator (Owner)"
                              >
                                <Crown className="h-3 w-3 text-amber-500" />
                                <span>Owner</span>
                              </Button>
                            )}

                            {!isSelf && !isTargetSuperAdmin && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteUser(u)}
                                className="h-7.5 w-7.5 p-0 text-destructive/70 hover:text-destructive hover:bg-destructive/10 cursor-pointer shrink-0"
                                title="Hapus Administrator"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* MODAL: TAMBAH / EDIT BUKU */}
        {/* ================================================================= */}
        <Dialog open={isBookModalOpen} onOpenChange={setIsBookModalOpen}>
          <DialogContent showCloseButton={false} className="w-full sm:max-w-4xl lg:max-w-5xl xl:max-w-5xl max-h-[92vh] overflow-y-auto p-5 sm:p-7 rounded-3xl border-border bg-card shadow-2xl">
            {/* Header */}
            <DialogHeader className="relative space-y-3.5 pb-4 border-b border-border/60">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5">
                <div className="space-y-1 pr-12 lg:pr-0">
                  <DialogTitle className="font-heading text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary shrink-0" />
                    <span>{editingBookId ? "Edit Informasi Buku Digital" : "Tambah Buku Baru ke Basis Data"}</span>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Lengkapi katalog resmi perpustakaan digital RSJD Atma Husada Mahakam.
                  </DialogDescription>
                </div>

                {/* Right Controls: Tab Switcher & Auto-Skip (Symmetrical, Equal Height, Zero Wrap) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-2 w-full lg:w-auto">
                  {/* Tab Switcher: Auto Write vs Manual Write (Equal 50-50, Symmetrical) */}
                  <div className="grid grid-cols-2 p-1 bg-muted/60 rounded-xl border border-border/80 shadow-inner w-full sm:w-auto h-9 items-center">
                    <button
                      type="button"
                      onClick={() => setBookModalTab("auto")}
                      className={cn(
                        "flex items-center justify-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap",
                        bookModalTab === "auto"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                      )}
                    >
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span>Auto Write</span>
                      <span
                        className={cn(
                          "text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none tracking-wide shrink-0",
                          bookModalTab === "auto"
                            ? "bg-white/25 text-white border border-white/40"
                            : "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30"
                        )}
                      >
                        Cerdas
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBookModalTab("manual")}
                      className={cn(
                        "flex items-center justify-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap",
                        bookModalTab === "manual"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                      )}
                    >
                      <PenTool className="w-3.5 h-3.5 shrink-0" />
                      <span>Manual Write</span>
                    </button>
                  </div>

                  {/* Auto-Skip Duplicate Toggle Button */}
                  <button
                    type="button"
                    onClick={() => toggleAutoSkipDuplicates(!autoSkipDuplicates)}
                    title={
                      autoSkipDuplicates
                        ? "Fitur Auto-Skip Aktif: Mencegah buku duplikat masuk ke katalog"
                        : "Fitur Auto-Skip Nonaktif: Semua buku akan diproses tanpa melewati duplikat"
                    }
                    className={cn(
                      "flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold border transition-all duration-200 cursor-pointer shadow-xs whitespace-nowrap w-full sm:w-auto",
                      autoSkipDuplicates
                        ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        : "bg-muted/60 hover:bg-muted text-muted-foreground border-border/80"
                    )}
                  >
                    <ShieldCheck className={cn("w-3.5 h-3.5 shrink-0", autoSkipDuplicates ? "text-emerald-500" : "text-muted-foreground")} />
                    <span>Auto-Skip:</span>
                    <span className="font-bold">{autoSkipDuplicates ? "ON" : "OFF"}</span>
                  </button>
                </div>
              </div>

              {/* Pinned Top-Right Close Button */}
              <button
                type="button"
                onClick={() => setIsBookModalOpen(false)}
                aria-label="Tutup modal"
                className="absolute top-0 right-0 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-2xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer shrink-0 border border-border/80 hover:border-border shadow-xs z-20"
              >
                <X className="w-4 h-4" />
              </button>
            </DialogHeader>

            {/* Hidden File Inputs */}
            <input
              ref={bookFileInputRef}
              type="file"
              accept=".pdf,.epub,.zip,application/pdf,application/epub+zip,application/zip,application/x-zip-compressed"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = e.target.files ? Array.from(e.target.files) : []
                if (files.length > 0) processIncomingBookFiles(files)
              }}
            />
            <input
              ref={coverImageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverImageChange}
            />

            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault()
                if (isBatchMode) {
                  handleSaveBatch()
                } else {
                  handleSaveBook(e)
                }
              }}
              className="space-y-6 pt-2"
            >
              <div className="space-y-5">
                {/* Dropzone Area (Mendukung Mode Auto Cerdas & Mode Manual Beruntun) */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setBookFileDragOver(true)
                  }}
                  onDragLeave={() => setBookFileDragOver(false)}
                  onDrop={async (e) => {
                    e.preventDefault()
                    setBookFileDragOver(false)
                    let files = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : []

                    // Periksa apakah berkas kosong / 0 bytes (khas Flatpak Linux Wayland saat DND dari /run/media)
                    const uriListText =
                      e.dataTransfer.getData("text/uri-list") ||
                      e.dataTransfer.getData("text/plain") ||
                      ""
                    const fileUris = uriListText
                      .split(/[\r\n]+/)
                      .map((s) => s.trim())
                      .filter((s) => s.startsWith("file://") || s.startsWith("/"))

                    const hasZeroByteFile = files.length > 0 && files.some((f) => f.size === 0)

                    if ((files.length === 0 || hasZeroByteFile) && fileUris.length > 0) {
                      setIsExtractingPdf(true)
                      setExtractionStatus("Membaca berkas asli dari sistem Linux...")
                      try {
                        const resolvedFiles: File[] = []
                        for (const uri of fileUris) {
                          const res = await adminFetch("/api/admin/books/read-local", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ uri }),
                          })
                          if (res.ok) {
                            const blob = await res.blob()
                            const headerName = res.headers.get("X-File-Name")
                            const name = headerName
                              ? decodeURIComponent(headerName)
                              : uri.split("/").pop() || "book.pdf"
                            resolvedFiles.push(new File([blob], name, { type: blob.type }))
                          }
                        }
                        if (resolvedFiles.length > 0) {
                          files = resolvedFiles
                        }
                      } catch (err) {
                        console.warn("Gagal membaca berkas lokal:", err)
                      } finally {
                        setIsExtractingPdf(false)
                      }
                    }

                    if (files.length > 0) {
                      processIncomingBookFiles(files)
                    }
                  }}
                  onClick={() => bookFileInputRef.current?.click()}
                  className={cn(
                    "relative group border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-3",
                    bookFileDragOver
                      ? "border-primary bg-primary/10 scale-[0.99]"
                      : isBatchMode && batchQueue.length > 0
                      ? "border-sky-500/50 bg-sky-500/5 hover:border-sky-500"
                      : uploadedBookFile && uploadedBookFile.size === 0
                      ? "border-amber-500/60 bg-amber-500/10 hover:border-amber-500"
                      : uploadedBookFile
                      ? "border-emerald-500/50 bg-emerald-500/5 hover:border-emerald-500"
                      : "border-border hover:border-primary/60 hover:bg-muted/30"
                  )}
                >
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                    {isBatchMode && batchQueue.length > 0 ? (
                      <Archive className="w-7 h-7 text-sky-500" />
                    ) : uploadedBookFile && uploadedBookFile.size === 0 ? (
                      <AlertTriangle className="w-7 h-7 text-amber-500" />
                    ) : uploadedBookFile ? (
                      <FileCheck className="w-7 h-7 text-emerald-500" />
                    ) : (
                      <UploadCloud className="w-7 h-7" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground">
                      {isBatchMode && batchQueue.length > 0
                        ? bookModalTab === "manual"
                          ? `Mode Beruntun (Batch) Manual (${batchQueue.length} Buku Terdeteksi)`
                          : `Mode Batch Aktif (${batchQueue.length} Buku Terdeteksi)`
                        : uploadedBookFile && uploadedBookFile.size === 0
                        ? `⚠️ Berkas Terpilih: ${uploadedBookFile.name} (0 Bytes - Sandbox)`
                        : uploadedBookFile
                        ? `Berkas Terpilih: ${uploadedBookFile.name}`
                        : "Tarik & Lepas Berkas PDF / EPUB / ZIP di Sini, atau Klik untuk Memilih"}
                    </p>
                    <p className="text-xs text-muted-foreground max-w-lg mx-auto">
                      {isBatchMode && batchQueue.length > 0
                        ? bookModalTab === "manual"
                          ? `Berhasil membaca ${batchQueue.length} berkas. Mode Manual hanya mengekstrak sampul & jumlah halaman tanpa auto-write teks.`
                          : `Berhasil membaca ${batchQueue.length} buku dari arsip. Klik untuk menambahkan berkas lainnya.`
                        : uploadedBookFile && uploadedBookFile.size === 0
                        ? "Peramban diblokir membaca berkas oleh sandbox Flatpak. Klik di sini untuk memilih berkas lewat dialog sistem (File Chooser)."
                        : uploadedBookFile
                        ? `${(uploadedBookFile.size / (1024 * 1024)).toFixed(2)} MB • Sampul & ${bookForm.pageCount} halaman diekstrak otomatis • Klik untuk mengganti berkas`
                        : bookModalTab === "manual"
                        ? "Mendukung satu berkas maupun berkas beruntun (.ZIP / Multi-file). Otomatis mengekstrak sampul & jumlah halaman saja tanpa auto-write teks."
                        : "Mendukung satu berkas maupun arsip .ZIP berisi banyak buku sekaligus (Auto-Write Cerdas)."}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <Badge variant="outline" className="text-[11px] font-mono rounded-lg">
                      PDF (Auto Cover & Hal)
                    </Badge>
                    <Badge variant="outline" className="text-[11px] font-mono rounded-lg">
                      EPUB
                    </Badge>
                    <Badge variant="outline" className="text-[11px] font-mono rounded-lg border-sky-500/30 text-sky-600 dark:text-sky-400 bg-sky-500/5">
                      📦 Berkas Beruntun / ZIP
                    </Badge>
                    {bookModalTab === "manual" ? (
                      <Badge className="text-[11px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 rounded-lg">
                        ✍️ Mode Manual (Bebas Teks Otomatis)
                      </Badge>
                    ) : (
                      <Badge className="text-[11px] bg-primary/15 text-primary border-primary/20 rounded-lg">
                        ⚡ Ekstraksi Instan Otomatis (Cerdas)
                      </Badge>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleAutoSkipDuplicates(!autoSkipDuplicates)
                      }}
                      className={cn(
                        "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-lg border transition-colors cursor-pointer",
                        autoSkipDuplicates
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                          : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                      )}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Auto-Skip Duplikat: {autoSkipDuplicates ? "Aktif" : "Nonaktif"}</span>
                    </button>
                  </div>
                </div>

                {/* Extraction Progress Status */}
                {isExtractingPdf && (
                  <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-medium animate-pulse">
                    <Spinner className="w-4 h-4 text-sky-500 shrink-0" />
                    <span>{extractionStatus || "Membaca dokumen PDF & merender halaman depan..."}</span>
                  </div>
                )}

                {!isExtractingPdf && extractionStatus && (
                  <div
                    className={cn(
                      "flex items-center gap-2.5 p-3.5 rounded-2xl text-xs font-medium",
                      extractionStatus.includes("Gagal") || extractionStatus.includes("⚠️")
                        ? "bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400"
                        : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    )}
                  >
                    {extractionStatus.includes("Gagal") || extractionStatus.includes("⚠️") ? (
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                    )}
                    <span className="flex-1">{extractionStatus}</span>
                    {(extractionStatus.includes("Gagal") || extractionStatus.includes("⚠️")) && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => bookFileInputRef.current?.click()}
                        className="h-6 text-[10px] px-2 rounded-md bg-amber-600 hover:bg-amber-500 text-white cursor-pointer font-bold"
                      >
                        Pilih Berkas Sistem
                      </Button>
                    )}
                  </div>
                )}

                {/* IF BATCH MODE: SHOW BATCH QUEUE CARDS */}
                {isBatchMode && batchQueue.length > 0 ? (
                  <div className="space-y-4 pt-1">
                    {/* Batch Header Toolbar */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-2xl bg-muted/30 border border-border">
                      <div className="flex items-center gap-2.5">
                        <Archive className="w-4 h-4 text-sky-500" />
                        <span className="text-xs font-semibold text-foreground">
                          Antrean Unggah {bookModalTab === "manual" ? "Beruntun Manual" : "Massal Cerdas"} ({batchQueue.length} Buku)
                        </span>
                        {bookModalTab === "manual" && (
                          <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10">
                            Hanya Sampul & Halaman (Teks Manual)
                          </Badge>
                        )}
                      </div>
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => bookFileInputRef.current?.click()}
                            disabled={isProcessing}
                            className="h-7 text-[11px] rounded-lg gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            Tambah Berkas Lagi
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setIsBatchMode(false)
                              setBatchQueue([])
                              setUploadedBookFile(null)
                              setExtractionStatus("")
                            }}
                            disabled={isProcessing}
                            className="h-7 text-[11px] rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            Reset ke Satuan
                          </Button>
                        </div>
                      </div>

                      {/* QUICK BULK ASSIGN TOOLBAR FOR MANUAL MODE */}
                      {bookModalTab === "manual" && (
                        <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/25 space-y-2.5 text-xs animate-in fade-in">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <span className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                              <span>⚡ Terapkan Cepat ke Semua ({batchQueue.length} Buku):</span>
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              Memudahkan pengisian buku beruntun tanpa auto-write
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className="flex items-center gap-1.5">
                              <Select
                                onValueChange={(val) => applyBatchBulkField("categoryId", val)}
                              >
                                <SelectTrigger className="h-7.5 text-[11px] rounded-lg bg-card border-border">
                                  <SelectValue placeholder="--- Pilih Kategori Semua ---" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-border bg-popover text-xs max-h-48">
                                  {categoriesList.map((c) => (
                                    <SelectItem key={c.id} value={String(c.id)}>
                                      {c.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center gap-1">
                              <Input
                                id="bulk-author-input"
                                placeholder="Masukkan Nama Penulis..."
                                className="h-7.5 text-[11px] rounded-lg bg-card border-border"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const el = document.getElementById("bulk-author-input") as HTMLInputElement
                                  if (el && el.value.trim()) applyBatchBulkField("authorName", el.value.trim())
                                }}
                                className="h-7.5 px-2.5 text-[10px] rounded-lg cursor-pointer shrink-0 font-semibold"
                              >
                                Terapkan
                              </Button>
                            </div>
                            <div className="flex items-center gap-1">
                              <Input
                                id="bulk-publisher-input"
                                placeholder="Masukkan Nama Penerbit..."
                                className="h-7.5 text-[11px] rounded-lg bg-card border-border"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const el = document.getElementById("bulk-publisher-input") as HTMLInputElement
                                  if (el && el.value.trim()) applyBatchBulkField("publisherName", el.value.trim())
                                }}
                                className="h-7.5 px-2.5 text-[10px] rounded-lg cursor-pointer shrink-0 font-semibold"
                              >
                                Terapkan
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Live Saving Progress Bar */}
                      {isProcessing && batchProgress.total > 0 && (
                        <div className="p-4 rounded-2xl bg-card border border-primary/20 shadow-sm space-y-2 animate-in fade-in">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-foreground flex items-center gap-2">
                              <Spinner className="w-3.5 h-3.5 text-primary" />
                              {batchProgress.message}
                            </span>
                            <span className="font-mono text-muted-foreground font-bold">
                              {Math.round((batchProgress.current / batchProgress.total) * 100)}%
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-300 rounded-full"
                              style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Queue Cards */}
                      <div className="space-y-3 max-h-[50vh] sm:max-h-[52vh] overflow-y-auto p-1.5 pr-2.5 pb-8 scroll-pb-8">
                        {batchQueue.map((item, index) => (
                          <div
                            key={item.id}
                            className={cn(
                              "p-3.5 rounded-2xl border transition-all duration-200 bg-card shadow-xs space-y-3",
                              item.status === "extracting"
                                ? "border-sky-500/50 bg-sky-500/5 animate-pulse"
                                : item.status === "success"
                                ? "border-emerald-500/50 bg-emerald-500/5"
                                : item.status === "error"
                                ? "border-rose-500/50 bg-rose-500/5"
                                : item.status === "skipped"
                                ? "border-amber-500/50 bg-amber-500/5 opacity-90"
                                : "border-border hover:border-primary/40"
                            )}
                          >
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
                              <div className="flex items-center gap-3 w-full sm:w-auto flex-1 min-w-0">
                                {/* Thumbnail */}
                                <div className="relative aspect-[3/4] w-12 sm:w-14 rounded-xl overflow-hidden border border-border bg-muted/40 shrink-0 shadow-xs">
                                  {item.coverUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center text-muted-foreground">
                                      <BookOpen className="w-4 h-4 opacity-40" />
                                      <span className="text-[8px] mt-0.5 font-mono">{item.format}</span>
                                    </div>
                                  )}
                                  <Badge className="absolute top-1 left-1 text-[7px] font-bold px-1 py-0 h-3 bg-black/70 text-white rounded">
                                    {item.format}
                                  </Badge>
                                </div>

                                {/* Title & Info */}
                                <div className="space-y-1 flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono font-bold text-muted-foreground shrink-0">#{index + 1}</span>
                                    <input
                                      type="text"
                                      value={item.title}
                                      onChange={(e) => updateBatchItem(item.id, { title: e.target.value, slug: generateCleanSlug(e.target.value) })}
                                      className="text-xs font-bold text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none w-full truncate py-0.5"
                                      placeholder="Masukkan Judul Buku..."
                                    />
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                    <span>{(item.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
                                    <span>•</span>
                                    <span>{item.pageCount} Hal</span>
                                    <span>•</span>
                                    <span className="font-mono text-foreground font-semibold px-1.5 py-0.5 rounded bg-muted/60 border border-border/50 text-[10px]">
                                      Thn {item.publishYear}
                                    </span>
                                    <span>•</span>
                                    <span className="truncate max-w-[160px]">{item.fileName}</span>
                                  </div>
                                  {item.isDuplicate && (
                                    <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 font-medium pt-0.5">
                                      <AlertTriangle className="w-3 h-3 shrink-0" />
                                      <span className="truncate">{item.duplicateReason || "Duplikat terdeteksi"}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Status & Actions */}
                              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                {item.status === "extracting" && (
                                  <Badge variant="outline" className="text-[10px] text-sky-600 border-sky-500/30 gap-1 animate-pulse">
                                    <Spinner className="w-3 h-3 text-sky-500" /> Ekstraksi...
                                  </Badge>
                                )}
                                {item.status === "ready" && (
                                  <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30 gap-1 bg-emerald-500/5">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Siap
                                  </Badge>
                                )}
                                {item.status === "skipped" && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/40 bg-amber-500/10 gap-1 font-semibold"
                                  >
                                    <AlertTriangle className="w-3 h-3 text-amber-500" /> Duplikat (Dilewati)
                                  </Badge>
                                )}
                                {item.status === "saving" && (
                                  <Badge variant="outline" className="text-[10px] text-primary border-primary/30 gap-1 animate-pulse">
                                    <Spinner className="w-3 h-3 text-primary" /> Menyimpan...
                                  </Badge>
                                )}
                                {item.status === "success" && (
                                  <Badge className="text-[10px] bg-emerald-500 text-white gap-1 font-semibold">
                                    <Check className="w-3 h-3" /> Tersimpan
                                  </Badge>
                                )}
                                {item.status === "error" && (
                                  <Badge variant="destructive" className="text-[10px] gap-1">
                                    <AlertCircle className="w-3 h-3" /> {item.errorMessage || "Gagal"}
                                  </Badge>
                                )}

                                {item.isDuplicate && item.status !== "success" && item.status !== "saving" && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      updateBatchItem(item.id, {
                                        status: item.status === "skipped" ? "ready" : "skipped",
                                      })
                                    }
                                    className="h-6 text-[10px] px-2 rounded-md border-border/80 text-foreground hover:bg-muted cursor-pointer"
                                  >
                                    {item.status === "skipped" ? "Tetap Simpan" : "Lewati"}
                                  </Button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => updateBatchItem(item.id, { isExpanded: !item.isExpanded })}
                                  className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-xs flex items-center cursor-pointer"
                                  title="Edit detail buku"
                                >
                                  {item.isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>

                                {item.status !== "success" && (
                                  <button
                                    type="button"
                                    onClick={() => removeBatchItem(item.id)}
                                    disabled={isProcessing}
                                    className="p-1 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition-colors cursor-pointer"
                                    title="Hapus dari antrean"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Expanded Detail Fields */}
                            {item.isExpanded && (
                              <div className="pt-2.5 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs animate-in fade-in">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-semibold text-muted-foreground">Kategori</label>
                                  <Select
                                    value={item.categoryId}
                                    onValueChange={(val) => updateBatchItem(item.id, { categoryId: val })}
                                  >
                                    <SelectTrigger className="w-full h-8 text-xs rounded-lg bg-card border-border">
                                      <SelectValue placeholder="--- Pilih Kategori ---" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-border bg-popover text-xs max-h-48">
                                      {categoriesList.map((c) => (
                                        <SelectItem key={c.id} value={String(c.id)}>
                                          {c.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-semibold text-muted-foreground">Penulis</label>
                                  <Input
                                    value={item.authorName}
                                    onChange={(e) => updateBatchItem(item.id, { authorName: e.target.value })}
                                    placeholder="Masukkan Nama Penulis..."
                                    className="h-8 text-xs rounded-lg bg-muted/20 border-border"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-semibold text-muted-foreground">Penerbit</label>
                                  <Input
                                    value={item.publisherName}
                                    onChange={(e) => updateBatchItem(item.id, { publisherName: e.target.value })}
                                    placeholder="Masukkan Nama Penerbit..."
                                    className="h-8 text-xs rounded-lg bg-muted/20 border-border"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-semibold text-muted-foreground">Tahun Terbit</label>
                                  <Input
                                    value={item.publishYear}
                                    onChange={(e) => updateBatchItem(item.id, { publishYear: e.target.value })}
                                    placeholder="Masukkan Tahun Terbit..."
                                    className="h-8 text-xs font-mono rounded-lg bg-muted/20 border-border"
                                  />
                                </div>

                                <div className="sm:col-span-2 lg:col-span-4 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-semibold text-muted-foreground">Sinopsis Buku</label>
                                    <button
                                      type="button"
                                      onClick={() => autoCompleteBatchItem(item.id)}
                                      className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                      <Sparkles className="w-3 h-3" /> Auto Isi Sinopsis
                                    </button>
                                  </div>
                                  <Textarea
                                    value={item.synopsis}
                                    onChange={(e) => updateBatchItem(item.id, { synopsis: e.target.value })}
                                    rows={2}
                                    placeholder="Masukkan Sinopsis Buku..."
                                    className="text-xs rounded-lg bg-muted/20 border-border resize-y leading-relaxed"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : bookModalTab === "auto" ? (
                    /* TAB 1: SINGLE AUTO WRITE FORM */
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-1">
                    {/* Left Column: Live Book Card Preview */}
                    <div className="lg:col-span-4 flex flex-col items-center sm:items-stretch gap-4 p-4 rounded-3xl bg-muted/25 border border-border/80">
                      <div className="text-center sm:text-left">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Preview Sampul Buku
                        </span>
                      </div>

                      <div className="relative aspect-[3/4] w-48 sm:w-full max-w-[240px] mx-auto rounded-2xl overflow-hidden border border-border bg-muted/40 shadow-xl group">
                        {bookForm.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={bookForm.coverUrl}
                            alt="Sampul Buku"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-muted-foreground gap-2">
                            <BookOpen className="w-8 h-8 opacity-40" />
                            <span className="text-xs">Belum ada sampul</span>
                          </div>
                        )}

                        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                          <Badge className="text-[10px] font-bold bg-black/70 text-white backdrop-blur-md border-white/10 rounded-md">
                            {bookForm.format}
                          </Badge>
                          {bookForm.isFeatured && (
                            <Badge className="text-[10px] font-bold bg-amber-500 text-white shadow-sm rounded-md">
                              ⭐ Pilihan
                            </Badge>
                          )}
                        </div>

                        <div className="absolute bottom-2.5 right-2.5">
                          <Badge className="text-[10px] font-medium bg-black/70 text-white backdrop-blur-md border-white/10 rounded-md">
                            {bookForm.pageCount} Halaman
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-2 w-full">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => coverImageInputRef.current?.click()}
                          className="w-full h-9 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
                        >
                          <ImagePlus className="w-3.5 h-3.5" />
                          <span>Ganti Sampul Manual</span>
                        </Button>

                        {uploadedBookFile && (
                          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 text-[11px] text-muted-foreground space-y-1">
                            <div className="flex justify-between">
                              <span>Format:</span>
                              <span className="font-semibold text-foreground">{bookForm.format}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Ukuran:</span>
                              <span className="font-semibold text-foreground">
                                {(uploadedBookFile.size / (1024 * 1024)).toFixed(2)} MB
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Halaman:</span>
                              <span className="font-semibold text-foreground">{bookForm.pageCount} Hal.</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Editable Metadata Fields */}
                    <div className="lg:col-span-8 space-y-4">
                      {/* DUPLICATE WARNING BANNER */}
                      {duplicateMatch && !editingBookId && (
                        <div className="p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200 space-y-3 animate-in fade-in">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            <div className="space-y-1 text-xs flex-1">
                              <div className="font-bold flex items-center gap-2">
                                <span>Buku Serupa Sudah Terdaftar di Katalog!</span>
                                <Badge variant="outline" className="text-[10px] border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300">
                                  Duplikat
                                </Badge>
                              </div>
                              <p className="text-[11px] leading-relaxed opacity-90">
                                Buku &quot;<strong>{duplicateMatch.title}</strong>&quot; sudah ada di katalog
                                {duplicateMatch.authorName ? ` (${duplicateMatch.authorName})` : ""}.
                                {autoSkipDuplicates && !allowSingleDuplicate
                                  ? " Fitur Auto-Skip aktif untuk mencegah duplikasi data."
                                  : ""}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-500/20 text-xs">
                            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-medium text-foreground">
                              <input
                                type="checkbox"
                                checked={allowSingleDuplicate}
                                onChange={(e) => setAllowSingleDuplicate(e.target.checked)}
                                className="w-4 h-4 rounded border-amber-500/50 text-amber-600 focus:ring-amber-500 cursor-pointer"
                              />
                              <span>Tetap simpan sebagai buku terpisah (Izinkan Duplikat)</span>
                            </label>

                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenEditBook(duplicateMatch)}
                              className="h-7 text-[11px] font-semibold gap-1.5 rounded-lg border-amber-500/40 bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 dark:text-amber-100 cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Buka & Edit Buku Terdaftar</span>
                            </Button>
                          </div>
                        </div>
                      )}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <span>Judul Buku *</span>
                            <span className="text-[11px] text-muted-foreground font-normal">
                              (Otomatis terisi dari berkas)
                            </span>
                          </label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAutoCompleteBookInfo}
                            className="h-7 px-2.5 text-[11px] font-semibold gap-1.5 rounded-lg border-sky-500/30 bg-sky-500/10 text-sky-600 hover:bg-sky-500/20 dark:text-sky-400 dark:hover:bg-sky-500/30 transition-all cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                            <span>Lengkapi Info & Sinopsis</span>
                          </Button>
                        </div>
                        <Input
                          value={bookForm.title}
                          onChange={(e) => {
                            const val = e.target.value
                            const prevAutoSlug = generateCleanSlug(bookForm.title)
                            setBookForm((prev) => ({
                              ...prev,
                              title: val,
                              slug: (!prev.slug || prev.slug === prevAutoSlug) ? generateCleanSlug(val) : prev.slug,
                            }))
                          }}
                          placeholder="Masukkan Judul Buku..."
                          className="h-10 text-xs rounded-xl bg-muted/20 border-border"
                        />
                        {bookFormErrors.title && <FieldError>{bookFormErrors.title}</FieldError>}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-foreground">Slug URL *</label>
                            <button
                              type="button"
                              onClick={() => {
                                if (bookForm.title) {
                                  setBookForm((prev) => ({ ...prev, slug: generateCleanSlug(prev.title) }))
                                }
                              }}
                              className="text-[10px] text-muted-foreground hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer"
                            >
                              Sinkronkan Judul
                            </button>
                          </div>
                          <Input
                            value={bookForm.slug}
                            onChange={(e) => setBookForm((prev) => ({ ...prev, slug: e.target.value }))}
                            placeholder="Masukkan Slug URL..."
                            className="h-10 text-xs font-mono rounded-xl bg-muted/20 border-border"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-foreground">Kategori *</label>
                            <button
                              type="button"
                              onClick={() => {
                                setQuickCatForm({ name: "", description: "" })
                                setQuickCatError("")
                                setIsQuickCatOpen(true)
                              }}
                              className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 flex items-center gap-1 hover:underline cursor-pointer"
                            >
                              <Plus className="h-3 w-3" />
                              <span>Kategori Baru</span>
                            </button>
                          </div>
                          <Select
                            value={bookForm.categoryId ? String(bookForm.categoryId) : ""}
                            onValueChange={(val) => setBookForm((prev) => ({ ...prev, categoryId: val }))}
                          >
                            <SelectTrigger className="w-full h-10 text-xs rounded-xl bg-card border-border font-medium">
                              <SelectValue placeholder="--- Pilih Kategori ---" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-border bg-popover text-xs max-h-64">
                              {categoriesList.map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-foreground">Nama Penulis / Tim Medis *</label>
                          <Input
                            value={bookForm.authorName}
                            onChange={(e) => setBookForm((prev) => ({ ...prev, authorName: e.target.value }))}
                            placeholder="Masukkan Nama Penulis / Tim Medis..."
                            className="h-10 text-xs rounded-xl bg-muted/20 border-border"
                          />
                          {bookFormErrors.author && <FieldError>{bookFormErrors.author}</FieldError>}
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-foreground">Penerbit</label>
                          <Input
                            value={bookForm.publisherName}
                            onChange={(e) => setBookForm((prev) => ({ ...prev, publisherName: e.target.value }))}
                            placeholder="Masukkan Nama Penerbit..."
                            className="h-10 text-xs rounded-xl bg-muted/20 border-border"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-foreground">Tahun Terbit</label>
                          <Input
                            value={bookForm.publishYear}
                            onChange={(e) => setBookForm((prev) => ({ ...prev, publishYear: e.target.value }))}
                            placeholder="Masukkan Tahun Terbit..."
                            className="h-10 text-xs font-mono rounded-xl bg-muted/20 border-border"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-foreground">Jumlah Halaman</label>
                          <Input
                            value={bookForm.pageCount}
                            onChange={(e) => setBookForm((prev) => ({ ...prev, pageCount: e.target.value }))}
                            placeholder="Masukkan Jumlah Halaman..."
                            className="h-10 text-xs font-mono rounded-xl bg-muted/20 border-border"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-foreground">Format Berkas</label>
                          <Select
                            value={bookForm.format}
                            onValueChange={(val: "PDF" | "EPUB" | "BOTH") => setBookForm((prev) => ({ ...prev, format: val }))}
                          >
                            <SelectTrigger className="w-full h-10 text-xs rounded-xl bg-card border-border font-medium">
                              <SelectValue placeholder="--- Pilih Format ---" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-border bg-popover text-xs">
                              <SelectItem value="PDF">Hanya PDF</SelectItem>
                              <SelectItem value="EPUB">Hanya EPUB</SelectItem>
                              <SelectItem value="BOTH">Keduanya (PDF & EPUB)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Tag Topik (Pisahkan dengan koma)</label>
                        <Input
                          value={bookForm.tagsInput}
                          onChange={(e) => setBookForm((prev) => ({ ...prev, tagsInput: e.target.value }))}
                          placeholder="Masukkan Tag Topik (pisahkan dengan koma)..."
                          className="h-10 text-xs rounded-xl bg-muted/20 border-border"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-foreground">Sinopsis Buku *</label>
                          <button
                            type="button"
                            onClick={handleAutoCompleteBookInfo}
                            className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Auto Isi Sinopsis</span>
                          </button>
                        </div>
                        <Textarea
                          value={bookForm.synopsis}
                          onChange={(e) => setBookForm((prev) => ({ ...prev, synopsis: e.target.value }))}
                          rows={4}
                          placeholder="Masukkan Sinopsis Buku..."
                          className="text-xs rounded-xl bg-muted/20 border-border resize-y leading-relaxed"
                        />
                        {bookFormErrors.synopsis && <FieldError>{bookFormErrors.synopsis}</FieldError>}
                      </div>

                      <div className="flex flex-wrap items-center gap-6 p-3 rounded-2xl bg-muted/30 border border-border text-xs">
                        <label className="flex items-center gap-2 font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={bookForm.isFeatured}
                            onChange={(e) => setBookForm((prev) => ({ ...prev, isFeatured: e.target.checked }))}
                            className="rounded border-border accent-primary"
                          />
                          <span>Tandai sebagai Pilihan Editor</span>
                        </label>

                        <label className="flex items-center gap-2 font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={bookForm.status === "aktif"}
                            onChange={(e) => setBookForm((prev) => ({ ...prev, status: e.target.checked ? "aktif" : "nonaktif" }))}
                            className="rounded border-border accent-primary"
                          />
                          <span>Status Aktif (Tersedia untuk Dibaca)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ========================================================= */
                  /* TAB 2: SINGLE MANUAL WRITE FORM (TULIS MANUAL LENGKAP)    */
                  /* ========================================================= */
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-1">
                    {/* Left Column: Sampul & Controls */}
                    <div className="lg:col-span-4 flex flex-col items-center sm:items-stretch gap-4 p-4 rounded-3xl bg-muted/25 border border-border/80">
                      {/* Berkas Buku Digital Card & Upload Action */}
                      <div className="w-full space-y-2 pb-3 border-b border-border/60">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            Berkas Buku Digital
                          </span>
                          {uploadedBookFile && (
                            <Badge variant="outline" className="text-[9px] font-semibold text-emerald-600 border-emerald-500/30 bg-emerald-500/5">
                              Terlampir
                            </Badge>
                          )}
                        </div>

                        {uploadedBookFile ? (
                          <div className="p-3 rounded-2xl bg-card border border-border/80 text-xs space-y-2 shadow-xs">
                            <div className="flex items-center justify-between font-semibold text-foreground">
                              <span className="truncate max-w-[170px] flex items-center gap-1.5" title={uploadedBookFile.name}>
                                <FileCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span className="truncate font-mono text-[11px]">{uploadedBookFile.name}</span>
                              </span>
                              <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                                {(uploadedBookFile.size / (1024 * 1024)).toFixed(2)} MB
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1.5 border-t border-border/50">
                              <span className="font-medium text-foreground">
                                {bookForm.pageCount} Halaman
                              </span>
                              <button
                                type="button"
                                onClick={() => bookFileInputRef.current?.click()}
                                className="text-primary hover:underline font-semibold text-[11px] cursor-pointer"
                              >
                                Ganti Berkas
                              </button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => bookFileInputRef.current?.click()}
                            className="w-full h-9 rounded-xl text-xs font-semibold gap-1.5 border-dashed border-primary/50 bg-primary/5 text-primary hover:bg-primary/10 cursor-pointer shadow-xs"
                          >
                            <FileUp className="w-3.5 h-3.5" />
                            <span>Pilih Berkas Buku (PDF / EPUB)</span>
                          </Button>
                        )}
                      </div>

                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-center sm:text-left">
                        Sampul Buku
                      </span>

                    <div className="relative aspect-[3/4] w-48 sm:w-full max-w-[240px] mx-auto rounded-2xl overflow-hidden border border-border bg-muted/40 shadow-xl group">
                      {bookForm.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={bookForm.coverUrl}
                          alt="Sampul Buku"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-muted-foreground gap-2">
                          <BookOpen className="w-8 h-8 opacity-40" />
                          <span className="text-xs">Belum ada sampul</span>
                        </div>
                      )}

                      <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                        <Badge className="text-[10px] font-bold bg-black/70 text-white backdrop-blur-md border-white/10 rounded-md">
                          {bookForm.format}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2 w-full">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => coverImageInputRef.current?.click()}
                        className="w-full h-9 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
                      >
                        <ImagePlus className="w-3.5 h-3.5" />
                        <span>Pilih Gambar dari Komputer</span>
                      </Button>

                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground">Atau Masukkan URL Gambar Sampul</label>
                        <Input
                          value={bookForm.coverUrl}
                          onChange={(e) => setBookForm((prev) => ({ ...prev, coverUrl: e.target.value }))}
                          placeholder="Masukkan URL Gambar Sampul..."
                          className="h-8.5 text-xs rounded-xl bg-muted/20 border-border"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 w-full pt-2 border-t border-border/60">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Format Berkas
                      </label>
                      <Select
                        value={bookForm.format}
                        onValueChange={(val: "PDF" | "EPUB" | "BOTH") => setBookForm((prev) => ({ ...prev, format: val }))}
                      >
                        <SelectTrigger className="w-full h-9.5 text-xs rounded-xl bg-card border-border font-medium">
                          <SelectValue placeholder="--- Pilih Format ---" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-border bg-popover text-xs">
                          <SelectItem value="PDF">Hanya PDF</SelectItem>
                          <SelectItem value="EPUB">Hanya EPUB</SelectItem>
                          <SelectItem value="BOTH">Keduanya (PDF & EPUB)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 w-full pt-2 border-t border-border/60">
                      <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={bookForm.isFeatured}
                          onChange={(e) => setBookForm((prev) => ({ ...prev, isFeatured: e.target.checked }))}
                          className="rounded border-border accent-primary"
                        />
                        <span>Pilihan Editor</span>
                      </label>

                      <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={bookForm.status === "aktif"}
                          onChange={(e) => setBookForm((prev) => ({ ...prev, status: e.target.checked ? "aktif" : "nonaktif" }))}
                          className="rounded border-border accent-primary"
                        />
                        <span>Status Aktif</span>
                      </label>
                    </div>
                  </div>

                  {/* Right Column: Metadata Fields */}
                  <div className="lg:col-span-8 space-y-4">
                    {/* DUPLICATE WARNING BANNER */}
                    {duplicateMatch && !editingBookId && (
                      <div className="p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200 space-y-3 animate-in fade-in">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                          <div className="space-y-1 text-xs flex-1">
                            <div className="font-bold flex items-center gap-2">
                              <span>Buku Serupa Sudah Terdaftar di Katalog!</span>
                              <Badge variant="outline" className="text-[10px] border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300">
                                Duplikat
                              </Badge>
                            </div>
                            <p className="text-[11px] leading-relaxed opacity-90">
                              Buku &quot;<strong>{duplicateMatch.title}</strong>&quot; sudah ada di katalog
                              {duplicateMatch.authorName ? ` (${duplicateMatch.authorName})` : ""}.
                              {autoSkipDuplicates && !allowSingleDuplicate
                                ? " Fitur Auto-Skip aktif untuk mencegah duplikasi data."
                                : ""}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-500/20 text-xs">
                          <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-medium text-foreground">
                            <input
                              type="checkbox"
                              checked={allowSingleDuplicate}
                              onChange={(e) => setAllowSingleDuplicate(e.target.checked)}
                              className="w-4 h-4 rounded border-amber-500/50 text-amber-600 focus:ring-amber-500 cursor-pointer"
                            />
                            <span>Tetap simpan sebagai buku terpisah (Izinkan Duplikat)</span>
                          </label>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEditBook(duplicateMatch)}
                            className="h-7 text-[11px] font-semibold gap-1.5 rounded-lg border-amber-500/40 bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 dark:text-amber-100 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Buka & Edit Buku Terdaftar</span>
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-foreground">Judul Buku *</label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAutoCompleteBookInfo}
                          className="h-7 px-2.5 text-[11px] font-semibold gap-1.5 rounded-lg border-sky-500/30 bg-sky-500/10 text-sky-600 hover:bg-sky-500/20 dark:text-sky-400 dark:hover:bg-sky-500/30 transition-all cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                          <span>Lengkapi Info & Sinopsis</span>
                        </Button>
                      </div>
                      <Input
                        value={bookForm.title}
                        onChange={(e) => {
                          const val = e.target.value
                          const prevAutoSlug = generateCleanSlug(bookForm.title)
                          setBookForm((prev) => ({
                            ...prev,
                            title: val,
                            slug: (!prev.slug || prev.slug === prevAutoSlug) ? generateCleanSlug(val) : prev.slug,
                          }))
                        }}
                        placeholder="Masukkan Judul Buku..."
                        className="h-10 text-xs rounded-xl bg-muted/20 border-border"
                      />
                      {bookFormErrors.title && <FieldError>{bookFormErrors.title}</FieldError>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-foreground">Slug URL *</label>
                          <button
                            type="button"
                            onClick={() => {
                              if (bookForm.title) {
                                setBookForm((prev) => ({ ...prev, slug: generateCleanSlug(prev.title) }))
                              }
                            }}
                            className="text-[10px] text-muted-foreground hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer"
                          >
                            Sinkronkan Judul
                          </button>
                        </div>
                        <Input
                          value={bookForm.slug}
                          onChange={(e) => setBookForm((prev) => ({ ...prev, slug: e.target.value }))}
                          placeholder="Masukkan Slug URL..."
                          className="h-10 text-xs font-mono rounded-xl bg-muted/20 border-border"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-foreground">Kategori *</label>
                          <button
                            type="button"
                            onClick={() => {
                              setQuickCatForm({ name: "", description: "" })
                              setQuickCatError("")
                              setIsQuickCatOpen(true)
                            }}
                            className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 flex items-center gap-1 hover:underline cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Kategori Baru</span>
                          </button>
                        </div>
                        <Select
                          value={bookForm.categoryId ? String(bookForm.categoryId) : ""}
                          onValueChange={(val) => setBookForm((prev) => ({ ...prev, categoryId: val }))}
                        >
                          <SelectTrigger className="w-full h-10 text-xs rounded-xl bg-card border-border font-medium">
                            <SelectValue placeholder="--- Pilih Kategori ---" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-border bg-popover text-xs max-h-64">
                            {categoriesList.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Nama Penulis / Tim Medis *</label>
                        <Input
                          value={bookForm.authorName}
                          onChange={(e) => setBookForm((prev) => ({ ...prev, authorName: e.target.value }))}
                          placeholder="Masukkan Nama Penulis / Tim Medis..."
                          className="h-10 text-xs rounded-xl bg-muted/20 border-border"
                        />
                        {bookFormErrors.author && <FieldError>{bookFormErrors.author}</FieldError>}
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Penerbit</label>
                        <Input
                          value={bookForm.publisherName}
                          onChange={(e) => setBookForm((prev) => ({ ...prev, publisherName: e.target.value }))}
                          placeholder="Masukkan Nama Penerbit..."
                          className="h-10 text-xs rounded-xl bg-muted/20 border-border"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Tahun Terbit</label>
                        <Input
                          value={bookForm.publishYear}
                          onChange={(e) => setBookForm((prev) => ({ ...prev, publishYear: e.target.value }))}
                          placeholder="Masukkan Tahun Terbit..."
                          className="h-10 text-xs font-mono rounded-xl bg-muted/20 border-border"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Jumlah Halaman</label>
                        <Input
                          value={bookForm.pageCount}
                          onChange={(e) => setBookForm((prev) => ({ ...prev, pageCount: e.target.value }))}
                          placeholder="Masukkan Jumlah Halaman..."
                          className="h-10 text-xs font-mono rounded-xl bg-muted/20 border-border"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Nomor ISBN</label>
                        <Input
                          value={bookForm.isbn}
                          onChange={(e) => setBookForm((prev) => ({ ...prev, isbn: e.target.value }))}
                          placeholder="Masukkan Nomor ISBN..."
                          className="h-10 text-xs font-mono rounded-xl bg-muted/20 border-border"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Tag Topik (Pisahkan dengan koma)</label>
                      <Input
                        value={bookForm.tagsInput}
                        onChange={(e) => setBookForm((prev) => ({ ...prev, tagsInput: e.target.value }))}
                        placeholder="Masukkan Tag Topik (pisahkan dengan koma)..."
                        className="h-10 text-xs rounded-xl bg-muted/20 border-border"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-foreground">Sinopsis Buku *</label>
                        <button
                          type="button"
                          onClick={handleAutoCompleteBookInfo}
                          className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Auto Isi Sinopsis</span>
                        </button>
                      </div>
                      <Textarea
                        value={bookForm.synopsis}
                        onChange={(e) => setBookForm((prev) => ({ ...prev, synopsis: e.target.value }))}
                        rows={4}
                        placeholder="Masukkan Sinopsis Buku..."
                        className="text-xs rounded-xl bg-muted/20 border-border resize-y leading-relaxed"
                      />
                      {bookFormErrors.synopsis && <FieldError>{bookFormErrors.synopsis}</FieldError>}
                    </div>
                  </div>
                </div>
              )}
              </div>

              {/* Dialog Footer */}
              <DialogFooter className="gap-2 pt-4 border-t border-border/60">
                {isBatchMode && batchQueue.length > 0 ? (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
                    <div className="text-xs text-muted-foreground self-start sm:self-center flex flex-wrap items-center gap-2">
                      <span className="font-bold text-foreground">{batchQueue.length} Buku</span>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        {batchQueue.filter((b) => b.status === "success").length} Tersimpan
                      </span>
                      {batchQueue.filter((b) => b.status === "skipped").length > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">
                            {batchQueue.filter((b) => b.status === "skipped").length} Duplikat Dilewati
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsBookModalOpen(false)}
                        disabled={isProcessing}
                        className="h-10 px-5 rounded-xl text-xs cursor-pointer"
                      >
                        {batchQueue.every((b) => b.status === "success" || b.status === "skipped") ? "Tutup" : "Batal"}
                      </Button>
                      <Button
                        type="button"
                        onClick={handleSaveBatch}
                        disabled={
                          isProcessing ||
                          batchQueue.every(
                            (b) => b.status === "success" || (autoSkipDuplicates && b.status === "skipped")
                          )
                        }
                        className="h-10 px-6 rounded-xl text-xs font-bold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/25 cursor-pointer"
                      >
                        {isProcessing ? (
                          <span className="flex items-center gap-2">
                            <Spinner className="w-3.5 h-3.5 text-white" />
                            <span>
                              Menyimpan ({batchProgress.current}/{batchProgress.total})...
                            </span>
                          </span>
                        ) : batchQueue.every((b) => b.status === "success") ? (
                          <span className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-white" />
                            <span>Semua Buku Tersimpan!</span>
                          </span>
                        ) : batchQueue.every((b) => b.status === "success" || b.status === "skipped") ? (
                          <span className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-white" />
                            <span>Selesai (Duplikat Dilewati)</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <UploadCloud className="w-4 h-4" />
                            <span>
                              Simpan (
                              {
                                batchQueue.filter(
                                  (b) => b.status !== "success" && (!autoSkipDuplicates || b.status !== "skipped")
                                ).length
                              }{" "}
                              Buku Baru)
                            </span>
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsBookModalOpen(false)}
                      disabled={isProcessing}
                      className="h-10 px-5 rounded-xl text-xs cursor-pointer"
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      disabled={isProcessing || isExtractingPdf}
                      className="h-10 px-6 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/25 cursor-pointer"
                    >
                      {isProcessing ? (
                        <span className="flex items-center gap-2">
                          <Spinner className="w-3.5 h-3.5 text-white" />
                          <span>Menyimpan ke Database...</span>
                        </span>
                      ) : (
                        <span>Simpan ke Database</span>
                      )}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ================================================================= */}
        {/* MODAL: TAMBAH KATEGORI CEPAT (INLINE DARI MODAL BUKU) */}
        {/* ================================================================= */}
        <Dialog open={isQuickCatOpen} onOpenChange={setIsQuickCatOpen}>
          <DialogContent className="max-w-md p-5 sm:p-6 rounded-3xl border-border shadow-2xl z-50">
            <DialogHeader className="space-y-1">
              <DialogTitle className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                <FolderTree className="h-5 w-5 text-sky-600" />
                <span>Tambah Kategori Baru Cepat</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Kategori yang Anda buat di sini akan otomatis terpilih pada formulir buku yang sedang diisi.
              </DialogDescription>
            </DialogHeader>

            <form noValidate onSubmit={handleCreateQuickCategory} className="space-y-4 pt-2">
              {quickCatError && (
                <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-200 dark:border-rose-900 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{quickCatError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Nama Kategori *</label>
                <Input
                  value={quickCatForm.name}
                  onChange={(e) => {
                    setQuickCatForm((prev) => ({ ...prev, name: e.target.value }))
                    if (quickCatError) setQuickCatError("")
                  }}
                  placeholder="Masukkan Nama Kategori..."
                  className="h-10 text-xs rounded-xl bg-muted/20 border-border"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Deskripsi (Opsional)</label>
                <Textarea
                  value={quickCatForm.description}
                  onChange={(e) => setQuickCatForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Masukkan Deskripsi Kategori..."
                  rows={2}
                  className="text-xs rounded-xl bg-muted/20 border-border resize-none"
                />
              </div>

              <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsQuickCatOpen(false)}
                  className="rounded-xl text-xs h-9"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isQuickCatSubmitting || !quickCatForm.name.trim()}
                  className="rounded-xl text-xs h-9 bg-sky-600 hover:bg-sky-700 text-white font-semibold"
                >
                  {isQuickCatSubmitting ? (
                    <>
                      <Spinner className="h-3 w-3 mr-1" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan & Terapkan</span>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ================================================================= */}
        {/* MODAL: TAMBAH / EDIT KATEGORI */}
        {/* ================================================================= */}
        <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
          <DialogContent className="max-w-md p-5 sm:p-6 rounded-3xl border-border shadow-2xl">
            <DialogHeader className="space-y-1">
              <DialogTitle className="font-heading text-base sm:text-lg font-bold text-foreground">
                {editingCategoryId ? "Edit Kategori Literatur" : "Tambah Kategori Baru"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Kategori akan muncul di menu katalog dan filter beranda pembaca.
              </DialogDescription>
            </DialogHeader>

            <form noValidate onSubmit={handleSaveCategory} className="space-y-3.5 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Nama Kategori *</label>
                <Input
                  value={categoryForm.name}
                  onChange={(e) => {
                    const val = e.target.value
                    setCategoryForm((prev) => ({
                      ...prev,
                      name: val,
                      slug: prev.slug || val.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").trim(),
                    }))
                  }}
                  placeholder="Masukkan Nama Kategori..."
                  className="h-9.5 text-xs rounded-xl bg-muted/20 border-border"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Slug URL *</label>
                <Input
                  value={categoryForm.slug}
                  onChange={(e) => setCategoryForm((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="Masukkan Slug URL Kategori..."
                  className="h-9.5 text-xs font-mono rounded-xl bg-muted/20 border-border"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Ikon Lucide</label>
                <Select
                  value={categoryForm.iconName}
                  onValueChange={(val) => setCategoryForm((prev) => ({ ...prev, iconName: val }))}
                >
                  <SelectTrigger className="w-full h-9.5 text-xs rounded-xl bg-card border-border font-medium">
                    <SelectValue placeholder="--- Pilih Ikon ---" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border bg-popover text-xs max-h-60">
                    {CATEGORY_ICON_OPTIONS.map((icon) => (
                      <SelectItem key={icon} value={icon}>
                        {icon}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Deskripsi Kategori</label>
                <Textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  placeholder="Masukkan Deskripsi Kategori..."
                  className="text-xs rounded-xl bg-muted/20 border-border"
                />
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCategoryModalOpen(false)}
                  disabled={isProcessing}
                  className="h-9 rounded-xl text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isProcessing}
                  className="h-9 px-4 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white cursor-pointer"
                >
                  {isProcessing ? "Menyimpan..." : "Simpan Kategori"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ================================================================= */}
        {/* MODAL: TAMBAH / EDIT TAG */}
        {/* ================================================================= */}
        <Dialog open={isTagModalOpen} onOpenChange={setIsTagModalOpen}>
          <DialogContent className="max-w-sm p-5 rounded-3xl border-border shadow-2xl">
            <DialogHeader className="space-y-1">
              <DialogTitle className="font-heading text-base font-bold text-foreground">
                {editingTagId ? "Edit Tag Kata Kunci" : "Tambah Tag Kata Kunci"}
              </DialogTitle>
            </DialogHeader>

            <form noValidate onSubmit={handleSaveTag} className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Nama Tag *</label>
                <Input
                  value={tagForm.name}
                  onChange={(e) => {
                    const val = e.target.value
                    setTagForm({
                      name: val,
                      slug: val.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").trim(),
                    })
                  }}
                  placeholder="Masukkan Nama Tag..."
                  className="h-9.5 text-xs rounded-xl bg-muted/20 border-border"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Slug URL</label>
                <Input
                  value={tagForm.slug}
                  onChange={(e) => setTagForm((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="Masukkan Slug URL Tag..."
                  className="h-9.5 text-xs font-mono rounded-xl bg-muted/20 border-border"
                />
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsTagModalOpen(false)}
                  disabled={isProcessing}
                  className="h-9 rounded-xl text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isProcessing}
                  className="h-9 px-4 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white cursor-pointer"
                >
                  {isProcessing ? "Menyimpan..." : "Simpan Tag"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ================================================================= */}
        {/* MODAL: UBAH PERAN PENGGUNA (KHUSUS SUPER ADMIN) */}
        {/* ================================================================= */}
        <Dialog open={Boolean(roleModalUser)} onOpenChange={(open) => !open && setRoleModalUser(null)}>
          <DialogContent className="max-w-sm p-5 rounded-3xl border-border shadow-2xl">
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                <Crown className="h-5 w-5" />
                <DialogTitle className="font-heading text-base font-bold text-foreground">
                  Kelola Peran Akun
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Tentukan hak akses untuk pengguna <strong>{roleModalUser?.name}</strong> ({roleModalUser?.email}).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              <div className="space-y-2">
                <label
                  onClick={() => setSelectedNewRole("member")}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-colors",
                    selectedNewRole === "member"
                      ? "border-sky-500 bg-sky-500/10 text-foreground"
                      : "border-border hover:bg-muted/40 text-muted-foreground"
                  )}
                >
                  <input
                    type="radio"
                    name="newRole"
                    checked={selectedNewRole === "member"}
                    onChange={() => setSelectedNewRole("member")}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-bold text-xs text-foreground">Member (Pembaca)</div>
                    <div className="text-[11px] text-muted-foreground">
                      Hanya dapat meminjam dan membaca e-book. Jika diturunkan dari Admin, akun wajib melakukan verifikasi.
                    </div>
                  </div>
                </label>

                <label
                  onClick={() => setSelectedNewRole("admin")}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-colors",
                    selectedNewRole === "admin"
                      ? "border-sky-500 bg-sky-500/10 text-foreground"
                      : "border-border hover:bg-muted/40 text-muted-foreground"
                  )}
                >
                  <input
                    type="radio"
                    name="newRole"
                    checked={selectedNewRole === "admin"}
                    onChange={() => setSelectedNewRole("admin")}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-sky-600" />
                      <span>Admin Pustakawan</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Akses CRUD penuh ke buku, kategori, tag, dan peminjaman. Otomatis bebas verifikasi member.
                    </div>
                  </div>
                </label>

                <div className="p-3 rounded-2xl bg-muted/40 border border-border/70 text-[11px] text-muted-foreground flex items-center gap-2.5">
                  <Crown className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span>
                    Tingkat hak akses <strong>Super Administrator (Owner)</strong> bersifat tunggal dan dialihkan secara aman melalui tombol <strong>Transfer Owner</strong> di tabel tim admin.
                  </span>
                </div>
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRoleModalUser(null)}
                  disabled={isProcessing}
                  className="h-9 rounded-xl text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveUserRole}
                  disabled={isProcessing}
                  className="h-9 px-4 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white cursor-pointer shadow-xs"
                >
                  {isProcessing ? "Menyimpan..." : "Perbarui Peran"}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* ================================================================= */}
        {/* MODAL: KONFIRMASI HAPUS PERMANEN (CUSTOM RADIX DIALOG) */}
        {/* ================================================================= */}
        <Dialog
          open={Boolean(deleteModal?.isOpen)}
          onOpenChange={(open) => {
            if (!open && !isProcessing) setDeleteModal(null)
          }}
        >
          <DialogContent className="w-full sm:max-w-md p-6 rounded-3xl border border-border bg-card shadow-2xl overflow-hidden">
            <DialogHeader className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
                  <Trash2 className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-base font-bold text-foreground">
                    {deleteModal?.title || "Konfirmasi Hapus"}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Tindakan ini permanen di basis data MariaDB.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-3.5 py-2 text-xs w-full min-w-0 overflow-hidden">
              <p className="text-foreground/80 leading-relaxed break-words">
                {deleteModal?.description}
              </p>

              {deleteModal?.itemName && (
                <div className="p-3.5 rounded-xl bg-muted/60 border border-border/80 flex items-start gap-2.5 min-w-0 w-full overflow-hidden">
                  <Badge variant="outline" className="text-[10px] uppercase font-bold shrink-0 bg-background border-border mt-0.5">
                    {deleteModal.itemType}
                  </Badge>
                  <span className="font-semibold text-foreground text-xs leading-relaxed break-words min-w-0 flex-1">
                    {deleteModal.itemName}
                  </span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 text-xs font-medium flex items-center gap-2.5 min-w-0 w-full">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span className="break-words min-w-0 flex-1 leading-snug">Data yang dihapus tidak dapat dipulihkan kembali.</span>
              </div>
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-border/60 mt-1 w-full min-w-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteModal(null)}
                disabled={isProcessing}
                className="h-10 px-4 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground border-border hover:bg-muted/60 transition-all cursor-pointer w-full sm:w-auto"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  if (!deleteModal) return
                  setIsProcessing(true)
                  try {
                    await deleteModal.onConfirm()
                  } finally {
                    setIsProcessing(false)
                    setDeleteModal(null)
                  }
                }}
                disabled={isProcessing}
                className="h-10 px-5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white gap-2 shadow-md shadow-rose-600/25 hover:shadow-lg hover:shadow-rose-600/35 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 w-full sm:w-auto"
              >
                {isProcessing ? <Spinner className="h-4 w-4 text-white" /> : <Trash2 className="h-4 w-4 text-white" />}
                <span>Hapus Permanen</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ================================================================= */}
        {/* MODAL: TAMBAH ADMINISTRATOR BARU (KHUSUS SUPER ADMIN) */}
        {/* ================================================================= */}
        <Dialog open={isAddAdminModalOpen} onOpenChange={setIsAddAdminModalOpen}>
          <DialogContent className="w-full sm:max-w-lg p-6 rounded-3xl border-border bg-card shadow-2xl overflow-y-auto max-h-[92vh]">
            <DialogHeader className="space-y-1 pb-2 border-b border-border/60 pr-10 sm:pr-8">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                <Crown className="h-5 w-5 shrink-0" />
                <DialogTitle className="font-heading text-base sm:text-lg font-bold text-foreground">
                  Tambah Akun Administrator Baru
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Daftarkan pustakawan atau staf pengelola baru untuk sistem perpustakaan RSJD Atma Husada Mahakam.
              </DialogDescription>
            </DialogHeader>

            <form noValidate onSubmit={handleCreateAdmin} className="space-y-4 pt-2">
              {addAdminError && (
                <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{addAdminError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-foreground">
                    Nama Lengkap Staf / Pustakawan <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="Masukkan Nama Lengkap..."
                    value={newAdminForm.name}
                    onChange={(e) => setNewAdminForm({ ...newAdminForm, name: e.target.value })}
                    className="h-9.5 rounded-xl text-xs bg-muted/20 border-border"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-foreground">
                    Alamat Email Akun / Dinas <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    required
                    type="email"
                    placeholder="Masukkan Email..."
                    value={newAdminForm.email}
                    onChange={(e) => setNewAdminForm({ ...newAdminForm, email: e.target.value })}
                    className="h-9.5 rounded-xl text-xs bg-muted/20 border-border"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">
                      Kata Sandi Sementara <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const pass = generateRandomPassword()
                        setNewAdminForm({ ...newAdminForm, password: pass })
                        setShowAdminPassword(true)
                      }}
                      className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>Buat Sandi Acak</span>
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      required
                      type={showAdminPassword ? "text" : "password"}
                      placeholder="Masukkan Password..."
                      value={newAdminForm.password}
                      onChange={(e) => setNewAdminForm({ ...newAdminForm, password: e.target.value })}
                      className="h-9.5 rounded-xl text-xs bg-muted/20 border-border pr-9 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1"
                    >
                      {showAdminPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-900 dark:text-sky-300 flex items-center gap-2.5 sm:col-span-2">
                  <Shield className="h-4 w-4 text-sky-600 shrink-0" />
                  <span>
                    Akun baru otomatis didaftarkan sebagai <strong>Admin Pustakawan</strong> resmi perpustakaan.
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    NIK / NIP (Opsional)
                  </label>
                  <Input
                    placeholder="Masukkan NIK / NIP..."
                    value={newAdminForm.nik}
                    onChange={(e) => setNewAdminForm({ ...newAdminForm, nik: e.target.value })}
                    className="h-9.5 rounded-xl text-xs bg-muted/20 border-border font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    No. WhatsApp / HP (Opsional)
                  </label>
                  <Input
                    placeholder="Masukkan Nomor Telepon..."
                    value={newAdminForm.phone}
                    onChange={(e) => setNewAdminForm({ ...newAdminForm, phone: e.target.value })}
                    className="h-9.5 rounded-xl text-xs bg-muted/20 border-border"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-foreground">
                    Unit Kerja / Jabatan
                  </label>
                  <Input
                    placeholder="Masukkan Unit Kerja / Jabatan..."
                    value={newAdminForm.institution}
                    onChange={(e) => setNewAdminForm({ ...newAdminForm, institution: e.target.value })}
                    className="h-9.5 rounded-xl text-xs bg-muted/20 border-border"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 pt-3 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddAdminModalOpen(false)}
                  disabled={isProcessing}
                  className="h-9 rounded-xl text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isProcessing}
                  className="h-9 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white cursor-pointer shadow-xs gap-1.5"
                >
                  {isProcessing ? <Spinner className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                  <span>{isProcessing ? "Menyimpan..." : "Daftarkan Administrator"}</span>
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ================================================================= */}
        {/* MODAL: RESET KATA SANDI ADMINISTRATOR (KHUSUS SUPER ADMIN) */}
        {/* ================================================================= */}
        <Dialog open={Boolean(resetPasswordModalUser)} onOpenChange={(open) => !open && setResetPasswordModalUser(null)}>
          <DialogContent className="max-w-sm p-5 rounded-3xl border-border bg-card shadow-2xl">
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
                <KeyRound className="h-5 w-5 shrink-0" />
                <DialogTitle className="font-heading text-base font-bold text-foreground">
                  Reset Kata Sandi Pengelola
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Masukkan kata sandi baru untuk <strong>{resetPasswordModalUser?.name}</strong> ({resetPasswordModalUser?.email}).
              </DialogDescription>
            </DialogHeader>

            <form noValidate onSubmit={handleResetPassword} className="space-y-4 pt-2">
              {resetPasswordError && (
                <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{resetPasswordError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    Kata Sandi Baru <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const pass = generateRandomPassword()
                      setNewResetPassword(pass)
                      setShowResetPassword(true)
                    }}
                    className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Buat Acak</span>
                  </button>
                </div>
                <div className="relative">
                  <Input
                    required
                    type={showResetPassword ? "text" : "password"}
                    placeholder="Masukkan Password..."
                    value={newResetPassword}
                    onChange={(e) => setNewResetPassword(e.target.value)}
                    className="h-9.5 rounded-xl text-xs bg-muted/20 border-border pr-9 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1"
                  >
                    {showResetPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Kata sandi baru akan langsung aktif dan dienkripsi scrypt di basis data.
                </p>
              </div>

              <DialogFooter className="gap-2 pt-2 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResetPasswordModalUser(null)}
                  disabled={isProcessing}
                  className="h-9 rounded-xl text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isProcessing}
                  className="h-9 px-4 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white cursor-pointer shadow-xs gap-1.5"
                >
                  {isProcessing ? <Spinner className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                  <span>{isProcessing ? "Menyimpan..." : "Terapkan Sandi Baru"}</span>
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* MODAL: TRANSFER KEPEMILIKAN SUPER ADMINISTRATOR (OWNER) */}
        <Dialog
          open={!!transferOwnerModalUser}
          onOpenChange={(open) => {
            if (!open) {
              setTransferOwnerModalUser(null)
              setTransferPassword("")
              setTransferAgreed(false)
              setTransferError("")
            }
          }}
        >
          <DialogContent className="max-w-md w-[95vw] rounded-3xl p-6 sm:p-7 border-border shadow-2xl">
            <DialogHeader className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600">
                  <Crown className="h-4 w-4" />
                </div>
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-amber-500/40 text-amber-700 dark:text-amber-400 font-bold">
                  Tindakan Kritis & Permanen
                </Badge>
              </div>
              <DialogTitle className="font-heading text-lg font-bold text-foreground">
                Transfer Kepemilikan Super Administrator
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                Anda akan menyerahkan kendali tertinggi (Owner) sistem perpustakaan PerpusAHM kepada staf berikut:
              </DialogDescription>
            </DialogHeader>

            {transferError && (
              <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{transferError}</span>
              </div>
            )}

            {transferOwnerModalUser && (
              <form noValidate onSubmit={handleTransferOwnership} className="space-y-4 pt-1">
                {/* Calon Penerima Info */}
                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0">
                    {transferOwnerModalUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs text-foreground truncate">
                      {transferOwnerModalUser.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate font-mono">
                      {transferOwnerModalUser.email}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {transferOwnerModalUser.institution || "Pustakawan RSJD"}
                    </div>
                  </div>
                  <Badge className="bg-sky-600 text-white text-[9px] px-2 py-0.5 font-semibold shrink-0">
                    Calon Owner
                  </Badge>
                </div>

                {/* Konsekuensi Pengalihan Alert */}
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 text-xs space-y-1.5 leading-relaxed">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Konsekuensi Pengalihan Kepemilikan:</span>
                  </div>
                  <ul className="list-disc pl-4 text-[11px] space-y-1 text-amber-800/90 dark:text-amber-300/90">
                    <li>
                      <strong>{transferOwnerModalUser.name}</strong> akan menjadi <strong>Super Administrator (Owner)</strong> baru sistem.
                    </li>
                    <li>
                      Akun Anda (<strong>{user?.name}</strong>) akan otomatis diturunkan menjadi <strong>Admin Pustakawan</strong>.
                    </li>
                    <li>
                      Tindakan ini permanen dan tidak dapat dibatalkan secara sepihak.
                    </li>
                  </ul>
                </div>

                {/* Input Kata Sandi Super Admin Saat Ini */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Kata Sandi Akun Anda (Konfirmasi Otorisasi) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      required
                      type={showTransferPassword ? "text" : "password"}
                      placeholder="Masukkan Password..."
                      value={transferPassword}
                      onChange={(e) => setTransferPassword(e.target.value)}
                      className="h-10 rounded-xl text-xs bg-muted/20 border-border pr-9 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTransferPassword(!showTransferPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1"
                    >
                      {showTransferPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-muted-foreground block">
                    Diperlukan untuk memvalidasi bahwa Anda adalah pemegang sah akun Super Admin.
                  </span>
                </div>

                {/* Checkbox Konfirmasi */}
                <label className="flex items-start gap-2.5 p-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={transferAgreed}
                    onChange={(e) => setTransferAgreed(e.target.checked)}
                    className="mt-0.5 rounded border-border"
                  />
                  <span className="text-[11px] text-foreground leading-snug">
                    Saya menyetujui dan memahami seluruh konsekuensi pengalihan kepemilikan <strong>Super Administrator</strong> ini.
                  </span>
                </label>

                <DialogFooter className="gap-2 pt-2 border-t border-border/60">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setTransferOwnerModalUser(null)}
                    disabled={isProcessing}
                    className="h-9 rounded-xl text-xs"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={isProcessing || !transferAgreed || !transferPassword.trim()}
                    className="h-9 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-600 via-rose-600 to-purple-600 hover:from-amber-500 hover:to-purple-500 text-white cursor-pointer shadow-md shadow-amber-600/20 gap-1.5"
                  >
                    {isProcessing ? <Spinner className="h-3.5 w-3.5" /> : <ArrowRightLeft className="h-3.5 w-3.5" />}
                    <span>{isProcessing ? "Memproses Transfer..." : "Alihkan Kepemilikan"}</span>
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* ================================================================= */}
        {/* MODAL: TAMBAH / EDIT ARTIKEL EDUKASI */}
        {/* ================================================================= */}
        <Dialog open={isArticleModalOpen} onOpenChange={setIsArticleModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 rounded-3xl border-border bg-card shadow-2xl">
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
                <Newspaper className="h-5 w-5" />
                <DialogTitle className="font-heading text-lg font-bold text-foreground">
                  {editingArticle ? "Edit Artikel Edukasi" : "Tulis Artikel Edukasi Baru"}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Lengkapi rincian konten literasi kesehatan jiwa atau pengumuman perpustakaan.
              </DialogDescription>
            </DialogHeader>

            <form noValidate onSubmit={handleSaveArticle} className="space-y-4 pt-2">
              {articleModalError && (
                <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{articleModalError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Judul Artikel */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-foreground">
                    Judul Artikel <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="Contoh: 5 Langkah Praktis Mengelola Stres Kerja..."
                    value={articleForm.title}
                    onChange={(e) => {
                      const title = e.target.value
                      const generatedSlug = title
                        .toLowerCase()
                        .replace(/[^\w\s-]/g, "")
                        .replace(/\s+/g, "-")
                        .replace(/--+/g, "-")
                        .trim()
                      setArticleForm({
                        ...articleForm,
                        title,
                        slug: editingArticle ? articleForm.slug : generatedSlug,
                      })
                    }}
                    className="h-9.5 rounded-xl text-xs bg-muted/20 border-border"
                  />
                </div>

                {/* Slug URL */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Slug URL
                  </label>
                  <Input
                    placeholder="slug-artikel"
                    value={articleForm.slug}
                    onChange={(e) => setArticleForm({ ...articleForm, slug: e.target.value })}
                    className="h-9.5 rounded-xl text-xs bg-muted/20 border-border font-mono text-[11px]"
                  />
                </div>

                {/* Kategori */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Kategori <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={articleForm.category}
                    onValueChange={(val) => setArticleForm({ ...articleForm, category: val })}
                  >
                    <SelectTrigger className="h-9.5 rounded-xl text-xs bg-muted/20 border-border">
                      <SelectValue placeholder="Pilih Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {ARTICLE_PRESET_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Penulis */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Nama Penulis / Penyusun
                  </label>
                  <Input
                    placeholder="Nama Penulis..."
                    value={articleForm.authorName}
                    onChange={(e) => setArticleForm({ ...articleForm, authorName: e.target.value })}
                    className="h-9.5 rounded-xl text-xs bg-muted/20 border-border"
                  />
                </div>

                {/* Estimasi Waktu Baca */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Estimasi Waktu Baca
                  </label>
                  <Input
                    placeholder="Contoh: 4 menit baca"
                    value={articleForm.readTime}
                    onChange={(e) => setArticleForm({ ...articleForm, readTime: e.target.value })}
                    className="h-9.5 rounded-xl text-xs bg-muted/20 border-border"
                  />
                </div>

                {/* URL Gambar Thumbnail */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-foreground">
                    URL Gambar Thumbnail (Unsplash / Web Image)
                  </label>
                  <Input
                    placeholder="https://images.unsplash.com/..."
                    value={articleForm.thumbnailUrl}
                    onChange={(e) => setArticleForm({ ...articleForm, thumbnailUrl: e.target.value })}
                    className="h-9.5 rounded-xl text-xs bg-muted/20 border-border font-mono text-[11px]"
                  />
                  {articleForm.thumbnailUrl && (
                    <div className="mt-2 relative w-full h-32 rounded-xl overflow-hidden border border-border bg-muted">
                      <img
                        src={articleForm.thumbnailUrl}
                        alt="Preview Thumbnail"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&auto=format&fit=crop&q=80"
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Ringkasan / Excerpt */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-foreground">
                    Ringkasan Singkat (Excerpt) <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Tulis ringkasan singkat 1-2 kalimat untuk kartu artikel..."
                    value={articleForm.excerpt}
                    onChange={(e) => setArticleForm({ ...articleForm, excerpt: e.target.value })}
                    className="w-full p-2.5 rounded-xl text-xs bg-muted/20 border border-border focus:outline-hidden focus:ring-2 focus:ring-sky-500 resize-none"
                  />
                </div>

                {/* Isi Artikel Lengkap */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-foreground">
                    Konten Lengkap Artikel
                  </label>
                  <textarea
                    rows={8}
                    placeholder="Tulis isi artikel lengkap di sini. Pisahkan paragraf dengan baris baru..."
                    value={articleForm.content}
                    onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
                    className="w-full p-2.5 rounded-xl text-xs bg-muted/20 border border-border focus:outline-hidden focus:ring-2 focus:ring-sky-500 font-sans leading-relaxed resize-y"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 pt-3 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsArticleModalOpen(false)}
                  disabled={isArticleSubmitting}
                  className="h-9 rounded-xl text-xs cursor-pointer"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isArticleSubmitting}
                  className="h-9 px-4 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white cursor-pointer shadow-xs gap-1.5"
                >
                  {isArticleSubmitting ? <Spinner className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                  <span>{isArticleSubmitting ? "Menyimpan..." : editingArticle ? "Perbarui Artikel" : "Terbitkan Artikel"}</span>
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ================================================================= */}
        {/* MODAL: PRATINJAU ARTIKEL */}
        {/* ================================================================= */}
        <Dialog open={Boolean(previewArticleModalItem)} onOpenChange={(open) => !open && setPreviewArticleModalItem(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-5 sm:p-7 rounded-3xl border-border bg-card shadow-2xl">
            {previewArticleModalItem && (
              <div className="space-y-4">
                <div className="relative aspect-16/9 w-full rounded-2xl overflow-hidden bg-muted">
                  <img
                    src={previewArticleModalItem.thumbnailUrl || "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&auto=format&fit=crop&q=80"}
                    alt={previewArticleModalItem.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="rounded-full bg-black/75 backdrop-blur-xs px-3 py-1 text-xs font-semibold text-white shadow-xs">
                      {previewArticleModalItem.category}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground leading-snug">
                    {previewArticleModalItem.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <User className="h-3.5 w-3.5 text-sky-600" />
                      <span>{previewArticleModalItem.authorName}</span>
                    </span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {new Date(previewArticleModalItem.publishedAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{previewArticleModalItem.readTime}</span>
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs text-sky-900 dark:text-sky-200 leading-relaxed italic">
                  &ldquo;{previewArticleModalItem.excerpt}&rdquo;
                </div>

                <div className="pt-2 text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-line space-y-3 font-sans">
                  {previewArticleModalItem.content || previewArticleModalItem.excerpt}
                </div>

                <DialogFooter className="pt-4 border-t border-border/60">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPreviewArticleModalItem(null)}
                    className="h-9 px-4 rounded-xl text-xs cursor-pointer"
                  >
                    Tutup Pratinjau
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ================================================================= */}
        {/* MODAL: HAPUS ARTIKEL KONFIRMASI */}
        {/* ================================================================= */}
        <Dialog open={Boolean(deleteArticleModalItem)} onOpenChange={(open) => !open && setDeleteArticleModalItem(null)}>
          <DialogContent className="max-w-md p-5 rounded-3xl border-border bg-card shadow-2xl">
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                <DialogTitle className="font-heading text-base font-bold text-foreground">
                  Hapus Artikel Edukasi
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Tindakan ini permanen. Artikel yang dihapus tidak dapat dipulihkan kembali.
              </DialogDescription>
            </DialogHeader>

            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 text-xs space-y-1 my-2">
              <p className="font-semibold text-foreground line-clamp-2">
                &ldquo;{deleteArticleModalItem?.title}&rdquo;
              </p>
              <p className="text-muted-foreground text-[11px]">
                Kategori: {deleteArticleModalItem?.category} &bull; Penulis: {deleteArticleModalItem?.authorName}
              </p>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteArticleModalItem(null)}
                disabled={isProcessing}
                className="h-9 rounded-xl text-xs cursor-pointer"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDeleteArticle}
                disabled={isProcessing}
                className="h-9 px-4 rounded-xl text-xs font-bold bg-destructive hover:bg-destructive/90 text-white cursor-pointer shadow-xs gap-1.5"
              >
                {isProcessing ? <Spinner className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                <span>{isProcessing ? "Menghapus..." : "Ya, Hapus Artikel"}</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </main>

      {/* MINI FOOTER KHUSUS ADMIN PORTAL */}
      <footer className="border-t border-border/60 bg-card/40 py-5 text-xs text-muted-foreground mt-auto">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">Portal Admin PerpusAHM</span>
            <span>&bull;</span>
            <span>&copy; {new Date().getFullYear()} RSJD Atma Husada Mahakam Samarinda</span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Basis Data MariaDB Terhubung
            </span>
            <span>&bull;</span>
            <span>v1.2.0 Enterprise</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
