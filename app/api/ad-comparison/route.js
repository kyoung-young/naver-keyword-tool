/**
 * POST /api/ad-comparison
 * 등록된 광고 계정들의 키워드 성과를 keywordstool 시장 평균과 비교 반환
 *
 * 환경변수 (계정 1 — 기존):
 *   NAVER_AD_CUSTOMER_ID, NAVER_AD_ACCESS_LICENSE, NAVER_AD_SECRET_KEY
 *   NAVER_AD_ACCOUNT_NAME  (표시 이름, 기본 "계정1")
 *
 * 환경변수 (계정 2 — 신규):
 *   NAVER_AD_CUSTOMER_ID_2, NAVER_AD_ACCESS_LICENSE_2, NAVER_AD_SECRET_KEY_2
 *   NAVER_AD_ACCOUNT_NAME_2 (표시 이름, 기본 "계정2")
 */

import { NextResponse } from 'next/server';
import { getKeywordTool } from '../../../lib/naverSearchAd';
import { findKeywordStats } from '../../../lib/naverAdAccount';

export const runtime = 'nodejs';

/* ── 등록된 계정 목록 빌드 ── */
function getAccounts() {
  const accounts = [
    {
      name:          process.env.NAVER_AD_ACCOUNT_NAME  || '아이센스',
      customerId:    process.env.NAVER_AD_CUSTOMER_ID,
      accessLicense: process.env.NAVER_AD_ACCESS_LICENSE,
      secretKey:     process.env.NAVER_AD_SECRET_KEY,
    },
    {
      name:          process.env.NAVER_AD_ACCOUNT_NAME_2  || '벌툰',
      customerId:    process.env.NAVER_AD_CUSTOMER_ID_2,
      accessLicense: process.env.NAVER_AD_ACCESS_LICENSE_2,
      secretKey:     process.env.NAVER_AD_SECRET_KEY_2,
    },
  ].filter(a => a.customerId && a.accessLicense && a.secretKey);
  return accounts;
}

export async function POST(request) {
  try {
    const { keywords } = await request.json();
    if (!keywords?.length) {
      return NextResponse.json({ error: '키워드를 입력해주세요.' }, { status: 400 });
    }

    const accounts = getAccounts();
    if (!accounts.length) {
      return NextResponse.json({ error: '광고 API 계정이 설정되지 않았습니다.' }, { status: 503 });
    }

    /* ── 1. keywordstool 시장 평균 조회 (첫 번째 계정으로 인증) ── */
    const main = accounts[0];
    const marketMap = {};

    for (const kw of keywords) {
      try {
        const list = await getKeywordTool({
          hintKeywords: kw,
          customerId:    main.customerId,
          accessLicense: main.accessLicense,
          secretKey:     main.secretKey,
        });
        const kl    = kw.toLowerCase();
        const exact = list.find(i => (i.relKeyword ?? '').toLowerCase() === kl) ?? list[0] ?? null;
        if (exact) {
          marketMap[kl] = {
            pcSearch:        exact.monthlyPcQcCnt        ?? 0,
            mobileSearch:    exact.monthlyMobileQcCnt    ?? 0,
            totalSearch:     (exact.monthlyPcQcCnt ?? 0) + (exact.monthlyMobileQcCnt ?? 0),
            marketPcCtr:     exact.monthlyAvePcCtr       ?? null,  // % 단위
            marketMobCtr:    exact.monthlyAveMobileCtr   ?? null,
            marketPcClk:     exact.monthlyAvePcClkCnt    ?? null,
            marketMobClk:    exact.monthlyAveMobileClkCnt ?? null,
            marketAvgDepth:  exact.plAvgDepth            ?? null,
            compIdx:         exact.compIdx               ?? null,
          };
        }
      } catch { /* 개별 키워드 오류는 무시 */ }
      await new Promise(r => setTimeout(r, 200));
    }

    /* ── 2. 각 계정별 키워드 성과 병렬 조회 ── */
    const accountStatsResults = await Promise.allSettled(
      accounts.map(acc =>
        findKeywordStats(keywords, acc.customerId, acc.accessLicense, acc.secretKey)
      )
    );

    /* ── 3. 키워드별 비교 데이터 조합 ── */
    const normalize = s => String(s).toLowerCase().replace(/\s+/g, '');

    const comparison = keywords.map(kw => {
      const kl     = normalize(kw);
      const market = marketMap[kw.toLowerCase()] ?? null;

      const accountData = accounts.map((acc, idx) => {
        const statsMap = accountStatsResults[idx].status === 'fulfilled'
          ? accountStatsResults[idx].value
          : {};
        const stat = statsMap[kl] ?? { found: false };

        /* CTR 차이: 내 CTR - 시장 평균 CTR */
        const myCtr    = stat.ctr ?? null;
        const mktCtr   = market?.marketPcCtr ?? null;
        const ctrDiff  = (myCtr !== null && mktCtr !== null)
          ? parseFloat((myCtr - mktCtr).toFixed(2))
          : null;
        const ctrScore = ctrDiff === null ? null
          : ctrDiff > 0.5  ? 'good'
          : ctrDiff > -0.5 ? 'avg'
          : 'bad';

        return {
          name:       acc.name,
          found:      stat.found ?? false,
          status:     stat.status ?? null,
          isActive:   stat.isActive ?? false,
          bid:        stat.bid ?? null,
          impCnt:     stat.impCnt ?? null,
          clkCnt:     stat.clkCnt ?? null,
          ctr:        stat.ctr    ?? null,
          avgCpc:     stat.avgCpc ?? null,
          salesAmt:   stat.salesAmt ?? null,
          ctrDiff,
          ctrScore,
        };
      });

      return {
        keyword:     kw,
        market,
        accounts:    accountData,
      };
    });

    return NextResponse.json({
      comparison,
      accountNames: accounts.map(a => a.name),
      accountCount: accounts.length,
    });

  } catch (err) {
    console.error('[ad-comparison]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
