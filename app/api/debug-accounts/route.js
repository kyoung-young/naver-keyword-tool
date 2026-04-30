import { NextResponse } from 'next/server';
import crypto from 'crypto';
export const runtime = 'nodejs';
const BASE = 'https://api.naver.com';
function sig(ts, method, uri, sk) {
  const msg = `${ts}.${method}.${uri}`;
  return crypto.createHmac('sha256', sk.trim()).update(msg).digest('base64');
}
function hdrs(method, uri, cid, lic, sk) {
  const ts = String(Date.now());
  return { 'Content-Type':'application/json; charset=UTF-8', 'X-Timestamp':ts, 'X-API-KEY':lic.trim(), 'X-Customer':String(cid).trim(), 'X-Signature':sig(ts, method, uri.split('?')[0], sk) };
}
async function tryPath(uri, cid, lic, sk) {
  try {
    const res = await fetch(`${BASE}${uri}`, { headers: hdrs('GET', uri, cid, lic, sk) });
    const text = await res.text();
    let parsed; try { parsed = JSON.parse(text); } catch { parsed = text.slice(0,400); }
    return { status: res.status, body: parsed };
  } catch(e) { return { status: 'ERR', body: e.message }; }
}
export async function GET() {
  const accounts = [
    { name: process.env.NAVER_AD_ACCOUNT_NAME||'계정1', cid: process.env.NAVER_AD_CUSTOMER_ID, lic: process.env.NAVER_AD_ACCESS_LICENSE, sk: process.env.NAVER_AD_SECRET_KEY },
    { name: process.env.NAVER_AD_ACCOUNT_NAME_2||'계정2', cid: process.env.NAVER_AD_CUSTOMER_ID_2, lic: process.env.NAVER_AD_ACCESS_LICENSE_2, sk: process.env.NAVER_AD_SECRET_KEY_2 },
  ].filter(a => a.cid && a.lic && a.sk);

  // 여러 후보 경로 동시 시도
  const PATHS = [
    '/naver/campaigns',
    '/campaigns',
    '/naver/managedkeyword/campaigns',
    '/naver/admanager/campaigns',
  ];

  const results = [];
  for (const acc of accounts) {
    const pathResults = {};
    for (const p of PATHS) {
      pathResults[p] = await tryPath(p, acc.cid, acc.lic, acc.sk);
      await new Promise(r => setTimeout(r, 100));
    }
    results.push({ name: acc.name, paths: pathResults });
  }
  return NextResponse.json({ results });
}
