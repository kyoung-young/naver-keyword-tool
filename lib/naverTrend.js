/**
 * 네이버 DataLab 트렌드 API 호출 함수
 * URL: https://openapi.naver.com/v1/datalab/search
 */

const TREND_URL = 'https://openapi.naver.com/v1/datalab/search';

/**
 * 트렌드 데이터 조회
 * @param {Object} params
 * @param {string}   params.startDate   - 'YYYY-MM-DD'
 * @param {string}   params.endDate     - 'YYYY-MM-DD'
 * @param {'date'|'week'|'month'} params.timeUnit
 * @param {Array<{groupName:string, keywords:string[]}>} params.keywordGroups
 * @param {string}   [params.device]    - '' | 'pc' | 'mo'
 * @param {string[]} [params.ages]      - [] | ['1','2',...,'6']
 * @param {string}   [params.gender]    - '' | 'm' | 'f'
 * @param {string}   params.clientId
 * @param {string}   params.clientSecret
 * @returns {Promise<{ startDate, endDate, timeUnit, results: Array }>}
 */
export async function getTrend({
  startDate,
  endDate,
  timeUnit = 'date',
  keywordGroups,
  device = '',
  ages = [],
  gender = '',
  clientId,
  clientSecret,
}) {
  const body = {
    startDate,
    endDate,
    timeUnit,
    keywordGroups,
  };

  if (device)        body.device = device;
  if (ages?.length)  body.ages = ages;
  if (gender)        body.gender = gender;

  const res = await fetch(TREND_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DataLab API 오류: ${res.status} ${text}`);
  }

  return res.json();
}

/**
 * 기간 계산 헬퍼 (오늘로부터 N개월 전)
 * @param {number} months
 * @returns {{ startDate: string, endDate: string }}
 */
export function getDateRange(months) {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - months);

  return {
    startDate: formatDate(start),
    endDate:   formatDate(end),
  };
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
