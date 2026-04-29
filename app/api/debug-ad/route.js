/**
 * GET /api/debug-ad
 * 네이버 검색광고 API 직접 호출 테스트 — 에러 원인 파악용
 */
import { NextResponse } from 'next/server';
import { getKeywordTool } from '../../../lib/naverSearchAd';

export const runtime = 'nodejs';

export async function GET() {
  const customerId    = process.env.NAVER_AD_CUSTOMER_ID;
  const accessLicense = process.env.NAVER_AD_ACCESS_LICENSE;
  const secretKey     = process.env.NAVER_AD_SECRET_KEY;

  // 환경변수 존재 여부
  const envCheck = {
    NAVER_AD_CUSTOMER_ID:    customerId    ? `✅ 설정됨 (${customerId})` : '❌ 없음',
    NAVER_AD_ACCESS_LICENSE: accessLicense ? `✅ 설정됨 (앞 10자: ${accessLicense.slice(0,10)}…)` : '❌ 없음',
    NAVER_AD_SECRET_KEY:     secretKey     ? `✅ 설정됨 (앞 10자: ${secretKey.slice(0,10)}…)` : '❌ 없음',
  };

  if (!customerId || !accessLicense || !secretKey) {
    return NextResponse.json({ envCheck, result: null, error: 'API 키 미설정' });
  }

  // 실제 API 호출
  try {
    const list = await getKeywordTool({
      hintKeywords: 'pc방창업',
      customerId,
      accessLicense,
      secretKey,
    });
    return NextResponse.json({
      envCheck,
      result: `✅ 성공 — ${list.length}개 키워드 반환`,
      sample: list.slice(0, 3),
      error: null,
    });
  } catch (err) {
    return NextResponse.json({
      envCheck,
      result: null,
      error: `❌ API 호출 실패: ${err.message}`,
    });
  }
}
