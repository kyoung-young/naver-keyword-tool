/**
 * GET /api/debug-ad
 * 쿼리 없이 /keywordstool 호출 → 400이 나오면 그 서명방식이 올바른 것
 */
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'nodejs';

const BASE_URL = 'https://api.naver.com';

async function tryAuth({ label, timestamp, sigKey, uriForSig, fetchUri, customerId, accessLicense }) {
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
    try { parsed = JSON.parse(text); } catch { parsed = text.slice(0, 400); }
    return {
      label,
      httpStatus: res.status,
      // 400 = 서명은 맞지만 파라미터 오류 → 올바른 서명!
      // 403 = 서명 자체가 틀림
      verdict: res.status === 200 ? '✅ 성공!'
             : res.status === 400 ? '✅ 서명 OK (파라미터 오류)'
             : res.status === 403 ? '❌ 서명 오류'
             : `⚠️ HTTP ${res.status}`,
      response: parsed,
    };
  } catch (e) {
    return { label, verdict: '❌ 네트워크 오류', error: e.message };
  }
}

export async function GET() {
  const customerId    = process.env.NAVER_AD_CUSTOMER_ID;
  const accessLicense = process.env.NAVER_AD_ACCESS_LICENSE;
  const secretKey     = process.env.NAVER_AD_SECRET_KEY;

  const envCheck = {
    NAVER_AD_CUSTOMER_ID:    customerId    ? `✅ "${customerId}" (len:${customerId.length})` : '❌',
    NAVER_AD_ACCESS_LICENSE: accessLicense ? `✅ len:${accessLicense.length}, 앞20: ${accessLicense.slice(0,20)}` : '❌',
    NAVER_AD_SECRET_KEY:     secretKey     ? `✅ len:${secretKey.length}, 앞20: ${secretKey.slice(0,20)}, 뒤5: ${secretKey.slice(-5)}` : '❌',
  };

  if (!customerId || !accessLicense || !secretKey) {
    return NextResponse.json({ envCheck, error: 'API 키 미설정' });
  }

  const timestamp = String(Date.now());
  const sk        = secretKey.trim();
  const b64Key    = Buffer.from(sk, 'base64');

  // 쿼리 없이 순수 path만 → 서명 OK면 400(required param missing), 서명 NG면 403
  const noParamUri = '/keywordstool';

  const results = await Promise.all([
    tryAuth({ label: '① string키',         timestamp, sigKey: sk,     uriForSig: noParamUri, fetchUri: noParamUri, customerId, accessLicense }),
    tryAuth({ label: '② Base64디코딩키',    timestamp, sigKey: b64Key, uriForSig: noParamUri, fetchUri: noParamUri, customerId, accessLicense }),
    // 혹시 X-Customer를 숫자로 보내야하는지도 테스트
    tryAuth({ label: '③ string키 (X-Customer=number)', timestamp, sigKey: sk, uriForSig: noParamUri, fetchUri: noParamUri,
      customerId: Number(customerId), accessLicense }),
  ]);

  // 키워드 포함 버전도 string키로 시도
  const withKw = await tryAuth({
    label: '④ string키 + 키워드 URL',
    timestamp, sigKey: sk,
    uriForSig: noParamUri,
    fetchUri: `/keywordstool?hintKeywords=${encodeURIComponent('pc방창업')}&showDetail=1`,
    customerId, accessLicense,
  });
  results.push(withKw);

  const winner = results.find(r => r.verdict.startsWith('✅'));

  return NextResponse.json({
    envCheck,
    timestamp,
    winner: winner ? winner.label : '❌ 모두 실패 — API 키 자체 문제 가능성',
    results,
  });
}
