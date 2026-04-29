/**
 * 네이버 검색 순위 확인 라이브러리
 *
 * Organic (블로그/카페/뉴스/웹): Search API sort=sim, display=100
 * 파워링크/파워콘텐츠/브랜드콘텐츠: 네이버 SERP HTML 파싱 (PC + Mobile 별도)
 *   - 파워링크 컨테이너: <div class="nad_area" id="power_link_body">
 *   - 파워콘텐츠 컨테이너: class="_fe_view_power_content"
 *   - 브랜드콘텐츠 컨테이너: class="brand_content" / "brand_storeContents" 등
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
function extractAdSection(html) {
  const PATTERNS = [
    /id=["']power_link_body["'][^>]*>([\s\S]{50,150000})/i,
    /class=["'][^"']*nad_area[^"']*["'][^>]*>([\s\S]{50,150000})/i,
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
function extractPowerContentSection(html) {
  const ANCHORS = [
    'ugc_powercontents_desk',
    'ugc_powercontents_mobile',
    'ugc_powercontents',
    '_fe_view_power_content',
    'plink_content',
    'powerlink_content',
  ];
  for (const anchor of ANCHORS) {
    const idx = html.indexOf(anchor);
    if (idx !== -1) {
      return html.slice(Math.max(0, idx - 200), idx + 80000);
    }
  }
  return '';
}

/* ── 브랜드콘텐츠 섹션 추출 ─────────────────────────── */
// 브랜드콘텐츠는 파워콘텐츠와 별개의 광고 상품입니다.
// 만화카페창업 같은 키워드에서 "브랜드 콘텐츠" 섹션으로 노출됩니다.
// 네이버 SERP HTML에서 사용하는 클래스명 패턴들을 순서대로 시도합니다.
function extractBrandContentSection(html) {
  const ANCHORS = [
    // 현재 네이버 구조 (2024~)
    'brand_content',
    'brand_contents',
    'brand_storeContents',
    'brandContents',
    'brandcontents',
    // data-block-id 기반 (Fender 렌더링)
    'brand_content_tab',
    'brand_content_list',
    // 레거시 / 모바일
    'sp_brand',
    'ct_brand',
    'ad_brand',
    'brand_area',
    '_fe_view_brand_content',
    'BrandContent',
  ];
  const lowerHtml = html.toLowerCase();
  for (const anchor of ANCHORS) {
    const idx = lowerHtml.indexOf(anchor.toLowerCase());
    if (idx !== -1) {
      return html.slice(Math.max(0, idx - 300), idx + 60000);
    }
  }
  return '';
}

/* ── 브랜드콘텐츠 아이템 파싱 ────────────────────────── */
// 브랜드콘텐츠는 각 업체 카드가 <li> 또는 <div> 단위로 구성됩니다.
// <li> 기반과 _fe_view_brand_content 기반 모두 처리합니다.
function parseBrandContentItems(section) {
  if (!section) return [];
  const items = [];

  // 1) _fe_view_brand_content 기반 (파워콘텐츠와 유사한 구조)
  if (section.includes('_fe_view_brand_content')) {
    const parts = section.split(/_fe_view_brand_content/);
    parts.slice(1).forEach((part) => {
      const gtIdx = part.indexOf('>');
      const contentPart = gtIdx !== -1 ? part.slice(gtIdx + 1) : part;
      const fullText = stripTags(contentPart.slice(0, 10000)).toLowerCase();
      if (fullText.length > 15) {
        items.push({ rank: items.length + 1, cite: '', text: fullText });
      }
    });
    if (items.length > 0) return items;
  }

  // 2) <li> 기반 파싱 (파워링크와 유사한 구조)
  const liParts = section.split(/<li[\s>]/i);
  liParts.slice(1).forEach((part) => {
    const trimmed = part.trimStart();
    // 서브링크 스킵
    if (/^class=["'](?:item|sublink_item)["']/.test(trimmed)) return;

    const citeMatch = part.match(/<cite[^>]*>([\s\S]*?)<\/cite>/i);
    const citeText  = citeMatch ? stripTags(citeMatch[1]).toLowerCase() : '';
    const fullText  = stripTags(part).toLowerCase();

    if (fullText.length > 15) {
      items.push({ rank: items.length + 1, cite: citeText, text: fullText });
    }
  });

  // 3) <li> 기반으로도 못찾으면 전체 텍스트를 단일 아이템으로
  if (items.length === 0 && section.length > 50) {
    const fullText = stripTags(section.slice(0, 5000)).toLowerCase();
    if (fullText.length > 15) {
      items.push({ rank: 1, cite: '', text: fullText });
    }
  }

  return items;
}

/* ── 파워콘텐츠 아이템 파싱 ─────────────────────────── */
function parsePowerContentItems(section) {
  if (!section) return [];
  const items = [];

  const parts = section.split(/_fe_view_power_content/);

  parts.slice(1).forEach((part) => {
    const gtIdx = part.indexOf('>');
    const contentPart = gtIdx !== -1 ? part.slice(gtIdx + 1) : part;
    const fullText = stripTags(contentPart.slice(0, 10000)).toLowerCase();
    if (fullText.length > 15) {
      items.push({ rank: items.length + 1, cite: '', text: fullText });
    }
  });

  return items;
}

/* ── 광고 아이템 파싱 (<li> 기반) ─────────────────── */
function parseItems(section) {
  if (!section) return [];
  const items = [];

  const parts = section.split(/<li[\s>]/i);

  parts.slice(1).forEach((part) => {
    const trimmed = part.trimStart();
    if (/^class=["'](?:item|sublink_item)["']/.test(trimmed)) return;

    const citeMatch = part.match(/<cite[^>]*>([\s\S]*?)<\/cite>/i);
    const citeText  = citeMatch ? stripTags(citeMatch[1]).toLowerCase() : '';
    const fullText  = stripTags(part).toLowerCase();

    if (fullText.length > 15) {
      items.push({ rank: items.length + 1, cite: citeText, text: fullText });
    }
  });

  return items;
}

/* ── 타겟 매칭 ──────────────────────────────────────── */
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

/* ── 메인 SERP에서 블로그 섹션 추출 ─────────────────── */
// 통합검색 결과의 블로그 위젯 (최상위 몇 개만 노출)
function extractBlogSectionFromMainSerp(html) {
  const ANCHORS = [
    // 현재 Fender 구조 data-block-id 기반
    'blogCafe',
    'blog_section',
    'total_blog',
    // 클래스명 기반
    'type_blog',
    'api_subject_bx',
    // 레거시
    'viewtype_blog',
    'blog_area',
  ];
  const lowerHtml = html.toLowerCase();
  for (const anchor of ANCHORS) {
    const idx = lowerHtml.indexOf(anchor.toLowerCase());
    if (idx !== -1) {
      return html.slice(Math.max(0, idx - 200), idx + 30000);
    }
  }
  return '';
}

/* ── 메인 SERP 블로그 섹션에서 순위 추출 ───────────── */
// 통합검색에 노출된 블로그 결과 (보통 상위 3~5개)에서 타겟 순위를 반환합니다.
function getBlogRankFromSection(section, targets) {
  if (!section) return null;
  const ts = (Array.isArray(targets) ? targets : [targets])
    .map(t => t.toLowerCase().trim()).filter(Boolean);

  // 블로그 포스트 URL 패턴: blog.naver.com/BLOGNAME 또는 custom domain
  // <a href="..."> 태그와 bloggername, title 기준으로 매칭
  const lowerSection = section.toLowerCase();

  // 각 블로그 아이템을 <li> 또는 블로그 특징 앵커로 분리
  const ITEM_SPLITS = ['<li class="bx"', '<li class="sh_blog', '<div class="total_area"',
    '<div class="api_subject_bx"', '<div class="blog_area"'];

  let parts = null;
  for (const splitter of ITEM_SPLITS) {
    const p = section.split(new RegExp(splitter, 'i'));
    if (p.length > 1) { parts = p; break; }
  }

  // 분리 실패 시 전체 섹션에서 직접 매칭
  if (!parts) {
    if (ts.some(t => lowerSection.includes(t))) return 1;
    return null;
  }

  for (let i = 1; i < parts.length; i++) {
    const itemText = parts[i].toLowerCase();
    if (ts.some(t => itemText.includes(t))) {
      return i; // 1-based rank
    }
  }
  return null;
}

/* ── 뉴스 SERP 순위 조회 ─────────────────────────── */
async function getNewsRankFromSerp(keyword, targets) {
  const qs = new URLSearchParams({
    where: 'news',
    query: keyword,
    sort:  '0',
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
    const html = await res.text();

    const ts = (Array.isArray(targets) ? targets : [targets])
      .map(t => t.toLowerCase().trim()).filter(Boolean);

    const listStart = html.indexOf('list_news _infinite_list');
    if (listStart === -1) return null;
    const listSection = html.slice(listStart, listStart + 400000);

    const MARKER = '"templateId":"newsItem"';
    let pos = 0;

    while (pos < listSection.length) {
      const markerIdx = listSection.indexOf(MARKER, pos);
      if (markerIdx === -1) break;

      const chunk = listSection.slice(Math.max(0, markerIdx - 4000), markerIdx);
      const rMatch = chunk.match(/"r":(\d+)/);
      const r = rMatch ? parseInt(rMatch[1]) : 0;

      if (r > 0) {
        const visualRank = Math.ceil(r / 5);
        const allUrls = [];
        for (const m of chunk.matchAll(/"titleHref":"([^"]+)"/g)) {
          const url = m[1].replace(/\\u002F/g, '/').toLowerCase();
          if (!url.includes('naver.com/press') && !url.includes('media.naver.com')) {
            allUrls.push(url);
          }
        }
        const titles = [];
        for (const m of chunk.matchAll(/"title":"([^"]+)"/g)) {
          titles.push(m[1].replace(/<\/?mark>/g, '').toLowerCase());
        }
        const contents = [];
        for (const m of chunk.matchAll(/"content":"([^"]+)"/g)) {
          contents.push(m[1].toLowerCase());
        }
        const articleText = [...titles, ...contents].join(' ');

        if (ts.some(t =>
          allUrls.some(u => u.includes(t)) ||
          articleText.includes(t)
        )) {
          return visualRank;
        }
      }

      pos = markerIdx + MARKER.length;
      if (pos - listStart > 350000) break;
    }

    return null;
  } catch {
    return null;
  }
}

/* ── HTML에서 "brand" 관련 클래스명 수집 (디버그용) ── */
function collectBrandClassNames(html) {
  const found = new Set();
  // class 속성에서 brand 포함 항목 수집
  const classRe = /class=["']([^"']*brand[^"']*)["']/gi;
  let m;
  while ((m = classRe.exec(html)) !== null) {
    // 클래스명 중 brand 포함한 것만 추출
    m[1].split(/\s+/).filter(c => c.toLowerCase().includes('brand')).forEach(c => found.add(c));
  }
  // data-block-id에서 brand 포함 항목
  const blockRe = /data-block-id=["']([^"']*brand[^"']*)["']/gi;
  while ((m = blockRe.exec(html)) !== null) {
    found.add('block:' + m[1]);
  }
  return [...found].slice(0, 20);
}

/* ──────────────────────────────────────────────────────
   Public API
   ────────────────────────────────────────────────────── */

/**
 * 파워링크 + 파워콘텐츠 + 브랜드콘텐츠 순위 (PC / Mobile 동시)
 */
export async function getSerpRanksBoth(keyword, targets) {
  const [pcHtml, mobileHtml] = await Promise.all([
    fetchSerp(keyword, 'pc'),
    fetchSerp(keyword, 'mobile'),
  ]);

  const pcClean     = cleanHtml(pcHtml);
  const mobileClean = cleanHtml(mobileHtml);

  // 파워링크
  const pcAdItems     = parseItems(extractAdSection(pcClean));
  const mbAdItems     = parseItems(extractAdSection(mobileClean));

  // 파워콘텐츠
  const pcPcSection   = extractPowerContentSection(pcClean);
  const mbPcSection   = extractPowerContentSection(mobileClean);
  const pcPcItems     = parsePowerContentItems(pcPcSection);
  const mbPcItems     = parsePowerContentItems(mbPcSection);

  // 브랜드콘텐츠
  const pcBcSection   = extractBrandContentSection(pcClean);
  const mbBcSection   = extractBrandContentSection(mobileClean);
  const pcBcItems     = parseBrandContentItems(pcBcSection);
  const mbBcItems     = parseBrandContentItems(mbBcSection);

  // 메인 SERP 블로그 섹션 (통합검색 노출 블로그)
  const pcBlogSection = extractBlogSectionFromMainSerp(pcClean);
  const mbBlogSection = extractBlogSectionFromMainSerp(mobileClean);
  const pcBlogRank    = getBlogRankFromSection(pcBlogSection, targets);
  const mbBlogRank    = getBlogRankFromSection(mbBlogSection, targets);

  // 브랜드 클래스명 디버그 (실제 HTML에서 수집)
  const brandClassesInPc = collectBrandClassNames(pcHtml);

  return {
    pc: {
      powerlink:     findRank(pcAdItems,  targets),
      powerContent:  findRank(pcPcItems,  targets),
      brandContent:  findRank(pcBcItems,  targets),
      adCount:       pcAdItems.length,
      blogRank:      pcBlogRank,
    },
    mobile: {
      powerlink:     findRank(mbAdItems,  targets),
      powerContent:  findRank(mbPcItems,  targets),
      brandContent:  findRank(mbBcItems,  targets),
      adCount:       mbAdItems.length,
      blogRank:      mbBlogRank,
    },
    _debug: {
      pcAds:            pcAdItems.slice(0, 5).map(i => ({ rank: i.rank, cite: i.cite, text: i.text.slice(0,80) })),
      mobileAds:        mbAdItems.slice(0, 5).map(i => ({ rank: i.rank, cite: i.cite, text: i.text.slice(0,80) })),
      pcPowerContent:   pcPcItems.slice(0, 5).map(i => ({ rank: i.rank, text: i.text.slice(0,80) })),
      mbPowerContent:   mbPcItems.slice(0, 5).map(i => ({ rank: i.rank, text: i.text.slice(0,80) })),
      pcBrandContent:   pcBcItems.slice(0, 5).map(i => ({ rank: i.rank, text: i.text.slice(0,80) })),
      mbBrandContent:   mbBcItems.slice(0, 5).map(i => ({ rank: i.rank, text: i.text.slice(0,80) })),
      pcPcSectionLen:   pcPcSection.length,
      pcBcSectionLen:   pcBcSection.length,
      mbBcSectionLen:   mbBcSection.length,
      brandClassesInPc, // 실제 HTML에 존재하는 brand 관련 클래스명
      pcBlogSectionLen: pcBlogSection.length,
      pcBlogRank,
      mbBlogRank,
    },
  };
}

/**
 * 유기적 채널 순위 (Search API sort=sim, 최대 100개)
 * 블로그의 경우 SERP HTML 순위를 serpBlogRank 파라미터로 받아 우선 사용합니다.
 */
export async function getOrganicRank(keyword, targets, channel, clientId, clientSecret, serpBlogRank = null) {
  try {
    const params = new URLSearchParams({
      query:   keyword,
      display: '100',
      sort:    'sim',
    });

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

    let matchedItem = null;
    let matchedIdx  = -1;
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
        matchedIdx = i;
        break;
      }
    }

    // 뉴스: SERP HTML 파싱으로 클러스터 단위 실제 순위
    if (channel === 'news') {
      const serpRank = await getNewsRankFromSerp(keyword, targets);
      if (serpRank !== null) {
        return { rank: serpRank, item: matchedItem, total };
      }
    }

    // 블로그: 통합검색 SERP 노출 순위가 있으면 우선 사용
    // serpBlogRank는 getSerpRanksBoth()에서 추출한 메인 SERP 블로그 섹션 순위
    if (channel === 'blog' && serpBlogRank !== null) {
      return { rank: serpBlogRank, item: matchedItem, total, source: 'serp' };
    }

    if (matchedIdx !== -1) {
      return { rank: matchedIdx + 1, total, item: matchedItem };
    }

    return { rank: null, item: null, total };
  } catch {
    return { rank: null, item: null, total: 0 };
  }
}
