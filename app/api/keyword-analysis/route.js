/**
 * POST /api/keyword-analysis
 * 키워드별 검색량 + 블로그/카페 발행량 + 등급 + 포화도 조회
 */

import { NextResponse } from 'next/server';
import { getKeywordTool } from '../../../lib/naverSearchAd';

export const runtime = 'nodejs';

const NAVER_SEARCH_API = 'https://openapi.naver.com/v1/search';

/** 채널별 총 발행량 + 최근 30일 추정 */
async function getPublishCount(keyword, channel, clientId, clientSecret) {
  try {
    const params = new URLSearchParams({ query: keyword, display: '100', sort: 'date' });
    const res = await fetch(`${NAVER_SEARCH_API}/${channel}.json?${params}`, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });
    if (!res.ok) return { total: 0, monthly: 0 };
    const data = await res.json();
    const total = data.total ?? 0;
    const items = data.items ?? [];
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const monthly = items.filter((item) => {
      try { return new Date(item.pubDate || item.postdate || 0).getTime() >= cutoff; }
      catch { return false; }
    }).length;
    return { total, monthly };
  } catch {
    return { total: 0, monthly: 0 };
  }
}

/** 키워드 등급 계산 (총 월간 검색량 기반) */
function calcGrade(total) {
  if (!total || total === null) return null;
  if (total >= 30000) return 'diamond';
  if (total >= 10000) return 'platinum';
  if (total >= 3000)  return 'gold';
  if (total >= 1000)  return 'silver';
  if (total >= 300)   return 'bronze';
  return 'seed';
}

/** 포화도 계산: 월 발행량 1000건 당 검색량 */
function calcSaturation(blogMonthly, totalSearch) {
  if (!totalSearch || totalSearch < 10) return null;
  // 포화도 = (월발행 * 1000) / 총검색량 → 값이 작을수록 블루오션
  const ratio = (blogMonthly * 1000) / totalSearch;
  if (ratio < 1)  return 'ocean';    // 블루오션
  if (ratio < 3)  return 'low';      // 낮음 (기회)
  if (ratio < 7)  return 'mid';      // 보통
  if (ratio < 15) return 'high';     // 경쟁 높음
  return 'red';                       // 레드오션
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

    // 세 가지 키 모두 있어야 검색광고 API 사용
    const hasAdApi = !!(customerId && accessLicense && secretKey);

    const settled = await Promise.allSettled(
      keywords.map(async (kw) => {
        const [kwToolResult, blogStats, cafeStats] = await Promise.allSettled([
          hasAdApi
            ? getKeywordTool({ hintKeywords: kw, customerId, accessLicense, secretKey })
            : Promise.resolve([]),
          getPublishCount(kw, 'blog', clientId, clientSecret),
          getPublishCount(kw, 'cafearticle', clientId, clientSecret),
        ]);

        const list = kwToolResult.status === 'fulfilled' ? kwToolResult.value : [];
        const blog = blogStats.status === 'fulfilled'  ? blogStats.value  : { total: 0, monthly: 0 };
        const cafe = cafeStats.status === 'fulfilled'  ? cafeStats.value  : { total: 0, monthly: 0 };

        // 정확히 일치하는 키워드 (대소문자 무관)
        const kl   = kw.toLowerCase();
        const exact = list.find((item) => (item.relKeyword ?? '').toLowerCase() === kl)
                   ?? list[0]
                   ?? null;

        const pcSearch     = exact ? (exact.monthlyPcQcCnt     ?? 0) : null;
        const mobileSearch = exact ? (exact.monthlyMobileQcCnt ?? 0) : null;
        const totalSearch  = pcSearch !== null ? pcSearch + mobileSearch : null;

        return {
          keyword:     kw,
          pcSearch,
          mobileSearch,
          totalSearch,
          competition: exact?.compIdx ?? null,
          grade:       calcGrade(totalSearch),
          saturation:  calcSaturation(blog.monthly, totalSearch),
          blogMonthly: blog.monthly,
          blogTotal:   blog.total,
          cafeMonthly: cafe.monthly,
          cafeTotal:   cafe.total,
        };
      })
    );

    const results = settled.map((s, i) =>
      s.status === 'fulfilled'
        ? s.value
        : {
            keyword:      keywords[i],
            pcSearch: null, mobileSearch: null, totalSearch: null,
            competition: null, grade: null, saturation: null,
            blogMonthly: 0, blogTotal: 0, cafeMonthly: 0, cafeTotal: 0,
          }
    );

    return NextResponse.json({ results, hasAdApi });
  } catch (err) {
    console.error('[/api/keyword-analysis]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
