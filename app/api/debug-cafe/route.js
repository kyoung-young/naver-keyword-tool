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
  const items = (data.items ?? []).map(i => ({ pubDate: i.pubDate, postdate: i.postdate, title: i.title?.slice(0,30) }));
  return NextResponse.json({ total: data.total, items });
}
