/**
 * GET /api/debug-ad
 * 네이버 검색광고 API 전체 응답 구조 확인용
 */
import { NextResponse } from 'next/server';
import { getKeywordTool } from '../../../lib/naverSearchAd';

export const runtime = 'nodejs';

export async function GET() {
  const customerId    = process.env.NAVER_AD_CUSTOMER_ID;
  const accessLicense = process.env.NAVER_AD_ACCESS_LICENSE;
  const secretKey     = process.env.NAVER_AD_SECRET_KEY;

  const envCheck = {
    NAVER_AD_CUSTOMER_ID:    customerId    ? `✅ 설정됨 (${customerId})` : '❌ 없음',
    NAVER_AD_ACCESS_LICENSE: accessLicense ? `✅ 설정됨 (앞 10자: ${accessLicense.slice(0,10)}…)` : '❌ 없음',
    NAVER_AD_SECRET_KEY:     secretKey     ? `✅ 설정됨 (앞 10자: ${secretKey.slice(0,10)}…)` : '❌ 없음',
  };

  if (!customerId || !accessLicense || !secretKey) {
    return NextResponse.json({ envCheck, result: null, error: 'API 키 미설정' });
  }

  try {
    const list = await getKeywordTool({
      hintKeywords: 'pc방창업',
      customerId,
      accessLicense,
      secretKey,
    });

    // 성공 시 — 첫 번째 항목의 모든 키 출력 (어떤 필드가 있는지 파악용)
    const firstItem = list[0] ?? null;
    const allKeys   = firstItem ? Object.keys(firstItem) : [];

    return NextResponse.json({
      envCheck,
      result: `✅ 성공 — ${list.length}개 키워드 반환`,
      // 첫 번째 항목 전체 구조 (어떤 필드가 있는지 확인)
      firstItemAllKeys: allKeys,
      firstItemRaw: firstItem,
      // 샘플 3개
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
