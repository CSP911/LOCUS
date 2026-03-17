import Database from 'better-sqlite3'
import path from 'path'
import { SCHEMA } from './schema'

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'locus.db')

let _db: Database.Database | null = null

/**
 * getDb — SQLite 연결 싱글톤
 *
 * TODO: 프로덕션에서 PostgreSQL로 교체
 * - better-sqlite3 → postgres (node-postgres)
 * - 스키마는 동일하게 유지 (SQL 호환)
 */
export function getDb(): Database.Database {
  if (_db) return _db
  _db = new Database(DB_PATH)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')
  _db.exec(SCHEMA)
  return _db
}

export function closeDb() {
  if (_db) { _db.close(); _db = null }
}
