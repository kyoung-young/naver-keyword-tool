/**
 * GET /api/debug-ad
 * keywordstool 기간별 파라미터 테스트
 * → startPeriod / endPeriod 파라미터로 월별 히스토리 데이터 조회 가능한지 확인
 */
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'nodejs';
const BASE_URL = 'https://api.naver.com';

function sign(timestamp, method, uri, secretKey) {
  const msg = `${timestamp}.${method}.${uri}`;
  return crypto.createHmac('sha256', secretKey.trim()).update(msg).digest('base64');
}

function headers(uri, customerId, accessLicense, secretKey) {
  const ts  = String(Date.now());
  const sig = sign(ts, 'GET', uri.split('?')[0], secretKey);
  return {
    'Content-Type': 'application/json; charset=UTF-8',
    'X-Timestamp':  ts,
    'X-API-KEY':    accessLicense.trim(),
    'X-Customer':   String(customerId).trim(),
    'X-Signature':  sig,
  };
}

async function callApi(path, customerId, accessLicense, secretKey) {
  const res  = await fetch(`${BASE_URL}${path}`, { headers: headers(path, customerId, accessLicense, secretKey) });
  const text = await res.text();
  try { return { status: res.status, data: JSON.parse(text) }; }
  catch { return { status: res.status, data: text.slice(0, 500) }; }
}

export async function GET() {
  const customerId    = process.env.NAVER_AD_CUSTOMER_ID;
  const accessLicense = process.env.NAVER_AD_ACCESS_LICENSE;
  const secretKey     = process.env.NAVER_AD_SECRET_KEY;

  if (!customerId || !accessLicense || !secretKey) {
    return NextResponse.json({ error: 'API 키 미설정' });
  }

  const kw = encodeURIComponent('pc방창업');

  // 테스트 1: 기본 (현재월)
  const t1 = await callApi(
    `/keywordstool?hintKeywords=${kw}&showDetail=1`,
    customerId, accessLicense, secretKey
  );

  // 테스트 2: startPeriod / endPeriod 파라미터 (월별 히스토리 시도)
  const t2 = await callApi(
    `/keywordstool?hintKeywords=${kw}&showDetail=1&startPeriod=202504&endPeriod=202603`,
    customerId, accessLicense, secretKey
  );

  // 테스트 3: startDate / endDate 형식
  const t3 = await callApi(
    `/keywordstool?hintKeywords=${kw}&showDetail=1&startDate=2025-04-01&endDate=2026-03-31`,
    customerId, accessLicense, secretKey
  );

  // 테스트 4: 기간별 통계 전용 엔드포인트 시도
  const t4 = await callApi(
    `/ncc/keywords/relkwdstat?query=${kw}`,
    customerId, accessLicense, secretKey
  );

  return NextResponse.json({
    '기본호출_현재월': { status: t1.status, fields: t1.data?.keywordList?.[0] ? Object.keys(t1.data.keywordList[0]) : null, sample: t1.data?.keywordList?.[0] },
    'startPeriod_파라미터': { status: t2.status, keyCount: t2.data?.keywordList?.length, sample: t2.data?.keywordList?.[0] ?? t2.data },
    'startDate_파라미터': { status: t3.status, keyCount: t3.data?.keywordList?.length, sample: t3.data?.keywordList?.[0] ?? t3.data },
    'relkwdstat엔드포인트': { status: t4.status, data: t4.data },
  });
}
