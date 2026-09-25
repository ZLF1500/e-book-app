import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import mysql from "mysql2/promise"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main() {
  const host = process.env.MYSQL_HOST || "localhost"
  const port = parseInt(process.env.MYSQL_PORT || "3306", 10)
  const user = process.env.MYSQL_USER || "root"
  const password = process.env.MYSQL_PASSWORD || ""
  const database = process.env.MYSQL_DATABASE || "perpusahm"

  console.log(`Menghubungkan ke MySQL di ${host}:${port} sebagai user '${user}'...`)

  try {
    // 1. Koneksi awal ke server MySQL (tanpa spesifikasi database dulu)
    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true,
    })

    console.log("✓ Berhasil terhubung ke server MySQL/MariaDB.")

    // 2. Baca file database.sql
    const sqlFilePath = path.join(__dirname, "..", "database.sql")
    const sqlContent = fs.readFileSync(sqlFilePath, "utf8")

    console.log(`Mengeksekusi skrip DDL & Seed dari ${sqlFilePath}...`)
    await connection.query(sqlContent)

    console.log(`✓ Skema database dan data awal '${database}' berhasil diinisialisasi!`)
    await connection.end()
    process.exit(0)
  } catch (err) {
    console.error("✕ Gagal menginisialisasi database MySQL:", err.message)
    console.info("\nPetunjuk Penanganan:")
    console.info("1. Pastikan MariaDB/MySQL berjalan di sistem Anda.")
    console.info("2. Jika user root memerlukan password, atur MYSQL_PASSWORD=\"...\" di file .env")
    console.info("3. Anda juga dapat langsung mengimpor file 'database.sql' melalui phpMyAdmin atau DBeaver.")
    process.exit(1)
  }
}

main()
