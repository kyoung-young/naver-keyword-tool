/**
 * POST /api/trend
 * 네이버 DataLab 트렌드 API 프록시
 * API 키는 서버 환경변수(.env.local)에서만 읽음
 */

import { NextResponse } from 'next/server';
import { getTrend } from '../../../lib/naverTrend';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const body = await request.json();
    const { startDate, endDate, timeUnit = 'date', keywordGroups, device = '', ages = [], gender = '' } = body;

    const clientId     = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    if (!keywordGroups?.length) {
      return NextResponse.json({ error: '키워드 그룹을 입력해주세요.' }, { status: 400 });
    }
    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: '서버 API 키가 설정되지 않았습니다. (.env.local 확인)' }, { status: 500 });
    }

    const data = await getTrend({ startDate, endDate, timeUnit, keywordGroups, device, ages, gender, clientId, clientSecret });
    return NextResponse.json(data);
  } catch (err) {
    console.error('[/api/trend]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
