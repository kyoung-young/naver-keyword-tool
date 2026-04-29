'use client';

import { useState, useEffect } from 'react';

/* ══════════════════════════════════════════════
   상수 / 헬퍼
══════════════════════════════════════════════ */
const GRADES = {
  diamond:  { label: '다이아',   icon: '💎', color: '#0369a1', bg: '#e0f2fe', range: '3만+' },
  platinum: { label: '플래티넘', icon: '🔮', color: '#7c3aed', bg: '#f3e8ff', range: '1만~3만' },
  gold:     { label: '골드',     icon: '🥇', color: '#b45309', bg: '#fef3c7', range: '3천~1만' },
  silver:   { label: '실버',     icon: '🥈', color: '#475569', bg: '#f1f5f9', range: '1천~3천' },
  bronze:   { label: '브론즈',   icon: '🥉', color: '#9a3412', bg: '#ffedd5', range: '300~1천' },
  seed:     { label: '씨앗',     icon: '🌱', color: '#166534', bg: '#dcfce7', range: '~300' },
};
const COMP_LABEL = { low: '낮음', mid: '중간', high: '높음' };
const COMP_COLOR = { low: '#16a34a', mid: '#d97706', high: '#dc2626' };
const COMP_BG    = { low: '#dcfce7', mid: '#fef9c3', high: '#fee2e2' };
const AGE_COLORS = ['#6366f1','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6'];

function fmtN(n) {
  if (n === null || n === undefined) return '-';
  if (n < 10) return '<10';
  return Number(n).toLocaleString();
}
function fmtPct(p) {
  if (p === null || p === undefined) return '-';
  return `${p}%`;
}

/* ── 등급 뱃지 ── */
function GradeBadge({ grade, size = 'md' }) {
  if (!grade) return <span style={{ color: '#9ca3af', fontSize: 12 }}>-</span>;
  const g = GRADES[grade];
  const fs = size === 'lg' ? 13 : 11;
  const px = size === 'lg' ? '4px 14px' : '2px 10px';
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:px, borderRadius:20, fontSize:fs, fontWeight:700, background:g.bg, color:g.color }}>
      {g.icon} {g.label}
    </span>
  );
}

/* ── 포화도 색상 ── */
function satColor(pct) {
  if (pct === null) return '#9ca3af';
  if (pct < 10)  return '#2563eb';
  if (pct < 30)  return '#16a34a';
  if (pct < 50)  return '#d97706';
  if (pct < 80)  return '#ea580c';
  return '#dc2626';
}
function satLabel(pct) {
  if (pct === null) return '-';
  if (pct < 10)  return '매우 낮음';
  if (pct < 30)  return '낮음';
  if (pct < 50)  return '높음';
  if (pct < 80)  return '매우 높음';
  return '포화';
}

/* ── 스파크라인 SVG ── */
function Sparkline({ data, color = '#03c75a', w = 120, h = 36 }) {
  if (!data?.length) return null;
  const vals  = data.map(d => d.ratio ?? 0);
  const max   = Math.max(...vals, 1);
  const PAD   = 3;
  const pts   = vals.map((v, i) => {
    const x = PAD + (i / Math.max(vals.length - 1, 1)) * (w - PAD * 2);
    const y = PAD + (1 - v / max) * (h - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2"
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ══════════════════════════════════════════════
   상세 패널 (연관키워드 / 트렌드 / 성향분석)
══════════════════════════════════════════════ */
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
      .then(({ ok, j }) => { if (!cancelled) { if (!ok) throw new Error(j.error); setData(j); } })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [keyword]);

  const TABS = [
    { key: 'related', label: '🔗 연관 키워드' },
    { key: 'trend',   label: '📈 트렌드' },
    { key: 'click',   label: '🖱 클릭 분석' },
  ];

  return (
    <div style={{ borderTop: '2px solid var(--color-primary)', background: '#fafafa' }}>
      {/* 탭 */}
      <div style={{ display:'flex', gap:0, borderBottom:'1px solid var(--color-border)', background:'#fff' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding:'10px 20px', fontSize:13, fontWeight: tab===t.key ? 700 : 500,
              color: tab===t.key ? 'var(--color-primary)' : 'var(--color-text-sub)',
              background:'transparent', border:'none', borderBottom: tab===t.key ? '2px solid var(--color-primary)' : '2px solid transparent',
              cursor:'pointer', marginBottom:-1,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding:'24px' }}>
        {loading && (
          <div style={{ textAlign:'center', padding:'32px 0' }}>
            <span className="spinner" style={{ width:24, height:24 }} />
            <p style={{ marginTop:10, color:'var(--color-text-sub)', fontSize:13 }}>상세 분석 중… (성별·연령 포함 최대 7초)</p>
          </div>
        )}
        {!loading && error && (
          <div style={{ padding:'12px 16px', background:'#fef2f2', borderRadius:8, color:'#dc2626', fontSize:13 }}>❌ {error}</div>
        )}

        {!loading && data && (
          <>
            {/* ── 연관 키워드 ── */}
            {tab === 'related' && (
              <div>
                {!data.hasAdApi && (
                  <div style={{ marginBottom:14, padding:'10px 14px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, fontSize:12, color:'#92400e' }}>
                    ⚠️ 검색광고 API 3종(CUSTOMER_ID 포함) 미설정 → Railway 환경변수에 추가하면 연관 키워드가 표시됩니다.
                  </div>
                )}
                {data.relatedKeywords?.length > 0 ? (
                  <div style={{ overflowX:'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width:32 }}>#</th>
                          <th style={{ minWidth:130 }}>연관 키워드</th>
                          <th>등급</th>
                          <th className="r">PC</th>
                          <th className="r">모바일</th>
                          <th className="r">합계</th>
                          <th>경쟁강도</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.relatedKeywords.map((r, idx) => (
                          <tr key={r.keyword}>
                            <td style={{ color:'#9ca3af', fontSize:11 }}>{idx+1}</td>
                            <td style={{ fontWeight:600 }}>{r.keyword}</td>
                            <td><GradeBadge grade={gradeFrom(r.total)} /></td>
                            <td className="r">{fmtN(r.pcSearch)}</td>
                            <td className="r">{fmtN(r.mobileSearch)}</td>
                            <td className="r" style={{ fontWeight:700, color:'var(--color-primary)' }}>{fmtN(r.total)}</td>
                            <td>
                              {r.compRaw ? (
                                <span style={{ display:'inline-flex', padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:700, background:COMP_BG[r.compRaw]??'#f3f4f6', color:COMP_COLOR[r.compRaw]??'#6b7280' }}>
                                  {COMP_LABEL[r.compRaw]??r.compRaw}
                                </span>
                              ) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ textAlign:'center', color:'var(--color-text-sub)', fontSize:13, padding:'24px 0' }}>연관 키워드 없음 (검색광고 API 필요)</p>
                )}
              </div>
            )}

            {/* ── 트렌드 ── */}
            {tab === 'trend' && (
              <div>
                {data.trendData?.length > 0 ? (
                  <div>
                    <p style={{ fontSize:12, color:'var(--color-text-sub)', marginBottom:16 }}>최근 12개월 검색 트렌드 (DataLab 상대 지수 기준)</p>
                    <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:120, borderBottom:'1px solid var(--color-border)', paddingBottom:4 }}>
                      {data.trendData.map((d, i) => {
                        const max = Math.max(...data.trendData.map(x => x.ratio), 1);
                        const pct = (d.ratio / max) * 100;
                        return (
                          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                            <div style={{ width:'100%', background:'var(--color-primary)', borderRadius:'3px 3px 0 0', height:`${pct}%`, minHeight:2, opacity:0.8 }} />
                            <span style={{ fontSize:9, color:'#9ca3af', transform:'rotate(-45deg)', whiteSpace:'nowrap', transformOrigin:'top left' }}>
                              {d.period?.slice(2,7)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p style={{ textAlign:'center', color:'var(--color-text-sub)', fontSize:13, padding:'24px 0' }}>
                    트렌드 데이터 없음<br/>
                    <span style={{ fontSize:11, color:'var(--color-text-muted)' }}>(검색량이 낮은 키워드는 DataLab에 데이터가 없을 수 있습니다)</span>
                  </p>
                )}
              </div>
            )}

            {/* ── 클릭 분석 ── */}
            {tab === 'click' && (
              <div>
                <p style={{ fontSize:12, color:'var(--color-text-sub)', marginBottom:20 }}>
                  네이버 검색광고 기준 클릭 성과 데이터 (광고 노출 키워드 기준)
                </p>
                {data.mainStats ? (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px,1fr))', gap:16 }}>
                    <ClickStat label="PC 클릭률 (CTR)"
                      value={data.mainStats.pcCtr != null ? `${data.mainStats.pcCtr}%` : '-'}
                      sub="PC 노출 대비 클릭률" color="#3b82f6" />
                    <ClickStat label="모바일 클릭률"
                      value={data.mainStats.mobileCtr != null ? `${data.mainStats.mobileCtr}%` : '-'}
                      sub="모바일 노출 대비 클릭률" color="#10b981" />
                    <ClickStat label="PC 월평균 클릭수"
                      value={data.mainStats.pcClkCnt != null ? fmtN(Math.round(data.mainStats.pcClkCnt)) : '-'}
                      sub="광고 월평균 클릭 횟수" color="#6366f1" />
                    <ClickStat label="모바일 월평균 클릭수"
                      value={data.mainStats.mobileClkCnt != null ? fmtN(Math.round(data.mainStats.mobileClkCnt)) : '-'}
                      sub="광고 월평균 클릭 횟수" color="#f59e0b" />
                    <ClickStat label="평균 노출순위"
                      value={data.mainStats.avgDepth != null ? `${data.mainStats.avgDepth}위` : '-'}
                      sub="파워링크 평균 노출 위치" color="#ef4444" />
                  </div>
                ) : (
                  <p style={{ textAlign:'center', color:'var(--color-text-sub)', fontSize:13, padding:'24px 0' }}>
                    {data.hasAdApi ? '클릭 데이터 없음' : '검색광고 API 필요 (NAVER_AD_* 3종)'}
                  </p>
                )}
                <p style={{ marginTop:20, fontSize:11, color:'var(--color-text-muted)', padding:'10px 14px', background:'#f8fafc', borderRadius:6 }}>
                  ℹ️ 성별·연령 통계는 네이버 내부 광고 시스템 전용으로 외부 공개 API를 통해 제공되지 않습니다.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function gradeFrom(total) {
  if (!total) return null;
  if (total >= 30000) return 'diamond';
  if (total >= 10000) return 'platinum';
  if (total >= 3000)  return 'gold';
  if (total >= 1000)  return 'silver';
  if (total >= 300)   return 'bronze';
  return 'seed';
}

/* ══════════════════════════════════════════════
   키워드 결과 카드 (블랙키위 스타일)
══════════════════════════════════════════════ */
function KeywordCard({ r, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  const hasSearch = r.totalSearch !== null;

  return (
    <div className="card" style={{ padding:0, overflow:'hidden', marginBottom:20 }}>
      {/* ── 헤더 ── */}
      <div style={{ padding:'16px 22px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'#fff', borderBottom:'1px solid var(--color-border)', flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontWeight:800, fontSize:18, color:'var(--color-text)' }}>{r.keyword}</span>
          <GradeBadge grade={r.grade} size="lg" />
          {r.competition && (
            <span style={{ display:'inline-flex', padding:'3px 11px', borderRadius:20, fontSize:11, fontWeight:700, background:COMP_BG[r.competition]??'#f3f4f6', color:COMP_COLOR[r.competition]??'#6b7280' }}>
              경쟁 {COMP_LABEL[r.competition]??r.competition}
            </span>
          )}
        </div>
        <button
          className={`btn ${open ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize:12, padding:'5px 14px' }}
          onClick={() => setOpen(v => !v)}>
          {open ? '▲ 닫기' : '▼ 연관 키워드 · 성향 분석'}
        </button>
      </div>

      {/* ── 메트릭 카드 2×2 ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px,1fr))', gap:0 }}>

        {/* 월간 검색량 */}
        <div style={{ padding:'22px 24px', borderRight:'1px solid var(--color-border)', borderBottom:'1px solid var(--color-border)' }}>
          <p style={{ fontSize:11, fontWeight:700, color:'var(--color-text-sub)', textTransform:'uppercase', letterSpacing:1, marginBottom:18 }}>📊 월간 검색량</p>
          <div style={{ display:'flex', gap:28 }}>
            <MetricItem icon="🖥" label="PC"    value={fmtN(r.pcSearch)}     highlight={hasSearch} />
            <MetricItem icon="📱" label="Mobile" value={fmtN(r.mobileSearch)} highlight={hasSearch} />
            <MetricItem icon="➕" label="Total"  value={fmtN(r.totalSearch)}  highlight={hasSearch} big />
          </div>
          {!hasSearch && (
            <p style={{ marginTop:10, fontSize:11, color:'#f59e0b' }}>
              ⚠️ 검색광고 API 키 설정 필요 (Railway → NAVER_AD_CUSTOMER_ID 등 3종)
            </p>
          )}
        </div>

        {/* 콘텐츠 발행량 */}
        <div style={{ padding:'22px 24px', borderBottom:'1px solid var(--color-border)' }}>
          <p style={{ fontSize:11, fontWeight:700, color:'var(--color-text-sub)', textTransform:'uppercase', letterSpacing:1, marginBottom:18 }}>📄 콘텐츠 발행량 (누적)</p>
          <div style={{ display:'flex', gap:28 }}>
            <MetricItem icon="📝" label="블로그" value={fmtN(r.blogTotal)}    highlight />
            <MetricItem icon="☕" label="카페"   value={fmtN(r.cafeTotal)}    highlight />
            <MetricItem icon="📋" label="전체"   value={fmtN(r.totalContent)} highlight big />
          </div>
        </div>

        {/* 월간 발행량 */}
        <div style={{ padding:'22px 24px', borderRight:'1px solid var(--color-border)' }}>
          <p style={{ fontSize:11, fontWeight:700, color:'var(--color-text-sub)', textTransform:'uppercase', letterSpacing:1, marginBottom:18 }}>📅 월간 발행량 (추정)</p>
          <div style={{ display:'flex', gap:28 }}>
            <MetricItem icon="📝" label="블로그" value={`${fmtN(r.blogMonthly)}+`} highlight />
            <MetricItem icon="☕" label="카페"   value={`${fmtN(r.cafeMonthly)}+`} highlight />
          </div>
          <p style={{ marginTop:10, fontSize:10, color:'var(--color-text-muted)' }}>* 최근 100건 날짜 범위 기반 추정치</p>
        </div>

        {/* 콘텐츠 포화도 지수 */}
        <div style={{ padding:'22px 24px' }}>
          <p style={{ fontSize:11, fontWeight:700, color:'var(--color-text-sub)', textTransform:'uppercase', letterSpacing:1, marginBottom:18 }}>🎯 콘텐츠 포화도 지수</p>
          {hasSearch ? (
            <div style={{ display:'flex', gap:24 }}>
              <SatItem label="블로그" pct={r.blogSatPct} />
              <SatItem label="카페"   pct={r.cafeSatPct} />
              <SatItem label="전체"   pct={r.totalSatPct} big />
            </div>
          ) : (
            <p style={{ fontSize:12, color:'#9ca3af' }}>검색량 데이터 필요</p>
          )}
          <p style={{ marginTop:10, fontSize:10, color:'var(--color-text-muted)' }}>* 포화도 = (월발행÷월검색) × 100</p>
        </div>

      </div>

      {/* ── 상세 패널 ── */}
      {open && <DetailPanel keyword={r.keyword} />}
    </div>
  );
}

/* ── 개별 숫자 메트릭 ── */
function MetricItem({ icon, label, value, highlight, big }) {
  return (
    <div style={{ textAlign:'center' }}>
      <div style={{ fontSize:big ? 22 : 18, fontWeight:800, color: highlight ? 'var(--color-text)' : '#9ca3af', letterSpacing:-0.5 }}>
        {value}
      </div>
      <div style={{ fontSize:11, color:'var(--color-text-sub)', marginTop:4 }}>{icon} {label}</div>
    </div>
  );
}

/* ── 클릭 통계 카드 ── */
function ClickStat({ label, value, sub, color }) {
  return (
    <div style={{ textAlign:'center', padding:'18px 12px', background:'#f8fafc', borderRadius:10, border:'1px solid #e5e7eb' }}>
      <div style={{ fontSize:22, fontWeight:800, color: value === '-' ? '#9ca3af' : color, letterSpacing:-0.5 }}>
        {value}
      </div>
      <div style={{ fontSize:12, fontWeight:700, color:'var(--color-text)', marginTop:6 }}>{label}</div>
      <div style={{ fontSize:10, color:'var(--color-text-muted)', marginTop:3 }}>{sub}</div>
    </div>
  );
}

/* ── 포화도 지수 아이템 ── */
function SatItem({ label, pct, big }) {
  const color = satColor(pct);
  const lbl   = satLabel(pct);
  return (
    <div style={{ textAlign:'center' }}>
      <div style={{ fontSize: big ? 22 : 18, fontWeight:800, color, letterSpacing:-0.5 }}>
        {fmtPct(pct)}
      </div>
      <div style={{ fontSize:10, fontWeight:700, color, marginTop:2 }}>{lbl}</div>
      <div style={{ fontSize:11, color:'var(--color-text-sub)', marginTop:2 }}>{label}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   메인 페이지
══════════════════════════════════════════════ */
export default function KeywordAnalysisPage() {
  const [input, setInput]       = useState('');
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [hasAdApi, setHasAdApi] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const keywords = input.split('\n').map(k => k.trim()).filter(Boolean);
    if (!keywords.length) { setError('키워드를 입력해주세요.'); return; }
    if (keywords.length > 30) { setError('최대 30개까지 가능합니다.'); return; }
    setLoading(true); setError(''); setResults([]);
    try {
      const res  = await fetch('/api/keyword-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data.results ?? []);
      setHasAdApi(data.hasAdApi !== false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadCsv = () => {
    if (!results.length) return;
    const header = ['키워드','등급','PC검색','모바일검색','합계','경쟁강도','블로그누적','카페누적','전체누적','블로그월발행','카페월발행','블로그포화도%','카페포화도%','전체포화도%'];
    const rows = results.map(r => [
      r.keyword,
      r.grade ? GRADES[r.grade]?.label : '-',
      r.pcSearch??'-', r.mobileSearch??'-', r.totalSearch??'-',
      r.competition ? COMP_LABEL[r.competition] : '-',
      r.blogTotal, r.cafeTotal, r.totalContent,
      r.blogMonthly, r.cafeMonthly,
      r.blogSatPct??'-', r.cafeSatPct??'-', r.totalSatPct??'-',
    ]);
    const csv = [header,...rows].map(row=>row.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8;'});
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'),{href:url,download:'keyword-analysis.csv'});
    a.click(); URL.revokeObjectURL(url);
  };

  /* ── 여러 키워드일 때 요약 테이블 (상단) ── */
  const showSummary = results.length > 1;

  return (
    <div>
      {/* 입력 카드 */}
      <div className="card" style={{ marginBottom:20 }}>
        <form onSubmit={handleSubmit}>
          <label style={{ display:'block', fontSize:12, fontWeight:700, color:'var(--color-text-sub)', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:8 }}>
            키워드 목록 <span style={{ fontSize:11, fontWeight:400, textTransform:'none', letterSpacing:0, marginLeft:6, color:'var(--color-text-muted)' }}>한 줄에 하나 · 최대 30개</span>
          </label>
          <textarea
            rows={4}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={'PC방창업\n만화카페창업\n코인노래방창업'}
            style={{ width:'100%', padding:'10px 12px', border:'1px solid var(--color-border)', borderRadius:'var(--radius-sm)', fontSize:14, fontFamily:'var(--font-base)', resize:'vertical', background:'var(--color-bg)', color:'var(--color-text)' }}
          />
          {error && <div style={{ marginTop:8, padding:'8px 12px', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:'var(--radius-sm)', color:'#dc2626', fontSize:13 }}>{error}</div>}
          <div style={{ display:'flex', gap:8, marginTop:14 }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" /> 조회 중…</> : '🔍 검색량 분석'}
            </button>
            {results.length > 0 && (
              <button type="button" className="btn btn-secondary" onClick={downloadCsv}>📥 CSV</button>
            )}
          </div>
        </form>
      </div>

      {/* API 경고 */}
      {!hasAdApi && results.length > 0 && (
        <div style={{ padding:'10px 16px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, fontSize:12, color:'#92400e', marginBottom:16, lineHeight:1.7 }}>
          ⚠️ <strong>검색광고 API 미설정</strong> — Railway 환경변수에 <strong>NAVER_AD_CUSTOMER_ID · NAVER_AD_ACCESS_LICENSE · NAVER_AD_SECRET_KEY</strong> 3개를 모두 등록해야 검색량이 표시됩니다.
        </div>
      )}

      {/* 등급 범례 */}
      {results.length > 0 && (
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16, alignItems:'center' }}>
          {Object.entries(GRADES).map(([k,g]) => (
            <span key={k} style={{ display:'inline-flex', alignItems:'center', gap:3, padding:'2px 9px', borderRadius:20, fontSize:11, fontWeight:600, background:g.bg, color:g.color, border:`1px solid ${g.color}30` }}>
              {g.icon} {g.label} <span style={{ opacity:.6 }}>{g.range}</span>
            </span>
          ))}
        </div>
      )}

      {/* 여러 키워드: 상단 요약 테이블 */}
      {showSummary && (
        <div className="card" style={{ marginBottom:24, padding:0, overflow:'hidden' }}>
          <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--color-border)', fontSize:12, fontWeight:700, color:'var(--color-text-sub)', textTransform:'uppercase', letterSpacing:1 }}>
            요약 비교 ({results.length}개)
          </div>
          <div style={{ overflowX:'auto' }}>
            <table className="data-table" style={{ fontSize:12 }}>
              <thead>
                <tr>
                  <th style={{ minWidth:110 }}>키워드</th>
                  <th>등급</th>
                  <th className="r">PC</th>
                  <th className="r">모바일</th>
                  <th className="r">합계</th>
                  <th>경쟁</th>
                  <th className="r">블로그누적</th>
                  <th className="r">카페누적</th>
                  <th className="r">블로그포화도</th>
                  <th className="r">카페포화도</th>
                  <th className="r">전체포화도</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.keyword}>
                    <td style={{ fontWeight:700 }}>{r.keyword}</td>
                    <td><GradeBadge grade={r.grade} /></td>
                    <td className="r">{fmtN(r.pcSearch)}</td>
                    <td className="r">{fmtN(r.mobileSearch)}</td>
                    <td className="r" style={{ fontWeight:700, color:'var(--color-primary)' }}>{fmtN(r.totalSearch)}</td>
                    <td>
                      {r.competition ? <span style={{ display:'inline-flex', padding:'2px 7px', borderRadius:20, fontSize:10, fontWeight:700, background:COMP_BG[r.competition]??'#f3f4f6', color:COMP_COLOR[r.competition]??'#6b7280' }}>{COMP_LABEL[r.competition]}</span> : '-'}
                    </td>
                    <td className="r">{fmtN(r.blogTotal)}</td>
                    <td className="r">{fmtN(r.cafeTotal)}</td>
                    <td className="r" style={{ color:satColor(r.blogSatPct), fontWeight:700 }}>{fmtPct(r.blogSatPct)}</td>
                    <td className="r" style={{ color:satColor(r.cafeSatPct), fontWeight:700 }}>{fmtPct(r.cafeSatPct)}</td>
                    <td className="r" style={{ color:satColor(r.totalSatPct), fontWeight:700 }}>{fmtPct(r.totalSatPct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 키워드별 상세 카드 */}
      {results.map((r, i) => (
        <KeywordCard key={r.keyword} r={r} defaultOpen={results.length === 1} />
      ))}
    </div>
  );
}
