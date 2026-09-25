export interface CategoryItem {
  id: string
  name: string
  slug: string
  iconName: string
  description?: string
  bookCount: number
}

export interface TagItem {
  id: string
  name: string
  slug: string
  usageCount: number
}

export interface AuthorItem {
  id: string
  name: string
  title: string
  bio: string
  photoUrl: string
  loanCount: number
}

export interface PublisherItem {
  id: string
  name: string
}

export interface BookItem {
  id: string
  title: string
  slug: string
  synopsis: string
  coverUrl: string
  authorId: string
  authorName: string
  authorPhoto?: string
  publisherId: string
  publisherName: string
  categoryId: string
  categoryName: string
  categorySlug?: string
  isbn: string
  publishYear: number
  language: string
  pageCount: number
  status: "aktif" | "nonaktif" // jika nonaktif, tombol baca disabled & badge Tidak Tersedia
  isFeatured: boolean
  loanCount: number
  averageRating: number
  reviewCount: number
  tags: string[]
  formats: {
    pdf: { available: boolean; status: "aktif" | "rusak" }
    epub: { available: boolean; status: "aktif" | "rusak" }
  }
  pdfUrl?: string | null
  epubUrl?: string | null
  fileUrl?: string | null
  reviews?: ReviewItem[]
}

export interface ArticleItem {
  id: string
  title: string
  slug: string
  thumbnailUrl: string
  excerpt: string
  authorName: string
  publishedAt: string
  readTime: string
  category: string
}

export interface ReviewItem {
  id: string
  userName: string
  userAvatar: string
  rating: number
  comment: string
  createdAt: string
  adminReply?: string
  adminReplyAt?: string
}

export const INITIAL_CATEGORIES: CategoryItem[] = [
  {
    id: "1",
    name: "Kesehatan Jiwa & Psikiatri",
    slug: "kesehatan-jiwa-psikiatri",
    iconName: "Brain",
    description: "Panduan pemahaman gangguan kejiwaan, neurobiologi, dan intervensi psikiatri modern.",
    bookCount: 42,
  },
  {
    id: "2",
    name: "Psikologi & Konseling",
    slug: "psikologi-konseling",
    iconName: "HeartHandshake",
    description: "Teknik konseling, psikoterapi kognitif perilaku, dan komunikasi terapeutik.",
    bookCount: 38,
  },
  {
    id: "3",
    name: "Pengembangan Diri & Mindfulness",
    slug: "pengembangan-diri-mindfulness",
    iconName: "Sparkles",
    description: "Latihan kesadaran penuh, resiliensi emosional, dan penemuan makna hidup.",
    bookCount: 56,
  },
  {
    id: "4",
    name: "Manajemen Stres & Burnout",
    slug: "manajemen-stres-burnout",
    iconName: "Activity",
    description: "Strategi mengatasi beban kerja, relaksasi saraf, dan pencegahan kelelahan mental.",
    bookCount: 31,
  },
  {
    id: "5",
    name: "Parenting & Perkembangan Anak",
    slug: "parenting-perkembangan-anak",
    iconName: "Users",
    description: "Pola asuh sehat, deteksi dini neurodivergensi, dan stimulasi emosi anak.",
    bookCount: 29,
  },
  {
    id: "6",
    name: "Gizi & Kesehatan Fisik",
    slug: "gizi-kesehatan-fisik",
    iconName: "Apple",
    description: "Koneksi sumbu usus-otak, nutrisi penunjang fungsi saraf, dan pola hidup sehat.",
    bookCount: 24,
  },
  {
    id: "7",
    name: "Geriatri & Kesehatan Lansia",
    slug: "geriatri-kesehatan-lansia",
    iconName: "Smile",
    description: "Perawatan demensia, dukungan psikogeriatri, dan kualitas hidup lanjut usia.",
    bookCount: 18,
  },
  {
    id: "8",
    name: "Pertolongan Pertama Psikologis",
    slug: "pertolongan-pertama-psikologis",
    iconName: "ShieldAlert",
    description: "Kesiapsiagaan krisis, intervensi pascatrauma, dan dukungan emosional darurat.",
    bookCount: 20,
  },
  {
    id: "14",
    name: "Sastra, Novel & Fiksi",
    slug: "sastra-novel-fiksi",
    iconName: "BookOpen",
    description: "Koleksi karya sastra, novel fiksi, rekreasi mental, dan biblioterapi untuk relaksasi pembaca.",
    bookCount: 15,
  },
  {
    id: "15",
    name: "Koleksi Umum & Literasi Populer",
    slug: "koleksi-umum-literasi-populer",
    iconName: "Compass",
    description: "Buku wawasan umum, sains populer, teknologi, biografi, dan pengetahuan multidisiplin.",
    bookCount: 12,
  },
]

export const POPULAR_TAGS: TagItem[] = [
  { id: "1", name: "Kesehatan Jiwa", slug: "kesehatan-jiwa", usageCount: 68 },
  { id: "2", name: "Meditasi", slug: "meditasi", usageCount: 54 },
  { id: "3", name: "Kecemasan", slug: "kecemasan", usageCount: 49 },
  { id: "4", name: "Depresi", slug: "depresi", usageCount: 45 },
  { id: "5", name: "Parenting", slug: "parenting", usageCount: 41 },
  { id: "6", name: "Self-Help", slug: "self-help", usageCount: 38 },
  { id: "7", name: "Gizi", slug: "gizi", usageCount: 35 },
  { id: "8", name: "Lansia", slug: "lansia", usageCount: 32 },
  { id: "9", name: "Pertolongan Pertama", slug: "pertolongan-pertama", usageCount: 29 },
  { id: "10", name: "Stres", slug: "stres", usageCount: 27 },
  { id: "11", name: "Mindfulness", slug: "mindfulness", usageCount: 25 },
  { id: "12", name: "Tidur Berkualitas", slug: "tidur-berkualitas", usageCount: 24 },
  { id: "13", name: "Bipolar", slug: "bipolar", usageCount: 22 },
  { id: "14", name: "Terapi Kognitif", slug: "terapi-kognitif", usageCount: 21 },
  { id: "15", name: "Remaja", slug: "remaja", usageCount: 19 },
  { id: "16", name: "Burnout", slug: "burnout", usageCount: 18 },
  { id: "17", name: "Trauma Healing", slug: "trauma-healing", usageCount: 16 },
  { id: "18", name: "Relaksasi", slug: "relaksasi", usageCount: 15 },
  { id: "19", name: "Konseling", slug: "konseling", usageCount: 14 },
  { id: "20", name: "Skizofrenia", slug: "skizofrenia", usageCount: 13 },
  { id: "21", name: "ADHD", slug: "adhd", usageCount: 12 },
  { id: "22", name: "Resiliensi", slug: "resiliensi", usageCount: 11 },
  { id: "23", name: "Pekerja Medis", slug: "pekerja-medis", usageCount: 10 },
  { id: "24", name: "Autisme", slug: "autisme", usageCount: 9 },
  { id: "25", name: "Emosi Sehat", slug: "emosi-sehat", usageCount: 8 },
  // Additional tags for expandable "Lainnya"
  { id: "26", name: "Psikosomatis", slug: "psikosomatis", usageCount: 7 },
  { id: "27", name: "Neurobiologi", slug: "neurobiologi", usageCount: 6 },
  { id: "28", name: "Keluarga Tangguh", slug: "keluarga-tangguh", usageCount: 5 },
  { id: "29", name: "Komunikasi Terapeutik", slug: "komunikasi-terapeutik", usageCount: 4 },
  { id: "30", name: "Psikoterapi Suportif", slug: "psikoterapi-suportif", usageCount: 3 },
]

export const POPULAR_AUTHORS: AuthorItem[] = [
  {
    id: "a1",
    name: "dr. Andi Wijaya, Sp.KJ",
    title: "Psikiater Konsultan RSJD",
    bio: "Spesialis kedokteran jiwa dengan fokus pada penanganan gangguan mood, ansietas, dan psikosomatis.",
    photoUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80",
    loanCount: 428,
  },
  {
    id: "a2",
    name: "Dra. Nurul Hikmah, M.Psi., Psikolog",
    title: "Psikolog Klinis Dewasa",
    bio: "Praktisi psikoterapi kognitif perilaku (CBT) dan mindfulness-based stress reduction.",
    photoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80",
    loanCount: 395,
  },
  {
    id: "a3",
    name: "dr. Hendra Pratama, Sp.A",
    title: "Dokter Spesialis Anak",
    bio: "Pemerhati tumbuh kembang emosi anak dan deteksi dini spektrum autisme & ADHD.",
    photoUrl: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=200&auto=format&fit=crop&q=80",
    loanCount: 312,
  },
  {
    id: "a4",
    name: "Siti Rahmawati, S.Gz, M.Gizi",
    title: "Ahli Gizi Klinis RSJD",
    bio: "Peneliti korelasi mikrobioma saluran cerna terhadap regulasi neurotransmitter serotonin.",
    photoUrl: "https://images.unsplash.com/photo-1594824813593-18e5486a4a40?w=200&auto=format&fit=crop&q=80",
    loanCount: 264,
  },
  {
    id: "a5",
    name: "dr. Rian Saputra, Sp.N",
    title: "Spesialis Neurologi",
    bio: "Pakar neurofisiologi tidur, ritme sirkadian, dan pengelolaan kelelahan kognitif.",
    photoUrl: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=200&auto=format&fit=crop&q=80",
    loanCount: 210,
  },
]

export const POPULAR_PUBLISHERS: PublisherItem[] = [
  { id: "p1", name: "Penerbit RSJD Atma Husada Mahakam" },
  { id: "p2", name: "EGC Penerbit Buku Kedokteran" },
  { id: "p3", name: "Gramedia Pustaka Utama" },
  { id: "p4", name: "UI Publishing" },
  { id: "p5", name: "Penerbit Buku Kompas" },
]

export const BOOKS_DATA: BookItem[] = [
  {
    id: "b1",
    title: "Menavigasi Badai Pikiran: Panduan Praktis Menaklukkan Kecemasan",
    slug: "menavigasi-badai-pikiran-panduan-praktis-kecemasan",
    synopsis:
      "Buku komprehensif yang dirancang oleh tim psikiater RSJD Atma Husada Mahakam untuk membantu individu mengenali tanda-tanda kecemasan berlebih (GAD, Panic Disorder) dan menerapkan teknik de-eskalasi emosi harian berbasis bukti klinis.",
    coverUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
    authorId: "a1",
    authorName: "dr. Andi Wijaya, Sp.KJ",
    authorPhoto: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80",
    publisherId: "p1",
    publisherName: "Penerbit RSJD Atma Husada Mahakam",
    categoryId: "1",
    categoryName: "Kesehatan Jiwa & Psikiatri",
    isbn: "978-602-8812-40-1",
    publishYear: 2024,
    language: "Indonesia",
    pageCount: 248,
    status: "aktif",
    isFeatured: true,
    loanCount: 512,
    averageRating: 4.88,
    reviewCount: 94,
    tags: ["Kesehatan Jiwa", "Kecemasan", "Terapi Kognitif", "Relaksasi"],
    formats: {
      pdf: { available: true, status: "aktif" },
      epub: { available: true, status: "aktif" },
    },
  },
  {
    id: "b2",
    title: "Seni Berhenti Sejenak: Terapi Mindfulness untuk Jiwa yang Lelah",
    slug: "seni-berhenti-sejenak-terapi-mindfulness",
    synopsis:
      "Di tengah ritme kerja modern yang serba cepat, buku ini menyajikan latihan mindfulness 10 menit setiap hari untuk menurunkan hormon kortisol, menstabilkan detak jantung, dan memulihkan kejernihan mental pembaca.",
    coverUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80",
    authorId: "a2",
    authorName: "Dra. Nurul Hikmah, M.Psi., Psikolog",
    authorPhoto: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80",
    publisherId: "p3",
    publisherName: "Gramedia Pustaka Utama",
    categoryId: "3",
    categoryName: "Pengembangan Diri & Mindfulness",
    isbn: "978-602-0341-11-9",
    publishYear: 2023,
    language: "Indonesia",
    pageCount: 196,
    status: "aktif",
    isFeatured: true,
    loanCount: 476,
    averageRating: 4.92,
    reviewCount: 128,
    tags: ["Mindfulness", "Meditasi", "Self-Help", "Burnout", "Emosi Sehat"],
    formats: {
      pdf: { available: true, status: "aktif" },
      epub: { available: true, status: "aktif" },
    },
  },
  {
    id: "b3",
    title: "Nutrisi Otak dan Suasana Hati: Pola Makan untuk Kebugaran Mental",
    slug: "nutrisi-otak-dan-suasana-hati",
    synopsis:
      "Eksplorasi ilmiah hubungan antara sistem pencernaan (gut microbiome) dan produksi hormon kebahagiaan. Disertai rencana menu 30 hari yang kaya akan asam lemak omega-3, probiotik, dan antioksidan pelindung sel saraf.",
    coverUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&auto=format&fit=crop&q=80",
    authorId: "a4",
    authorName: "Siti Rahmawati, S.Gz, M.Gizi",
    authorPhoto: "https://images.unsplash.com/photo-1594824813593-18e5486a4a40?w=200&auto=format&fit=crop&q=80",
    publisherId: "p2",
    publisherName: "EGC Penerbit Buku Kedokteran",
    categoryId: "6",
    categoryName: "Gizi & Kesehatan Fisik",
    isbn: "978-979-448-912-3",
    publishYear: 2024,
    language: "Indonesia",
    pageCount: 220,
    status: "aktif",
    isFeatured: true,
    loanCount: 432,
    averageRating: 4.79,
    reviewCount: 65,
    tags: ["Gizi", "Kesehatan Jiwa", "Neurobiologi", "Pola Makan"],
    formats: {
      pdf: { available: true, status: "aktif" },
      epub: { available: false, status: "aktif" },
    },
  },
  {
    id: "b4",
    title: "Memeluk Emosi Anak: Panduan Pola Asuh Tanpa Teriak",
    slug: "memeluk-emosi-anak-pola-asuh-tanpa-teriak",
    synopsis:
      "Buku panduan bagi orang tua untuk memahami regulasi emosi anak usia dini hingga remaja. Membantu orang tua menjadi jangkar yang tenang saat anak mengalami tantrum dan membangun koneksi emosional yang lekat.",
    coverUrl: "https://images.unsplash.com/photo-1476820865390-c52aeebb9891?w=600&auto=format&fit=crop&q=80",
    authorId: "a3",
    authorName: "dr. Hendra Pratama, Sp.A",
    authorPhoto: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=200&auto=format&fit=crop&q=80",
    publisherId: "p3",
    publisherName: "Gramedia Pustaka Utama",
    categoryId: "5",
    categoryName: "Parenting & Perkembangan Anak",
    isbn: "978-602-0654-20-4",
    publishYear: 2023,
    language: "Indonesia",
    pageCount: 272,
    status: "aktif",
    isFeatured: false,
    loanCount: 398,
    averageRating: 4.85,
    reviewCount: 88,
    tags: ["Parenting", "Remaja", "Emosi Sehat", "Keluarga Tangguh"],
    formats: {
      pdf: { available: true, status: "aktif" },
      epub: { available: true, status: "aktif" },
    },
  },
  {
    id: "b5",
    title: "Tidur Nyenyak, Jiwa Tenang: Terapi Insomnia dan Gangguan Irama Sirkadian",
    slug: "tidur-nyenyak-jiwa-tenang-terapi-insomnia",
    synopsis:
      "Mengupas mekanisme neurologis di balik siklus tidur REM dan Non-REM. Memberikan panduan sleep hygiene terstruktur tanpa ketergantungan obat penenang, sangat relevan bagi pekerja shift dan penderita kecemasan malam.",
    coverUrl: "https://images.unsplash.com/photo-1520072959219-c595dc870360?w=600&auto=format&fit=crop&q=80",
    authorId: "a5",
    authorName: "dr. Rian Saputra, Sp.N",
    authorPhoto: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=200&auto=format&fit=crop&q=80",
    publisherId: "p1",
    publisherName: "Penerbit RSJD Atma Husada Mahakam",
    categoryId: "4",
    categoryName: "Manajemen Stres & Burnout",
    isbn: "978-602-8812-45-6",
    publishYear: 2024,
    language: "Indonesia",
    pageCount: 184,
    status: "aktif",
    isFeatured: true,
    loanCount: 365,
    averageRating: 4.81,
    reviewCount: 71,
    tags: ["Tidur Berkualitas", "Stres", "Relaksasi", "Kesehatan Jiwa"],
    formats: {
      pdf: { available: true, status: "aktif" },
      epub: { available: true, status: "aktif" },
    },
  },
  {
    id: "b6",
    title: "Pertolongan Pertama pada Krisis Psikologis: Panduan Tanggap Bencana & Trauma",
    slug: "pertolongan-pertama-krisis-psikologis",
    synopsis:
      "Protokol standar Psychological First Aid (PFA) yang direkomendasikan WHO untuk masyarakat dan tenaga kesehatan saat menghadapi orang dalam kondisi panik, duka mendalam, atau syok pascabencana.",
    coverUrl: "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=600&auto=format&fit=crop&q=80",
    authorId: "a2",
    authorName: "Dra. Nurul Hikmah, M.Psi., Psikolog",
    authorPhoto: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80",
    publisherId: "p4",
    publisherName: "UI Publishing",
    categoryId: "8",
    categoryName: "Pertolongan Pertama Psikologis",
    isbn: "978-979-456-781-0",
    publishYear: 2022,
    language: "Indonesia",
    pageCount: 160,
    status: "aktif",
    isFeatured: false,
    loanCount: 340,
    averageRating: 4.74,
    reviewCount: 42,
    tags: ["Pertolongan Pertama", "Trauma Healing", "Konseling", "Pekerja Medis"],
    formats: {
      pdf: { available: true, status: "aktif" },
      epub: { available: true, status: "aktif" },
    },
  },
  {
    id: "b7",
    title: "Menua dengan Berdaya: Pendampingan Lansia dan Perawatan Demensia",
    slug: "menua-dengan-berdaya-pendampingan-lansia",
    synopsis:
      "Buku rujukan bagi keluarga dan perawat (caregiver) dalam merawat anggota keluarga usia lanjut. Mengulas stimulasi kognitif, pencegahan depresi geriatri, serta tips komunikasi penuh kasih bagi penderita Alzheimer.",
    coverUrl: "https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=600&auto=format&fit=crop&q=80",
    authorId: "a1",
    authorName: "dr. Andi Wijaya, Sp.KJ",
    authorPhoto: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80",
    publisherId: "p1",
    publisherName: "Penerbit RSJD Atma Husada Mahakam",
    categoryId: "7",
    categoryName: "Geriatri & Kesehatan Lansia",
    isbn: "978-602-8812-48-7",
    publishYear: 2023,
    language: "Indonesia",
    pageCount: 232,
    status: "aktif",
    isFeatured: false,
    loanCount: 310,
    averageRating: 4.82,
    reviewCount: 53,
    tags: ["Lansia", "Kesehatan Jiwa", "Keluarga Tangguh", "Psikoterapi Suportif"],
    formats: {
      pdf: { available: true, status: "aktif" },
      epub: { available: false, status: "aktif" },
    },
  },
  {
    id: "b8",
    title: "Mengurai Benang Kusut: Terapi Kognitif Perilaku untuk Depresi",
    slug: "mengurai-benang-kusut-terapi-kognitif-depresi",
    synopsis:
      "Buku kerja (workbook) interaktif yang menuntun pembaca mengidentifikasi distorsi kognitif (pikiran serba hitam-putih, katastrofisasi) dan menggantinya dengan penalaran yang lebih seimbang dan adaptif.",
    coverUrl: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&auto=format&fit=crop&q=80",
    authorId: "a2",
    authorName: "Dra. Nurul Hikmah, M.Psi., Psikolog",
    authorPhoto: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80",
    publisherId: "p2",
    publisherName: "EGC Penerbit Buku Kedokteran",
    categoryId: "2",
    categoryName: "Psikologi & Konseling",
    isbn: "978-979-448-950-5",
    publishYear: 2024,
    language: "Inggris",
    pageCount: 304,
    status: "aktif",
    isFeatured: true,
    loanCount: 295,
    averageRating: 4.9,
    reviewCount: 79,
    tags: ["Depresi", "Terapi Kognitif", "Kesehatan Jiwa", "Self-Help"],
    formats: {
      pdf: { available: true, status: "aktif" },
      epub: { available: true, status: "aktif" },
    },
  },
  {
    id: "b9",
    title: "Memahami Spektrum Autisme dan ADHD pada Remaja",
    slug: "memahami-spektrum-autisme-adhd-remaja",
    synopsis:
      "Menjawab pertanyaan seputar neurodiversitas pada usia transisi. Memberikan wawasan bagi pendidik dan orang tua agar mampu menciptakan lingkungan sekolah yang inklusif dan ramah sensorik.",
    coverUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&auto=format&fit=crop&q=80",
    authorId: "a3",
    authorName: "dr. Hendra Pratama, Sp.A",
    authorPhoto: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=200&auto=format&fit=crop&q=80",
    publisherId: "p4",
    publisherName: "UI Publishing",
    categoryId: "5",
    categoryName: "Parenting & Perkembangan Anak",
    isbn: "978-979-456-820-6",
    publishYear: 2023,
    language: "Indonesia",
    pageCount: 215,
    status: "aktif",
    isFeatured: false,
    loanCount: 278,
    averageRating: 4.77,
    reviewCount: 39,
    tags: ["ADHD", "Autisme", "Remaja", "Parenting"],
    formats: {
      pdf: { available: true, status: "aktif" },
      epub: { available: true, status: "aktif" },
    },
  },
  {
    id: "b10",
    title: "Resiliensi Jiwa di Tempat Kerja: Menghalau Burnout & Beban Mental",
    slug: "resiliensi-jiwa-tempat-kerja-menghalau-burnout",
    synopsis:
      "Kajian psikologi okupasi yang berfokus pada dinamika beban mental pekerja kantor dan tenaga medis garda terdepan. Dilengkapi checklist batasan emosional (boundaries) dan teknik pemulihan akhir pekan.",
    coverUrl: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600&auto=format&fit=crop&q=80",
    authorId: "a2",
    authorName: "Dra. Nurul Hikmah, M.Psi., Psikolog",
    authorPhoto: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80",
    publisherId: "p5",
    publisherName: "Penerbit Buku Kompas",
    categoryId: "4",
    categoryName: "Manajemen Stres & Burnout",
    isbn: "978-623-241-330-2",
    publishYear: 2024,
    language: "Indonesia",
    pageCount: 208,
    status: "aktif",
    isFeatured: false,
    loanCount: 260,
    averageRating: 4.83,
    reviewCount: 52,
    tags: ["Burnout", "Stres", "Resiliensi", "Pekerja Medis"],
    formats: {
      pdf: { available: true, status: "aktif" },
      epub: { available: true, status: "aktif" },
    },
  },
  {
    id: "b11",
    title: "Mengenal Gangguan Bipolar: Dari Diagnosis Menuju Keseimbangan",
    slug: "mengenal-gangguan-bipolar-keseimbangan",
    synopsis:
      "Buku panduan edukatif bagi penyintas bipolar dan orang-orang terdekatnya. Membahas fase mania, depresi, pentingnya kepatuhan pengobatan stabilisator suasana hati, dan dukungan sosial tanpa stigma.",
    coverUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&auto=format&fit=crop&q=80",
    authorId: "a1",
    authorName: "dr. Andi Wijaya, Sp.KJ",
    authorPhoto: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80",
    publisherId: "p1",
    publisherName: "Penerbit RSJD Atma Husada Mahakam",
    categoryId: "1",
    categoryName: "Kesehatan Jiwa & Psikiatri",
    isbn: "978-602-8812-52-4",
    publishYear: 2022,
    language: "Indonesia",
    pageCount: 264,
    status: "aktif",
    isFeatured: false,
    loanCount: 245,
    averageRating: 4.76,
    reviewCount: 48,
    tags: ["Bipolar", "Kesehatan Jiwa", "Terapi Kognitif"],
    formats: {
      pdf: { available: true, status: "aktif" },
      epub: { available: false, status: "aktif" },
    },
  },
  {
    id: "b12",
    title: "Komunikasi Terapeutik dalam Pelayanan Kesehatan Jiwa",
    slug: "komunikasi-terapeutik-pelayanan-kesehatan-jiwa",
    synopsis:
      "Panduan praktis bagi dokter, perawat, dan relawan pendamping dalam membangun rapport dan empati yang tulus dengan pasien yang mengalami agitasi, waham, atau halusinasi.",
    coverUrl: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&auto=format&fit=crop&q=80",
    authorId: "a1",
    authorName: "dr. Andi Wijaya, Sp.KJ",
    authorPhoto: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80",
    publisherId: "p2",
    publisherName: "EGC Penerbit Buku Kedokteran",
    categoryId: "2",
    categoryName: "Psikologi & Konseling",
    isbn: "978-979-448-980-2",
    publishYear: 2021,
    language: "Inggris",
    pageCount: 198,
    status: "aktif",
    isFeatured: false,
    loanCount: 215,
    averageRating: 4.71,
    reviewCount: 34,
    tags: ["Konseling", "Komunikasi Terapeutik", "Pekerja Medis", "Kesehatan Jiwa"],
    formats: {
      pdf: { available: true, status: "aktif" },
      epub: { available: true, status: "aktif" },
    },
  },
  {
    id: "b13",
    title: "Skizofrenia: Mematahkan Mitos, Membangun Harapan Pemulihan",
    slug: "skizofrenia-mematahkan-mitos-membangun-harapan",
    synopsis:
      "Membahas pendekatan holistik penanganan skizofrenia yang menggabungkan farmakoterapi mutakhir, rehabilitasi psikososial di RSJD, dan pemberdayaan komunitas untuk mendukung reintegrasi pasien.",
    coverUrl: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=600&auto=format&fit=crop&q=80",
    authorId: "a1",
    authorName: "dr. Andi Wijaya, Sp.KJ",
    authorPhoto: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80",
    publisherId: "p1",
    publisherName: "Penerbit RSJD Atma Husada Mahakam",
    categoryId: "1",
    categoryName: "Kesehatan Jiwa & Psikiatri",
    isbn: "978-602-8812-60-9",
    publishYear: 2023,
    language: "Indonesia",
    pageCount: 288,
    status: "aktif",
    isFeatured: false,
    loanCount: 198,
    averageRating: 4.86,
    reviewCount: 31,
    tags: ["Skizofrenia", "Kesehatan Jiwa", "Psikoterapi Suportif"],
    formats: {
      pdf: { available: true, status: "aktif" },
      epub: { available: true, status: "aktif" },
    },
  },
  {
    id: "b14",
    title: "Psikosomatis: Ketika Tubuh Berbicara Mewakili Batin yang Terluka",
    slug: "psikosomatis-ketika-tubuh-berbicara",
    synopsis:
      "Penjelasan medis mengenai gejala fisik seperti maag kronis, sakit kepala tegang, dan sesak dada non-kardiak yang dipicu oleh konflik emosional tak terselesaikan dan stres jangka panjang.",
    coverUrl: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=600&auto=format&fit=crop&q=80",
    authorId: "a5",
    authorName: "dr. Rian Saputra, Sp.N",
    authorPhoto: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=200&auto=format&fit=crop&q=80",
    publisherId: "p2",
    publisherName: "EGC Penerbit Buku Kedokteran",
    categoryId: "4",
    categoryName: "Manajemen Stres & Burnout",
    isbn: "978-979-448-999-4",
    publishYear: 2023,
    language: "Indonesia",
    pageCount: 210,
    status: "aktif",
    isFeatured: false,
    loanCount: 185,
    averageRating: 4.69,
    reviewCount: 27,
    tags: ["Psikosomatis", "Stres", "Kesehatan Jiwa"],
    formats: {
      pdf: { available: true, status: "aktif" },
      epub: { available: false, status: "aktif" },
    },
  },
]

export const ARTICLES_DATA: ArticleItem[] = [
  {
    id: "art-1",
    title: "Mengenali 'Quiet Burnout': Tanda Lelah Mental yang Sering Diabaikan",
    slug: "mengenali-quiet-burnout-lelah-mental",
    thumbnailUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&auto=format&fit=crop&q=80",
    excerpt:
      "Burnout tidak selalu ditandai ledakan amarah. Sering kali ia datang perlahan berupa mati rasa emosional dan kehilangan minat pada hal yang dulu dicintai.",
    authorName: "dr. Andi Wijaya, Sp.KJ",
    publishedAt: "14 Sep 2026",
    readTime: "4 menit baca",
    category: "Tips Kesehatan Jiwa",
  },
  {
    id: "art-2",
    title: "5 Teknik Grounding 5-4-3-2-1 untuk Meredakan Serangan Panik Seketika",
    slug: "teknik-grounding-meredakan-serangan-panik",
    thumbnailUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80",
    excerpt:
      "Kombinasi indra penglihatan, peraba, pendengaran, penciuman, dan perasa terbukti secara klinis menarik kembali fokus korteks prefrontal saat sistem limbik overaktif.",
    authorName: "Dra. Nurul Hikmah, M.Psi.",
    publishedAt: "10 Sep 2026",
    readTime: "3 menit baca",
    category: "Psikologi Praktis",
  },
  {
    id: "art-3",
    title: "Layanan Literasi Digital RSJD: Membaca sebagai Sarana Biblioterapi",
    slug: "layanan-literasi-digital-rsjd-biblioterapi",
    thumbnailUrl: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&auto=format&fit=crop&q=80",
    excerpt:
      "Perpustakaan Digital RSJD Atma Husada Mahakam hadir menyediakan bahan bacaan kurasi untuk memulihkan kesehatan psikologis masyarakat Kalimantan Timur.",
    authorName: "Humas RSJD Atma Husada",
    publishedAt: "05 Sep 2026",
    readTime: "5 menit baca",
    category: "Berita Perpustakaan",
  },
]

export const SAMPLE_REVIEWS: ReviewItem[] = [
  {
    id: "rev-1",
    userName: "Budi Santoso, S.Kom",
    userAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80",
    rating: 5,
    comment:
      "Buku 'Menavigasi Badai Pikiran' sangat membuka wawasan saya sebagai pekerja IT yang sering cemas saat deadline. Teknik de-eskalasi pernapasannya sangat manjur!",
    createdAt: "3 hari yang lalu",
    adminReply:
      "Terima kasih atas apresiasinya Pak Budi. Terus praktikkan pernapasan diafragma secara teratur ya. Salam hangat dari tim psikiatri RSJD.",
    adminReplyAt: "2 hari yang lalu",
  },
  {
    id: "rev-2",
    userName: "drg. Maya Lestari",
    userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80",
    rating: 5,
    comment:
      "Kualitas buku digital di perpustakaan RSJD ini sangat tinggi, bahasanya mudah dipahami masyarakat umum namun tetap berbobot secara akademis.",
    createdAt: "1 minggu yang lalu",
  },
]
