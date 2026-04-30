/**
 * PostgreSQL 연결 풀 (Railway DATABASE_URL 사용)
 * DATABASE_URL 없으면 graceful fallback (앱은 정상 작동)
 */
import pg from 'pg';
const { Pool } = pg;

let _pool = null;

export function getDb() {
  if (!process.env.DATABASE_URL) return null;
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // Railway는 SSL 필요
      max: 5,
      idleTimeoutMillis: 30000,
    });
    _pool.on('error', (err) => {
      console.error('[DB] Pool error:', err.message);
      _pool = null; // 에러 시 풀 리셋
    });
  }
  return _pool;
}

/**
 * 테이블 초기화 (없으면 생성)
 */
export async function initDb() {
  const db = getDb();
  if (!db) return false;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS keyword_stats (
        id          SERIAL PRIMARY KEY,
        keyword     VARCHAR(200) NOT NULL,
        year_month  CHAR(7)     NOT NULL,   -- 'YYYY-MM'
        pc_cnt      INTEGER     NOT NULL DEFAULT 0,
        mobile_cnt  INTEGER     NOT NULL DEFAULT 0,
        competition VARCHAR(10),
        saved_at    TIMESTAMP   NOT NULL DEFAULT NOW(),
        UNIQUE(keyword, year_month)
      );
      CREATE INDEX IF NOT EXISTS idx_ks_keyword ON keyword_stats(keyword);
      CREATE INDEX IF NOT EXISTS idx_ks_ym      ON keyword_stats(year_month);
    `);
    return true;
  } catch (err) {
    console.error('[DB] initDb error:', err.message);
    return false;
  }
}
