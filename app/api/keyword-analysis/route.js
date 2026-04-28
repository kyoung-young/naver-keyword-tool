/**
 * POST /api/keyword-analysis
 * 키워드별 검색량 + 블로그 발행량 조회
 */

import { NextResponse } from 'next/server';
import { getKeywordTool } from '../../../lib/naverSearchAd';

export const runtime = 'nodejs';

const NAVER_SEARCH_API = 'https://openapi.naver.com/v1/search';

/** 블로그 총 발행량(누적) + 최근 30일 발행량 추정 */
async function getBlogPublishCount(keyword, clientId, clientSecret) {
  try {
    const params = new URLSearchParams({ query: keyword, display: '100', sort: 'date' });
    const res = await fetch(`${NAVER_SEARCH_API}/blog.json?${params}`, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });
    if (!res.ok) return { total: 0, monthly: 0 };
    const data = await res.json();

    const total = data.total ?? 0;
    const items = data.items ?? [];

    // 최근 30일 내 게시물 수 추정 (pubDate 기반)
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const monthly = items.filter((item) => {
      try {
        return new Date(item.pubDate).getTime() >= cutoff;
      } catch {
        return false;
      }
    }).length;

    return { total, monthly };
  } catch {
    return { total: 0, monthly: 0 };
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { keywords } = body;

    const customerId    = process.env.NAVER_AD_CUSTOMER_ID;
    const accessLicense = process.env.NAVER_AD_ACCESS_LICENSE;
    const secretKey     = process.env.NAVER_AD_SECRET_KEY;
    const clientId      = process.env.NAVER_CLIENT_ID;
    const clientSecret  = process.env.NAVER_CLIENT_SECRET;

    if (!keywords?.length) {
      return NextResponse.json({ error: '키워드를 입력해주세요.' }, { status: 400 });
    }
    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: '네이버 검색 API 키가 설정되지 않았습니다.' }, { status: 500 });
    }

    const hasAdApi = !!(accessLicense && secretKey);

    // 모든 키워드 병렬 처리
    const settled = await Promise.allSettled(
      keywords.map(async (kw) => {
        const [kwToolList, blogStats] = await Promise.allSettled([
          hasAdApi
            ? getKeywordTool({ hintKeywords: kw, customerId: customerId || '0', accessLicense, secretKey })
            : Promise.resolve([]),
          getBlogPublishCount(kw, clientId, clientSecret),
        ]);

        const list    = kwToolList.status === 'fulfilled' ? kwToolList.value : [];
        const blog    = blogStats.status === 'fulfilled'  ? blogStats.value  : { total: 0, monthly: 0 };

        // 정확히 일치하는 키워드 찾기 (없으면 첫 번째)
        const exact = list.find((item) => item.relKeyword === kw) ?? list[0] ?? null;

        return {
          keyword:     kw,
          pcSearch:    exact ? (exact.monthlyPcQcCnt    ?? 0) : null,
          mobileSearch:exact ? (exact.monthlyMobileQcCnt ?? 0) : null,
          totalSearch: exact ? ((exact.monthlyPcQcCnt ?? 0) + (exact.monthlyMobileQcCnt ?? 0)) : null,
          competition: exact?.compIdx ?? null,
          blogTotal:   blog.total,
          blogMonthly: blog.monthly,
        };
      })
    );

    const results = settled.map((s, i) =>
      s.status === 'fulfilled'
        ? s.value
        : { keyword: keywords[i], pcSearch: null, mobileSearch: null, totalSearch: null, competition: null, blogTotal: 0, blogMonthly: 0 }
    );

    return NextResponse.json({ results, hasAdApi });
  } catch (err) {
    console.error('[/api/keyword-analysis]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
