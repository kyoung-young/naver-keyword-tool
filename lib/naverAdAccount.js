/**
 * 네이버 검색광고 계정 성과 데이터 조회
 * 캠페인 → 광고그룹 → 키워드 → 통계 순서로 계층 조회
 */
import crypto from 'crypto';

const BASE_URL = 'https://api.naver.com';

/* ── 인증 헬퍼 (naverSearchAd.js와 동일한 HMAC 방식) ── */
function generateSignature(timestamp, method, uri, secretKey) {
  const message = `${timestamp}.${method}.${uri}`;
  const hmac = crypto.createHmac('sha256', secretKey.trim());
  hmac.update(message);
  return hmac.digest('base64');
}

function buildHeaders(method, uri, customerId, accessLicense, secretKey) {
  const timestamp = String(Date.now());
  const pathOnly  = uri.split('?')[0];
  const signature = generateSignature(timestamp, method, pathOnly, secretKey);
  return {
    'Content-Type': 'application/json; charset=UTF-8',
    'X-Timestamp': timestamp,
    'X-API-KEY':   accessLicense.trim(),
    'X-Customer':  String(customerId).trim(),
    'X-Signature': signature,
  };
}

async function apiGet(uri, customerId, accessLicense, secretKey) {
  const headers = buildHeaders('GET', uri, customerId, accessLicense, secretKey);
  const res = await fetch(`${BASE_URL}${uri}`, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

/* ── 캠페인 목록 ── */
async function getCampaigns(customerId, accessLicense, secretKey) {
  const data = await apiGet('/naver/campaigns', customerId, accessLicense, secretKey);
  return Array.isArray(data) ? data : (data?.campaigns ?? []);
}

/* ── 광고그룹 목록 (캠페인 IDs 기준) ── */
async function getAdGroups(campaignIds, customerId, accessLicense, secretKey) {
  if (!campaignIds?.length) return [];
  // 한 번에 최대 100개씩 분할
  const BATCH = 100;
  const all = [];
  for (let i = 0; i < campaignIds.length; i += BATCH) {
    const ids = campaignIds.slice(i, i + BATCH).join(',');
    const data = await apiGet(
      `/naver/adgroups?campaignIds=${encodeURIComponent(ids)}`,
      customerId, accessLicense, secretKey
    );
    const rows = Array.isArray(data) ? data : (data?.adGroups ?? data?.adgroups ?? []);
    all.push(...rows);
    if (campaignIds.length > BATCH) await new Promise(r => setTimeout(r, 150));
  }
  return all;
}

/* ── 키워드 목록 (광고그룹 IDs 기준) ── */
async function getAdKeywords(adgroupIds, customerId, accessLicense, secretKey) {
  if (!adgroupIds?.length) return [];
  const BATCH = 100;
  const all = [];
  for (let i = 0; i < adgroupIds.length; i += BATCH) {
    const ids = adgroupIds.slice(i, i + BATCH).join(',');
    const data = await apiGet(
      `/naver/adKeywords?adgroupIds=${encodeURIComponent(ids)}`,
      customerId, accessLicense, secretKey
    );
    const rows = Array.isArray(data) ? data : (data?.keywords ?? data?.keywordList ?? []);
    all.push(...rows);
    if (adgroupIds.length > BATCH) await new Promise(r => setTimeout(r, 150));
  }
  return all;
}

/* ── 키워드 ID 기준 성과 통계 (최근 30일) ── */
async function getStatById(keywordId, customerId, accessLicense, secretKey) {
  const now   = new Date();
  const end   = now.toISOString().slice(0, 10);
  const start = new Date(now - 30 * 86400000).toISOString().slice(0, 10);
  const fields = 'impCnt,clkCnt,ctr,avgCpc,salesAmt';
  const uri = `/stats?id=${keywordId}&fields=${fields}&timeUnit=allDays&startDate=${start}&endDate=${end}`;
  const data = await apiGet(uri, customerId, accessLicense, secretKey);
  const row = Array.isArray(data?.data) ? (data.data[0] ?? {}) : {};
  return {
    impCnt:   Number(row.impCnt   ?? 0),
    clkCnt:   Number(row.clkCnt   ?? 0),
    ctr:      Number(row.ctr      ?? 0),   // % 단위 (ex: 2.5)
    avgCpc:   Number(row.avgCpc   ?? 0),
    salesAmt: Number(row.salesAmt ?? 0),
  };
}

/**
 * 계정에서 지정 키워드들을 찾아 성과 데이터 반환
 *
 * @param {string[]} targetKeywords  - 분석할 키워드 목록
 * @param {string}   customerId
 * @param {string}   accessLicense
 * @param {string}   secretKey
 * @returns {Record<string, {found, status, bid, impCnt, clkCnt, ctr, avgCpc, salesAmt}>}
 */
export async function findKeywordStats(targetKeywords, customerId, accessLicense, secretKey) {
  /* 1. 캠페인 조회 */
  const campaigns  = await getCampaigns(customerId, accessLicense, secretKey);
  const campaignIds = campaigns
    .map(c => c.nccCampaignId ?? c.campaignId ?? c.id)
    .filter(Boolean);
  if (!campaignIds.length) return {};

  /* 2. 광고그룹 조회 */
  const adGroups = await getAdGroups(campaignIds, customerId, accessLicense, secretKey);
  const adGroupIds = adGroups
    .map(g => g.nccAdgroupId ?? g.adgroupId ?? g.id)
    .filter(Boolean);
  if (!adGroupIds.length) return {};

  /* 3. 전체 키워드 조회 */
  const allKeywords = await getAdKeywords(adGroupIds, customerId, accessLicense, secretKey);

  /* 4. 입력 키워드와 텍스트 매칭 (공백·대소문자 무관) */
  const normalize = s => String(s).toLowerCase().replace(/\s+/g, '');
  const targetMap = new Map(
    targetKeywords.map(k => [normalize(k), k])
  );

  const matched = allKeywords.filter(kw => {
    const text = kw.keyword ?? kw.keywordText ?? kw.relKeyword ?? '';
    return targetMap.has(normalize(text));
  });

  /* 5. 매칭된 키워드들의 성과 조회 */
  const results = {};

  // 먼저 매칭 안 된 키워드는 "등록 없음"으로 표시
  for (const [, origKw] of targetMap) {
    results[normalize(origKw)] = { found: false };
  }

  for (const kw of matched) {
    const kwText   = kw.keyword ?? kw.keywordText ?? '';
    const kwId     = kw.nccKeywordId ?? kw.keywordId ?? kw.id;
    const isActive = (kw.userLock ?? kw.status ?? '') !== 'Y' &&
                     String(kw.inspect ?? 'APPROVED').toUpperCase() !== 'REJECTED';
    const statusLabel = kw.userLock === 'Y'           ? '중지'
                      : kw.bidAmt === 0               ? '예산소진'
                      : '운영중';
    const baseResult = {
      found:    true,
      keyword:  kwText,
      keywordId: kwId,
      status:   statusLabel,
      isActive,
      bid:      kw.bidAmt ?? kw.bid ?? null,
    };

    if (kwId) {
      try {
        const stats = await getStatById(kwId, customerId, accessLicense, secretKey);
        results[normalize(kwText)] = { ...baseResult, ...stats };
      } catch {
        results[normalize(kwText)] = { ...baseResult, impCnt: 0, clkCnt: 0, ctr: 0, avgCpc: 0, salesAmt: 0 };
      }
      await new Promise(r => setTimeout(r, 120)); // rate limit 방지
    } else {
      results[normalize(kwText)] = { ...baseResult, impCnt: 0, clkCnt: 0, ctr: 0, avgCpc: 0, salesAmt: 0 };
    }
  }

  return results;
}
