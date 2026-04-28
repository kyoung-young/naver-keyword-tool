/**
 * POST /api/keyword-expansion
 * 시드 키워드 기반 연관 키워드 확장 (네이버 검색광고 API)
 */

import { NextResponse } from 'next/server';
import { getKeywordTool } from '../../../lib/naverSearchAd';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const body = await request.json();
    const { seedKeyword, includeWords = [], excludeWords = [], highPerformance = false } = body;

    const customerId    = process.env.NAVER_AD_CUSTOMER_ID;
    const accessLicense = process.env.NAVER_AD_ACCESS_LICENSE;
    const secretKey     = process.env.NAVER_AD_SECRET_KEY;

    if (!seedKeyword?.trim()) {
      return NextResponse.json({ error: '시드 키워드를 입력해주세요.' }, { status: 400 });
    }
    if (!accessLicense || !secretKey) {
      return NextResponse.json({ error: '검색광고 API 키가 설정되지 않았습니다. (설정 페이지 확인)' }, { status: 500 });
    }

    // 고성능 모드: 여러 변형 키워드로 추가 확장
    const hintKeywords = highPerformance
      ? [seedKeyword, `${seedKeyword} 추천`, `${seedKeyword} 가격`, `${seedKeyword} 후기`, `${seedKeyword} 비교`].slice(0, 5)
      : [seedKeyword];

    const list = await getKeywordTool({
      hintKeywords,
      customerId: customerId || '0',
      accessLicense,
      secretKey,
    });

    // 중복 제거
    const seen = new Set();
    let keywords = list.filter((item) => {
      if (seen.has(item.relKeyword)) return false;
      seen.add(item.relKeyword);
      return true;
    });

    // 포함 단어 필터 (모두 포함되어야 함)
    const inc = includeWords.map((w) => w.trim().toLowerCase()).filter(Boolean);
    if (inc.length > 0) {
      keywords = keywords.filter((item) =>
        inc.every((w) => item.relKeyword.toLowerCase().includes(w))
      );
    }

    // 제외 단어 필터 (하나라도 포함되면 제외)
    const exc = excludeWords.map((w) => w.trim().toLowerCase()).filter(Boolean);
    if (exc.length > 0) {
      keywords = keywords.filter((item) =>
        !exc.some((w) => item.relKeyword.toLowerCase().includes(w))
      );
    }

    // 검색량 기준 정렬
    keywords.sort((a, b) =>
      ((b.monthlyPcQcCnt ?? 0) + (b.monthlyMobileQcCnt ?? 0)) -
      ((a.monthlyPcQcCnt ?? 0) + (a.monthlyMobileQcCnt ?? 0))
    );

    const results = keywords.map((item) => ({
      keyword:     item.relKeyword,
      pcSearch:    item.monthlyPcQcCnt    ?? 0,
      mobileSearch:item.monthlyMobileQcCnt ?? 0,
      totalSearch: (item.monthlyPcQcCnt ?? 0) + (item.monthlyMobileQcCnt ?? 0),
      competition: item.compIdx ?? '-',
    }));

    return NextResponse.json({ results, seed: seedKeyword });
  } catch (err) {
    console.error('[/api/keyword-expansion]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
