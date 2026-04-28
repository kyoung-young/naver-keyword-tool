/**
 * POST /api/keyword-tool
 * 네이버 검색광고 키워드도구 API 프록시
 * API 키는 서버 환경변수(.env.local)에서만 읽음
 */

import { NextResponse } from 'next/server';
import { getKeywordStats } from '../../../lib/naverSearchAd';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const body = await request.json();
    const { keywords } = body;

    const customerId    = process.env.NAVER_AD_CUSTOMER_ID;
    const accessLicense = process.env.NAVER_AD_ACCESS_LICENSE;
    const secretKey     = process.env.NAVER_AD_SECRET_KEY;

    if (!keywords?.length) {
      return NextResponse.json({ error: '키워드를 입력해주세요.' }, { status: 400 });
    }
    if (!customerId || !accessLicense || !secretKey) {
      return NextResponse.json({ error: '검색광고 API 키가 설정되지 않았습니다. (.env.local 확인)' }, { status: 500 });
    }

    const stats = await getKeywordStats({ keywords, customerId, accessLicense, secretKey });
    return NextResponse.json({ stats });
  } catch (err) {
    console.error('[/api/keyword-tool]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
