/**
 * 네이버 검색광고 API 호출 함수
 * Base URL: https://api.naver.com
 * 인증: HMAC-SHA256 (timestamp + '\n' + method + '\n' + uri)
 *
 * Node.js 내장 crypto 모듈 사용 (Edge Runtime 불가 → Node.js only)
 */

import crypto from 'crypto';

const BASE_URL = 'https://api.naver.com';

/**
 * HMAC-SHA256 서명 생성
 * @param {string} timestamp  - Unix 밀리초 문자열
 * @param {string} method     - HTTP 메서드 (대문자)
 * @param {string} uri        - 경로 + 쿼리 문자열 (/keywordstool?...)
 * @param {string} secretKey  - 검색광고 Secret Key
 * @returns {string}          - Base64 인코딩된 서명
 */
function generateSignature(timestamp, method, uri, secretKey) {
  const message = `${timestamp}\n${method}\n${uri}`;
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(message);
  return hmac.digest('base64');
}

/**
 * 공통 인증 헤더 생성
 */
function buildHeaders(method, uri, customerId, accessLicense, secretKey) {
  const timestamp = String(Date.now());
  const signature = generateSignature(timestamp, method, uri, secretKey);

  return {
    'Content-Type': 'application/json',
    'X-Timestamp': timestamp,
    'X-API-KEY': accessLicense,
    'X-Customer': String(customerId),
    'X-Signature': signature,
  };
}

/**
 * 키워드 도구 API — 키워드 월간 검색량 조회
 * @param {Object} params
 * @param {string|string[]} params.hintKeywords  - 최대 5개
 * @param {string}  params.customerId
 * @param {string}  params.accessLicense
 * @param {string}  params.secretKey
 * @param {boolean} [params.showDetail=true]
 * @returns {Promise<Array>}  - 키워드별 통계 배열
 */
export async function getKeywordTool({
  hintKeywords,
  customerId,
  accessLicense,
  secretKey,
  showDetail = true,
}) {
  const keywords = Array.isArray(hintKeywords) ? hintKeywords : [hintKeywords];
  const queryStr = keywords.map((k) => `hintKeywords=${encodeURIComponent(k)}`).join('&');
  const uri = `/keywordstool?${queryStr}&showDetail=${showDetail ? 1 : 0}`;

  const headers = buildHeaders('GET', uri, customerId, accessLicense, secretKey);

  const res = await fetch(`${BASE_URL}${uri}`, { headers });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`검색광고 API 오류: ${res.status} ${text}`);
  }

  const data = await res.json();
  // keywordList 배열 반환
  return data.keywordList ?? [];
}

/**
 * 키워드 입찰 관련 정보 조회 (선택적으로 사용)
 * @param {Object} params
 * @param {string[]} params.keywords
 * @param {string}   params.customerId
 * @param {string}   params.accessLicense
 * @param {string}   params.secretKey
 */
export async function getKeywordStats({
  keywords,
  customerId,
  accessLicense,
  secretKey,
}) {
  const results = await Promise.allSettled(
    keywords.map((kw) =>
      getKeywordTool({ hintKeywords: kw, customerId, accessLicense, secretKey })
    )
  );

  const output = {};
  keywords.forEach((kw, i) => {
    const r = results[i];
    output[kw] = r.status === 'fulfilled' ? r.value : [];
  });
  return output;
}
