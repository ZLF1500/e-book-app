import type { Metadata } from "next"
import Link from "next/link"
import {
  BookOpen,
  HeartHandshake,
  ShieldCheck,
  Building2,
  PhoneCall,
  Mail,
  MapPin,
  Clock,
  Sparkles,
  ArrowRight,
  Library,
  Users,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Tentang Kami — PerpusAHM.com",
  description:
    "Profil dan dedikasi Perpustakaan Digital RSJD Atma Husada Mahakam Samarinda dalam menyediakan literasi kesehatan jiwa dan psikiatri modern.",
}

export default function TentangKamiPage() {
  return (
    <div className="min-h-screen bg-background py-10 sm:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header Breadcrumb & Title */}
        <div className="space-y-3 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            <Building2 className="h-3.5 w-3.5" />
            <span>Profil Lembaga & Layanan Digital</span>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50">
            Tentang <span className="text-sky-600">PerpusAHM</span>
          </h1>
          <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Perpustakaan Digital Resmi Rumah Sakit Jiwa Daerah (RSJD) Atma Husada Mahakam Samarinda.
            Wadah literasi komprehensif untuk mendukung kesehatan mental masyarakat Kalimantan Timur dan seluruh Indonesia.
          </p>
        </div>

        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <h2 className="font-heading text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                Dedikasi untuk Pemulihan & Edukasi Jiwa
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Didirikan sebagai wujud komitmen RSJD Atma Husada Mahakam dalam mendemokratisasi akses terhadap bahan bacaan berkualitas, 
                PerpusAHM menyediakan koleksi digital mutakhir di bidang psikiatri klinis, keperawatan jiwa, psikoterapi, 
                pengembangan diri, serta panduan kesehatan mental keluarga.
              </p>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Seluruh materi dapat dipinjam secara <strong>100% gratis</strong> tanpa antrean kuota fisik, 
                dilengkapi perlindungan integritas berkas digital (DRM) dan reader interaktif yang nyaman dibaca di segala perangkat.
              </p>
              <div className="pt-2">
                <Link
                  href="/buku"
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs sm:text-sm font-semibold px-5 py-2.5 shadow-sm transition-all"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Jelajahi Koleksi E-Book</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Feature stats cards */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/80">
                <Library className="h-6 w-6 text-sky-600 mb-2" />
                <div className="font-heading text-2xl font-extrabold text-neutral-900 dark:text-neutral-100">
                  100%
                </div>
                <div className="text-xs text-neutral-600 dark:text-neutral-400 font-medium mt-0.5">
                  Akses Gratis Tanpa Biaya
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80">
                <HeartHandshake className="h-6 w-6 text-emerald-600 mb-2" />
                <div className="font-heading text-2xl font-extrabold text-neutral-900 dark:text-neutral-100">
                  24/7
                </div>
                <div className="text-xs text-neutral-600 dark:text-neutral-400 font-medium mt-0.5">
                  Layanan Literasi Digital
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80">
                <ShieldCheck className="h-6 w-6 text-amber-600 mb-2" />
                <div className="font-heading text-2xl font-extrabold text-neutral-900 dark:text-neutral-100">
                  Anti-Bot
                </div>
                <div className="text-xs text-neutral-600 dark:text-neutral-400 font-medium mt-0.5">
                  Keamanan NIK Terlindungi
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80">
                <Users className="h-6 w-6 text-indigo-600 mb-2" />
                <div className="font-heading text-2xl font-extrabold text-neutral-900 dark:text-neutral-100">
                  Ribuan
                </div>
                <div className="text-xs text-neutral-600 dark:text-neutral-400 font-medium mt-0.5">
                  Pembaca Terlayani
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mission & Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-600">
              <Sparkles className="h-4 w-4" />
              <span>Visi Kami</span>
            </div>
            <h3 className="font-heading text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Menjadi Pusat Rujukan Literasi Kesehatan Jiwa Terunggul di Indonesia
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Mewujudkan perpustakaan ramah digital yang mampu menjembatani ilmu psikiatri mutakhir kepada tenaga medis, akademisi, 
              penyintas, serta keluarga pasien guna menghapus stigma gangguan kesehatan jiwa di masyarakat.
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-600">
              <Sparkles className="h-4 w-4" />
              <span>Misi Layanan</span>
            </div>
            <ul className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-sky-600 font-bold">•</span>
                <span>Menyediakan koleksi e-book bermutu tinggi berformat EPUB & PDF terkurasi.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sky-600 font-bold">•</span>
                <span>Mengembangkan platform digital yang inklusif, responsif, dan mudah diakses bagi semua kalangan.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sky-600 font-bold">•</span>
                <span>Mendukung program biblioterapi bagi pasien dan pengunjung RSJD Atma Husada Mahakam.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Contact / Alamat Layanan */}
        <div id="kontak" className="p-6 sm:p-8 rounded-3xl border border-border bg-neutral-50 dark:bg-neutral-900/50 space-y-5">
          <div>
            <h3 className="font-heading text-xl font-bold text-neutral-900 dark:text-neutral-100">
              Layanan Informasi & Pustakawan
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Hubungi tim kami untuk konsultasi penelusuran pustaka, donasi naskah e-book, atau bantuan teknis akun.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-card border border-border space-y-1">
              <div className="flex items-center gap-2 text-sky-600 font-semibold">
                <PhoneCall className="h-4 w-4" />
                <span>Hotline RSJD (24 Jam)</span>
              </div>
              <div className="text-neutral-900 dark:text-neutral-100 font-bold">
                (0541) 743364
              </div>
              <div className="text-[11px] text-neutral-500">
                Panggilan darurat & informasi umum
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-card border border-border space-y-1">
              <div className="flex items-center gap-2 text-emerald-600 font-semibold">
                <PhoneCall className="h-4 w-4" />
                <span>WhatsApp Pustakawan</span>
              </div>
              <div className="text-neutral-900 dark:text-neutral-100 font-bold">
                0811-5500-1234
              </div>
              <div className="text-[11px] text-neutral-500">
                Layanan chat jam kerja
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-card border border-border space-y-1">
              <div className="flex items-center gap-2 text-indigo-600 font-semibold">
                <Mail className="h-4 w-4" />
                <span>Email Resmi</span>
              </div>
              <div className="text-neutral-900 dark:text-neutral-100 font-bold truncate">
                perpustakaan@rsjdatmahusada.go.id
              </div>
              <div className="text-[11px] text-neutral-500">
                Korespodensi ilmiah & kerjasama
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-card border border-border space-y-1">
              <div className="flex items-center gap-2 text-amber-600 font-semibold">
                <MapPin className="h-4 w-4" />
                <span>Lokasi Fisik</span>
              </div>
              <div className="text-neutral-900 dark:text-neutral-100 font-bold">
                Gedung Litbang RSJD
              </div>
              <div className="text-[11px] text-neutral-500">
                Jl. Kakap No. 23, Samarinda, Kaltim
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
