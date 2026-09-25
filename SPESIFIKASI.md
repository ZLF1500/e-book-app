# Perpustakaan Digital RSJD Atma Husada Mahakam
## Dokumen Fitur & Skema Database Lengkap (v33 — Konsolidasi Master v31, v32 & v33)

---

## 0. Keputusan Utama yang Dikonfirmasi

| Poin | Keputusan |
|---|---|
| **Ketersediaan Unlimited Stock (Murni Biner)** | ⚠️ **Penegasan Mutlak** — Sebagai buku digital, **TIDAK ADA kuota eksemplar fisik, tidak ada antrean, dan tidak ada pembatasan jumlah peminjam serentak**. Semua anggota dapat mengakses dan meminjam buku yang sama secara instan. Status buku bersifat murni biner: **Tersedia (Akses Instan)** atau **Sedang Pemeliharaan / Revisi File** (diaktifkan admin bila berkas PDF/EPUB rusak atau sedang diperbarui). |
| **Akses Akun Tamu (Guest)** | ⚠️ **Revisi Final v32** — Tamu (belum login) hanya dapat menjelajahi katalog, mencari buku, dan membaca ringkasan sinopsis. **Tamu TIDAK BISA meminjam buku dan TIDAK BISA memberi ulasan**. Jika tombol Pinjam atau Kirim Ulasan diklik, sistem menampilkan dialog yang mengarahkan untuk Masuk / Buat Akun terlebih dahulu. |
| **Verifikasi Biodata Anti-Bot** | ⚠️ **Aturan Wajib v32** — Sebelum user meminjam buku untuk pertama kali, user **wajib mengisi biodata verifikasi** (Nama Lengkap sesuai KTP, NIK/Nomor Identitas resmi minimal 10 digit, Nomor WhatsApp aktif, Instansi, dan verifikasi OTP). Tujuannya adalah memvalidasi peminjam nyata dan mencegah bot/spam otomatis. |
| **KTA Digital Resmi Ber-QR Code** | 🌟 **Fitur Baru v33** — Anggota yang telah lolos verifikasi NIK otomatis mendapatkan Kartu Tanda Anggota (KTA) Digital resmi berdesain chip EMV dan QR Code otentik yang dapat diunduh/dicetak langsung dari profil dan rak pinjaman. |
| **Generator Sitasi Ilmiah Otomatis** | 🌟 **Fitur Baru v33** — Halaman buku dilengkapi generator sitasi 1-klik dengan standar format **APA 7th Edition, MLA 9th Edition, Chicago 17th, dan Harvard** untuk mendukung dokter, perawat, residen, dan peneliti RSJD. |
| **Rak Koleksi Tematik Kurasi** | 🌟 **Fitur Baru v33** — Paket bacaan terarah di beranda: *Manajemen Stres & Anti-Burnout*, *Pengasuhan Anak & Remaja (Parenting)*, *Ketenangan Jiwa & Mindfulness*, serta *Referensi Klinis Psikiatri*. |
| **Dasbor Reading Habit & Target** | 🌟 **Fitur Baru v33** — Halaman `/pinjaman` dilengkapi metrik pencapaian membaca: buku selesai, total menit membaca, reading streak harian, dan progress target tahunan (Reading Goal 2026). |
| **Catatan & Sorotan E-Reader (Notes & Highlights)** | 🌟 **Fitur Baru v33** — Di e-reader digital (`/baca/[bookId]`), pembaca dapat memberi stabilo warna-warni (kuning, hijau, biru), menyimpan catatan pemikiran per halaman, menyalin kumpulan catatan, serta memilih 3 tema kertas (*Putih*, *Sepia Hangat*, *Malam OLED*). |
| **Visual 3D Hardcover & Ribbon Bookmark** | 🌟 **Penyelarasan Desain v33** — Tampilan kartu buku dipercantik dengan aksen 3D spine lipatan buku fisik realistis dan pita pembatas buku (*ribbon bookmark*) elegan. |
| **Fokus Konten & Interface** | ⚠️ **Pembersihan Konten v32** — Seluruh informasi blog umum di luar aktivitas perpustakaan dieliminasi. Platform berfokus 100% pada ekosistem perbukuan dan literasi kesehatan jiwa RSJD. |
| **Strategi Database Zero-Ribet** | ✅ **MySQL Native Driver (`mysql2`)** — Menggunakan query SQL murni dengan Prepared Statements (`?`) aman dari SQL Injection. Berkas skrip SQL DDL & DML mandiri tersedia di `database.sql` untuk diimpor langsung ke phpMyAdmin / DBeaver / MariaDB. |
| Filter Tahun Terbit | ✅ **Slider rentang tahun** (mis. 2015–2024) — lebih praktis dan intuitif dibanding date picker kalender harian. |
| Tampilan List (grid/list toggle) | ✅ Cover kecil dengan aksen 3D spine, judul, penulis, kategori, badge status, tahun terbit, rating. |
| Pagination & jumlah per halaman | ✅ **12 item per halaman** (berlaku sama untuk tampilan Grid maupun List) — data diambil per-halaman langsung dari server (SQL `LIMIT`/`OFFSET`), **tidak** meload seluruh katalog buku sekaligus ke frontend. |
| Layout Grid | ✅ **4 kolom × 3 baris** (di layar desktop) = pas 12 card per halaman. Di layar lebih kecil kolom otomatis menyesuaikan (mis. 2 kolom di HP), tapi jumlah item per halaman tetap 12. |
| Durasi pinjam | ⚠️ **Final (v31)** — Durasi membatasi akses baca. **User sendiri pilih durasi (1–7 hari)** saat klik Pinjam, admin mengatur **batas maksimal** (default 7 hari) lewat `app_settings`. Begitu `due_at` lewat, status jadi "selesai" & wajib pinjam ulang untuk baca lagi — **kecuali** user sedang aktif membaca saat itu terjadi, sesi baca yang sedang berjalan tidak dipaksa keluar (lihat 4.1). |
| Format file | ✅ **PDF & EPUB keduanya** — default baca pakai PDF kalau ada, EPUB dirender jadi gambar fixed juga (demi konsistensi proteksi). User bisa pindah format manual (mis. PDF rusak → fallback ke EPUB). Status rusak dicatat per-format, bukan per-buku. Detail di bagian 6. |
| Download & salin | ✅ **Tidak bisa didownload, tidak bisa disalin**. Proteksi klik kanan, shortcut keyboard copy/print, dan drag text dinonaktifkan di reader. |
| Anti-screenshot & Traceability | ✅ **Watermark dinamis** mencantumkan nama peminjam, email, ID pengguna, dan timestamp akses secara diagonal di atas lembaran bacaan. |
| Header/Navigasi | ✅ Logo resmi RS Atma Husada Mahakam Samarinda `PerpusAHM.com`, Mega Menu Kategori, **Search Bar Global** (satu-satunya lokasi search di seluruh app, submit → `/buku?q=...`), Keyword Pills di bawah search bar, ikon Bookmark berdiri sendiri dengan badge counter, dan Menu Avatar Profil Pengguna. |
| Total koleksi buku | ✅ Ditampilkan sebagai indikator (mis. "1.000+ Koleksi Digital") di mega menu sebagai CTA ke katalog lengkap. |
| Ulasan — balas & hapus | ✅ Admin bisa **membalas** ulasan (1 balasan per ulasan, seperti Shopee) dan **menghapus** ulasan. |
| Monitor peminjam per buku | ✅ Admin bisa melihat **siapa saja yang sedang meminjam buku tertentu**. |
| Buku Pilihan Editor (Featured) | ✅ Admin bisa menandai buku tertentu sebagai "pilihan editor" (`is_featured`), terpisah dari sort otomatis (Populer/Rating/Terbaru). |
| Buku dinonaktifkan (mis. file rusak) | ⚠️ Buku **tetap muncul** di pencarian/katalog (tidak hilang/ditarik), hanya tombol "Baca" didisable + badge "Sedang Revisi File" muncul. Ini penting supaya bookmark pengguna tidak tiba-tiba hilang. |
| Lapor Masalah per buku | ✅ Tombol "Help"/lapor masalah di tiap halaman Detail Buku, agar pembaca dapat melaporkan jika ada halaman/file PDF/EPUB rusak. |
| Login & Autentikasi | ✅ Mendukung **Google OAuth** 1-klik, form email/password, serta **Lupa Password via Magic Link**. |
| Baru Saja Dilihat | ✅ Section di Beranda menampilkan riwayat kunjungan buku terakhir pengguna (tersimpan di `localStorage` untuk tamu atau tabel `recently_viewed` untuk user). |
| Baris ikon Kategori cepat | ✅ Akses cepat kategori langsung dari halaman Beranda (selain dropdown header). |
| Search bar — dropdown pintar | ✅ 3 kelompok: Riwayat Pencarian (hapus per-item/semua), Tags (badge flex-wrap tak beraturan max 25 + "Lainnya"), dan Penulis populer. |
| Baris Tag Populer | ✅ Pill tipis tepat di bawah Header (di atas Carousel) berisi tag trending. |
| Lanjutkan baca dari posisi terakhir | ✅ Menggunakan tabel `reading_progress` untuk menyimpan `last_page` dan `progress_percent` secara debounce. |

---

## 0.1 Arsitektur & Teknologi

| Aspek | Konfigurasi Project |
|---|---|
| Framework | **Next.js 16**, React 19, App Router (Turbopack) |
| Routing halaman | **File-based routing** di folder `app/` (mis. `app/buku/page.tsx`, `app/baca/[bookId]/page.tsx`, `app/pinjaman/page.tsx`) |
| Style & UI Components | Tailwind CSS + Radix UI + shadcn UI |
| Warna Primary | **Sky** (`#0284c7`) |
| Font | Heading: **Instrument Sans**, Body: **Inter**, Monospace: **Geist Mono** |
| Carousel | `embla-carousel-react` dengan auto-slide tanpa tombol panah/dots |
| Driver & Database | **MySQL Native (`mysql2/promise`)** dengan skema DDL & Seed di `database.sql` (Kompatibel 100% dengan MySQL 8.x / MariaDB 10.4+) |

---

## 1. Ringkasan Sistem

- **Nama sistem:** Perpustakaan Digital RSJD Atma Husada Mahakam
- **Tujuan:** Menyediakan akses literatur dan e-book digital fokus kesehatan jiwa, psikiatri, dan kesehatan umum untuk masyarakat luas dan civitas rumah sakit.
- **Target pengguna:** Masyarakat umum, pasien/keluarga, perawat, dokter, residen psikiatri, dan akademisi.
- **Karakteristik Akses:** Unlimited stock (tanpa batas kuota eksemplar fisik).

---

## 2. Role & Hak Akses Pengguna

### A. Tamu (Belum Login)
- Dapat mencari buku lewat Global Search Bar di Header.
- Dapat melihat katalog lengkap, memfilter berdasarkan kategori, dan rentang tahun terbit.
- Dapat membuka halaman Detail Buku untuk membaca sinopsis, spesifikasi, dan melihat ulasan pembaca lain.
- **Terkunci:** Tombol *"Pinjam E-Book"* & *"Kirim Ulasan"* &rarr; Membuka modal peringatan untuk Masuk atau Buat Akun baru.
- **Terkunci:** Tidak memiliki akses ke halaman *Rak Pinjaman Saya* (`/pinjaman`).

### B. Pengguna / Member (Terdaftar)
- Dapat menyimpan buku ke bookmark pribadi.
- **Belum Verifikasi Biodata:** Saat mengklik *"Pinjam E-Book"*, sistem memunculkan formulir **"Verifikasi Identitas Peminjam (Anti-Bot)"** (Nama KTP, NIK minimal 10 digit, No. WhatsApp aktif, Instansi, dan OTP 6-digit).
- **Sudah Terverifikasi Biodata:** Dapat langsung memilih durasi pinjam 1–7 hari dan membuka reader digital seketika.
- Berhak mendapatkan **Kartu Tanda Anggota (KTA) Digital Resmi RSJD** ber-QR Code yang dapat diunduh/dicetak.
- Dapat menuliskan ulasan dan memberikan rating bintang 1–5 (1 ulasan per buku).
- Dapat melihat progres membaca terakhir di halaman *Rak Pinjaman Saya*.
- Dapat menambahkan catatan dan sorotan stabilo (*highlights*) di e-reader digital.

### C. Admin / Pustakawan RSJD
- Dashboard ringkasan koleksi buku, peminjaman aktif, dan statistik pembaca.
- Master Buku: Tambah buku baru, upload file PDF/EPUB, edit metadata, hapus buku, dan toggle status *Pilihan Editor*.
- Monitor peminjam: Memantau daftar pembaca yang sedang meminjam buku tertentu.
- Moderasi ulasan: Membalas ulasan pembaca (1 balasan resmi per ulasan) dan menghapus ulasan spam/melanggar etika.
- Pengaturan: Mengubah batas maksimal hari peminjaman (`app_settings.max_loan_days`).
- Manajemen laporan: Meninjau dan menyelesaikan laporan format buku rusak yang dikirim pembaca.

---

## 3. Spesifikasi Halaman Beranda (`/`)

### 3.0.0 Baris Tag Populer
- Posisi: Paling atas, tepat di bawah Header, sebelum carousel cover.
- Tampilan: Pill teks tipis, scrollable horizontal, berisi tag yang paling banyak digunakan (`usage_count` terbanyak).
- Klik tag &rarr; Mengarahkan ke `/buku?tag=...` dengan filter aktif.

### 3.0 Carousel Cover Buku Populer
- Posisi: Di bawah baris Tag Populer, di atas rak kategori.
- Isi: 7–10 cover buku paling populer (`ORDER BY loan_count DESC LIMIT 10`).
- Efek: Auto-slide bergeser otomatis tiap 3–4 detik, loop tanpa tombol navigasi panah/dots untuk visual minimalis dan senyap.
- Cover dilengkapi visual **3D Hardcover Spine** dan badge `🌐 ID`.
- Klik cover &rarr; Langsung ke halaman Detail Buku.

### 3.0.1 Baris Ikon Kategori Cepat
- Akses cepat kategori horizontal (Kesehatan Jiwa, Mindfulness, Manajemen Stres, Parenting, Konseling, dll).
- Klik ikon &rarr; Langsung memfilter katalog sesuai kategori tersebut.

### 3.0.2 Baru Saja Dilihat (Recently Viewed)
- Menampilkan kartu buku yang baru saja dibuka halaman detailnya oleh pengguna.
- Tersimpan di `localStorage` untuk tamu dan tabel `recently_viewed` untuk member login.
- Bagian ini otomatis disembunyikan jika riwayat masih kosong.

### 3.0.3 Rak Koleksi Tematik Kurasi Pustakawan (Fitur Baru v33)
- 4 paket bacaan siap akses:
  1. 🧠 *Manajemen Stres & Anti-Burnout*
  2. 👨‍👩‍👧 *Pengasuhan Anak & Remaja (Parenting)*
  3. 🌿 *Ketenangan Jiwa, Tidur & Mindfulness*
  4. 🏥 *Referensi Klinis Psikiatri & Medis*

### 3.1 Search Bar — Dropdown Pintar
- Terletak di Header global (satu-satunya input pencarian di aplikasi).
- **Kondisi Fokus (Belum Mengetik):** Menampilkan Riwayat Pencarian pribadi (dengan tombol hapus per-item dan hapus semua), Tags flex-wrap tak beraturan (max 25 tag + expand "Lainnya"), dan Penulis Populer.
- **Kondisi Mengetik (Live Search):** Menampilkan saran pencarian judul buku, filter tag yang cocok, dan filter penulis yang relevan.

### 3.2 Toolbar Katalog Buku
```
[ ▦ Grid / List ] [ ⚙ Filter Dialog ] [ Terbaru | Populer | Rating | Bookmark ] [ ⇅ Sort Direction ]
```
1. **Grid/List Toggle:** Beralih antara tampilan kartu grid 4x3 desktop dan tampilan list baris.
2. **Filter Dialog:**
   - **Kategori:** Radio single-select (`categories`).
   - **Status:** Radio (Semua / Akses Instan / Sedang Revisi File).
   - **Penulis & Penerbit:** Input teks autocomplete.
   - **Tahun Terbit:** Slider rentang tahun (2015–2024).
3. **Selection Sort:** Segmented buttons (Terbaru, Populer, Rating, Bookmark).
4. **Arah Urutan:** Toggle Ascending/Descending (disembunyikan saat tab "Bookmark" aktif).

---

## 4. Skema Database Relasional MySQL Native

Seluruh arsitektur basis data menggunakan **MySQL Native murni** dengan skema DDL dan DML lengkap yang tersimpan dalam berkas:
- **[database.sql](file:///run/media/zoe/Programmer/Programmer/e-book/database.sql)**: Berkas SQL import siap pakai untuk phpMyAdmin, DBeaver, atau MariaDB CLI.
- **[lib/db.ts](file:///run/media/zoe/Programmer/Programmer/e-book/lib/db.ts)**: Driver koneksi pool `mysql2/promise` dengan prepared statements.

### Struktur Tabel Utama (21 Tabel Aktif di MariaDB `perpusahm`)
1. `users` — Akun civitas RSJD & pembaca umum.
2. `oauth_accounts` — Kredensial masuk Google OAuth 2.0.
3. `password_reset_tokens` — Token pemulihan kata sandi dengan batas kedaluwarsa.
4. `verification_otps` — Kode OTP 6 digit email / WhatsApp anti-bot (transient).
5. `categories` — Kategori literatur kesehatan jiwa dan kedokteran.
6. `authors` — Data penulis dan dokter pengarang manuskrip.
7. `publishers` — Data penerbit buku.
8. `tags` — Tag topik trending literatur digital.
9. `books` — Metadata katalog e-book.
10. `book_files` — Berkas digital asli (PDF & EPUB).
11. `book_tags` — Relasi Many-to-Many buku dan tag.
12. `loans` — Transaksi peminjaman buku digital dengan batas tanggal `dueAt`.
13. `reading_progress` — Pelacakan posisi baca dan persentase pembaca.
14. `favorites` — Koleksi buku yang disimpan/di-bookmark pengguna.
15. `reviews` — Rating & ulasan pembaca beserta tanggapan admin.
16. `book_reports` — Laporan pembaca terhadap kendala/kerusakan berkas digital.
17. `notifications` — Notifikasi sistem dan peminjaman bagi pengguna.
18. `search_history` — Riwayat pencarian pengguna terintegrasi ke database.
19. `recently_viewed` — Jejak buku yang terakhir diakses pembaca.
20. `articles` — Artikel publikasi dan literasi kesehatan jiwa.
21. `app_settings` — Konfigurasi global sistem (maksimal durasi pinjam, dsb).

### Cuplikan DDL Skrip SQL MySQL Native:
```sql
CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NULL,
  nik VARCHAR(20) UNIQUE NULL,
  phone VARCHAR(25) NULL,
  institution VARCHAR(150) NULL,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  avatar_url VARCHAR(255),
  role ENUM('member','admin') NOT NULL DEFAULT 'member',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE books (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  synopsis TEXT,
  cover_url VARCHAR(255),
  author_id BIGINT UNSIGNED,
  publisher_id BIGINT UNSIGNED,
  category_id BIGINT UNSIGNED,
  isbn VARCHAR(20),
  publish_year YEAR,
  language VARCHAR(50) DEFAULT 'Indonesia',
  page_count INT UNSIGNED,
  status ENUM('aktif','nonaktif') NOT NULL DEFAULT 'aktif',
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  loan_count INT UNSIGNED NOT NULL DEFAULT 0,
  average_rating DECIMAL(3,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE SET NULL,
  FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE SET NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE book_files (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  book_id BIGINT UNSIGNED NOT NULL,
  format ENUM('pdf','epub') NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  status ENUM('aktif','rusak') NOT NULL DEFAULT 'aktif',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_book_format (book_id, format),
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE TABLE loans (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  book_id BIGINT UNSIGNED NOT NULL,
  duration_days TINYINT UNSIGNED NOT NULL,
  borrowed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_at DATETIME NOT NULL,
  status ENUM('aktif','selesai') NOT NULL DEFAULT 'aktif',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE TABLE book_reports (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  book_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED,
  format ENUM('pdf','epub') NOT NULL DEFAULT 'pdf',
  message TEXT NOT NULL,
  status ENUM('baru','ditinjau','selesai') NOT NULL DEFAULT 'baru',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

---

## 5. Logika Peminjaman & Sesi Baca Reader

### 5.0 Penegasan Unlimited Stock
Karena bersifat digital tanpa kuota, "Peminjaman" **bukan** membatasi sumber daya fisik. Tujuannya adalah:
1. Menata rak bacaan aktif pribadi pengguna di menu *Daftar Pinjaman Saya*.
2. Memfasilitasi audit dan pelaporan statistik sirkulasi buku RSJD.
3. Memberikan pengalaman membaca tertib dengan batas waktu pilihan (1–7 hari).

### 5.1 Siklus Akses Baca
1. **Pengecekan Saat Pintu Masuk:** Pengecekan status pinjam hanya terjadi sekali saat pengguna mengakses `/baca/[bookId]`. Jika `NOW() > due_at` di titik ini, pembaca dialihkan ke halaman pemberitahuan masa pinjam selesai dan dipersilakan meminjam ulang.
2. **Tidak Di-kick Paksa:** Jika masa pinjam `due_at` habis ketika pembaca **sedang aktif membaca di dalam reader**, pembaca **TIDAK DIKELUARKAN SECARA PAKSA**. Pembaca dapat menyelesaikan sesi membacanya sampai ia sengaja keluar atau menutup tab. Begitu keluar, ia wajib meminjam ulang.
3. **Lanjutkan Baca Otomatis (Debounce):** Nomor halaman terakhir (`last_page`) tersimpan otomatis secara debounce 1–2 detik, sehingga saat buku dibuka kembali, langsung melompat ke halaman terakhir yang dibaca.

---

## 6. Fitur Unggulan Perpustakaan Digital v33

### 6.1 KTA Digital Resmi Ber-QR Code
- Terbit otomatis untuk seluruh anggota yang telah lolos verifikasi NIK & nomor aktif.
- Menampilkan nomor anggota resmi `RSJD-LIB-2026-XXXX`, NIK sensor KTP, nama lengkap, instansi, chip kartu pintar, dan QR Code SVG validasi.
- Dapat diakses dari dropdown avatar profil Header dan dashboard halaman `/pinjaman`.
- Dilengkapi tombol cetak dan ekspor kartu digital.

### 6.2 Generator Sitasi Ilmiah Otomatis
- Tersemat di halaman detail buku (`/buku/[slug]`).
- Menyediakan format rujukan akademis lengkap:
  - APA 7th Edition
  - MLA 9th Edition
  - Chicago 17th Edition
  - Harvard Referencing
- Dilengkapi tombol 1-klik salin sitasi ke clipboard.

### 6.3 E-Reader Notes & Highlights Drawer
- Tersemat di e-reader digital (`/baca/[bookId]`).
- Pilihan 3 warna stabilo: Kuning, Hijau, Biru.
- Pencatatan pemikiran dan kutipan per nomor halaman secara persisten di `localStorage`.
- Tombol ekspor dan salin seluruh catatan bacaan.
- 3 Tema Kertas: *Putih*, *Sepia Hangat*, dan *Malam OLED Dark*.

---

## 7. Panduan Deployment Basis Data MySQL Native
Saat server fisik / VPS RSJD atau hosting siap digunakan:
1. Impor berkas [database.sql](file:///run/media/zoe/Programmer/Programmer/e-book/database.sql) langsung via phpMyAdmin atau terminal:
   ```bash
   mysql -u user_rsjd -p perpusahm < database.sql
   ```
2. Sesuaikan konfigurasi di `.env` server:
   ```env
   MYSQL_HOST="localhost"
   MYSQL_PORT="3306"
   MYSQL_USER="user_rsjd"
   MYSQL_PASSWORD="password_aman_rsjd"
   MYSQL_DATABASE="perpusahm"
   ```
3. Seluruh tabel, indeks, relasi, dan seed data admin/kategori langsung aktif seketika tanpa memerlukan migrasi ORM.
