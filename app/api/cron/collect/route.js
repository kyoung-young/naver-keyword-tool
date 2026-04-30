/**
 * GET /api/cron/collect
 * 매월 1일 자동 호출 → 추적 중인 모든 키워드의 검색량을 재수집하여 DB 저장
 *
 * Railway Cron 설정:
 *   Schedule: 0 1 1 * *  (매월 1일 01:00 UTC)
 *   Command:  curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/collect
 */

import { NextResponse } from 'next/server';
import { getKeywordTool } from '../../../../lib/naverSearchAd';
import { getAllTrackedKeywords, saveKeywordStats } from '../../../../lib/keywordHistory';

export const runtime = 'nodejs';

export async function GET(request) {
  // 인증 (CRON_SECRET 환경변수로 보호)
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const customerId    = process.env.NAVER_AD_CUSTOMER_ID;
  const accessLicense = process.env.NAVER_AD_ACCESS_LICENSE;
  const secretKey     = process.env.NAVER_AD_SECRET_KEY;

  if (!customerId || !accessLicense || !secretKey) {
    return NextResponse.json({ error: '검색광고 API 키 미설정' }, { status: 500 });
  }

  // 추적 중인 키워드 전체 조회
  const keywords = await getAllTrackedKeywords();
  if (!keywords.length) {
    return NextResponse.json({ message: '추적 키워드 없음', collected: 0 });
  }

  const results = { success: [], failed: [] };

  // 키워드별 순차 처리 (API 과부하 방지)
  for (const kw of keywords) {
    try {
      const list = await getKeywordTool({
        hintKeywords: kw,
        customerId,
        accessLicense,
        secretKey,
      });

      // 정확 매칭 우선, 없으면 첫 번째
      const kl    = kw.toLowerCase();
      const exact = list.find(i => (i.relKeyword ?? '').toLowerCase() === kl) ?? list[0];

      if (exact) {
        const pc     = exact.monthlyPcQcCnt     ?? 0;
        const mobile = exact.monthlyMobileQcCnt ?? 0;
        await saveKeywordStats(kw, pc, mobile, exact.compIdx ?? null);
        results.success.push({ keyword: kw, pc, mobile });
      } else {
        results.failed.push({ keyword: kw, reason: '매칭 키워드 없음' });
      }

      // 429 방지: 키워드 간 300ms 대기
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      results.failed.push({ keyword: kw, reason: err.message });
    }
  }

  return NextResponse.json({
    message: `수집 완료: ${results.success.length}개 성공, ${results.failed.length}개 실패`,
    ...results,
  });
}
