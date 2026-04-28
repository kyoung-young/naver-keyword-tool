/**
 * POST /api/search
 * 네이버 검색 API 프록시 (블로그/카페/뉴스/웹문서)
 * API 키는 서버 환경변수(.env.local)에서만 읽음 — 클라이언트 전달값 사용 안 함
 */

import { NextResponse } from 'next/server';
import { searchAll } from '../../../lib/naverSearch';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const body = await request.json();
    const { keywords, channels } = body;

    // 환경변수에서만 키 로드 (클라이언트에서 받지 않음)
    const clientId     = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    if (!keywords?.length) {
      return NextResponse.json({ error: '키워드를 입력해주세요.' }, { status: 400 });
    }
    if (!channels?.length) {
      return NextResponse.json({ error: '채널을 선택해주세요.' }, { status: 400 });
    }
    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: '서버 API 키가 설정되지 않았습니다. (.env.local 확인)' }, { status: 500 });
    }

    const results = await searchAll(keywords, channels, clientId, clientSecret);
    return NextResponse.json({ results });
  } catch (err) {
    console.error('[/api/search]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
