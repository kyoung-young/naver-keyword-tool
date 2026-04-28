/**
 * 모니터링 자동 실행 워커
 * ─────────────────────────────────────────────
 * 사용법: node worker.mjs
 * 역할: data/monitors.json 을 읽어 nextRunAt이 지난 항목을 자동으로 실행하고
 *       결과를 history에 저장합니다.
 *
 * node-cron 표현식: 매 1분마다 체크 → nextRunAt이 지난 항목만 실행
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ── .env.local 로드 ────────────────────────────────────── */
function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && !(key in process.env)) process.env[key] = val;
  }
}
loadEnv();

const NAVER_CLIENT_ID     = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
const DATA_PATH           = path.join(__dirname, 'data', 'monitors.json');

/* ── 데이터 읽기/쓰기 ────────────────────────────────────── */
function readData() {
  try { return JSON.parse(readFileSync(DATA_PATH, 'utf-8')); }
  catch { return { monitors: [] }; }
}

function writeData(data) {
  const dir = path.dirname(DATA_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

/* ── 다음 실행 시각 계산 ─────────────────────────────────── */
function calcNextRun(schedule, from = new Date()) {
  const next = new Date(from);
  if (schedule === 'daily')  next.setDate(next.getDate() + 1);
  if (schedule === 'weekly') next.setDate(next.getDate() + 7);
  next.setHours(9, 0, 0, 0);
  return next.toISOString();
}

/* ── 네이버 검색 API 직접 호출 ───────────────────────────── */
const SEARCH_BASE = 'https://openapi.naver.com/v1/search';
const CHANNEL_EP  = { blog: '/blog.json', cafe: '/cafearticle.json', news: '/news.json', web: '/webkr.json' };

async function searchChannel(keyword, channel) {
  const ep = CHANNEL_EP[channel];
  if (!ep) return { total: 0 };
  const params = new URLSearchParams({ query: keyword, display: '1', sort: 'date' });
  try {
    const res = await fetch(`${SEARCH_BASE}${ep}?${params}`, {
      headers: {
        'X-Naver-Client-Id':     NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
      },
    });
    if (!res.ok) return { total: 0 };
    const data = await res.json();
    return { total: data.total ?? 0 };
  } catch {
    return { total: 0 };
  }
}

/* ── 단일 모니터 실행 ────────────────────────────────────── */
async function runMonitor(monitor) {
  const channels = ['blog', 'cafe', 'news', 'web'];
  const totals   = {};

  for (const kw of monitor.keywords) {
    for (const ch of channels) {
      const result = await searchChannel(kw, ch);
      totals[`${kw}_${ch}`] = result.total;
    }
  }

  const historyEntry = { runAt: new Date().toISOString(), totals };
  return historyEntry;
}

/* ── 전체 체크 로직 ─────────────────────────────────────── */
async function checkAndRun() {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    console.warn('[worker] NAVER API 키가 설정되지 않았습니다. .env.local 확인');
    return;
  }

  const data = readData();
  const now  = new Date();
  let changed = false;

  for (const mon of data.monitors) {
    if (!mon.active) continue;
    if (!mon.nextRunAt || new Date(mon.nextRunAt) > now) continue;

    console.log(`[worker] 실행 시작: "${mon.groupName}" (${mon.keywords.join(', ')})`);

    try {
      const entry = await runMonitor(mon);

      mon.lastRunAt = entry.runAt;
      mon.nextRunAt = calcNextRun(mon.schedule);
      mon.history   = [entry, ...(mon.history || [])].slice(0, 30);

      console.log(`[worker] 완료: "${mon.groupName}" → 다음 실행 ${mon.nextRunAt}`);
      changed = true;
    } catch (err) {
      console.error(`[worker] 오류: "${mon.groupName}"`, err.message);
    }
  }

  if (changed) writeData(data);
}

/* ── 시작 ──────────────────────────────────────────────── */
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  모니터링 워커 시작');
console.log('  cron: 매 1분마다 nextRunAt 체크');
console.log('  데이터: data/monitors.json');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// 시작 즉시 한 번 체크
checkAndRun();

// 이후 매 1분마다 체크 (nextRunAt이 지난 항목만 실행)
cron.schedule('* * * * *', () => {
  checkAndRun();
});
