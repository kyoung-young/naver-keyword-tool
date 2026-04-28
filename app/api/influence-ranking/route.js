/**
 * POST /api/influence-ranking
 * 내 블로그/카페의 키워드별 노출 현황 및 영향력 점수 측정
 * - 각 키워드에서 블로그/카페 순위를 조회하고 가중 점수를 계산
 */

import { NextResponse } from 'next/server';
import { getOrganicRank } from '../../../lib/naverRank';

export const runtime = 'nodejs';

/**
 * 순위 → 점수 변환
 * 1위=100, 2위=80, 3위=70, 4위=60, 5위=55,
 * 6~10위=40, 11~30위=20, 31~50위=10, 51~100위=5
 */
function rankToScore(rank) {
  if (!rank) return 0;
  if (rank === 1)  return 100;
  if (rank === 2)  return 80;
  if (rank === 3)  return 70;
  if (rank === 4)  return 60;
  if (rank === 5)  return 55;
  if (rank <= 10)  return 40;
  if (rank <= 30)  return 20;
  if (rank <= 50)  return 10;
  return 5;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { target, keywords, channels = ['blog', 'cafe'] } = body;

    const clientId     = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    if (!target?.trim()) {
      return NextResponse.json({ error: '조회할 블로그명·URL을 입력해주세요.' }, { status: 400 });
    }
    if (!keywords?.length) {
      return NextResponse.json({ error: '키워드를 1개 이상 입력해주세요.' }, { status: 400 });
    }
    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: '네이버 검색 API 키가 설정되지 않았습니다.' }, { status: 500 });
    }

    // 각 키워드 × 채널 병렬 조회
    const results = await Promise.all(
      keywords.map(async (keyword) => {
        const channelResults = await Promise.all(
          channels.map((ch) =>
            getOrganicRank(keyword, [target], ch, clientId, clientSecret)
          )
        );

        const byChannel = {};
        channels.forEach((ch, i) => {
          const r = channelResults[i];
          byChannel[ch] = { rank: r.rank, item: r.item, total: r.total };
        });

        // 대표 순위 (채널 중 가장 높은 순위)
        const ranks = channels.map((ch) => byChannel[ch].rank).filter(Boolean);
        const bestRank = ranks.length ? Math.min(...ranks) : null;
        const score = Math.max(...channels.map((ch) => rankToScore(byChannel[ch].rank)));

        return {
          keyword,
          channels: byChannel,
          bestRank,
          score,
        };
      })
    );

    // 전체 점수 (평균)
    const totalScore = results.length
      ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
      : 0;

    // 노출 키워드 수
    const exposedCount = results.filter((r) => r.bestRank !== null).length;

    return NextResponse.json({ results, target, totalScore, exposedCount });
  } catch (err) {
    console.error('[/api/influence-ranking]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
