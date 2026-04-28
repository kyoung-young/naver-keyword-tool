/**
 * POST /api/rank
 * 키워드별 채널 노출 순위 확인 (PC + Mobile)
 */

import { NextResponse } from 'next/server';
import { getOrganicRank, getSerpRanksBoth } from '../../../lib/naverRank';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const body = await request.json();
    const { keywords, target } = body;

    const clientId     = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    if (!keywords?.length)  return NextResponse.json({ error: '키워드를 입력해주세요.' }, { status: 400 });
    if (!target?.trim())    return NextResponse.json({ error: '조회 대상을 입력해주세요.' }, { status: 400 });
    if (!clientId || !clientSecret) return NextResponse.json({ error: '서버 API 키 미설정' }, { status: 500 });

    // 쉼표로 구분된 여러 타겟 → 배열로 변환 (OR 매칭)
    const targets = target.split(',').map(t => t.trim()).filter(Boolean);

    const results = {};

    for (const keyword of keywords) {
      // 유기적 채널 4개 + SERP(PC+Mobile) 병렬 조회
      const [blogRank, cafeRank, newsRank, webRank, serpBoth] = await Promise.all([
        getOrganicRank(keyword, targets, 'blog', clientId, clientSecret),
        getOrganicRank(keyword, targets, 'cafe', clientId, clientSecret),
        getOrganicRank(keyword, targets, 'news', clientId, clientSecret),
        getOrganicRank(keyword, targets, 'web',  clientId, clientSecret),
        getSerpRanksBoth(keyword, targets),
      ]);

      results[keyword] = {
        // 파워링크: PC / Mobile 별도
        powerlink: {
          pc:     serpBoth.pc.powerlink,
          mobile: serpBoth.mobile.powerlink,
        },
        // 파워콘텐츠: PC / Mobile 별도
        powerContent: {
          pc:     serpBoth.pc.powerContent,
          mobile: serpBoth.mobile.powerContent,
        },
        // 유기적 채널 (API 기반, 기기 무관)
        blog: { rank: blogRank.rank, item: blogRank.item, total: blogRank.total },
        cafe: { rank: cafeRank.rank, item: cafeRank.item, total: cafeRank.total },
        news: { rank: newsRank.rank, item: newsRank.item, total: newsRank.total },
        web:  { rank: webRank.rank,  item: webRank.item,  total: webRank.total  },
        // 디버그
        _debug: serpBoth._debug,
      };
    }

    return NextResponse.json({ results, target });
  } catch (err) {
    console.error('[/api/rank]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
