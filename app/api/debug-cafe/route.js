import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export async function GET(request) {
  const clientId     = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  const params = new URLSearchParams({ query: '만화카페창업', display: '3', sort: 'date' });
  const res  = await fetch(`https://openapi.naver.com/v1/search/cafearticle.json?${params}`, {
    headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret }
  });
  const data = await res.json();
  // 첫 번째 아이템 raw 그대로 반환 (날짜 필드 확인용)
  return NextResponse.json({
    httpStatus: res.status,
    total: data.total,
    firstItemRaw: data.items?.[0] ?? null,
    firstItemKeys: data.items?.[0] ? Object.keys(data.items[0]) : [],
  });
}
