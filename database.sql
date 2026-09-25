-- ============================================================================
-- Skema Database Resmi Perpustakaan Digital RSJD Atma Husada Mahakam
-- Format: MySQL / MariaDB Native SQL Script
-- Kompatibel dengan: MySQL 8.x+, MariaDB 10.4+, phpMyAdmin, HeidiSQL, DBeaver
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `perpusahm`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `perpusahm`;

-- ----------------------------------------------------------------------------
-- 1. TABEL: users (Pengguna, Pembaca, dan Admin Pustakawan)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NULL,
  `nik` VARCHAR(50) NULL UNIQUE,
  `phone` VARCHAR(50) NULL,
  `institution` VARCHAR(255) NULL,
  `isVerified` TINYINT(1) NOT NULL DEFAULT 0,
  `avatarUrl` MEDIUMTEXT NULL,
  `role` ENUM('member', 'admin', 'super_admin') NOT NULL DEFAULT 'member',
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_email` (`email`),
  INDEX `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. TABEL: oauth_accounts (Integrasi Google Sign-In)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `oauth_accounts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `provider` VARCHAR(50) NOT NULL,
  `providerAccountId` VARCHAR(255) NOT NULL,
  `accessToken` TEXT NULL,
  `refreshToken` TEXT NULL,
  `expiresAt` DATETIME NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_provider_account` (`provider`, `providerAccountId`),
  INDEX `idx_oauth_user_id` (`userId`),
  CONSTRAINT `fk_oauth_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. TABEL: password_reset_tokens (Tautan Reset Sandi)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL,
  `token` VARCHAR(255) NOT NULL UNIQUE,
  `expiresAt` DATETIME NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_reset_token` (`token`),
  INDEX `idx_reset_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. TABEL: verification_otps (Kode OTP 6-Digit Email / WhatsApp)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `verification_otps` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `identifier` VARCHAR(255) NOT NULL,
  `otpCode` VARCHAR(10) NOT NULL,
  `expiresAt` DATETIME NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_otp_identifier` (`identifier`),
  INDEX `idx_otp_code` (`otpCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. TABEL: categories (Kategori Literatur Digital)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `slug` VARCHAR(100) NOT NULL UNIQUE,
  `iconName` VARCHAR(50) NULL,
  `description` TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. TABEL: authors (Penulis / Pengarang)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `authors` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `bio` TEXT NULL,
  `photoUrl` TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 7. TABEL: publishers (Penerbit)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `publishers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 8. TABEL: tags (Topik / Tag Buku)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tags` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `slug` VARCHAR(100) NOT NULL UNIQUE,
  `usageCount` INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 9. TABEL: books (Koleksi Buku & Manuskrip)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `books` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL UNIQUE,
  `synopsis` TEXT NULL,
  `coverUrl` TEXT NULL,
  `authorId` INT NULL,
  `publisherId` INT NULL,
  `categoryId` INT NULL,
  `authorName` VARCHAR(255) NULL,
  `publisherName` VARCHAR(255) NULL,
  `categoryName` VARCHAR(255) NULL,
  `isbn` VARCHAR(50) NULL,
  `publishYear` INT NULL,
  `language` VARCHAR(50) NOT NULL DEFAULT 'Indonesia',
  `pageCount` INT NOT NULL DEFAULT 200,
  `status` VARCHAR(20) NOT NULL DEFAULT 'aktif',
  `isFeatured` TINYINT(1) NOT NULL DEFAULT 0,
  `loanCount` INT NOT NULL DEFAULT 0,
  `averageRating` FLOAT NOT NULL DEFAULT 0.0,
  `reviewCount` INT NOT NULL DEFAULT 0,
  `pdfAvailable` TINYINT(1) NOT NULL DEFAULT 1,
  `epubAvailable` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_books_category` (`categoryId`),
  INDEX `idx_books_author` (`authorId`),
  INDEX `idx_books_publisher` (`publisherId`),
  INDEX `idx_books_status` (`status`),
  CONSTRAINT `fk_books_author` FOREIGN KEY (`authorId`) REFERENCES `authors` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_books_publisher` FOREIGN KEY (`publisherId`) REFERENCES `publishers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_books_category` FOREIGN KEY (`categoryId`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 10. TABEL: book_files (Berkas Digital PDF & EPUB)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `book_files` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `bookId` INT NOT NULL,
  `format` VARCHAR(10) NOT NULL,
  `filePath` TEXT NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'aktif',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_book_format` (`bookId`, `format`),
  CONSTRAINT `fk_files_book` FOREIGN KEY (`bookId`) REFERENCES `books` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 11. TABEL: book_tags (Relasi Many-to-Many Buku dan Tag)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `book_tags` (
  `bookId` INT NOT NULL,
  `tagId` INT NOT NULL,
  PRIMARY KEY (`bookId`, `tagId`),
  CONSTRAINT `fk_bt_book` FOREIGN KEY (`bookId`) REFERENCES `books` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bt_tag` FOREIGN KEY (`tagId`) REFERENCES `tags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 13. TABEL: loans (Peminjaman Buku Digital)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `loans` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `bookId` INT NOT NULL,
  `durationDays` INT NOT NULL,
  `borrowedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `dueAt` DATETIME NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'aktif',
  `lastPage` INT NOT NULL DEFAULT 1,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_loans_user` (`userId`),
  INDEX `idx_loans_status` (`status`),
  CONSTRAINT `fk_loans_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_loans_book` FOREIGN KEY (`bookId`) REFERENCES `books` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 14. TABEL: reading_progress (Riwayat & Persentase Bacaan Pengguna)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `reading_progress` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `bookId` INT NOT NULL,
  `lastPage` INT NOT NULL DEFAULT 1,
  `progressPercent` FLOAT NOT NULL DEFAULT 0.0,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_user_book_progress` (`userId`, `bookId`),
  CONSTRAINT `fk_rp_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rp_book` FOREIGN KEY (`bookId`) REFERENCES `books` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 15. TABEL: favorites (Buku Favorit / Bookmark Pembaca)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `favorites` (
  `userId` INT NOT NULL,
  `bookId` INT NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`userId`, `bookId`),
  CONSTRAINT `fk_fav_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_fav_book` FOREIGN KEY (`bookId`) REFERENCES `books` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 16. TABEL: reviews (Ulasan & Rating Buku)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `reviews` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `bookId` INT NOT NULL,
  `rating` INT NOT NULL,
  `comment` TEXT NULL,
  `adminReply` TEXT NULL,
  `adminReplyAt` DATETIME NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_reviews_book` (`bookId`),
  CONSTRAINT `fk_reviews_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reviews_book` FOREIGN KEY (`bookId`) REFERENCES `books` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 17. TABEL: book_reports (Laporan Kerusakan / Masalah Buku)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `book_reports` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `bookId` INT NOT NULL,
  `userId` INT NULL,
  `format` VARCHAR(10) NOT NULL DEFAULT 'PDF',
  `message` TEXT NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'baru',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_reports_book` FOREIGN KEY (`bookId`) REFERENCES `books` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reports_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 18. TABEL: app_settings (Pengaturan Sistem Perpustakaan)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `app_settings` (
  `settingKey` VARCHAR(100) PRIMARY KEY,
  `settingValue` TEXT NOT NULL,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 19. TABEL: search_history (Riwayat Pencarian Pengguna)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `search_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `query` VARCHAR(255) NOT NULL,
  `searchedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_sh_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 20. TABEL: recently_viewed (Terakhir Dilihat)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `recently_viewed` (
  `userId` INT NOT NULL,
  `bookId` INT NOT NULL,
  `viewedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`userId`, `bookId`),
  CONSTRAINT `fk_rv_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rv_book` FOREIGN KEY (`bookId`) REFERENCES `books` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 20. TABEL: notifications (Notifikasi Pengguna)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `type` VARCHAR(50) NOT NULL DEFAULT 'system',
  `link` VARCHAR(255) NULL,
  `isRead` TINYINT(1) NOT NULL DEFAULT 0,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_notifications_user` (`userId`),
  INDEX `idx_notifications_read` (`userId`, `isRead`),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 22. TABEL: articles (Artikel & Publikasi Edukasi)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `articles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL UNIQUE,
  `thumbnailUrl` TEXT NULL,
  `excerpt` TEXT NOT NULL,
  `content` LONGTEXT NULL,
  `authorName` VARCHAR(255) NOT NULL,
  `readTime` VARCHAR(50) NOT NULL DEFAULT '5 menit',
  `category` VARCHAR(100) NOT NULL DEFAULT 'Kesehatan Jiwa',
  `publishedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_articles_slug` (`slug`),
  INDEX `idx_articles_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- DATA AWAL (SEED DATA LENGKAP)
-- ============================================================================

-- 1. Pengaturan Sistem Bawaan
INSERT INTO `app_settings` (`settingKey`, `settingValue`)
VALUES ('max_loan_days', '7')
ON DUPLICATE KEY UPDATE `settingValue` = VALUES(`settingValue`);

-- 2. Akun Demo Bawaan
-- Password admin: "adminpassword123" (scrypt hash)
-- Password member: "password123" (scrypt hash)
INSERT INTO `users` (`id`, `name`, `email`, `password`, `nik`, `phone`, `institution`, `isVerified`, `avatarUrl`, `role`, `isActive`)
VALUES
(
  1,
  'Pustakawan RSJD',
  'admin@rsjd.kaltimprov.go.id',
  '0119834709ed2b660175ea49de8de69a:b04ca0f87d580ad6f6f57d73ffd18a186870a4e417a66558c92ff8383dcf0ee16671b963d02a7b6e8cb06367a3c2e1007172ae83c218cc818ab08d60b56874f3',
  '6472010101900001',
  '081155001234',
  'RSJD Atma Husada Mahakam',
  1,
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'admin',
  1
),
(
  2,
  'Budi Santoso, S.Kom',
  'budi@example.com',
  '2f044fd480f20a9c7146453866c84616:d0b03b1e287d38aee0002c9691a90055beac622684d208680e18b462af9ef8bdfb51b81306b4a2da2cb92c2e7d14111670107148630382f3759300fec9977b88',
  '6472020202950002',
  '081234567890',
  'Dinas Kesehatan Samarinda',
  1,
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  'member',
  1
),
(
  3,
  'Siti Rahmawati',
  'siti@example.com',
  '2f044fd480f20a9c7146453866c84616:d0b03b1e287d38aee0002c9691a90055beac622684d208680e18b462af9ef8bdfb51b81306b4a2da2cb92c2e7d14111670107148630382f3759300fec9977b88',
  '6472030303980003',
  '081345678901',
  'Universitas Mulawarman',
  0,
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'member',
  1
)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 3. Kategori Bawaan
INSERT INTO `categories` (`id`, `name`, `slug`, `iconName`, `description`)
VALUES
(1, 'Kesehatan Jiwa & Psikiatri', 'kesehatan-jiwa-psikiatri', 'Brain', 'Panduan pemahaman gangguan kejiwaan, neurobiologi, dan intervensi psikiatri modern.'),
(2, 'Psikologi & Konseling', 'psikologi-konseling', 'HeartHandshake', 'Teknik konseling, psikoterapi kognitif perilaku, dan komunikasi terapeutik.'),
(3, 'Pengembangan Diri & Mindfulness', 'pengembangan-diri-mindfulness', 'Sparkles', 'Latihan kesadaran penuh, resiliensi emosional, dan penemuan makna hidup.'),
(4, 'Manajemen Stres & Burnout', 'manajemen-stres-burnout', 'Activity', 'Strategi mengatasi beban kerja, relaksasi saraf, dan pencegahan kelelahan mental.'),
(5, 'Parenting & Perkembangan Anak', 'parenting-perkembangan-anak', 'Users', 'Pola asuh sehat, deteksi dini neurodivergensi, dan stimulasi emosi anak.'),
(6, 'Gizi & Kesehatan Fisik', 'gizi-kesehatan-fisik', 'Apple', 'Koneksi sumbu usus-otak, nutrisi penunjang fungsi saraf, dan pola hidup sehat.'),
(7, 'Geriatri & Kesehatan Lansia', 'geriatri-kesehatan-lansia', 'Smile', 'Perawatan demensia, dukungan psikogeriatri, dan kualitas hidup lanjut usia.'),
(8, 'Pertolongan Pertama Psikologis', 'pertolongan-pertama-psikologis', 'ShieldAlert', 'Kesiapsiagaan krisis, intervensi pascatrauma, dan dukungan emosional darurat.'),
(9, 'Sastra, Novel & Fiksi', 'sastra-novel-fiksi', 'BookOpen', 'Koleksi karya sastra, novel fiksi, rekreasi mental, dan biblioterapi untuk relaksasi pembaca.'),
(10, 'Koleksi Umum & Literasi Populer', 'koleksi-umum-literasi-populer', 'Compass', 'Buku wawasan umum, sains populer, teknologi, biografi, dan pengetahuan multidisiplin.')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `slug` = VALUES(`slug`), `description` = VALUES(`description`);

-- ============================================================================
-- Selesai. Seluruh tabel dan data awal berhasil disiapkan.
-- ============================================================================
