/**
 * GET /api/cron
 * 모니터링 자동 실행 엔드포인트
 *
 * Railway Cron Job 또는 외부 cron 서비스에서 호출합니다.
 * Authorization: Bearer <CRON_SECRET> 헤더로 인증합니다.
 *
 * Railway Cron 설정:
 *   Schedule : * * * * *  (매 1분)
 *   Command  : curl -s -X GET https://<YOUR_DOMAIN>/api/cron \
 *              -H "Authorization: Bearer $CRON_SECRET"
 */

import { NextResponse }                              from 'next/server';
import { readFileSync, writeFileSync, mkdirSync,
         existsSync }                                from 'fs';
import path                                          from 'path';

export const runtime = 'nodejs';

/* ── 데이터 경로 ─────────────────────────────────── */
const DATA_PATH = path.join(process.cwd(), 'data', 'monitors.json');

function readData() {
  try { return JSON.parse(readFileSync(DATA_PATH, 'utf-8')); }
  catch { return { monitors: [] }; }
}

function writeData(data) {
  const dir = path.dirname(DATA_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

/* ── 다음 실행 시각 계산 ──────────────────────────── */
function calcNextRun(schedule, from = new Date()) {
  const next = new Date(from);
  if (schedule === 'daily')  next.setDate(next.getDate() + 1);
  if (schedule === 'weekly') next.setDate(next.getDate() + 7);
  next.setHours(9, 0, 0, 0);
  return next.toISOString();
}

/* ── 네이버 검색 API 직접 호출 ───────────────────── */
const SEARCH_BASE  = 'https://openapi.naver.com/v1/search';
const CHANNEL_EP   = {
  blog: '/blog.json',
  cafe: '/cafearticle.json',
  news: '/news.json',
  web:  '/webkr.json',
};

async function searchChannel(keyword, channel, clientId, clientSecret) {
  const ep = CHANNEL_EP[channel];
  if (!ep) return 0;
  const params = new URLSearchParams({ query: keyword, display: '1', sort: 'date' });
  try {
    const res = await fetch(`${SEARCH_BASE}${ep}?${params}`, {
      headers: {
        'X-Naver-Client-Id':     clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return data.total ?? 0;
  } catch {
    return 0;
  }
}

/* ── 단일 모니터 실행 ────────────────────────────── */
async function runMonitor(monitor, clientId, clientSecret) {
  const channels = ['blog', 'cafe', 'news', 'web'];
  const totals   = {};
  for (const kw of monitor.keywords) {
    for (const ch of channels) {
      totals[`${kw}_${ch}`] = await searchChannel(kw, ch, clientId, clientSecret);
    }
  }
  return { runAt: new Date().toISOString(), totals };
}

/* ── GET 핸들러 ──────────────────────────────────── */
export async function GET(request) {
  /* 인증 확인 */
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const clientId     = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 환경변수가 설정되지 않았습니다.' },
      { status: 500 }
    );
  }

  const data    = readData();
  const now     = new Date();
  const ran     = [];
  const skipped = [];

  for (const mon of data.monitors) {
    if (!mon.active) { skipped.push(mon.groupName); continue; }
    if (!mon.nextRunAt || new Date(mon.nextRunAt) > now) {
      skipped.push(mon.groupName);
      continue;
    }

    try {
      const entry = await runMonitor(mon, clientId, clientSecret);
      mon.lastRunAt = entry.runAt;
      mon.nextRunAt = calcNextRun(mon.schedule);
      mon.history   = [entry, ...(mon.history || [])].slice(0, 30);
      ran.push(mon.groupName);
    } catch (err) {
      console.error(`[cron] 오류: "${mon.groupName}"`, err.message);
    }
  }

  if (ran.length > 0) writeData(data);

  return NextResponse.json({
    ok: true,
    ran,
    skipped,
    checkedAt: now.toISOString(),
  });
}
