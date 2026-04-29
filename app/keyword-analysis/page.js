'use client';

import { useState, useEffect } from 'react';

/* ── 등급 설정 ──────────────────────────────────────────── */
const GRADES = {
  diamond:  { label: '다이아',   icon: '💎', color: '#0369a1', bg: '#e0f2fe' },
  platinum: { label: '플래티넘', icon: '🔮', color: '#7c3aed', bg: '#f3e8ff' },
  gold:     { label: '골드',     icon: '🥇', color: '#b45309', bg: '#fef3c7' },
  silver:   { label: '실버',     icon: '🥈', color: '#475569', bg: '#f1f5f9' },
  bronze:   { label: '브론즈',   icon: '🥉', color: '#9a3412', bg: '#ffedd5' },
  seed:     { label: '씨앗',     icon: '🌱', color: '#166534', bg: '#dcfce7' },
};

/* ── 포화도 설정 ─────────────────────────────────────────── */
const SATURATIONS = {
  ocean: { label: '블루오션', icon: '🌊', color: '#0369a1', bg: '#e0f2fe' },
  low:   { label: '기회',    icon: '🟢', color: '#166534', bg: '#dcfce7' },
  mid:   { label: '보통',    icon: '🟡', color: '#92400e', bg: '#fef3c7' },
  high:  { label: '경쟁',    icon: '🟠', color: '#9a3412', bg: '#ffedd5' },
  red:   { label: '레드오션',icon: '🔴', color: '#991b1b', bg: '#fee2e2' },
};

const COMP       = { low: '낮음', mid: '중간', high: '높음' };
const COMP_COLOR = { low: '#166534', mid: '#92400e', high: '#991b1b' };
const COMP_BG    = { low: '#dcfce7', mid: '#fef3c7', high: '#fee2e2' };
const AGE_COLORS = ['#6366f1','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6'];

function fmtNum(n) {
  if (n === null || n === undefined) return '-';
  if (n < 10) return '<10';
  return n.toLocaleString();
}

function calcGradeFromTotal(total) {
  if (!total) return null;
  if (total >= 30000) return 'diamond';
  if (total >= 10000) return 'platinum';
  if (total >= 3000)  return 'gold';
  if (total >= 1000)  return 'silver';
  if (total >= 300)   return 'bronze';
  return 'seed';
}

/* ── 등급 뱃지 ──────────────────────────────────────────── */
function GradeBadge({ grade }) {
  if (!grade) return <span style={{ color: '#9ca3af', fontSize: 12 }}>-</span>;
  const g = GRADES[grade];
  if (!g) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: g.bg, color: g.color,
    }}>
      {g.icon} {g.label}
    </span>
  );
}

/* ── 포화도 뱃지 ─────────────────────────────────────────── */
function SatBadge({ saturation }) {
  if (!saturation) return <span style={{ color: '#9ca3af', fontSize: 12 }}>-</span>;
  const s = SATURATIONS[saturation];
  if (!s) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.color,
    }}>
      {s.icon} {s.label}
    </span>
  );
}

/* ── 가로 퍼센트 바 ─────────────────────────────────────── */
function PercentBar({ label, percent, color }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: 'var(--color-text-sub)' }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{percent}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: '#f3f4f6', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 4, width: `${percent}%`, background: color, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

/* ── 트렌드 스파크라인 (SVG) ────────────────────────────── */
function Sparkline({ data, color = '#03c75a' }) {
  if (!data?.length) return <span style={{ fontSize: 11, color: '#9ca3af' }}>-</span>;
  const W = 100, H = 30, PAD = 2;
  const vals = data.map(d => d.ratio ?? 0);
  const max  = Math.max(...vals, 1);
  const points = vals.map((v, i) => {
    const x = PAD + (i / Math.max(vals.length - 1, 1)) * (W - PAD * 2);
    const y = PAD + (1 - v / max) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5}
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ── 키워드 상세 패널 ────────────────────────────────────── */
function DetailPanel({ keyword }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [tab, setTab]         = useState('related');

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setData(null); setError('');
    fetch('/api/keyword-detail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword }),
    })
      .then(r => r.json().then(j => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (cancelled) return;
        if (!ok) throw new Error(j.error);
        setData(j);
      })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [keyword]);

  return (
    <div style={{ padding: '20px 24px', background: 'var(--color-bg-sub, #fafafa)', borderTop: '1px solid var(--color-border)' }}>
      {/* 탭 + 트렌드 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[['related','🔗 연관 키워드'], ['demo','👥 성별·연령']].map(([k, l]) => (
          <button key={k}
            className={`btn ${tab === k ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '5px 14px', fontSize: 12 }}
            onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
        {data?.trendData?.length > 0 && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--color-text-sub)' }}>12개월 트렌드</span>
            <Sparkline data={data.trendData} />
          </div>
        )}
      </div>

      {/* 로딩 */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '28px 0' }}>
          <span className="spinner" style={{ width: 22, height: 22 }} />
          <p style={{ marginTop: 10, color: 'var(--color-text-sub)', fontSize: 13 }}>
            상세 분석 중… (성별·연령 DataLab 조회 포함, 최대 6초)
          </p>
        </div>
      )}

      {/* 에러 */}
      {!loading && error && (
        <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>
          ❌ {error}
        </div>
      )}

      {/* 데이터 */}
      {!loading && data && (
        <>
          {/* ── 연관 키워드 탭 ── */}
          {tab === 'related' && (
            <div>
              {!data.hasAdApi && (
                <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12, color: '#92400e', marginBottom: 14 }}>
                  ⚠️ <strong>검색광고 API 3종 미설정</strong> — NAVER_AD_CUSTOMER_ID · NAVER_AD_ACCESS_LICENSE · NAVER_AD_SECRET_KEY 를 Railway에 설정해야 연관 키워드가 표시됩니다.
                </div>
              )}
              {data.relatedKeywords?.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th style={{ minWidth: 120 }}>연관 키워드</th>
                        <th>등급</th>
                        <th className="r">PC 검색</th>
                        <th className="r">모바일</th>
                        <th className="r">합계</th>
                        <th>경쟁강도</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.relatedKeywords.map((r, idx) => (
                        <tr key={r.keyword}>
                          <td style={{ color: 'var(--color-text-sub)', fontSize: 12 }}>{idx + 1}</td>
                          <td style={{ fontWeight: 600 }}>{r.keyword}</td>
                          <td><GradeBadge grade={calcGradeFromTotal(r.total)} /></td>
                          <td className="r">{fmtNum(r.pcSearch)}</td>
                          <td className="r">{fmtNum(r.mobileSearch)}</td>
                          <td className="r" style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                            {fmtNum(r.total)}
                          </td>
                          <td>
                            {r.compRaw ? (
                              <span style={{
                                display: 'inline-flex', padding: '2px 9px', borderRadius: 20,
                                fontSize: 11, fontWeight: 700,
                                background: COMP_BG[r.compRaw] ?? '#f3f4f6',
                                color: COMP_COLOR[r.compRaw] ?? '#6b7280',
                              }}>
                                {COMP[r.compRaw] ?? r.compRaw}
                              </span>
                            ) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-sub)', fontSize: 13 }}>
                  연관 키워드 없음 (검색광고 API 키 설정 필요)
                </div>
              )}
            </div>
          )}

          {/* ── 성별·연령 탭 ── */}
          {tab === 'demo' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 28 }}>

              {/* 성별 비율 */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-sub)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                  👥 성별 비율
                </div>
                {data.gender ? (
                  <>
                    <div style={{ borderRadius: 8, overflow: 'hidden', height: 26, display: 'flex', marginBottom: 12 }}>
                      <div style={{ width: `${data.gender.male}%`, background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', transition: 'width 0.5s' }}>
                        {data.gender.male >= 12 && `${data.gender.male}%`}
                      </div>
                      <div style={{ width: `${data.gender.female}%`, background: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', transition: 'width 0.5s' }}>
                        {data.gender.female >= 12 && `${data.gender.female}%`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
                      <div><span style={{ color: '#3b82f6', fontWeight: 700 }}>남성</span> {data.gender.male}%</div>
                      <div><span style={{ color: '#ec4899', fontWeight: 700 }}>여성</span> {data.gender.female}%</div>
                    </div>
                  </>
                ) : (
                  <div style={{ color: 'var(--color-text-sub)', fontSize: 13 }}>데이터 없음 (트렌드 API 오류 또는 검색량 부족)</div>
                )}
              </div>

              {/* 연령대 분포 */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-sub)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                  📊 연령대 분포
                </div>
                {data.ageGroups ? (
                  data.ageGroups.map((ag, i) => (
                    <PercentBar key={ag.label} label={ag.label} percent={ag.percent} color={AGE_COLORS[i]} />
                  ))
                ) : (
                  <div style={{ color: 'var(--color-text-sub)', fontSize: 13 }}>데이터 없음</div>
                )}
              </div>

            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── 메인 페이지 ─────────────────────────────────────────── */
export default function KeywordAnalysisPage() {
  const [input, setInput]           = useState('');
  const [results, setResults]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [hasAdApi, setHasAdApi]     = useState(true);
  const [expandedKw, setExpandedKw] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const keywords = input.split('\n').map(k => k.trim()).filter(Boolean);
    if (!keywords.length) { setError('키워드를 입력해주세요.'); return; }
    if (keywords.length > 30) { setError('최대 30개까지 가능합니다.'); return; }
    setLoading(true); setError(''); setResults([]); setExpandedKw(null);
    try {
      const res  = await fetch('/api/keyword-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data.results || []);
      setHasAdApi(data.hasAdApi !== false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadCsv = () => {
    if (!results.length) return;
    const header = ['키워드','등급','PC 검색량','모바일 검색량','합계','경쟁강도','포화도','블로그월발행','블로그누적','카페월발행','카페누적'];
    const rows = results.map(r => [
      r.keyword,
      r.grade ? (GRADES[r.grade]?.label ?? r.grade) : '-',
      r.pcSearch ?? '-', r.mobileSearch ?? '-', r.totalSearch ?? '-',
      r.competition ? (COMP[r.competition] ?? r.competition) : '-',
      r.saturation ? (SATURATIONS[r.saturation]?.label ?? r.saturation) : '-',
      r.blogMonthly, r.blogTotal, r.cafeMonthly, r.cafeTotal,
    ]);
    const csv = [header, ...rows]
      .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'keyword-analysis.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const toggleRow = (kw) => setExpandedKw(prev => prev === kw ? null : kw);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">키워드 분석</h1>
        <p className="page-desc">검색량 · 등급 · 포화도 · 발행량 · 연관키워드 · 성별/연령 분포</p>
      </div>

      {/* 입력 카드 */}
      <div className="card" style={{ marginBottom: 20 }}>
        <form onSubmit={handleSubmit}>
          <label className="kw-label">
            키워드 목록
            <span className="kw-label-hint">한 줄에 하나 · 최대 30개</span>
          </label>
          <textarea
            className="kw-textarea"
            rows={5}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={'pc방창업\n만화카페창업\n코인노래방창업'}
          />
          {error && <div className="field-error">{error}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" /> 조회 중…</> : '🔍 검색량 분석'}
            </button>
            {results.length > 0 && (
              <button type="button" className="btn btn-secondary" onClick={downloadCsv}>
                📥 CSV 다운로드
              </button>
            )}
          </div>
        </form>
      </div>

      {/* 검색광고 API 경고 */}
      {!hasAdApi && results.length > 0 && (
        <div className="notice-warn">
          ⚠️ <strong>검색광고 API 미설정</strong> — PC/모바일 검색량 · 경쟁강도 · 연관키워드를 보려면
          Railway 환경변수에 <strong>NAVER_AD_CUSTOMER_ID</strong> · NAVER_AD_ACCESS_LICENSE · NAVER_AD_SECRET_KEY 3개를 모두 설정하세요.
        </div>
      )}

      {/* 등급 범례 */}
      {results.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
          {Object.entries(GRADES).map(([k, g]) => (
            <span key={k} style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600,
              background: g.bg, color: g.color, border: `1px solid ${g.color}30`,
            }}>
              {g.icon} {g.label}
            </span>
          ))}
          <span style={{ fontSize: 11, color: 'var(--color-text-sub)', marginLeft: 4 }}>← 총 월간 검색량 기준</span>
        </div>
      )}

      {/* 결과 테이블 */}
      {results.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* 테이블 헤더 */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="section-label">분석 결과</span>
            <span style={{ fontSize: 12, color: 'var(--color-text-sub)' }}>
              {results.length}개 키워드 · 행 클릭 → 연관키워드/성별연령 상세보기
            </span>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 120 }}>키워드</th>
                  <th>등급</th>
                  <th className="r">PC</th>
                  <th className="r">모바일</th>
                  <th className="r">합계</th>
                  <th>경쟁강도</th>
                  <th>포화도</th>
                  <th className="r">블로그월</th>
                  <th className="r">블로그누적</th>
                  <th className="r">카페월</th>
                  <th className="r">카페누적</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {results.flatMap(r => {
                  const isOpen = expandedKw === r.keyword;
                  const rows = [
                    <tr
                      key={r.keyword}
                      style={{ cursor: 'pointer', background: isOpen ? 'rgba(3,199,90,0.04)' : undefined }}
                      onClick={() => toggleRow(r.keyword)}
                    >
                      <td style={{ fontWeight: 700 }}>{r.keyword}</td>
                      <td><GradeBadge grade={r.grade} /></td>
                      <td className="r">{fmtNum(r.pcSearch)}</td>
                      <td className="r">{fmtNum(r.mobileSearch)}</td>
                      <td className="r" style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                        {fmtNum(r.totalSearch)}
                      </td>
                      <td>
                        {r.competition ? (
                          <span style={{
                            display: 'inline-flex', padding: '2px 9px', borderRadius: 20,
                            fontSize: 11, fontWeight: 700,
                            background: COMP_BG[r.competition] ?? '#f3f4f6',
                            color: COMP_COLOR[r.competition] ?? '#6b7280',
                          }}>
                            {COMP[r.competition] ?? r.competition}
                          </span>
                        ) : '-'}
                      </td>
                      <td><SatBadge saturation={r.saturation} /></td>
                      <td className="r">{r.blogMonthly.toLocaleString()}+</td>
                      <td className="r">{r.blogTotal.toLocaleString()}</td>
                      <td className="r">{r.cafeMonthly.toLocaleString()}+</td>
                      <td className="r">{r.cafeTotal.toLocaleString()}</td>
                      <td style={{ textAlign: 'center', fontSize: 11, color: isOpen ? 'var(--color-primary)' : 'var(--color-text-sub)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {isOpen ? '▲ 닫기' : '▼ 상세'}
                      </td>
                    </tr>,
                  ];
                  if (isOpen) {
                    rows.push(
                      <tr key={`${r.keyword}__detail`}>
                        <td colSpan={12} style={{ padding: 0 }}>
                          <DetailPanel keyword={r.keyword} />
                        </td>
                      </tr>
                    );
                  }
                  return rows;
                })}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '10px 20px', borderTop: '1px solid var(--color-border)' }}>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>
              * 블로그/카페 월발행: 최근 100건 pubDate 기준 추정 · 누적: 네이버 검색 총 결과수
              · 포화도: 월발행 1,000건/총검색량 비율 (낮을수록 블루오션)
              · 성별/연령: DataLab 상대적 관심도 기반 추정치
            </p>
          </div>
        </div>
      )}

      <style>{`
        .kw-label {
          display: block; font-size: 12px; font-weight: 700;
          color: var(--color-text-sub); text-transform: uppercase;
          letter-spacing: 0.04em; margin-bottom: 8px;
        }
        .kw-label-hint {
          font-size: 11px; font-weight: 400; text-transform: none;
          letter-spacing: 0; margin-left: 8px; color: var(--color-text-muted);
        }
        .kw-textarea {
          width: 100%; padding: 10px 12px;
          border: 1px solid var(--color-border); border-radius: var(--radius-sm);
          font-size: 14px; font-family: var(--font-base);
          resize: vertical; background: var(--color-bg); color: var(--color-text);
        }
        .kw-textarea:focus {
          border-color: var(--color-primary); outline: none;
          box-shadow: 0 0 0 3px rgba(3,199,90,0.12);
        }
        .field-error {
          margin-top: 8px; padding: 8px 12px;
          background: #fef2f2; border: 1px solid #fca5a5;
          border-radius: var(--radius-sm); color: var(--color-danger); font-size: 13px;
        }
        .notice-warn {
          background: #fffbeb; border: 1px solid #fde68a;
          border-radius: var(--radius-sm); padding: 10px 14px;
          font-size: 12px; color: #92400e; margin-bottom: 16px; line-height: 1.6;
        }
        .data-table tbody tr:hover td { background: rgba(0,0,0,0.015); }
      `}</style>
    </div>
  );
}
