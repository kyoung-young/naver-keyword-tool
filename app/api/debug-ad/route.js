/**
 * GET /api/debug-ad
 * 시그니처 4가지 조합 전부 테스트 — 어느 방식이 맞는지 확인용
 */
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'nodejs';

const BASE_URL = 'https://api.naver.com';

async function trySignature({ label, timestamp, sigKey, uriForSig, fetchUri, customerId, accessLicense }) {
  const message = `${timestamp}\nGET\n${uriForSig}`;
  const hmac = crypto.createHmac('sha256', sigKey);
  hmac.update(message);
  const signature = hmac.digest('base64');

  const headers = {
    'Content-Type': 'application/json; charset=UTF-8',
    'X-Timestamp': timestamp,
    'X-API-KEY': accessLicense.trim(),
    'X-Customer': String(customerId).trim(),
    'X-Signature': signature,
  };

  try {
    const res = await fetch(`${BASE_URL}${fetchUri}`, { headers });
    const text = await res.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = text.slice(0, 300); }
    return {
      label,
      uriForSig,
      keyType: Buffer.isBuffer(sigKey) ? `Buffer(${sigKey.length}bytes)` : `string(${sigKey.length}chars)`,
      signature,
      httpStatus: res.status,
      ok: res.status === 200,
      response: parsed,
    };
  } catch (e) {
    return { label, uriForSig, ok: false, networkError: e.message };
  }
}

export async function GET() {
  const customerId    = process.env.NAVER_AD_CUSTOMER_ID;
  const accessLicense = process.env.NAVER_AD_ACCESS_LICENSE;
  const secretKey     = process.env.NAVER_AD_SECRET_KEY;

  const envCheck = {
    NAVER_AD_CUSTOMER_ID:    customerId    ? `✅ (${customerId})` : '❌ 없음',
    NAVER_AD_ACCESS_LICENSE: accessLicense ? `✅ (앞10: ${accessLicense.slice(0,10)}…)` : '❌ 없음',
    NAVER_AD_SECRET_KEY:     secretKey     ? `✅ (앞10: ${secretKey.slice(0,10)}…, 길이:${secretKey.length})` : '❌ 없음',
  };

  if (!customerId || !accessLicense || !secretKey) {
    return NextResponse.json({ envCheck, error: 'API 키 미설정' });
  }

  const timestamp  = String(Date.now());
  const stringKey  = secretKey.trim();
  const b64Key     = Buffer.from(secretKey.trim(), 'base64');
  const pathOnly   = '/keywordstool';
  const fullUri    = `/keywordstool?hintKeywords=${encodeURIComponent('pc방창업')}&showDetail=1`;

  // 4가지 조합 동시 테스트
  const results = await Promise.all([
    trySignature({ label: '① string키 + path만',     timestamp, sigKey: stringKey, uriForSig: pathOnly, fetchUri: fullUri, customerId, accessLicense }),
    trySignature({ label: '② string키 + fullURI',    timestamp, sigKey: stringKey, uriForSig: fullUri,  fetchUri: fullUri, customerId, accessLicense }),
    trySignature({ label: '③ Base64디코딩키 + path만', timestamp, sigKey: b64Key,    uriForSig: pathOnly, fetchUri: fullUri, customerId, accessLicense }),
    trySignature({ label: '④ Base64디코딩키 + fullURI', timestamp, sigKey: b64Key,   uriForSig: fullUri,  fetchUri: fullUri, customerId, accessLicense }),
  ]);

  const winner = results.find(r => r.ok);

  return NextResponse.json({
    envCheck,
    timestamp,
    winner: winner ? winner.label : '❌ 모두 실패',
    results,
  });
}
