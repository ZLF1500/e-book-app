import mysql from "mysql2/promise"
import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise"

// Singleton Pool Instance for Next.js Fast Refresh & Serverless Environment
declare global {
  // eslint-disable-next-line no-var
  var __mysqlPool: Pool | undefined
}

function createMySQLPool(): Pool {
  const host = process.env.MYSQL_HOST || "localhost"
  const port = parseInt(process.env.MYSQL_PORT || "3306", 10)
  const user = process.env.MYSQL_USER || "root"
  const password = process.env.MYSQL_PASSWORD || ""
  const database = process.env.MYSQL_DATABASE || "perpusahm"

  return mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10,
    idleTimeout: 60000,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    dateStrings: true, // Keep date format clean & predictable (YYYY-MM-DD HH:mm:ss)
  })
}

export const pool: Pool = globalThis.__mysqlPool || createMySQLPool()

if (process.env.NODE_ENV !== "production") {
  globalThis.__mysqlPool = pool
}

export type QueryParam = string | number | boolean | Date | Buffer | null | undefined

/**
 * Menjalankan SELECT query dengan prepared statement (?)
 * Mengembalikan array of rows bertipe T.
 */
export async function query<T = RowDataPacket>(
  sql: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any[] = []
): Promise<T[]> {
  try {
    const [rows] = await pool.query<RowDataPacket[] & T[]>(sql, params)
    return rows as T[]
  } catch (err: unknown) {
    const error = err as Error & { code?: string }
    console.error(`[MySQL Query Error] ${sql} =>`, error.message)
    throw err
  }
}

/**
 * Menjalankan SELECT query dan mengembalikan satu baris pertama atau null jika tidak ditemukan.
 */
export async function queryOne<T = RowDataPacket>(
  sql: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any[] = []
): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows.length > 0 ? rows[0] : null
}

/**
 * Menjalankan query DML (INSERT, UPDATE, DELETE) dengan prepared statement (?)
 * Mengembalikan ResultSetHeader (memiliki field: insertId, affectedRows, changedRows).
 */
export async function execute(
  sql: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any[] = []
): Promise<ResultSetHeader> {
  try {
    const [result] = await pool.query<ResultSetHeader>(sql, params)
    return result
  } catch (err: unknown) {
    const error = err as Error & { code?: string }
    console.error(`[MySQL Execute Error] ${sql} =>`, error.message)
    throw err
  }
}
