/**
 * 네이버 검색 순위 확인 라이브러리
 *
 * Organic (블로그/카페/뉴스/웹): Search API sort=sim, display=100
 * 파워링크/파워콘텐츠: 네이버 SERP HTML 파싱 (PC + Mobile 별도)
 *   - 파워링크 컨테이너: <div class="nad_area" id="power_link_body">
 *   - 파워콘텐츠 컨테이너: class="_fe_view_power_content"
 *   - 광고 href는 클릭 추적 URL이므로 텍스트 내용으로 매칭
 */

const NAVER_SEARCH_API = 'https://openapi.naver.com/v1/search';

const CHANNEL_ENDPOINTS = {
  blog: '/blog.json',
  cafe: '/cafearticle.json',
  news: '/news.json',
  web:  '/webkr.json',
};

/* ── User-Agent ───────────────────────────────────────── */
const PC_UA     = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

/* ── SERP HTML 가져오기 ──────────────────────────────── */
async function fetchSerp(keyword, device = 'pc') {
  const isMobile = device === 'mobile';
  const base = isMobile
    ? 'https://m.search.naver.com/search.naver'
    : 'https://search.naver.com/search.naver';

  const qs = new URLSearchParams({
    query: keyword,
    where: isMobile ? 'm' : 'nexearch',
    sm:    'top_hty',
    ie:    'utf8',
  });

  try {
    const res = await fetch(`${base}?${qs}`, {
      headers: {
        'User-Agent':      isMobile ? MOBILE_UA : PC_UA,
        'Accept':          'text/html,application/xhtml+xml',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        'Referer':         'https://www.naver.com/',
        'Cache-Control':   'no-cache',
      },
    });
    if (!res.ok) return '';
    return await res.text();
  } catch {
    return '';
  }
}

/* ── HTML 클린업 헬퍼 ────────────────────────────────── */
function cleanHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');
}

function stripTags(str) {
  return str
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

/* ── 광고 섹션 추출 (여러 패턴 시도) ────────────────── */
// 네이버 SERP 실제 구조:
//   PC/Mobile: <div class="nad_area" id="power_link_body">
//   상한을 150000으로 충분히 크게 설정 (6위 이후 광고주도 포함)
function extractAdSection(html) {
  const PATTERNS = [
    // 현재 네이버 구조 (PC/Mobile 공통)
    /id=["']power_link_body["'][^>]*>([\s\S]{50,150000})/i,
    /class=["'][^"']*nad_area[^"']*["'][^>]*>([\s\S]{50,150000})/i,
    // 레거시 패턴
    /id=["']iad["'][^>]*>([\s\S]{50,150000})/i,
    /class=["'][^"']*\bad_area\b[^"']*["'][^>]*>([\s\S]{50,150000})/i,
    /class=["'][^"']*\blst_ad\b[^"']*["'][^>]*>([\s\S]{50,150000})/i,
    /class=["'][^"']*\bad_wrap\b[^"']*["'][^>]*>([\s\S]{50,150000})/i,
    /class=["'][^"']*\b_iads\b[^"']*["'][^>]*>([\s\S]{50,150000})/i,
    /class=["'][^"']*\bsp_nads\b[^"']*["'][^>]*>([\s\S]{50,150000})/i,
  ];
  for (const p of PATTERNS) {
    const m = html.match(p);
    if (m) return m[1];
  }
  return '';
}

/* ── 파워콘텐츠 섹션 추출 ────────────────────────────── */
// 네이버 SERP 실제 구조 (2024~):
//   블록: data-block-id="ugc/prs_template_v2_ugc_powercontents_desk.ts"
//   아이템: class="... _fe_view_power_content" data-template-id="ugcItem"
//   → 아이템이 <div> 기반이므로 extractPowerContentSection으로 전체 블록을 가져온 뒤
//     parsePowerContentItems 에서 _fe_view_power_content 기준으로 분리합니다.
function extractPowerContentSection(html) {
  // 파워콘텐츠 전체 블록 앵커 (PC/Mobile 공통)
  const ANCHORS = [
    'ugc_powercontents_desk',
    'ugc_powercontents_mobile',
    'ugc_powercontents',
    '_fe_view_power_content',  // 폴백: 첫 아이템부터
    // 레거시
    'plink_content',
    'powerlink_content',
  ];
  for (const anchor of ANCHORS) {
    const idx = html.indexOf(anchor);
    if (idx !== -1) {
      // 앵커 위치에서 충분히 큰 범위를 캡처
      return html.slice(Math.max(0, idx - 200), idx + 80000);
    }
  }
  return '';
}

/* ── 파워콘텐츠 아이템 파싱 (_fe_view_power_content 기준) ── */
// 파워콘텐츠 아이템은 <div class="... _fe_view_power_content"> 로 구분됩니다.
// ※ 분리 후 각 파트는 " data-power-content-url="https://...긴base64..." 로 시작하는
//   긴 속성값으로 시작하므로, 첫 번째 '>'(태그 닫힘) 이후부터 텍스트를 추출합니다.
function parsePowerContentItems(section) {
  if (!section) return [];
  const items = [];

  // _fe_view_power_content 기준으로 아이템 분리
  const parts = section.split(/_fe_view_power_content/);

  parts.slice(1).forEach((part) => {
    // 긴 속성(data-power-content-url)을 건너뛰고 > 이후 실제 콘텐츠부터 추출
    const gtIdx = part.indexOf('>');
    const contentPart = gtIdx !== -1 ? part.slice(gtIdx + 1) : part;
    const fullText = stripTags(contentPart.slice(0, 10000)).toLowerCase();
    if (fullText.length > 15) {
      items.push({ rank: items.length + 1, cite: '', text: fullText });
    }
  });

  return items;
}

/* ── 섹션에서 광고 아이템 목록 파싱 ─────────────────── */
// 광고 내 서브링크(<li class="item">, <li class="sublink_item">)는
// 별도 광고 슬롯이 아니므로 건너뜁니다.
function parseItems(section) {
  if (!section) return [];
  const items = [];

  const parts = section.split(/<li[\s>]/i);

  parts.slice(1).forEach((part) => {
    // 서브링크 건너뛰기 (PC: class="item", Mobile: class="sublink_item")
    const trimmed = part.trimStart();
    if (/^class=["'](?:item|sublink_item)["']/.test(trimmed)) return;

    // <cite> : 실제 노출 도메인 (있는 경우)
    const citeMatch = part.match(/<cite[^>]*>([\s\S]*?)<\/cite>/i);
    const citeText  = citeMatch ? stripTags(citeMatch[1]).toLowerCase() : '';

    // 전체 텍스트 (제목 + 설명 포함)
    const fullText = stripTags(part).toLowerCase();

    // 의미있는 내용이 있는 항목만 포함
    if (fullText.length > 15) {
      items.push({ rank: items.length + 1, cite: citeText, text: fullText });
    }
  });

  return items;
}

/* ── 타겟 매칭 (여러 타겟 OR 매칭) ─────────────────── */
function findRank(items, targets) {
  const ts = (Array.isArray(targets) ? targets : [targets])
    .map(t => t.toLowerCase().trim()).filter(Boolean);
  for (const item of items) {
    if (ts.some(t => item.cite.includes(t) || item.text.includes(t))) {
      return item.rank;
    }
  }
  return null;
}

/* ── 뉴스 SERP HTML에서 클러스터 단위 순위 조회 ────────── */
// 네이버 뉴스 검색 결과 구조 (Fender 렌더링 기반, 2024~):
//   - 각 뉴스 아이템: ..."templateId":"newsItem"} 패턴으로 구분
//   - clickLog 내 "r":N 값이 해당 기사의 flat 순위 (1-based)
//   - 묶음 기사(cluster)는 메인 기사 r=1,6,11... + 서브기사 r=2~5, 7~10...
//   - 시각적 순위 = Math.ceil(r / 5)  →  r=1..5 → 1위, r=6..10 → 2위, ...
//   - 서브기사는 "subInfoCluster" 배열 안에 자체 titleHref + r 값을 가짐
async function getNewsRankFromSerp(keyword, targets) {
  const qs = new URLSearchParams({
    where: 'news',
    query: keyword,
    sort:  '0',       // 관련도순
    sm:    'tab_opt',
    ie:    'utf8',
  });

  try {
    const res = await fetch(`https://search.naver.com/search.naver?${qs}`, {
      headers: {
        'User-Agent':      PC_UA,
        'Accept':          'text/html,application/xhtml+xml',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        'Referer':         'https://www.naver.com/',
        'Cache-Control':   'no-cache',
      },
    });
    if (!res.ok) return null;
    const html = await res.text();   // cleanHtml 불필요 — JSON 영역은 스크립트 아님

    const ts = (Array.isArray(targets) ? targets : [targets])
      .map(t => t.toLowerCase().trim()).filter(Boolean);

    // ── list_news 섹션 추출 (뉴스 탭 결과 영역만 대상으로 함) ──
    const listStart = html.indexOf('list_news _infinite_list');
    if (listStart === -1) return null;
    const listSection = html.slice(listStart, listStart + 400000);

    // ── 각 newsItem 추출 ──────────────────────────────────────
    // "templateId":"newsItem" 마커를 기준으로 분리
    // 각 조각에서 r 값 + titleHref(메인 + subInfoCluster) 수집
    const MARKER = '"templateId":"newsItem"';
    let pos = 0;

    while (pos < listSection.length) {
      const markerIdx = listSection.indexOf(MARKER, pos);
      if (markerIdx === -1) break;

      // 마커 이전 최대 4000자에서 이 newsItem의 데이터 추출
      const chunk = listSection.slice(Math.max(0, markerIdx - 4000), markerIdx);

      // ① 메인 기사의 r 값: clickLog > title > "r":N 또는 data-cr-on &r=N 패턴
      //    "r":<숫자> 가 여러 개 나올 수 있으므로 가장 앞에 나오는 것이 메인 기사 r
      const rMatch = chunk.match(/"r":(\d+)/);
      const r = rMatch ? parseInt(rMatch[1]) : 0;

      if (r > 0) {
        // 시각적 순위 = ceil(r / 5)
        const visualRank = Math.ceil(r / 5);

        // ② 이 클러스터에 속한 모든 기사 URL 수집 (메인 + subInfoCluster)
        //    media.naver.com/press/... 등 네이버 내부 언론사 채널 링크는 제외
        const allUrls = [];
        for (const m of chunk.matchAll(/"titleHref":"([^"]+)"/g)) {
          const url = m[1].replace(/\\u002F/g, '/').toLowerCase();
          if (!url.includes('naver.com/press') && !url.includes('media.naver.com')) {
            allUrls.push(url);
          }
        }

        // ③ 기사 제목 + 내용(content) 텍스트만 추출 (keep 버튼 URL 등 제외)
        const titles = [];
        for (const m of chunk.matchAll(/"title":"([^"]+)"/g)) {
          titles.push(m[1].replace(/<\/?mark>/g, '').toLowerCase());
        }
        const contents = [];
        for (const m of chunk.matchAll(/"content":"([^"]+)"/g)) {
          contents.push(m[1].toLowerCase());
        }
        const articleText = [...titles, ...contents].join(' ');

        // ④ 타겟 매칭: 기사 URL 또는 기사 제목/내용에서만 검색
        if (ts.some(t =>
          allUrls.some(u => u.includes(t)) ||
          articleText.includes(t)
        )) {
          return visualRank;
        }
      }

      pos = markerIdx + MARKER.length;
      if (pos - listStart > 350000) break; // 안전 한계
    }

    return null;
  } catch {
    return null;
  }
}

/* ──────────────────────────────────────────────────────
   Public API
   ────────────────────────────────────────────────────── */

/**
 * 파워링크 + 파워콘텐츠 순위 (PC / Mobile 동시)
 * @param {string} keyword
 * @param {string|string[]} targets  단일 문자열 또는 여러 타겟 배열 (OR 매칭)
 */
export async function getSerpRanksBoth(keyword, targets) {
  const [pcHtml, mobileHtml] = await Promise.all([
    fetchSerp(keyword, 'pc'),
    fetchSerp(keyword, 'mobile'),
  ]);

  const pcClean     = cleanHtml(pcHtml);
  const mobileClean = cleanHtml(mobileHtml);

  const pcAdItems     = parseItems(extractAdSection(pcClean));
  const pcPcItems     = parsePowerContentItems(extractPowerContentSection(pcClean));
  const mbAdItems     = parseItems(extractAdSection(mobileClean));
  const mbPcItems     = parsePowerContentItems(extractPowerContentSection(mobileClean));

  return {
    pc: {
      powerlink:    findRank(pcAdItems,  targets),
      powerContent: findRank(pcPcItems,  targets),
      adCount:      pcAdItems.length,
    },
    mobile: {
      powerlink:    findRank(mbAdItems,  targets),
      powerContent: findRank(mbPcItems,  targets),
      adCount:      mbAdItems.length,
    },
    // 디버그용 (상위 5개 아이템)
    _debug: {
      pcAds:     pcAdItems.slice(0, 5).map(i => ({ rank: i.rank, cite: i.cite, text: i.text.slice(0,80) })),
      mobileAds: mbAdItems.slice(0, 5).map(i => ({ rank: i.rank, cite: i.cite, text: i.text.slice(0,80) })),
      pcPowerContent:  pcPcItems.slice(0, 5).map(i => ({ rank: i.rank, text: i.text.slice(0,80) })),
      mbPowerContent:  mbPcItems.slice(0, 5).map(i => ({ rank: i.rank, text: i.text.slice(0,80) })),
      pcPcSectionLen:  extractPowerContentSection(pcClean).length,
    },
  };
}

/**
 * 유기적 채널 순위 (Search API sort=sim, 최대 100개)
 * @param {string} keyword
 * @param {string|string[]} targets  단일 문자열 또는 여러 타겟 배열 (OR 매칭)
 * @param {'blog'|'cafe'|'news'|'web'} channel
 */
export async function getOrganicRank(keyword, targets, channel, clientId, clientSecret) {
  try {
    // 순위 확인은 실제 사용자처럼 따옴표 없이 검색 (exact-phrase 제거)
    const params = new URLSearchParams({
      query:   keyword,
      display: '100',
      sort:    'sim',
    });

    // API 호출 (total 수치 + item 정보 획득용)
    const res = await fetch(
      `${NAVER_SEARCH_API}${CHANNEL_ENDPOINTS[channel]}?${params}`,
      {
        headers: {
          'X-Naver-Client-Id':     clientId,
          'X-Naver-Client-Secret': clientSecret,
        },
      }
    );

    if (!res.ok) return { rank: null, item: null, total: 0 };
    const data = await res.json();

    const total = data.total ?? 0;
    const items = data.items ?? [];
    const ts = (Array.isArray(targets) ? targets : [targets])
      .map(t => t.toLowerCase().trim()).filter(Boolean);

    // ── API 기반 매칭 아이템 탐색 (item 정보 추출용) ──────────
    let matchedItem = null;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const fields = [
        item.link, item.originallink, item.title,
        item.bloggername, item.cafename, item.description,
      ];
      if (fields.some((f) => f && ts.some(t => f.toLowerCase().includes(t)))) {
        matchedItem = {
          title:       stripTags(item.title || ''),
          link:        item.link || item.originallink || '',
          bloggername: item.bloggername || '',
          cafename:    item.cafename || '',
          description: stripTags(item.description || ''),
        };
        break;
      }
    }

    // ── 뉴스: SERP HTML 파싱으로 클러스터 단위 실제 순위 ──────
    // 뉴스 묶음(클러스터)은 여러 기사가 하나의 시각적 순위를 차지하므로
    // API 개별 아이템 번호 대신 SERP HTML의 li.bx 단위로 순위를 계산
    if (channel === 'news') {
      const serpRank = await getNewsRankFromSerp(keyword, targets);
      if (serpRank !== null) {
        return { rank: serpRank, item: matchedItem, total };
      }
      // SERP 파싱 실패 시 API 기반 순위로 폴백
    }

    // ── blog / cafe / web : API 기반 순위 (기존 방식) ─────────
    if (matchedItem) {
      // API에서 찾은 위치를 순위로 사용
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const fields = [
          item.link, item.originallink, item.title,
          item.bloggername, item.cafename, item.description,
        ];
        if (fields.some((f) => f && ts.some(t => f.toLowerCase().includes(t)))) {
          return { rank: i + 1, total, item: matchedItem };
        }
      }
    }

    return { rank: null, item: null, total };
  } catch {
    return { rank: null, item: null, total: 0 };
  }
}
