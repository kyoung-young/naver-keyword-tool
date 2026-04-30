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
export async function GET() {
  const results = [];
  const accounts = [
    { name: process.env.NAVER_AD_ACCOUNT_NAME||'계정1', cid: process.env.NAVER_AD_CUSTOMER_ID, lic: process.env.NAVER_AD_ACCESS_LICENSE, sk: process.env.NAVER_AD_SECRET_KEY },
    { name: process.env.NAVER_AD_ACCOUNT_NAME_2||'계정2', cid: process.env.NAVER_AD_CUSTOMER_ID_2, lic: process.env.NAVER_AD_ACCESS_LICENSE_2, sk: process.env.NAVER_AD_SECRET_KEY_2 },
  ].filter(a => a.cid && a.lic && a.sk);
  for (const acc of accounts) {
    try {
      const uri = '/naver/campaigns';
      const res = await fetch(`${BASE}${uri}`, { headers: hdrs('GET', uri, acc.cid, acc.lic, acc.sk) });
      const text = await res.text();
      let parsed; try { parsed = JSON.parse(text); } catch { parsed = text.slice(0,300); }
      results.push({ name: acc.name, status: res.status, campaignCount: Array.isArray(parsed) ? parsed.length : null, firstItem: Array.isArray(parsed) ? parsed[0] : parsed });
    } catch(e) {
      results.push({ name: acc.name, error: e.message });
    }
  }
  return NextResponse.json({ accounts: results });
}
