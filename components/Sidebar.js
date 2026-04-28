'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const NAV_GROUPS = [
  {
    label: '키워드 조사',
    items: [
      { href: '/keyword-analysis',  label: '키워드 분석',   icon: BarChartIcon },
      { href: '/keyword-expansion', label: '키워드 확장',   icon: SearchPlusIcon },
      { href: '/trend',             label: '트렌드 그래프', icon: TrendIcon },
    ],
  },
  {
    label: '순위 분석',
    items: [
      { href: '/rank',              label: '노출 순위 확인', icon: RankIcon },
      { href: '/influence-ranking', label: '영향력 분석',    icon: StarIcon },
    ],
  },
  {
    label: '경쟁사 관리',
    items: [
      { href: '/competitors', label: '경쟁사 키워드', icon: BuildingIcon },
      { href: '/monitor',     label: '모니터링',       icon: BellIcon },
    ],
  },
  {
    label: '기타',
    items: [
      { href: '/',         label: '검색 분석',  icon: SearchIcon },
      { href: '/settings', label: 'API 설정',   icon: SettingsIcon },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <button
        className="sidebar-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="메뉴"
      >
        <MenuIcon />
      </button>

      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`sidebar${mobileOpen ? ' open' : ''}`}>
        {/* 로고 */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">
            <LogoIcon />
          </div>
          <div className="sidebar-logo-text">
            <span className="sidebar-brand">키워드툴</span>
            <span className="sidebar-brand-sub">네이버 통합 분석</span>
          </div>
        </div>

        {/* 네비게이션 */}
        <nav className="sidebar-nav">
          {NAV_GROUPS.map(({ label: groupLabel, items }) => (
            <div key={groupLabel} className="sidebar-section">
              <div className="sidebar-section-label">{groupLabel}</div>
              {items.map(({ href, label, icon: Icon }) => {
                const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`sidebar-item${isActive ? ' active' : ''}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className="sidebar-item-icon"><Icon /></span>
                    <span className="sidebar-item-label">{label}</span>
                    {isActive && <span className="sidebar-item-dot" />}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* 하단 */}
        <div className="sidebar-footer">
          <div className="sidebar-footer-badge">
            <span className="sidebar-footer-dot" />
            Naver API 연결됨
          </div>
        </div>
      </aside>

      <style>{`
        /* ── 사이드바 기본 ── */
        .sidebar {
          position: fixed;
          top: 0; left: 0;
          width: var(--sidebar-width);
          height: 100vh;
          background: #0f1117;
          display: flex;
          flex-direction: column;
          z-index: 100;
          overflow-y: auto;
          overflow-x: hidden;
        }

        /* ── 로고 ── */
        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 20px 16px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          flex-shrink: 0;
        }
        .sidebar-logo-mark {
          width: 34px; height: 34px;
          background: var(--color-primary);
          border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 0 0 3px rgba(3,199,90,0.2);
        }
        .sidebar-logo-text {
          display: flex; flex-direction: column; gap: 1px;
        }
        .sidebar-brand {
          font-size: 14px; font-weight: 700;
          color: #fff; letter-spacing: -0.3px;
        }
        .sidebar-brand-sub {
          font-size: 10px; color: rgba(255,255,255,0.4);
          letter-spacing: 0.02em;
        }

        /* ── 네비게이션 ── */
        .sidebar-nav {
          flex: 1;
          padding: 12px 10px;
          display: flex;
          flex-direction: column;
          gap: 0;
          overflow-y: auto;
        }
        .sidebar-section {
          margin-bottom: 6px;
        }
        .sidebar-section-label {
          font-size: 10px;
          font-weight: 700;
          color: rgba(255,255,255,0.25);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 10px 10px 4px;
        }
        .sidebar-item {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 8px 10px;
          border-radius: 7px;
          font-size: 13px;
          font-weight: 500;
          color: rgba(255,255,255,0.55);
          transition: background 0.15s, color 0.15s;
          position: relative;
          text-decoration: none;
        }
        .sidebar-item:hover {
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.85);
        }
        .sidebar-item.active {
          background: rgba(3,199,90,0.15);
          color: #4ade80;
          font-weight: 600;
        }
        .sidebar-item-icon {
          width: 18px; height: 18px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; opacity: 0.8;
        }
        .sidebar-item.active .sidebar-item-icon { opacity: 1; }
        .sidebar-item-label { flex: 1; }
        .sidebar-item-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: var(--color-primary);
          flex-shrink: 0;
        }

        /* ── 하단 ── */
        .sidebar-footer {
          padding: 14px 16px;
          border-top: 1px solid rgba(255,255,255,0.07);
          flex-shrink: 0;
        }
        .sidebar-footer-badge {
          display: flex; align-items: center; gap: 7px;
          font-size: 11px; color: rgba(255,255,255,0.3);
        }
        .sidebar-footer-dot {
          width: 6px; height: 6px;
          background: var(--color-primary);
          border-radius: 50%;
          flex-shrink: 0;
          box-shadow: 0 0 6px var(--color-primary);
        }

        /* ── 모바일 ── */
        .sidebar-toggle {
          display: none;
          position: fixed; top: 12px; left: 12px; z-index: 200;
          background: #0f1117;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          width: 38px; height: 38px;
          color: #fff;
          align-items: center; justify-content: center;
        }
        .sidebar-overlay {
          display: none;
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 99;
        }

        @media (max-width: 768px) {
          .sidebar {
            transform: translateX(-100%);
            transition: transform 0.25s;
          }
          .sidebar.open { transform: translateX(0); }
          .sidebar-toggle { display: flex; }
          .sidebar-overlay { display: block; }
        }
      `}</style>
    </>
  );
}

/* ── SVG 아이콘 (인라인) ────────────────────────── */
function LogoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  );
}
function BarChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  );
}
function SearchPlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
    </svg>
  );
}
function TrendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  );
}
function RankIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  );
}
function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
}
function BuildingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M3 9h18M9 21V9"/>
    </svg>
  );
}
function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  );
}
