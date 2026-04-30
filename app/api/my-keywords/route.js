/**
 * GET/POST/DELETE /api/my-keywords
 * 계정별 "집행 중인 광고 키워드" 등록·조회·삭제 + keywordstool 시장 평균 비교
 *
 * DB 테이블: my_ad_keywords
 *   id, account_name, keyword, bid_pc, bid_mobile, status, memo, created_at
 */
import { NextResponse } from 'next/server';
import { getDb, initDb } from '../../../lib/db.js';
import { getKeywordTool } from '../../../lib/naverSearchAd.js';

export const runtime = 'nodejs';

async function ensureTable() {
  const db = getDb();
  if (!db) return;
  await initDb();
  await db.query(`
    CREATE TABLE IF NOT EXISTS my_ad_keywords (
      id           SERIAL PRIMARY KEY,
      account_name VARCHAR(100) NOT NULL,
      keyword      VARCHAR(200) NOT NULL,
      bid_pc       INTEGER,
      bid_mobile   INTEGER,
      status       VARCHAR(20) NOT NULL DEFAULT '운영중',
      memo         TEXT,
      created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(account_name, keyword)
    );
    CREATE INDEX IF NOT EXISTS idx_mak_account ON my_ad_keywords(account_name);
  `);
  // 기존 테이블에 컬럼 추가 (이미 있으면 오류 무시)
  for (const col of ['bid_pc INTEGER', 'bid_mobile INTEGER']) {
    const name = col.split(' ')[0];
    await db.query(
      `ALTER TABLE my_ad_keywords ADD COLUMN IF NOT EXISTS ${name} INTEGER`
    ).catch(() => {});
  }
  // 구버전 bid_amt 컬럼 → bid_pc로 마이그레이션
  await db.query(`
    UPDATE my_ad_keywords
    SET bid_pc = bid_amt
    WHERE bid_amt IS NOT NULL AND bid_pc IS NULL
  `).catch(() => {});
}

function getAccountNames() {
  const names = [];
  if (process.env.NAVER_AD_ACCOUNT_NAME)   names.push(process.env.NAVER_AD_ACCOUNT_NAME);
  if (process.env.NAVER_AD_ACCOUNT_NAME_2) names.push(process.env.NAVER_AD_ACCOUNT_NAME_2);
  return names.length ? names : ['계정1'];
}

/* ── GET ── */
export async function GET(request) {
  try {
    await ensureTable();
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const accountName = searchParams.get('account') ?? '';

    let rows = [];
    if (db) {
      const q = accountName
        ? await db.query('SELECT * FROM my_ad_keywords WHERE account_name=$1 ORDER BY created_at DESC', [accountName])
        : await db.query('SELECT * FROM my_ad_keywords ORDER BY account_name, created_at DESC');
      rows = q.rows;
    }

    const customerId    = process.env.NAVER_AD_CUSTOMER_ID;
    const accessLicense = process.env.NAVER_AD_ACCESS_LICENSE;
    const secretKey     = process.env.NAVER_AD_SECRET_KEY;
    const hasAdApi = !!(customerId && accessLicense && secretKey);

    const marketMap = {};
    if (hasAdApi && rows.length) {
      const keywords = [...new Set(rows.map(r => r.keyword))];
      for (let i = 0; i < keywords.length; i += 5) {
        for (const kw of keywords.slice(i, i + 5)) {
          try {
            const list  = await getKeywordTool({ hintKeywords: kw, customerId, accessLicense, secretKey });
            const kl    = kw.toLowerCase();
            const exact = list.find(j => (j.relKeyword ?? '').toLowerCase() === kl) ?? list[0];
            if (exact) {
              marketMap[kl] = {
                pcSearch:       exact.monthlyPcQcCnt         ?? 0,
                mobileSearch:   exact.monthlyMobileQcCnt     ?? 0,
                totalSearch:    (exact.monthlyPcQcCnt ?? 0) + (exact.monthlyMobileQcCnt ?? 0),
                marketPcCtr:    exact.monthlyAvePcCtr        ?? null,
                marketMobCtr:   exact.monthlyAveMobileCtr    ?? null,
                marketPcClk:    exact.monthlyAvePcClkCnt     ?? null,
                marketMobClk:   exact.monthlyAveMobileClkCnt ?? null,
                marketAvgDepth: exact.plAvgDepth             ?? null,
                compIdx:        exact.compIdx                ?? null,
              };
            }
          } catch { /* 무시 */ }
          await new Promise(r => setTimeout(r, 200));
        }
      }
    }

    return NextResponse.json({
      keywords:     rows.map(r => ({ ...r, market: marketMap[r.keyword.toLowerCase()] ?? null })),
      accountNames: getAccountNames(),
      hasAdApi,
    });
  } catch (err) {
    console.error('[my-keywords GET]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ── POST ── */
export async function POST(request) {
  try {
    await ensureTable();
    const db = getDb();
    if (!db) return NextResponse.json({ error: 'DB 미연결' }, { status: 503 });

    const { accountName, keyword, bidPc, bidMobile, status = '운영중', memo = '' } = await request.json();
    if (!accountName?.trim()) return NextResponse.json({ error: '계정명 필요' }, { status: 400 });
    if (!keyword?.trim())     return NextResponse.json({ error: '키워드 필요' }, { status: 400 });

    const { rows } = await db.query(`
      INSERT INTO my_ad_keywords (account_name, keyword, bid_pc, bid_mobile, status, memo)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (account_name, keyword) DO UPDATE SET
        bid_pc     = EXCLUDED.bid_pc,
        bid_mobile = EXCLUDED.bid_mobile,
        status     = EXCLUDED.status,
        memo       = EXCLUDED.memo,
        created_at = NOW()
      RETURNING *
    `, [
      accountName.trim(),
      keyword.trim().toLowerCase(),
      bidPc    ? Number(bidPc)    : null,
      bidMobile ? Number(bidMobile) : null,
      status,
      memo,
    ]);

    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    console.error('[my-keywords POST]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ── DELETE ── */
export async function DELETE(request) {
  try {
    await ensureTable();
    const db = getDb();
    if (!db) return NextResponse.json({ error: 'DB 미연결' }, { status: 503 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 });

    const { rowCount } = await db.query('DELETE FROM my_ad_keywords WHERE id=$1', [Number(id)]);
    if (!rowCount) return NextResponse.json({ error: '항목 없음' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[my-keywords DELETE]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
