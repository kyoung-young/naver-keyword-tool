import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const kw = searchParams.get('kw') || '만화카페창업';
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  const params = new URLSearchParams({ query: kw, display: '5', sort: 'date' });
  const res = await fetch(`https://openapi.naver.com/v1/search/cafearticle.json?${params}`, {
    headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret }
  });
  const data = await res.json();
  // 첫 번째 아이템의 모든 키 확인
  const firstItem = data.items?.[0] ?? null;
  const allKeys = firstItem ? Object.keys(firstItem) : [];
  const sample = (data.items ?? []).slice(0,3).map(i => {
    const out = {};
    for (const k of Object.keys(i)) out[k] = String(i[k]).slice(0, 50);
    return out;
  });
  return NextResponse.json({ total: data.total, allKeys, sample });
}
