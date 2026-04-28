/**
 * POST /api/export
 * 엑셀 내보내기 — xlsx 패키지 사용
 * Body: { results: { [keyword]: { blog, cafe, news, web } }, keywords: string[] }
 */

import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const runtime = 'nodejs';

const CHANNELS = ['blog', 'cafe', 'news', 'web'];
const CHANNEL_LABELS = { blog: '블로그', cafe: '카페', news: '뉴스', web: '웹문서' };

export async function POST(request) {
  try {
    const body = await request.json();
    const { results, keywords } = body;

    if (!results || !keywords?.length) {
      return NextResponse.json({ error: '데이터가 없습니다.' }, { status: 400 });
    }

    const wb = XLSX.utils.book_new();

    // ── 요약 시트 ──────────────────────────────────────────
    const summaryRows = [['키워드', '블로그', '카페', '뉴스', '웹문서']];
    for (const kw of keywords) {
      const row = [kw];
      for (const ch of CHANNELS) {
        row.push(results[kw]?.[ch]?.total ?? 0);
      }
      summaryRows.push(row);
    }
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, '요약');

    // ── 채널별 시트 ────────────────────────────────────────
    for (const ch of CHANNELS) {
      const rows = [['키워드', '제목', '출처/URL', '날짜', '설명']];
      for (const kw of keywords) {
        const items = results[kw]?.[ch]?.items ?? [];
        for (const item of items) {
          rows.push([
            kw,
            item.title,
            item.link,
            item.pubDate,
            item.description,
          ]);
        }
      }
      const ws = XLSX.utils.aoa_to_sheet(rows);
      // 열 너비 설정
      ws['!cols'] = [
        { wch: 20 },
        { wch: 50 },
        { wch: 50 },
        { wch: 20 },
        { wch: 60 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, CHANNEL_LABELS[ch]);
    }

    // ── 파일 생성 ──────────────────────────────────────────
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const fileName = `naver_keyword_분석_${today}.xlsx`;

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
  } catch (err) {
    console.error('[/api/export]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
