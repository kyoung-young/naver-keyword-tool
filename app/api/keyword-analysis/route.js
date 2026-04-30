/**
 * POST /api/keyword-analysis
 * 키워드별 검색량 + 블로그/카페 발행량 + 등급 + 포화도 조회
 */

import { NextResponse } from 'next/server';
import { getKeywordTool } from '../../../lib/naverSearchAd';
import { saveKeywordStats } from '../../../lib/keywordHistory';

export const runtime = 'nodejs';

const NAVER_SEARCH_API = 'https://openapi.naver.com/v1/search';

/**
 * 채널별 발행량 조회
 * - total: 누적 총 발행량 (API total 필드)
 * - monthly: 월간 발행량 추정
 *   → 최근 100개 포스트의 날짜 범위(span)로 계산
 *     monthly = round(100 / daySpan * 30)
 *   → 블랙키위와 동일한 방식 (단순 30일 내 카운트 보다 훨씬 정확)
 */
async function getPublishCount(keyword, channel, clientId, clientSecret) {
  try {
    const params = new URLSearchParams({ query: keyword, display: '100', sort: 'date' });
    const endpoint = channel === 'cafe' ? 'cafearticle' : channel;
    const res = await fetch(`${NAVER_SEARCH_API}/${endpoint}.json?${params}`, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });
    if (!res.ok) return { total: 0, monthly: 0 };
    const data = await res.json();

    const total = data.total ?? 0;
    const items = data.items ?? [];

    // 날짜 범위로 월간 발행량 추정
    // ※ 블로그: pubDate  "Mon, 09 Jan 2023 15:30:00 +0900"
    // ※ 카페:  postdate "20230109"  → new Date() Invalid Date 주의
    const dated = items
      .map(i => {
        // pubDate, postdate 모두 시도 — YYYYMMDD 형식이면 변환
        for (const field of [i.pubDate, i.postdate]) {
          if (!field) continue;
          let raw = String(field).trim();
          if (/^\d{8}$/.test(raw)) {
            raw = `${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}`;
          }
          const t = new Date(raw).getTime();
          if (!isNaN(t)) return t;
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => b - a); // 최신순

    let monthly = 0;
    if (dated.length >= 2) {
      const newest = dated[0];
      const oldest = dated[dated.length - 1];
      const daySpan = (newest - oldest) / 86400000; // ms → days
      monthly = daySpan > 0
        ? Math.round(dated.length / daySpan * 30)
        : dated.length * 30; // 같은 날 몰려있으면 매우 활발
    } else if (dated.length === 1) {
      monthly = 30; // 최소 추정
    }

    return { total, monthly };
  } catch {
    return { total: 0, monthly: 0 };
  }
}

/** 포화도 레벨 */
function satLevel(pct) {
  if (pct === null || pct === undefined) return null;
  if (pct < 10)  return { label: '매우 낮음', color: '#2563eb' };
  if (pct < 30)  return { label: '낮음',     color: '#16a34a' };
  if (pct < 50)  return { label: '높음',     color: '#d97706' };
  if (pct < 80)  return { label: '매우 높음',color: '#ea580c' };
  return              { label: '포화',      color: '#dc2626' };
}

/** 키워드 등급 */
function calcGrade(total) {
  if (!total) return null;
  if (total >= 30000) return 'diamond';
  if (total >= 10000) return 'platinum';
  if (total >= 3000)  return 'gold';
  if (total >= 1000)  return 'silver';
  if (total >= 300)   return 'bronze';
  return 'seed';
}

export async function POST(request) {
  try {
    const { keywords } = await request.json();

    const customerId    = process.env.NAVER_AD_CUSTOMER_ID;
    const accessLicense = process.env.NAVER_AD_ACCESS_LICENSE;
    const secretKey     = process.env.NAVER_AD_SECRET_KEY;
    const clientId      = process.env.NAVER_CLIENT_ID;
    const clientSecret  = process.env.NAVER_CLIENT_SECRET;

    if (!keywords?.length)
      return NextResponse.json({ error: '키워드를 입력해주세요.' }, { status: 400 });
    if (!clientId || !clientSecret)
      return NextResponse.json({ error: '네이버 검색 API 키 미설정' }, { status: 500 });

    const hasAdApi = !!(customerId && accessLicense && secretKey);

    const settled = await Promise.allSettled(
      keywords.map(async (kw) => {
        const [kwRes, blogRes, cafeRes] = await Promise.allSettled([
          hasAdApi
            ? getKeywordTool({ hintKeywords: kw, customerId, accessLicense, secretKey })
            : Promise.resolve([]),
          getPublishCount(kw, 'blog', clientId, clientSecret),
          getPublishCount(kw, 'cafe', clientId, clientSecret),
        ]);

        const list = kwRes.status === 'fulfilled' ? (kwRes.value ?? []) : [];
        const blog = blogRes.status === 'fulfilled' ? blogRes.value : { total: 0, monthly: 0 };
        const cafe = cafeRes.status === 'fulfilled' ? cafeRes.value : { total: 0, monthly: 0 };

        // 대소문자 무관 정확 매칭 → 없으면 첫 번째
        const kl    = kw.toLowerCase();
        const exact = list.find(i => (i.relKeyword ?? '').toLowerCase() === kl) ?? list[0] ?? null;

        const pcSearch     = exact ? (exact.monthlyPcQcCnt     ?? 0) : null;
        const mobileSearch = exact ? (exact.monthlyMobileQcCnt ?? 0) : null;
        const totalSearch  = pcSearch !== null ? pcSearch + mobileSearch : null;

        // 포화도 % = (월발행 / 월검색) × 100  (소수점 1자리 반올림 — 0%로 뭉개지는 문제 방지)
        const ts          = totalSearch && totalSearch > 0 ? totalSearch : null;
        const roundSat    = v => Math.min(999, Math.round(v * 10) / 10); // 소수점 1자리
        const blogSatPct  = ts ? roundSat(blog.monthly / ts * 100) : null;
        const cafeSatPct  = ts ? roundSat(cafe.monthly / ts * 100) : null;
        const totalSatPct = (blogSatPct !== null && cafeSatPct !== null)
                            ? roundSat(blogSatPct + cafeSatPct) : null;

        return {
          keyword:     kw,
          pcSearch,
          mobileSearch,
          totalSearch,
          competition: exact?.compIdx ?? null,
          grade:       calcGrade(totalSearch),
          // 발행량
          blogMonthly: blog.monthly,
          blogTotal:   blog.total,
          cafeMonthly: cafe.monthly,
          cafeTotal:   cafe.total,
          totalContent: blog.total + cafe.total,
          // 포화도
          blogSatPct,
          cafeSatPct,
          totalSatPct,
          blogSatLevel:  satLevel(blogSatPct),
          cafeSatLevel:  satLevel(cafeSatPct),
          totalSatLevel: satLevel(totalSatPct),
        };
      })
    );

    const results = settled.map((s, i) =>
      s.status === 'fulfilled' ? s.value : {
        keyword: keywords[i],
        pcSearch: null, mobileSearch: null, totalSearch: null,
        competition: null, grade: null,
        blogMonthly: 0, blogTotal: 0, cafeMonthly: 0, cafeTotal: 0, totalContent: 0,
        blogSatPct: null, cafeSatPct: null, totalSatPct: null,
        blogSatLevel: null, cafeSatLevel: null, totalSatLevel: null,
      }
    );

    // 검색광고 API 데이터가 있는 결과만 DB에 백그라운드 저장 (응답 지연 없음)
    if (hasAdApi) {
      for (const r of results) {
        if (r.pcSearch !== null) {
          saveKeywordStats(r.keyword, r.pcSearch, r.mobileSearch, r.competition)
            .catch(e => console.error('[keyword-analysis] DB save error:', e.message));
        }
      }
    }

    return NextResponse.json({ results, hasAdApi });
  } catch (err) {
    console.error('[/api/keyword-analysis]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
