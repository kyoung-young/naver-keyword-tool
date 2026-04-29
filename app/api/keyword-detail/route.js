/**
 * POST /api/keyword-detail
 * 단일 키워드 상세 분석: 연관 키워드 + 성별·연령 분포 + 12개월 트렌드
 */

import { NextResponse } from 'next/server';
import { getKeywordTool } from '../../../lib/naverSearchAd';
import { getKeywordDemographics } from '../../../lib/naverDemographic';

export const runtime = 'nodejs';

const COMP_LABEL = { low: '낮음', mid: '중간', high: '높음' };

export async function POST(request) {
  try {
    const { keyword } = await request.json();
    if (!keyword?.trim()) {
      return NextResponse.json({ error: '키워드를 입력해주세요.' }, { status: 400 });
    }

    const clientId      = process.env.NAVER_CLIENT_ID;
    const clientSecret  = process.env.NAVER_CLIENT_SECRET;
    const customerId    = process.env.NAVER_AD_CUSTOMER_ID;
    const accessLicense = process.env.NAVER_AD_ACCESS_LICENSE;
    const secretKey     = process.env.NAVER_AD_SECRET_KEY;

    const hasAdApi = !!(customerId && accessLicense && secretKey);
    const hasSearch = !!(clientId && clientSecret);

    if (!hasSearch) {
      return NextResponse.json({ error: '검색 API 키 미설정' }, { status: 500 });
    }

    // 연관 키워드(광고API) + 인구통계(DataLab) 병렬 조회
    const [kwToolResult, demoResult] = await Promise.allSettled([
      hasAdApi
        ? getKeywordTool({ hintKeywords: keyword, customerId, accessLicense, secretKey })
        : Promise.resolve([]),
      getKeywordDemographics(keyword, clientId, clientSecret),
    ]);

    const list = kwToolResult.status === 'fulfilled' ? (kwToolResult.value ?? []) : [];
    const demo = demoResult.status  === 'fulfilled' ? (demoResult.value  ?? {}) : {};

    // 연관 키워드 가공 — 전체 검색량 내림차순, 최대 30개
    const relatedKeywords = list
      .map((item) => {
        const pc     = item.monthlyPcQcCnt     ?? 0;
        const mobile = item.monthlyMobileQcCnt ?? 0;
        return {
          keyword:     item.relKeyword,
          pcSearch:    pc,
          mobileSearch:mobile,
          total:       pc + mobile,
          competition: item.compIdx ? (COMP_LABEL[item.compIdx] ?? item.compIdx) : null,
          compRaw:     item.compIdx ?? null,
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 30);

    return NextResponse.json({
      keyword,
      relatedKeywords,
      gender:    demo.gender     ?? null,
      ageGroups: demo.ageGroups  ?? null,
      trendData: demo.trendData  ?? [],
      hasAdApi,
    });
  } catch (err) {
    console.error('[/api/keyword-detail]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
