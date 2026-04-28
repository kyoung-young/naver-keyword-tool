/**
 * 네이버 검색 API 호출 함수
 * Base URL: https://openapi.naver.com/v1/search
 */

const BASE_URL = 'https://openapi.naver.com/v1/search';

const CHANNEL_ENDPOINTS = {
  blog: '/blog.json',
  cafe: '/cafearticle.json',
  news: '/news.json',
  web:  '/webkr.json',
};

/**
 * 단일 채널 검색
 * @param {string} keyword
 * @param {'blog'|'cafe'|'news'|'web'} channel
 * @param {string} clientId
 * @param {string} clientSecret
 * @returns {Promise<{ total: number, items: Array }>}
 */
export async function searchChannel(keyword, channel, clientId, clientSecret) {
  const endpoint = CHANNEL_ENDPOINTS[channel];
  if (!endpoint) throw new Error(`알 수 없는 채널: ${channel}`);

  // 큰따옴표로 감싸면 네이버가 정확히 일치하는 문서만 반환
  // 예: "레드포스PC방" → 해당 키워드가 포함된 글만 노출 (형태소 분리 방지)
  const exactQuery = `"${keyword}"`;

  const params = new URLSearchParams({
    query: exactQuery,
    display: '10',
    sort: channel === 'web' ? 'sim' : 'date',
  });

  const url = `${BASE_URL}${endpoint}?${params.toString()}`;

  const res = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`네이버 API 오류 [${channel}]: ${res.status} ${text}`);
  }

  const data = await res.json();
  return {
    total: data.total ?? 0,
    items: (data.items ?? []).map((item) => ({
      title:       stripHtml(item.title),
      link:        item.link || item.originallink,
      description: stripHtml(item.description),
      pubDate:     item.pubDate || item.postdate || '',
      bloggername: item.bloggername || '',
      cafename:    item.cafename || '',
    })),
  };
}

/**
 * 여러 키워드 × 여러 채널 동시 검색
 * @param {string[]} keywords
 * @param {string[]} channels
 * @param {string} clientId
 * @param {string} clientSecret
 * @returns {Promise<Object>} { [keyword]: { blog, cafe, news, web } }
 */
export async function searchAll(keywords, channels, clientId, clientSecret) {
  const tasks = [];

  for (const keyword of keywords) {
    for (const channel of channels) {
      tasks.push(
        searchChannel(keyword, channel, clientId, clientSecret)
          .then((result) => ({ keyword, channel, result, error: null }))
          .catch((err)  => ({ keyword, channel, result: null, error: err.message }))
      );
    }
  }

  const settled = await Promise.all(tasks);

  // 결과를 { keyword: { channel: data } } 구조로 조합
  const output = {};
  for (const keyword of keywords) {
    output[keyword] = {};
    for (const channel of channels) {
      output[keyword][channel] = { total: 0, items: [], error: null };
    }
  }

  for (const { keyword, channel, result, error } of settled) {
    if (error) {
      output[keyword][channel] = { total: 0, items: [], error };
    } else {
      output[keyword][channel] = { ...result, error: null };
    }
  }

  return output;
}

/** HTML 태그 제거 헬퍼 */
function stripHtml(str) {
  if (!str) return '';
  return str.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, (m) => HTML_ENTITIES[m] || m);
}

const HTML_ENTITIES = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
};
