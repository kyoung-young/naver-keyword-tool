'use client';

import { useState } from 'react';
import KeywordInput from '../../components/KeywordInput';

/* ── 채널 정의 ─────────────────────────────────────────── */
const PAID_CHANNELS = [
  { key: 'powerlink',    label: '파워링크',    icon: '📢', color: '#e84118', isPaid: true },
  { key: 'powerContent', label: '파워콘텐츠',  icon: '✍️', color: '#8e44ad', isPaid: true },
  { key: 'brandContent', label: '브랜드콘텐츠', icon: '🏷️', color: '#0070c9', isPaid: true },
];
const ORGANIC_CHANNELS = [
  { key: 'blog', label: '블로그',  icon: '📝', color: 'var(--color-blog)' },
  { key: 'cafe', label: '카페',    icon: '☕', color: 'var(--color-cafe)' },
  { key: 'news', label: '뉴스',    icon: '📰', color: 'var(--color-news)' },
  { key: 'web',  label: '웹사이트',icon: '🌐', color: 'var(--color-web)'  },
];

/* ── 순위 뱃지 ─────────────────────────────────────────── */
function RankBadge({ rank, size = 'md' }) {
  const fs = size === 'sm' ? 11 : 13;
  const px = size === 'sm' ? '3px 9px' : '4px 14px';

  if (!rank) return (
    <span style={{ display:'inline-flex', alignItems:'center', padding: px,
      borderRadius:20, fontSize:fs, fontWeight:600, background:'#f3f4f6', color:'#9ca3af' }}>
      미노출
    </span>
  );

  const s = rank <= 3  ? { bg:'#dcfce7', c:'#15803d' }
          : rank <= 7  ? { bg:'#fef9c3', c:'#a16207' }
          : rank <= 15 ? { bg:'#ffedd5', c:'#c2410c' }
          :               { bg:'#f3f4f6', c:'#6b7280' };

  return (
    <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
      padding: px, borderRadius:20, fontSize:fs, fontWeight:700,
      background: s.bg, color: s.c, minWidth: size==='sm'?40:52 }}>
      {rank}위
    </span>
  );
}

/* ── PC/Mobile 비교 셀 ─────────────────────────────────── */
function DeviceRankCell({ pcRank, mobileRank }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:4, alignItems:'flex-start' }}>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <span style={{ fontSize:11, color:'var(--color-text-sub)', width:52 }}>🖥 PC</span>
        <RankBadge rank={pcRank} size="sm" />
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <span style={{ fontSize:11, color:'var(--color-text-sub)', width:52 }}>📱 Mobile</span>
        <RankBadge rank={mobileRank} size="sm" />
      </div>
    </div>
  );
}

/* ── 메인 페이지 ────────────────────────────────────────── */
export default function RankPage() {
  const [keywords, setKeywords]   = useState([]);
  const [target, setTarget]       = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [results, setResults]     = useState(null);
  const [checkedAt, setCheckedAt] = useState('');
  const [device, setDevice]       = useState('all'); // 'all' | 'pc' | 'mobile'

  const handleCheck = async () => {
    if (!keywords.length) { setError('키워드를 입력하세요.'); return; }
    if (!target.trim())   { setError('조회 대상을 입력하세요.'); return; }
    setLoading(true); setError(''); setResults(null);

    try {
      const res = await fetch('/api/rank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords, target: target.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data.results);
      setCheckedAt(new Date().toLocaleString('ko-KR'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">노출 순위 확인</h1>
        <p className="page-desc">파워링크·파워콘텐츠·브랜드콘텐츠·블로그·카페·뉴스·웹사이트 노출 순위를 PC/모바일 구분해서 확인합니다.</p>
      </div>

      {/* 입력 패널 */}
      <div className="card" style={{ marginBottom:24, maxWidth:700 }}>
        <div style={{ marginBottom:16 }}>
          <label style={{ fontWeight:600, fontSize:13, display:'block', marginBottom:8 }}>
            검색 키워드 <span style={{ color:'var(--color-text-sub)', fontWeight:400 }}>(최대 5개)</span>
          </label>
          <KeywordInput keywords={keywords} onChange={setKeywords} max={5} />
        </div>

        <div style={{ marginBottom:20 }}>
          <label style={{ fontWeight:600, fontSize:13, display:'block', marginBottom:4 }}>
            조회 대상
            <span style={{ color:'var(--color-text-sub)', fontWeight:400, marginLeft:6 }}>
              (브랜드명·블로그명·도메인 등 — 쉼표로 여러 개 입력)
            </span>
          </label>
          <div style={{ fontSize:11, color:'var(--color-text-sub)', marginBottom:6 }}>
            예) 파워링크와 블로그명이 다른 경우: <strong>아이센스블랙라벨, 아이센스블랙라벨pc존</strong>
          </div>
          <input
            type="text"
            className="input-field"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
            placeholder="예: 아이센스블랙라벨, 아이센스블랙라벨pc존"
          />
        </div>

        {error && (
          <div style={{ padding:'10px 14px', background:'#fef2f2', border:'1px solid #fca5a5',
            borderRadius:8, color:'#dc2626', fontSize:13, marginBottom:14 }}>
            {error}
          </div>
        )}

        <button className="btn btn-primary" onClick={handleCheck} disabled={loading}
          style={{ minWidth:140, justifyContent:'center' }}>
          {loading
            ? <><span className="spinner" style={{ width:16, height:16 }} /> 조회 중...</>
            : '🔍 순위 조회'}
        </button>
      </div>

      {/* 결과 */}
      {results && (
        <div>
          {/* 헤더 + 기기 필터 */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
            marginBottom:16, flexWrap:'wrap', gap:12 }}>
            <h3 style={{ fontWeight:700, fontSize:15 }}>
              조회 결과
              <span style={{ fontWeight:400, fontSize:12, color:'var(--color-text-sub)', marginLeft:10 }}>
                대상:{' '}
                {target.split(',').map(t => t.trim()).filter(Boolean).map((t, i) => (
                  <strong key={i} style={{ color:'var(--color-text)',
                    background:'var(--color-bg)', borderRadius:4, padding:'1px 6px',
                    marginLeft:4, border:'1px solid var(--color-border)' }}>
                    {t}
                  </strong>
                ))}
              </span>
            </h3>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              {/* 기기 토글 */}
              {[['all','전체'],['pc','🖥 PC'],['mobile','📱 모바일']].map(([v,l]) => (
                <button key={v}
                  className={`btn ${device===v ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding:'5px 12px', fontSize:12 }}
                  onClick={() => setDevice(v)}>
                  {l}
                </button>
              ))}
              <span style={{ fontSize:11, color:'var(--color-text-sub)', marginLeft:4 }}>
                {checkedAt} 기준
              </span>
            </div>
          </div>

          {/* 범례 */}
          <div style={{ display:'flex', gap:14, marginBottom:20, flexWrap:'wrap' }}>
            {[['#dcfce7','#15803d','1~3위'],['#fef9c3','#a16207','4~7위'],
              ['#ffedd5','#c2410c','8~15위'],['#f3f4f6','#9ca3af','미노출']].map(([bg,c,l]) => (
              <div key={l} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12 }}>
                <span style={{ width:12, height:12, borderRadius:3, background:bg,
                  border:`1px solid ${c}`, display:'inline-block' }} />
                <span style={{ color:'var(--color-text-sub)' }}>{l}</span>
              </div>
            ))}
          </div>

          {keywords.map((kw) => {
            const r = results[kw];
            if (!r) return null;

            return (
              <div key={kw} className="card" style={{ marginBottom:24 }}>
                <h4 style={{ fontWeight:700, fontSize:16, marginBottom:20 }}>🔎 "{kw}"</h4>

                {/* ── 광고 섹션 (파워링크/파워콘텐츠) ── */}
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'var(--color-text-sub)',
                    marginBottom:10, textTransform:'uppercase', letterSpacing:1 }}>
                    광고 영역
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px,1fr))', gap:12 }}>
                    {PAID_CHANNELS.map((ch) => {
                      const d = r[ch.key];
                      const pcRank = d?.pc;
                      const mbRank = d?.mobile;
                      const hasAny = pcRank || mbRank;

                      // 기기 필터 적용
                      const showPc     = device === 'all' || device === 'pc';
                      const showMobile = device === 'all' || device === 'mobile';

                      return (
                        <div key={ch.key} style={{
                          border:`1px solid ${hasAny ? ch.color+'50' : 'var(--color-border)'}`,
                          borderRadius:10, padding:'14px 16px',
                          background: hasAny ? ch.color+'08' : '#fafafa',
                        }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:12 }}>
                            <span style={{ fontSize:16 }}>{ch.icon}</span>
                            <span style={{ fontWeight:700, fontSize:13, color:ch.color }}>{ch.label}</span>
                            <span style={{ fontSize:10, padding:'1px 6px', borderRadius:4,
                              background:'#fee2e2', color:'#dc2626', fontWeight:600 }}>광고</span>
                          </div>
                          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                            {showPc && (
                              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                <span style={{ fontSize:12, color:'var(--color-text-sub)',
                                  width:28, fontWeight:600 }}>🖥</span>
                                <RankBadge rank={pcRank} size="sm" />
                              </div>
                            )}
                            {showMobile && (
                              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                <span style={{ fontSize:12, color:'var(--color-text-sub)',
                                  width:28, fontWeight:600 }}>📱</span>
                                <RankBadge rank={mbRank} size="sm" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── 유기적 채널 (블로그/카페/뉴스/웹) ── */}
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:'var(--color-text-sub)',
                    marginBottom:10, textTransform:'uppercase', letterSpacing:1 }}>
                    유기적 검색 (기기 공통)
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))', gap:12, marginBottom:20 }}>
                    {ORGANIC_CHANNELS.map((ch) => {
                      const d = r[ch.key];
                      return (
                        <div key={ch.key} style={{
                          border:`1px solid ${d?.rank ? ch.color+'40' : 'var(--color-border)'}`,
                          borderRadius:10, padding:'14px 16px',
                          background: d?.rank ? ch.color+'08' : '#fafafa',
                        }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
                            <span style={{ fontSize:16 }}>{ch.icon}</span>
                            <span style={{ fontWeight:600, fontSize:13, color:ch.color }}>{ch.label}</span>
                          </div>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                            <RankBadge rank={d?.rank} />
                            {d?.total > 0 && (
                              <span style={{ fontSize:11, color:'var(--color-text-sub)' }}>
                                총 {d.total.toLocaleString()}건
                              </span>
                            )}
                          </div>
                          {ch.key === 'blog' && (
                            <div style={{ marginTop:4, fontSize:10, color:'var(--color-text-sub)' }}>
                              {d?.source === 'serp'
                                ? '🔎 통합검색 SERP 순위'
                                : '📊 검색API 순위 (참고용)'}
                            </div>
                          )}
                          {d?.rank && d?.item?.title && (
                            <div style={{ marginTop:8, fontSize:11, color:'var(--color-text-sub)',
                              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}
                              title={d.item.title}>
                              {d.item.title}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── 통합 상세 테이블 ── */}
                {(() => {
                  const found = [
                    ...PAID_CHANNELS.filter(ch => r[ch.key]?.pc || r[ch.key]?.mobile),
                    ...ORGANIC_CHANNELS.filter(ch => r[ch.key]?.rank),
                  ];
                  if (!found.length) return (
                    <div style={{ padding:'24px', textAlign:'center', background:'#fafafa',
                      borderRadius:8, color:'var(--color-text-sub)' }}>
                      ⚠️ 해당 대상이 검색 결과 상위권에 없습니다.
                    </div>
                  );
                  return (
                    <div style={{ overflowX:'auto' }}>
                      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                        <thead>
                          <tr>
                            {['채널','PC 순위','모바일 순위','제목 / 도메인','총 문서'].map(h => (
                              <th key={h} style={{ padding:'8px 12px', background:'var(--color-bg)',
                                textAlign:'left', borderBottom:'1px solid var(--color-border)',
                                color:'var(--color-text-sub)', fontWeight:600, whiteSpace:'nowrap' }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {/* 광고 채널 */}
                          {PAID_CHANNELS.filter(ch => r[ch.key]?.pc || r[ch.key]?.mobile).map(ch => (
                            <tr key={ch.key}>
                              <td style={{ padding:'10px 12px', borderBottom:'1px solid var(--color-border)' }}>
                                <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                                  {ch.icon} <span style={{ fontWeight:600, color:ch.color }}>{ch.label}</span>
                                  <span style={{ fontSize:10, padding:'1px 5px', borderRadius:3,
                                    background:'#fee2e2', color:'#dc2626' }}>광고</span>
                                </span>
                              </td>
                              <td style={{ padding:'10px 12px', borderBottom:'1px solid var(--color-border)' }}>
                                <RankBadge rank={r[ch.key].pc} size="sm" />
                              </td>
                              <td style={{ padding:'10px 12px', borderBottom:'1px solid var(--color-border)' }}>
                                <RankBadge rank={r[ch.key].mobile} size="sm" />
                              </td>
                              <td style={{ padding:'10px 12px', borderBottom:'1px solid var(--color-border)',
                                color:'var(--color-text-sub)', fontSize:12 }}>—</td>
                              <td style={{ padding:'10px 12px', borderBottom:'1px solid var(--color-border)' }}>—</td>
                            </tr>
                          ))}
                          {/* 유기적 채널 */}
                          {ORGANIC_CHANNELS.filter(ch => r[ch.key]?.rank).map(ch => (
                            <tr key={ch.key}>
                              <td style={{ padding:'10px 12px', borderBottom:'1px solid var(--color-border)' }}>
                                <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                                  {ch.icon} <span style={{ fontWeight:600, color:ch.color }}>{ch.label}</span>
                                </span>
                              </td>
                              <td colSpan={2} style={{ padding:'10px 12px', borderBottom:'1px solid var(--color-border)' }}>
                                <RankBadge rank={r[ch.key].rank} size="sm" />
                                <span style={{ fontSize:11, color:'var(--color-text-sub)', marginLeft:6 }}>
                                  {ch.key === 'blog'
                                    ? (r[ch.key].source === 'serp' ? '🔎 SERP 순위' : '📊 API 순위')
                                    : '(기기 공통)'}
                                </span>
                              </td>
                              <td style={{ padding:'10px 12px', borderBottom:'1px solid var(--color-border)', maxWidth:280 }}>
                                {r[ch.key].item?.link ? (
                                  <a href={r[ch.key].item.link} target="_blank" rel="noopener noreferrer"
                                    style={{ color:'var(--color-primary-dark)', fontWeight:500, textDecoration:'none',
                                      display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                                    {r[ch.key].item.title || r[ch.key].item.link}
                                  </a>
                                ) : '—'}
                              </td>
                              <td style={{ padding:'10px 12px', borderBottom:'1px solid var(--color-border)',
                                textAlign:'right', whiteSpace:'nowrap' }}>
                                {r[ch.key].total ? r[ch.key].total.toLocaleString() + '건' : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
