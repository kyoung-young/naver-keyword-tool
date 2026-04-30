/**
 * 키워드 월별 검색량 히스토리 저장/조회
 */
import { getDb, initDb } from './db.js';

/** 현재 연월 'YYYY-MM' */
function currentYearMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * 키워드 검색량을 DB에 저장 (upsert)
 * @param {string}  keyword
 * @param {number}  pcCnt
 * @param {number}  mobileCnt
 * @param {string}  competition  - 'low'|'mid'|'high'|null
 * @param {string}  [yearMonth]  - 'YYYY-MM', 기본값 현재월
 */
export async function saveKeywordStats(keyword, pcCnt, mobileCnt, competition, yearMonth) {
  const db = getDb();
  if (!db) return;
  try {
    await initDb();
    const ym = yearMonth ?? currentYearMonth();
    await db.query(`
      INSERT INTO keyword_stats (keyword, year_month, pc_cnt, mobile_cnt, competition)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (keyword, year_month) DO UPDATE SET
        pc_cnt      = EXCLUDED.pc_cnt,
        mobile_cnt  = EXCLUDED.mobile_cnt,
        competition = EXCLUDED.competition,
        saved_at    = NOW()
    `, [keyword.toLowerCase(), ym, pcCnt ?? 0, mobileCnt ?? 0, competition ?? null]);
  } catch (err) {
    console.error('[keywordHistory] save error:', err.message);
  }
}

/**
 * 키워드의 월별 히스토리 조회 (최근 N개월, 오래된 순)
 * @param {string} keyword
 * @param {number} months  기본 13 (최근 12개월 보장)
 * @returns {Array<{year_month, pc_cnt, mobile_cnt, total_cnt, competition}>}
 */
export async function getKeywordHistory(keyword, months = 13) {
  const db = getDb();
  if (!db) return [];
  try {
    await initDb();
    const { rows } = await db.query(`
      SELECT
        year_month,
        pc_cnt,
        mobile_cnt,
        (pc_cnt + mobile_cnt) AS total_cnt,
        competition
      FROM keyword_stats
      WHERE keyword = $1
      ORDER BY year_month ASC
      LIMIT $2
    `, [keyword.toLowerCase(), months]);
    return rows;
  } catch (err) {
    console.error('[keywordHistory] get error:', err.message);
    return [];
  }
}

/**
 * 추적 중인 모든 고유 키워드 목록 (cron 수집용)
 */
export async function getAllTrackedKeywords() {
  const db = getDb();
  if (!db) return [];
  try {
    await initDb();
    const { rows } = await db.query(`
      SELECT DISTINCT keyword FROM keyword_stats ORDER BY keyword
    `);
    return rows.map(r => r.keyword);
  } catch (err) {
    console.error('[keywordHistory] getAllTracked error:', err.message);
    return [];
  }
}
