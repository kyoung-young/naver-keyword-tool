'use client';

import { usePathname } from 'next/navigation';

const PAGE_META = {
  '/':                   { title: '키워드 검색 분석',  desc: '네이버 블로그·카페·뉴스·웹문서 통합 검색' },
  '/keyword-analysis':   { title: '키워드 분석',       desc: 'PC/모바일 검색량 · 블로그 발행량 조회' },
  '/keyword-expansion':  { title: '키워드 확장',       desc: '시드 키워드 기반 연관 키워드 발굴' },
  '/rank':               { title: '노출 순위 확인',    desc: '파워링크 · 파워콘텐츠 · 블로그 · 카페 등 순위 조회' },
  '/influence-ranking':  { title: '영향력 분석',       desc: '내 채널의 키워드별 노출 현황 및 점수 측정' },
  '/trend':              { title: '트렌드 그래프',     desc: '네이버 DataLab 검색어 트렌드 시각화' },
  '/competitors':        { title: '경쟁사 키워드',     desc: '경쟁사 키워드 그룹 관리' },
  '/monitor':            { title: '모니터링',           desc: '키워드 순위 변동 자동 감지' },
  '/settings':           { title: 'API 설정',           desc: '네이버 API 키 설정 및 상태 확인' },
};

export default function Topbar() {
  const pathname = usePathname();
  const meta = PAGE_META[pathname] ?? { title: '키워드 분석툴', desc: '' };

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="topbar-text">
          <h2 className="topbar-title">{meta.title}</h2>
          {meta.desc && <p className="topbar-desc">{meta.desc}</p>}
        </div>
      </div>

      <style>{`
        .topbar {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid var(--color-border);
          height: var(--topbar-height);
          display: flex;
          align-items: center;
          padding: 0 36px;
        }
        .topbar-inner {
          display: flex;
          align-items: center;
          gap: 16px;
          width: 100%;
        }
        .topbar-text { display: flex; align-items: baseline; gap: 12px; }
        .topbar-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--color-text);
          white-space: nowrap;
        }
        .topbar-desc {
          font-size: 12px;
          color: var(--color-text-muted);
          display: none;
        }
        @media (min-width: 900px) {
          .topbar-desc { display: block; }
        }
      `}</style>
    </header>
  );
}
