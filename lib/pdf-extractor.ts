/**
 * PDF Smart Extraction Utility for Perpustakaan Digital RSJD Atma Husada Mahakam
 * Automatically extracts:
 * 1. Front cover (page 1) as high-res canvas image
 * 2. Accurate page count
 * 3. Metadata & smart text scanning (Pages 1-15 & Last pages) for:
 *    - Accurate Title & cleaned filename (ignoring scanlation watermarks)
 *    - Author & Publisher detection (strictly blacklisting watermarks/scanner domains)
 *    - Authentic Synopsis / blurb extraction
 *    - Domain classification: Medical/Mental Health vs. Fiction/Novel vs. General Non-fiction
 *    - Automatic category & tag suggestions
 *    - Knowledge base recognition for popular series (e.g. Mushoku Tensei, SAO, Slime, etc.)
 */

declare global {
  interface Window {
    pdfjsLib?: {
      getDocument: (params: { data: ArrayBuffer } | string | { url: string }) => {
        promise: Promise<{
          numPages: number
          getPage: (num: number) => Promise<{
            getViewport: (params: { scale: number }) => { width: number; height: number }
            render: (params: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => {
              promise: Promise<void>
            }
            getTextContent: () => Promise<{
              items: Array<{ str?: string }>
            }>
          }>
          getMetadata: () => Promise<{
            info?: {
              Title?: string
              Author?: string
              Subject?: string
              Keywords?: string
              Creator?: string
              Producer?: string
              CreationDate?: string
              ModDate?: string
              [key: string]: unknown
            }
          }>
        }>
      }
      GlobalWorkerOptions: {
        workerSrc: string
      }
    }
  }
}

const PDFJS_SCRIPT_SRC = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
const PDFJS_WORKER_SRC = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"

let pdfJsLoadingPromise: Promise<void> | null = null

export async function ensurePdfJsLoaded(): Promise<void> {
  if (typeof window === "undefined") return

  if (window.pdfjsLib) {
    if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC
    }
    return
  }

  if (pdfJsLoadingPromise) {
    return pdfJsLoadingPromise
  }

  pdfJsLoadingPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${PDFJS_SCRIPT_SRC}"]`)
    if (existingScript) {
      existingScript.addEventListener("load", () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC
          resolve()
        } else {
          reject(new Error("pdfjsLib tidak terdeteksi"))
        }
      })
      existingScript.addEventListener("error", () => reject(new Error("Gagal mengunduh modul PDF.js")))
      return
    }

    const script = document.createElement("script")
    script.src = PDFJS_SCRIPT_SRC
    script.async = true
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC
        resolve()
      } else {
        reject(new Error("Pustaka PDF.js belum siap."))
      }
    }
    script.onerror = () => {
      pdfJsLoadingPromise = null
      reject(new Error("Gagal mengunduh pustaka PDF dari CDN."))
    }
    document.head.appendChild(script)
  })

  return pdfJsLoadingPromise
}

/**
 * Scanlation / pirate / scanner watermarks that should NEVER be used
 * as Title, Author, or Publisher.
 */
export const WATERMARK_BLACKLIST = [
  "bakadame",
  "meonovel",
  "pdfnovelindo",
  "novelringan",
  "indowebnovel",
  "sakuranovel",
  "wuxiaworld",
  "shinigami",
  "komiku",
  "bacakomik",
  "z-library",
  "zlibrary",
  "zlib",
  "oceanofpdf",
  "libgen",
  "annas-archive",
  "anna's archive",
  "pdfdrive",
  "pdf drive",
  "pdf by",
  "pdfby",
  "bloody kent",
  "bloodykent",
  "converted by",
  "shared by",
  "uploaded by",
  "scanlation",
  "fan-translation",
  "fansub",
  "translator",
  "terjemahan",
  "tl by",
  "tl:",
  "penerjemah",
  "typesetter",
  "proofreader",
  "cleaner",
  "raw provider",
  "discord",
  "t.me/",
  "telegram",
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "http://",
  "https://",
  "www.",
  ".com",
  ".net",
  ".org",
  ".id",
  ".xyz",
  ".me",
  ".cc",
  ".to",
  "untitled",
  "unknown",
]

export function isBlacklistedWatermark(text?: string | null): boolean {
  if (!text) return true
  const lower = text.toLowerCase().trim()
  return WATERMARK_BLACKLIST.some((bl) => lower.includes(bl))
}

export function cleanSynopsisText(text?: string): string | undefined {
  if (!text) return undefined
  let cleaned = text
    .replace(/(?:pdf\s*by|converted\s*by|shared\s*by|uploaded\s*by)\s*:\s*[^\n\r]+/gi, "")
    .replace(/(?:kunjungi|baca\s*di|download\s*di)\s*:\s*[^\n\r]+/gi, "")
    .replace(/(?:https?:\/\/|www\.)[^\s]+/gi, "")
    .replace(/bakadame(?:\.com)?/gi, "")
    .replace(/meonovel(?:\.com|\.id)?/gi, "")
    .replace(/novelringan(?:\.com|\.id|\.net)?/gi, "")
    .replace(/pdfnovelindo(?:\.com|\.net)?/gi, "")
    .replace(/\s+/g, " ")
    .trim()
  return cleaned.length > 20 ? cleaned : undefined
}

/**
 * Generates a clean URL slug from any title string
 */
export function generateCleanSlug(text: string): string {
  if (!text) return ""
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .replace(/[^a-z0-9\s-]/g, "") // remove special characters
    .trim()
    .replace(/\s+/g, "-") // space to dash
    .replace(/-+/g, "-") // collapse consecutive dashes
    .replace(/^-+|-+$/g, "") // strip leading and trailing dashes
}

export interface SeriesKnowledge {
  name: string
  pattern: RegExp
  canonicalTitle: string
  author: string
  publisher: string
  categorySlug: string
  categoryName: string
  tags: string[]
  synopsis: string
  firstPublishedYear: number
  getYearForVolume?: (vol?: string | number) => number
}

/**
 * Curated knowledge base for popular light novels and literary works
 */
export const KNOWN_SERIES: SeriesKnowledge[] = [
  {
    name: "Mushoku Tensei",
    pattern: /(?:mushoku|jobless\s*reincarnation|isekai\s*ittara\s*honki|rudeus|\brudy\b|greyrat|rifujin|magonote|shirotaka|\broxy\b|migurdia|sylphiette|sylphy|\beris\b|boreas|hitogami|manusia[\s\-]dewa|nanahoshi|orsted|ruijerd|superd|ghislaine|fittoa|paul\s*greyrat|zenith\s*greyrat|tunawisma|tiga\s*puluh\s*empat\s*tahun)/i,
    canonicalTitle: "Mushoku Tensei: Jobless Reincarnation",
    author: "Rifujin na Magonote",
    publisher: "MF Books / Kadokawa",
    categorySlug: "sastra-novel-fiksi",
    categoryName: "Sastra, Novel & Fiksi",
    tags: ["Novel", "Isekai", "Fantasi", "Petualangan", "Reinkarnasi", "Light Novel"],
    synopsis: "Mengisahkan seorang pria pengangguran (NEET) berusia 34 tahun yang tewas tertabrak truk setelah diusir dari rumahnya. Ia bereinkarnasi ke dunia sihir dan pedang sebagai bayi bernama Rudeus Greyrat. Berbekal ingatan dari kehidupan sebelumnya dan tekad pantang menyerah, Rudeus berjanji untuk menjalani hidup keduanya dengan sungguh-sungguh tanpa penyesalan, mendalami ilmu sihir sejak balita, dan memulai perjalanan petualangan epik di dunia barunya.",
    firstPublishedYear: 2014,
    getYearForVolume: (vol) => {
      const v = typeof vol === "string" ? parseFloat(vol) : (vol || 1)
      if (v <= 5) return 2014
      if (v <= 8) return 2015
      if (v <= 13) return 2016
      if (v <= 16) return 2017
      if (v <= 19) return 2018
      if (v <= 22) return 2019
      if (v <= 24) return 2020
      if (v === 25) return 2021
      return 2022
    },
  },
  {
    name: "Sword Art Online",
    pattern: /(?:sword\s*art\s*online|\bsao\b|kirito|asuna|aincrad|reki\s*kawahara)/i,
    canonicalTitle: "Sword Art Online",
    author: "Reki Kawahara",
    publisher: "Dengeki Bunko / Kadokawa",
    categorySlug: "sastra-novel-fiksi",
    categoryName: "Sastra, Novel & Fiksi",
    tags: ["Novel", "Sci-Fi", "Virtual Reality", "Fantasi", "Petualangan", "Light Novel"],
    synopsis: "Di masa depan, ribuan pemain terjebak di dalam permainan realitas virtual 'Sword Art Online' (SAO) di mana tombol logout sengaja ditiadakan oleh sang pencipta. Kematian di dalam game berarti kematian nyata di dunia asli. Kirito, seorang solo-player berbakat, harus berjuang menembus 100 lantai kastil terbang Aincrad demi membebaskan semua orang.",
    firstPublishedYear: 2009,
    getYearForVolume: (vol) => {
      const v = typeof vol === "string" ? parseFloat(vol) : (vol || 1)
      if (v <= 3) return 2009
      if (v <= 6) return 2010
      if (v <= 8) return 2011
      if (v <= 11) return 2012
      if (v <= 13) return 2013
      if (v <= 16) return 2014
      if (v <= 17) return 2015
      if (v <= 18) return 2016
      if (v <= 20) return 2017
      if (v <= 22) return 2018
      if (v <= 24) return 2020
      return 2022
    },
  },
  {
    name: "That Time I Got Reincarnated as a Slime",
    pattern: /(?:tensei\s*shitara\s*slime|slime\s*datta\s*ken|rimuru\s*tempest|\bfuse\b|mikami\s*satoru|veldora)/i,
    canonicalTitle: "That Time I Got Reincarnated as a Slime",
    author: "Fuse",
    publisher: "Micro Magazine / GC Novels",
    categorySlug: "sastra-novel-fiksi",
    categoryName: "Sastra, Novel & Fiksi",
    tags: ["Novel", "Isekai", "Fantasi", "Slime", "Kerajaan", "Light Novel"],
    synopsis: "Satoru Mikami, seorang pegawai kantoran biasa berusia 37 tahun, tewas ditikam penjahat di jalanan dan bereinkarnasi di dunia fantasi sebagai monster slime yang tampaknya tak berdaya. Memiliki kemampuan predator 'Predator' dan panduan 'Great Sage', ia berganti nama menjadi Rimuru Tempest dan mulai membangun peradaban monster yang damai dan makmur.",
    firstPublishedYear: 2014,
    getYearForVolume: (vol) => {
      const v = typeof vol === "string" ? parseFloat(vol) : (vol || 1)
      if (v <= 3) return 2014
      if (v <= 6) return 2015
      if (v <= 9) return 2016
      if (v <= 11) return 2017
      if (v <= 13) return 2018
      if (v <= 15) return 2019
      if (v <= 17) return 2020
      if (v <= 19) return 2021
      return 2022
    },
  },
  {
    name: "Overlord",
    pattern: /(?:overlord|ainz\s*ooal\s*gown|momonga|maruyama\s*kugane|nazarick|albedo)/i,
    canonicalTitle: "Overlord",
    author: "Kugane Maruyama",
    publisher: "Enterbrain / Kadokawa",
    categorySlug: "sastra-novel-fiksi",
    categoryName: "Sastra, Novel & Fiksi",
    tags: ["Novel", "Dark Fantasy", "Isekai", "Game", "Anti-Hero", "Light Novel"],
    synopsis: "Ketika game MMORPG legendaris Yggdrasil hendak dimatikan layanannya, seorang pemain veteran berjuluk Momonga memutuskan bertahan hingga detik server ditutup. Namun keanehan terjadi saat jam server habis: ia tidak ter-logout, melainkan terperangkap dalam wujud avatar tengkoraknya, dan seluruh NPC Makam Agung Nazarick hidup menjadi makhluk nyata yang setia kepadanya.",
    firstPublishedYear: 2012,
    getYearForVolume: (vol) => {
      const v = typeof vol === "string" ? parseFloat(vol) : (vol || 1)
      if (v <= 3) return 2012
      if (v <= 6) return 2013
      if (v <= 8) return 2014
      if (v <= 9) return 2015
      if (v <= 11) return 2016
      if (v <= 12) return 2017
      if (v <= 13) return 2018
      if (v <= 14) return 2020
      return 2022
    },
  },
  {
    name: "Re:Zero",
    pattern: /(?:re:zero|kara\s*hajimeru\s*isekai|subaru\s*natsuki|emilia|tappei\s*nagatsuki|rem\s*dan\s*ram)/i,
    canonicalTitle: "Re:Zero - Starting Life in Another World",
    author: "Tappei Nagatsuki",
    publisher: "MF Bunko J / Kadokawa",
    categorySlug: "sastra-novel-fiksi",
    categoryName: "Sastra, Novel & Fiksi",
    tags: ["Novel", "Isekai", "Fantasi Psikologis", "Time Loop", "Tragedi", "Light Novel"],
    synopsis: "Subaru Natsuki tiba-tiba terlempar ke dunia lain saat baru pulang dari toserba. Tanpa kekuatan super atau kemampuan bertarung, ia hanya dikutuk dengan kemampuan 'Return by Death'—mengulang waktu ke titik tertentu setiap kali ia tewas mengenaskan. Demi menyelamatkan gadis berambut perak yang dicintainya dan sahabat-sahabatnya, Subaru harus menanggung penderitaan fisik dan mental yang tak terbayangkan.",
    firstPublishedYear: 2014,
    getYearForVolume: (vol) => {
      const v = typeof vol === "string" ? parseFloat(vol) : (vol || 1)
      if (v <= 5) return 2014
      if (v <= 7) return 2015
      if (v <= 11) return 2016
      if (v <= 15) return 2017
      if (v <= 18) return 2018
      if (v <= 21) return 2019
      if (v <= 25) return 2020
      if (v <= 28) return 2021
      return 2022
    },
  },
  {
    name: "Classroom of the Elite",
    pattern: /(?:classroom\s*of\s*the\s*elite|youkoso\s*jitsuryoku|ayanokouji|kiyotaka|kinugasa\s*shougo|shogo\s*kinugasa)/i,
    canonicalTitle: "Classroom of the Elite",
    author: "Shogo Kinugasa",
    publisher: "MF Bunko J / Kadokawa",
    categorySlug: "sastra-novel-fiksi",
    categoryName: "Sastra, Novel & Fiksi",
    tags: ["Novel", "Psikologi", "Sekolah", "Misteri", "Drama", "Light Novel"],
    synopsis: "SMA Koudo Ikusei adalah sekolah bergengsi dengan fasilitas mutakhir dan tingkat kelulusan kerja 100%. Namun di balik kemegahannya, sekolah ini memberlakukan seleksi alam yang kejam di mana setiap kelas bersaing memperebutkan poin bulanan. Kiyotaka Ayanokouji, siswa genius penyendiri di Kelas D yang sengaja menyembunyikan kemampuannya, harus bergerak di balik bayang-bayang demi melindungi posisinya.",
    firstPublishedYear: 2015,
    getYearForVolume: (vol) => {
      const v = typeof vol === "string" ? parseFloat(vol) : (vol || 1)
      if (v <= 3) return 2015
      if (v <= 5) return 2016
      if (v <= 7.5) return 2017
      if (v <= 9) return 2018
      if (v <= 11.5) return 2019
      return 2020
    },
  },
  {
    name: "Solo Leveling",
    pattern: /(?:solo\s*leveling|only\s*i\s*level\s*up|sung\s*jin-?woo|chugong|shadow\s*monarch)/i,
    canonicalTitle: "Solo Leveling",
    author: "Chugong",
    publisher: "D&C Media",
    categorySlug: "sastra-novel-fiksi",
    categoryName: "Sastra, Novel & Fiksi",
    tags: ["Novel", "Action", "Dungeon", "Hunter", "Level Up", "Fantasi Modern"],
    synopsis: "Ketika gerbang misterius menghubungkan dunia manusia dengan sarang monster buas, manusia dengan kekuatan super yang disebut Hunter bermunculan. Sung Jin-Woo dikenal sebagai Hunter terlemah di dunia berperingkat E. Namun setelah lolos dari pembantaian Double Dungeon maut, sebuah jendela pencarian misterius muncul di hadapannya, menjadikannya satu-satunya Hunter yang dapat meningkatkan kekuatannya tanpa batas.",
    firstPublishedYear: 2018,
    getYearForVolume: (vol) => {
      const v = typeof vol === "string" ? parseFloat(vol) : (vol || 1)
      if (v <= 3) return 2018
      if (v <= 8) return 2019
      return 2020
    },
  },
  {
    name: "KonoSuba",
    pattern: /(?:konosuba|kono\s*subarashii|kazuma\s*satou|aqua|megumin|natsume\s*akatsuki)/i,
    canonicalTitle: "KonoSuba: God's Blessing on this Wonderful World!",
    author: "Natsume Akatsuki",
    publisher: "Sneaker Bunko / Kadokawa",
    categorySlug: "sastra-novel-fiksi",
    categoryName: "Sastra, Novel & Fiksi",
    tags: ["Novel", "Komedi", "Isekai", "Fantasi", "Parodi", "Light Novel"],
    synopsis: "Kazuma Satou, seorang remaja tertutup yang tewas konyol akibat syok mengira dirinya tertabrak traktor pelan, diberi pilihan oleh Dewi Aqua untuk langsung menuju alam baka atau bereinkarnasi ke dunia fantasi dengan membawa satu benda pilihan. Kesal diejek sang Dewi, Kazuma memilih membawa Dewi Aqua sendiri. Petualangan kocak dan penuh bencana pun dimulai bersama party yang luar biasa kacau.",
    firstPublishedYear: 2013,
    getYearForVolume: (vol) => {
      const v = typeof vol === "string" ? parseFloat(vol) : (vol || 1)
      if (v <= 4) return 2013
      if (v <= 6) return 2014
      if (v <= 8) return 2015
      if (v <= 10) return 2016
      if (v <= 13) return 2017
      if (v <= 15) return 2018
      return 2019
    },
  },
]

/**
 * Searches for a match in the curated series knowledge base
 */
export function lookupKnownSeries(
  queryText: string,
  filename?: string
): {
  series: SeriesKnowledge
  volumeNumber?: string
  cleanTitle: string
  estimatedYear?: number
} | null {
  const combined = `${filename || ""} ${queryText}`
  for (const series of KNOWN_SERIES) {
    if (series.pattern.test(combined)) {
      // Cari nomor volume dari filename atau text
      let vol: string | undefined
      const volMatch = combined.match(/(?:volume|vol\.?|v|jilid)\s*(\d+(?:\.\d+)?)/i)
      if (volMatch && volMatch[1]) {
        vol = volMatch[1]
      }
      const cleanTitle = vol ? `${series.canonicalTitle} - Volume ${vol}` : series.canonicalTitle
      const estimatedYear = series.getYearForVolume
        ? series.getYearForVolume(vol)
        : series.firstPublishedYear

      return { series, volumeNumber: vol, cleanTitle, estimatedYear }
    }
  }
  return null
}

export interface PdfExtractionResult {
  coverDataUrl: string
  pageCount: number
  metadataTitle?: string
  metadataAuthor?: string
  metadataPublisher?: string
  extractedYear?: number
  extractedSynopsis?: string
  suggestedCategorySlug?: string
  suggestedCategoryName?: string
  suggestedTags?: string[]
  detectedType: "medical" | "fiction" | "general"
  detectedSummary: string
  detectedSeriesName?: string
}

/**
 * Helper to clean filename into a readable book title
 */
function cleanBookTitleFromFileName(filename: string): string {
  let cleaned = filename
    .replace(/\.[^/.]+$/, "") // Hapus ekstensi .pdf
    .replace(/\[(?:bakadame|meonovel|pdfnovelindo|novelringan|z-library|epub|pdf|light novel|novel).*?\]/gi, "")
    .replace(/\((?:bakadame|meonovel|pdfnovelindo|novelringan|z-library|epub|pdf|light novel|novel).*?\)/gi, "")
    .replace(/^\[.*?\]\s*/g, "") // Hapus tag pembuka
    .replace(/\(.*?\)/g, "") // Hapus teks dalam kurung
    .replace(/_+/g, " ")
    .replace(/\s*-\s*/g, " - ")
    .replace(/pdf\s*by\s*:\s*[^\-]+/gi, "")
    .replace(/bakadame\.com/gi, "")
    .replace(/bakadame/gi, "")
    .trim()

  // Format Title Case
  cleaned = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (/^(vol|vol\.|ch|ch\.|volume|bab|jilid)$/i.test(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      }
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(" ")

  return cleaned || "Buku Baru"
}

/**
 * Smart detection of book publication year from text, colophon, metadata, or filename.
 */
export function extractPublishedYear(params: {
  pageTexts: { pageNum: number; text: string }[]
  fullScannedText: string
  filename?: string
  creationDate?: string
  modDate?: string
  knownSeriesYear?: number
}): number | undefined {
  const currentYear = new Date().getFullYear()

  // 1. Cek pola kuat di teks colophon / hak cipta / informasi penerbitan
  // Halaman 1-8 dan 3 halaman terakhir adalah lokasi standar informasi penerbitan (colophon)
  const priorityPages = params.pageTexts.filter(
    (p) => p.pageNum <= 8 || p.pageNum >= (params.pageTexts[params.pageTexts.length - 1]?.pageNum || 1) - 3
  )
  const textToScan = priorityPages.map((p) => p.text).join("\n") || params.fullScannedText

  // Pisahkan baris / kalimat untuk memeriksa konteks penerbitan
  const sentences = textToScan.split(/[\n\r]+/)

  // Pola 1: Konteks eksplisit (Tahun terbit, Cetakan ke-X, First published, Publication date, © / Copyright)
  const strongYearPatterns = [
    /(?:tahun\s*terbit|tahun\s*cetak|diterbitkan\s*(?:pada\s*tahun|pertama\s*kali)?|cetakan\s*(?:pertama|ke[\s\-]?\d+|\d+)|edisi\s*(?:pertama|\d+)|first\s*published|originally\s*published|published\s*in|publication\s*date)\s*[:\-,\.]?\s*(?:[A-Za-z]{3,12}\s+)?\b(19\d{2}|20\d{2})\b/i,
    /(?:copyright|hak\s*cipta|©)\s*(?:[A-Za-z0-9\s,\.\'\-]{0,35})?\b(19\d{2}|20\d{2})\b/i,
    /\b(19\d{2}|20\d{2})\s*年\s*(?:\d{1,2}\s*月)?/, // Format colophon Jepang (misal: 2014年1月)
    /(?:isbn[\s:0-9\-]{10,25}).*?\b(19\d{2}|20\d{2})\b/i,
    /(?:januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|january|february|march|april|may|june|july|august|september|october|november|december)\s+\b(19\d{2}|20\d{2})\b/i,
  ]

  for (const sentence of sentences) {
    // Lewati baris jika mengandung watermark domain/scanner bajakan agar tidak mengambil tahun download/rip
    if (isBlacklistedWatermark(sentence)) continue

    for (const pat of strongYearPatterns) {
      const match = sentence.match(pat)
      if (match && match[1]) {
        const y = parseInt(match[1], 10)
        if (y >= 1950 && y <= currentYear) {
          return y
        }
      }
    }
  }

  // 2. Jika merupakan seri yang dikenali di Knowledge Base (misal Mushoku Tensei, SAO, Slime)
  if (params.knownSeriesYear && params.knownSeriesYear >= 1950 && params.knownSeriesYear <= currentYear) {
    return params.knownSeriesYear
  }

  // 3. Deteksi tahun di nama berkas (Filename)
  // Contoh: "Mushoku_Tensei_Vol_01_(2014).pdf", "Buku-Ajar-2021.pdf"
  if (params.filename) {
    const fnMatch = params.filename.match(/(?:[\s\(_\-\[])\b(19[7-9]\d|20[0-2]\d)\b(?:[\s\)_\]\-\.])/i)
    if (fnMatch && fnMatch[1]) {
      const y = parseInt(fnMatch[1], 10)
      if (y >= 1970 && y <= currentYear) {
        return y
      }
    }
  }

  // 4. Deteksi dari Metadata PDF (CreationDate / ModDate)
  // Seringkali berupa D:YYYYMMDD... atau YYYY-MM-DD
  const dateStr = params.creationDate || params.modDate
  if (dateStr) {
    const metaYearMatch = dateStr.match(/(?:D:)?\b(19[7-9]\d|20[0-2]\d)\b/)
    if (metaYearMatch && metaYearMatch[1]) {
      const y = parseInt(metaYearMatch[1], 10)
      if (y >= 1970 && y <= currentYear) {
        return y
      }
    }
  }

  // 5. Cek tahun 4 digit apa pun di halaman colophon awal (hal 2 - 4) yang aman dari watermark
  for (const page of priorityPages) {
    if (page.pageNum >= 2 && page.pageNum <= 4) {
      const allYears = page.text.match(/\b(19[89]\d|20[0-2]\d)\b/g)
      if (allYears) {
        for (const yrStr of allYears) {
          const yr = parseInt(yrStr, 10)
          if (yr >= 1980 && yr <= currentYear) {
            return yr
          }
        }
      }
    }
  }

  return undefined
}

export async function extractPdfCoverAndMeta(file: File): Promise<PdfExtractionResult> {
  await ensurePdfJsLoaded()

  if (!window.pdfjsLib) {
    throw new Error("Modul pembaca PDF tidak tersedia di peramban.")
  }

  const arrayBuffer = await file.arrayBuffer()
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    throw new Error(
      "Berkas dokumen kosong atau tidak dapat dibaca oleh peramban (0 bytes). Jika menggunakan peramban Flatpak di Linux, silakan klik area unggah untuk memilih berkas lewat pemilih sistem."
    )
  }
  const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer })
  const pdfDoc = await loadingTask.promise

  const pageCount = pdfDoc.numPages || 1

  // 1. Ekstrak metadata bawaan (hanya jika valid dan bukan watermark scanlation)
  let metadataTitle: string | undefined
  let metadataAuthor: string | undefined
  let metadataCreationDate: string | undefined
  let metadataModDate: string | undefined
  try {
    const meta = await pdfDoc.getMetadata()
    if (
      meta?.info?.Title &&
      meta.info.Title.trim().length > 2 &&
      !isBlacklistedWatermark(meta.info.Title)
    ) {
      metadataTitle = meta.info.Title.trim()
    }
    if (
      meta?.info?.Author &&
      meta.info.Author.trim().length > 2 &&
      !isBlacklistedWatermark(meta.info.Author)
    ) {
      metadataAuthor = meta.info.Author.trim()
    }
    if (meta?.info?.CreationDate) {
      metadataCreationDate = String(meta.info.CreationDate)
    }
    if (meta?.info?.ModDate) {
      metadataModDate = String(meta.info.ModDate)
    }
  } catch {
    // Abaikan kesalahan metadata PDF
  }

  // 2. Render Page 1 to generate front cover image (High resolution)
  const page1 = await pdfDoc.getPage(1)
  const baseViewport = page1.getViewport({ scale: 1.0 })
  const targetWidth = 800
  const scale = Math.max(1.2, Math.min(2.0, targetWidth / baseViewport.width))
  const viewport = page1.getViewport({ scale })

  const canvas = document.createElement("canvas")
  canvas.width = viewport.width
  canvas.height = viewport.height

  const ctx = canvas.getContext("2d")
  if (!ctx) {
    throw new Error("Gagal membuat konteks kanvas grafis.")
  }

  await page1.render({ canvasContext: ctx, viewport }).promise
  const coverDataUrl = canvas.toDataURL("image/jpeg", 0.88)

  // 3. Smart Scanning Teks Mendalam:
  // Halaman 1–25 (meliputi sampul dalam, halaman judul, daftar isi, prolog, awal bab)
  // serta 4 halaman terakhir (halaman kolofon/hak cipta & blurb belakang)
  const pagesToScan: number[] = []
  const frontLimit = Math.min(25, pageCount)
  for (let i = 1; i <= frontLimit; i++) {
    pagesToScan.push(i)
  }
  const backStart = Math.max(frontLimit + 1, pageCount - 3)
  for (let i = backStart; i <= pageCount; i++) {
    pagesToScan.push(i)
  }

  const pageTexts: { pageNum: number; text: string }[] = []
  for (const pNum of pagesToScan) {
    try {
      const p = await pdfDoc.getPage(pNum)
      const textObj = await p.getTextContent()
      const text = textObj.items
        .map((it) => (typeof it.str === "string" ? it.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
      if (text) {
        pageTexts.push({ pageNum: pNum, text })
      }
    } catch {
      // Abaikan error pada halaman tertentu
    }
  }

  const fullScannedText = pageTexts.map((pt) => pt.text).join("\n")
  const lowerText = fullScannedText.toLowerCase()

  // 4. Periksa apakah dokumen cocok dengan Seri Terkenal (Knowledge Base)
  const knownMatch = lookupKnownSeries(fullScannedText, file.name)

  // Ekstrak Tahun Terbit Akurat
  const detectedYear = extractPublishedYear({
    pageTexts,
    fullScannedText,
    filename: file.name,
    creationDate: metadataCreationDate,
    modDate: metadataModDate,
    knownSeriesYear: knownMatch?.estimatedYear,
  }) || knownMatch?.estimatedYear

  if (knownMatch) {
    const { series, cleanTitle } = knownMatch
    const finalYear = detectedYear || series.firstPublishedYear
    return {
      coverDataUrl,
      pageCount,
      metadataTitle: cleanTitle,
      metadataAuthor: series.author,
      metadataPublisher: series.publisher,
      extractedYear: finalYear,
      extractedSynopsis: series.synopsis,
      suggestedCategorySlug: series.categorySlug,
      suggestedCategoryName: series.categoryName,
      suggestedTags: series.tags,
      detectedType: "fiction",
      detectedSummary: `Sampul Hal 1 • ${pageCount} Hal • Thn ${finalYear} • Seri: ${series.name} • Sinopsis Siap`,
      detectedSeriesName: series.name,
    }
  }

  // 5. Ekstraksi Pengarang Generic (dengan proteksi blacklist ketat)
  let detectedAuthor = metadataAuthor
  if (!detectedAuthor) {
    const authorPatterns = [
      /(?:karya|penulis|author|ditulis oleh)\s*[:\-]?\s*([A-Za-z0-9\s,\.\'\-]{3,45})/i,
      /(?:written by|story by|author & art)\s*[:\-]?\s*([A-Za-z0-9\s,\.\'\-]{3,45})/i,
      /(?:copyright|hak cipta|©)\s*(?:\d{4})?\s*([A-Za-z0-9\s,\.\'\-]{3,40})/i,
    ]
    for (const pat of authorPatterns) {
      const match = fullScannedText.match(pat)
      if (match && match[1]) {
        const candidate = match[1].split("\n")[0].split(/[;|\/]/)[0].trim()
        if (
          candidate.length > 2 &&
          candidate.length < 40 &&
          !candidate.toLowerCase().includes("halaman") &&
          !isBlacklistedWatermark(candidate)
        ) {
          detectedAuthor = candidate
          break
        }
      }
    }
  }

  // 6. Ekstraksi Penerbit Generic (dengan proteksi blacklist)
  let detectedPublisher: string | undefined
  const pubPatterns = [
    /(?:penerbit|publisher|published by|diterbitkan oleh)\s*[:\-]?\s*([A-Za-z0-9\s,\.\'\-]{3,50})/i,
    /(?:press|publishing|pustaka|media|kompas|gramedia|mizan|erlangga|kadokawa|yen press|seven seas|mf books|dengeki)\s*([A-Za-z0-9\s,\.]{0,30})/i,
  ]
  for (const pat of pubPatterns) {
    const match = fullScannedText.match(pat)
    if (match && match[0]) {
      const cand = match[0]
        .split("\n")[0]
        .replace(/^(?:penerbit|publisher|published by|diterbitkan oleh)\s*[:\-]?\s*/i, "")
        .trim()
      if (cand.length > 3 && cand.length < 50 && !isBlacklistedWatermark(cand)) {
        detectedPublisher = cand
        break
      }
    }
  }

  // 7. Ekstraksi Sinopsis / Ringkasan Cerita
  let extractedSynopsis: string | undefined

  // Cek pada halaman belakang (sering berupa blurb sampul belakang)
  for (let pNum = pageCount; pNum >= Math.max(1, pageCount - 3); pNum--) {
    const backPage = pageTexts.find((pt) => pt.pageNum === pNum)
    if (backPage && backPage.text.length > 120 && !isBlacklistedWatermark(backPage.text.slice(0, 100))) {
      const cleanBack = backPage.text
        .replace(/isbn[\s:0-9\-]+/gi, "")
        .replace(/harga[\s:0-9\.,]+/gi, "")
        .replace(/cetakan[\s:0-9\.,]+/gi, "")
        .replace(/all rights reserved/gi, "")
        .trim()
      if (cleanBack.length > 100 && !cleanBack.toLowerCase().includes("daftar isi")) {
        extractedSynopsis = cleanBack.slice(0, 750).trim()
        break
      }
    }
  }

  // Jika belum dapat, cari kata kunci Sinopsis/Ringkasan/Prakata/Prolog di teks halaman depan
  if (!extractedSynopsis) {
    const synPatterns = [
      /(?:sinopsis|ringkasan|tentang buku ini|blurb|synopsis|summary)\s*[:\-]?\s*([\s\S]{80,750})/i,
      /(?:prakata|kata pengantar|pendahuluan)\s*[:\-]?\s*([\s\S]{100,750})/i,
    ]
    for (const pat of synPatterns) {
      const m = fullScannedText.match(pat)
      if (m && m[1]) {
        const candidate = m[1].replace(/\s+/g, " ").trim()
        if (!isBlacklistedWatermark(candidate.slice(0, 60))) {
          extractedSynopsis = candidate
          break
        }
      }
    }
  }

  // Jika masih kosong dan memiliki Prolog / Bab 1, ambil kutipan pengantar
  if (!extractedSynopsis) {
    const prologMatch = fullScannedText.match(/(?:prolog|prologue|bab 1|chapter 1)\s*[:\-]?\s*([\s\S]{120,600})/i)
    if (prologMatch && prologMatch[1]) {
      const candidateExcerpt = prologMatch[1].replace(/\s+/g, " ").trim()
      if (!isBlacklistedWatermark(candidateExcerpt.slice(0, 60))) {
        extractedSynopsis = `Prolog Cerita: "${candidateExcerpt.slice(0, 450)}..."`
      }
    }
  }

  // 8. Klasifikasi Domain & Rekomendasi Tag
  const medicalKeywords = [
    "psikiatri", "jiwa", "mental", "skizofrenia", "depresi", "ansietas", "kecemasan",
    "bipolar", "psikologi", "psikoterapi", "konseling", "keperawatan", "medis", "klinis",
    "farmakologi", "obat", "saraf", "neuro", "geriatri", "lansia", "demensia", "pediatri",
    "gizi", "nutrisi", "burnout", "stres", "trauma", "rumahsakit", "rsjd", "kesehatan",
  ]
  const fictionKeywords = [
    "novel", "volume", "vol.", "chapter", "bab", "fiksi", "cerita", "tokoh", "isekai",
    "fantasi", "petualangan", "romance", "manga", "komik", "terjemahan", "karakter",
    "light novel", "magic", "sword", "reinkarnasi", "dunia lain", "shounen", "seinen",
  ]

  let medicalScore = 0
  for (const kw of medicalKeywords) {
    if (lowerText.includes(kw) || file.name.toLowerCase().includes(kw)) {
      medicalScore++
    }
  }

  let fictionScore = 0
  for (const kw of fictionKeywords) {
    if (lowerText.includes(kw) || file.name.toLowerCase().includes(kw)) {
      fictionScore++
    }
  }

  let detectedType: "medical" | "fiction" | "general" = "general"
  let suggestedCategorySlug = "koleksi-umum-literasi-populer"
  let suggestedCategoryName = "Koleksi Umum & Literasi Populer"
  let suggestedTags = ["Umum", "Literasi", "Referensi"]

  if (fictionScore >= 1 && medicalScore <= 1) {
    detectedType = "fiction"
    suggestedCategorySlug = "sastra-novel-fiksi"
    suggestedCategoryName = "Sastra, Novel & Fiksi"

    const novelTags = ["Novel", "Fiksi"]
    if (lowerText.includes("fantasi") || lowerText.includes("magic") || lowerText.includes("isekai")) {
      novelTags.push("Fantasi")
    }
    if (lowerText.includes("isekai") || lowerText.includes("dunia lain") || lowerText.includes("reinkarnasi")) {
      novelTags.push("Isekai")
    }
    if (lowerText.includes("petualangan") || lowerText.includes("adventure") || lowerText.includes("quest")) {
      novelTags.push("Petualangan")
    }
    if (lowerText.includes("romance") || lowerText.includes("cinta") || lowerText.includes("romantis")) {
      novelTags.push("Romansa")
    }
    if (lowerText.includes("light novel") || lowerText.includes("manga") || lowerText.includes("japan")) {
      novelTags.push("Light Novel")
    }
    suggestedTags = Array.from(new Set(novelTags)).slice(0, 5)
  } else if (medicalScore >= 2) {
    detectedType = "medical"
    if (lowerText.includes("stres") || lowerText.includes("burnout")) {
      suggestedCategorySlug = "manajemen-stres-burnout"
      suggestedCategoryName = "Manajemen Stres & Burnout"
      suggestedTags = ["Manajemen Stres", "Burnout", "Kesehatan Jiwa"]
    } else if (lowerText.includes("mindfulness") || lowerText.includes("meditasi") || lowerText.includes("resiliensi")) {
      suggestedCategorySlug = "psikologi-terapan"
      suggestedCategoryName = "Pengembangan Diri & Mindfulness"
      suggestedTags = ["Mindfulness", "Pengembangan Diri", "Kesehatan Mental"]
    } else if (lowerText.includes("lansia") || lowerText.includes("geriatri") || lowerText.includes("demensia")) {
      suggestedCategorySlug = "geriatri-kesehatan-lansia"
      suggestedCategoryName = "Geriatri & Kesehatan Lansia"
      suggestedTags = ["Geriatri", "Lansia", "Kesehatan Jiwa"]
    } else if (lowerText.includes("anak") || lowerText.includes("parenting")) {
      suggestedCategorySlug = "manajemen-rumah-sakit"
      suggestedCategoryName = "Parenting & Perkembangan Anak"
      suggestedTags = ["Parenting", "Tumbuh Kembang", "Keluarga"]
    } else {
      suggestedCategorySlug = "kesehatan-mental-psikiatri"
      suggestedCategoryName = "Kesehatan Jiwa & Psikiatri"
      suggestedTags = ["Kesehatan Jiwa", "Psikiatri", "Referensi Klinis"]
    }
  }

  // 9. Tentukan Judul Terbaik
  const fileNameClean = cleanBookTitleFromFileName(file.name)
  let bestTitle = metadataTitle || fileNameClean

  // Bersihkan judul dari sisa watermark
  if (isBlacklistedWatermark(bestTitle)) {
    bestTitle = fileNameClean
  }

  // Jika nama berkas hanya "Volume X", periksa apakah ada judul utama di halaman 2-7
  if (/^(?:Volume|Vol\.?|Jilid)\s*\d+$/i.test(bestTitle)) {
    for (const pt of pageTexts) {
      if (pt.pageNum >= 2 && pt.pageNum <= 8) {
        const potentialMatch = pt.text.match(/([A-Z][a-zA-Z0-9\s\:\-\'\!]{4,45})/g)
        if (potentialMatch) {
          const candidate = potentialMatch.find(
            (c) =>
              !isBlacklistedWatermark(c) &&
              !c.toLowerCase().includes("volume") &&
              !c.toLowerCase().includes("daftar isi") &&
              !c.toLowerCase().includes("halaman")
          )
          if (candidate) {
            bestTitle = `${candidate.trim()} - ${bestTitle}`
            break
          }
        }
      }
    }
  }

  if (detectedAuthor && isBlacklistedWatermark(detectedAuthor)) {
    detectedAuthor = undefined
  }

  const finalSynopsis = cleanSynopsisText(extractedSynopsis)

  let detectedSummary = `Sampul Hal 1 • ${pageCount} Hal${detectedYear ? ` • Thn ${detectedYear}` : ""} • Kategori: ${suggestedCategoryName}`
  if (finalSynopsis) {
    detectedSummary += " • Sinopsis Siap"
  }

  return {
    coverDataUrl,
    pageCount,
    metadataTitle: bestTitle,
    metadataAuthor: detectedAuthor,
    metadataPublisher: detectedPublisher,
    extractedYear: detectedYear,
    extractedSynopsis: finalSynopsis,
    suggestedCategorySlug,
    suggestedCategoryName,
    suggestedTags,
    detectedType,
    detectedSummary,
  }
}

