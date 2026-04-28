'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import KeywordInput from '../components/KeywordInput';
import ResultTable from '../components/ResultTable';
import ExcelExportBtn from '../components/ExcelExportBtn';

const CHANNELS = [
  { key: 'blog', label: '블로그', color: 'var(--color-blog)' },
  { key: 'cafe', label: '카페',   color: 'var(--color-cafe)' },
  { key: 'news', label: '뉴스',   color: 'var(--color-news)' },
  { key: 'web',  label: '웹문서', color: 'var(--color-web)'  },
];

const QUICK_TOOLS = [
  {
    href: '/keyword-analysis',
    icon: '📊',
    title: '키워드 분석',
    desc: 'PC/모바일 월간 검색량, 블로그 발행량 한번에 조회',
    color: '#3b82f6',
    bg: '#eff6ff',
  },
  {
    href: '/keyword-expansion',
    icon: '🔎',
    title: '키워드 확장',
    desc: '시드 키워드에서 롱테일 연관 키워드 자동 발굴',
    color: '#8b5cf6',
    bg: '#f5f3ff',
  },
  {
    href: '/rank',
    icon: '🏆',
    title: '노출 순위 확인',
    desc: '파워링크 · 파워콘텐츠 · 블로그 · 카페 순위 조회',
    color: '#f59e0b',
    bg: '#fffbeb',
  },
  {
    href: '/influence-ranking',
    icon: '⭐',
    title: '영향력 분석',
    desc: '내 블로그·카페가 키워드에서 얼마나 노출되는지 점수화',
    color: '#10b981',
    bg: '#ecfdf5',
  },
  {
    href: '/trend',
    icon: '📈',
    title: '트렌드 그래프',
    desc: '네이버 DataLab 기반 검색어 트렌드 시각화',
    color: '#ef4444',
    bg: '#fef2f2',
  },
  {
    href: '/monitor',
    icon: '🔔',
    title: '모니터링',
    desc: '키워드 순위 변동 자동 감지 및 알림',
    color: '#06b6d4',
    bg: '#ecfeff',
  },
];

export default function DashboardPage() {
  const [keywords, setKeywords] = useState([]);
  const [channels, setChannels] = useState(['blog', 'news']);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [results, setResults]   = useState(null);
  const [activeTab, setActiveTab] = useState('blog');
  const [activeKw, setActiveKw]   = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = sessionStorage.getItem('loadKeywords');
    if (stored) {
      try {
        const kws = JSON.parse(stored);
        if (Array.isArray(kws) && kws.length) setKeywords(kws);
      } catch {}
      sessionStorage.removeItem('loadKeywords');
    }
  }, []);

  const toggleChannel = (ch) =>
    setChannels((prev) => prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]);

  const handleSearch = useCallback(async () => {
    if (!keywords.length) { setError('키워드를 1개 이상 입력하세요.'); return; }
    if (!channels.length) { setError('채널을 1개 이상 선택하세요.'); return; }
    setLoading(true); setError(''); setResults(null);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords, channels }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '검색 실패');
      setResults(data.results);
      setActiveTab(channels[0]);
      setActiveKw(keywords[0]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [keywords, channels]);

  const summaryData = results
    ? CHANNELS.filter((c) => channels.includes(c.key)).map((c) => ({
        ...c,
        total: keywords.reduce((sum, kw) => sum + (results[kw]?.[c.key]?.total ?? 0), 0),
      }))
    : [];

  return (
    <div>
      {/* 도구 바로가기 (결과 없을 때) */}
      {!results && (
        <div className="tools-grid">
          {QUICK_TOOLS.map((tool) => (
            <Link key={tool.href} href={tool.href} className="tool-card">
              <div className="tool-card-icon" style={{ background: tool.bg, color: tool.color }}>
                {tool.icon}
              </div>
              <div className="tool-card-body">
                <div className="tool-card-title">{tool.title}</div>
                <div className="tool-card-desc">{tool.desc}</div>
              </div>
              <div className="tool-card-arrow">→</div>
            </Link>
          ))}
        </div>
      )}

      {/* 검색 패널 */}
      <div className="card search-card">
        <div className="search-card-header">
          <h3 className="search-card-title">통합 검색 분석</h3>
          <p className="search-card-sub">네이버 블로그·카페·뉴스·웹문서를 한번에 분석합니다</p>
        </div>

        <div className="search-row">
          <div className="search-kw">
            <label className="field-label">키워드 <span className="field-hint">최대 5개 · Enter로 추가</span></label>
            <KeywordInput keywords={keywords} onChange={setKeywords} max={5} />
          </div>

          <div className="search-ch">
            <label className="field-label">채널</label>
            <div className="ch-list">
              {CHANNELS.map((c) => (
                <label key={c.key} className="ch-item">
                  <input
                    type="checkbox"
                    checked={channels.includes(c.key)}
                    onChange={() => toggleChannel(c.key)}
                  />
                  <span className="ch-dot" style={{ background: c.color }} />
                  {c.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        {error && <div className="error-box">{error}</div>}

        <button className="btn btn-primary btn-search" onClick={handleSearch} disabled={loading}>
          {loading ? <><span className="spinner" /> 분석 중...</> : '분석 시작'}
        </button>
      </div>

      {/* 결과 */}
      {results && (
        <>
          <div className="summary-grid">
            {summaryData.map((c) => (
              <div key={c.key} className="summary-card">
                <div className="summary-card-label">{c.label}</div>
                <div className="summary-card-value" style={{ color: c.color }}>
                  {c.total.toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>총 문서</div>
              </div>
            ))}
          </div>

          {keywords.length >= 2 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 className="card-section-title">키워드 비교</h3>
              <CompareBarChart keywords={keywords} channels={channels} results={results} />
            </div>
          )}

          <div className="card">
            <div className="card-top-row">
              <h3 className="card-section-title" style={{ margin: 0 }}>최신 문서</h3>
              <ExcelExportBtn results={results} keywords={keywords} />
            </div>
            <div className="tabs">
              {CHANNELS.filter((c) => channels.includes(c.key)).map((c) => (
                <button
                  key={c.key}
                  className={`tab-btn${activeTab === c.key ? ' active' : ''}`}
                  onClick={() => setActiveTab(c.key)}
                >
                  {c.label}
                </button>
              ))}
            </div>
            {keywords.length > 1 && (
              <div style={{ marginBottom: 16 }}>
                <select className="select-field" value={activeKw} onChange={(e) => setActiveKw(e.target.value)}>
                  {keywords.map((kw) => <option key={kw} value={kw}>{kw}</option>)}
                </select>
              </div>
            )}
            <ResultTable items={results?.[activeKw]?.[activeTab]?.items ?? []} channel={activeTab} />
          </div>
        </>
      )}

      <style>{`
        /* 도구 그리드 */
        .tools-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }
        .tool-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 18px;
          background: var(--color-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          box-shadow: var(--shadow-xs);
          text-decoration: none;
          transition: box-shadow 0.15s, border-color 0.15s, transform 0.15s;
        }
        .tool-card:hover {
          box-shadow: var(--shadow-md);
          border-color: #c8cdd5;
          transform: translateY(-2px);
        }
        .tool-card-icon {
          width: 40px; height: 40px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }
        .tool-card-body { flex: 1; min-width: 0; }
        .tool-card-title { font-size: 13px; font-weight: 700; color: var(--color-text); margin-bottom: 2px; }
        .tool-card-desc  { font-size: 11px; color: var(--color-text-sub); line-height: 1.4; }
        .tool-card-arrow {
          font-size: 16px;
          color: var(--color-text-muted);
          flex-shrink: 0;
          transition: transform 0.15s;
        }
        .tool-card:hover .tool-card-arrow { transform: translateX(3px); color: var(--color-text); }

        /* 검색 카드 */
        .search-card { margin-bottom: 24px; }
        .search-card-header { margin-bottom: 20px; }
        .search-card-title { font-size: 15px; font-weight: 700; margin-bottom: 3px; }
        .search-card-sub { font-size: 12px; color: var(--color-text-sub); }
        .search-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 24px;
          margin-bottom: 16px;
          align-items: start;
        }
        .field-label {
          display: block; font-size: 12px; font-weight: 600;
          color: var(--color-text-sub); margin-bottom: 8px;
          text-transform: uppercase; letter-spacing: 0.04em;
        }
        .field-hint { font-weight: 400; font-size: 11px; text-transform: none; letter-spacing: 0; margin-left: 4px; }
        .ch-list { display: flex; flex-direction: column; gap: 8px; }
        .ch-item {
          display: flex; align-items: center; gap: 8px;
          font-size: 13px; cursor: pointer; user-select: none;
          white-space: nowrap;
        }
        .ch-item input[type="checkbox"] { accent-color: var(--color-primary); width: 14px; height: 14px; }
        .ch-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .error-box {
          padding: 10px 14px;
          background: #fef2f2; border: 1px solid #fca5a5;
          border-radius: var(--radius-sm); color: var(--color-danger);
          font-size: 13px; margin-bottom: 16px;
        }
        .btn-search { padding: 10px 28px; font-size: 14px; }

        /* 카드 내부 */
        .card-section-title { font-size: 14px; font-weight: 700; margin-bottom: 14px; }
        .card-top-row {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 16px;
        }

        @media (max-width: 900px) {
          .tools-grid { grid-template-columns: repeat(2, 1fr); }
          .search-row { grid-template-columns: 1fr; }
        }
        @media (max-width: 600px) {
          .tools-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

function CompareBarChart({ keywords, channels, results }) {
  const chList = CHANNELS.filter((c) => channels.includes(c.key));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {chList.map((ch) => {
        const maxVal = Math.max(1, ...keywords.map((kw) => results[kw]?.[ch.key]?.total ?? 0));
        return (
          <div key={ch.key}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-sub)', marginBottom: 6 }}>
              {ch.label}
            </div>
            {keywords.map((kw) => {
              const val = results[kw]?.[ch.key]?.total ?? 0;
              const pct = Math.min(100, (val / maxVal) * 100);
              return (
                <div key={kw} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                  <span style={{ minWidth: 90, fontSize: 12, color: 'var(--color-text-sub)', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kw}</span>
                  <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 4, height: 18, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: ch.color, borderRadius: 4, transition: 'width 0.6s ease', minWidth: val > 0 ? 4 : 0 }} />
                  </div>
                  <span style={{ minWidth: 64, fontSize: 12, fontWeight: 700, textAlign: 'right' }}>{val.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
