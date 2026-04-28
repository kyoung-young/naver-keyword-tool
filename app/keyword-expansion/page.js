'use client';

import { useState } from 'react';

const COMP_LABEL = { low: '낮음', mid: '중간', high: '높음' };
const COMP_COLOR = { low: 'var(--color-primary)', mid: 'var(--color-warning)', high: 'var(--color-danger)' };
const COMP_BG    = { low: 'var(--color-primary-light)', mid: '#fffbeb', high: '#fef2f2' };

function fmtNum(n) {
  if (n === null || n === undefined) return '-';
  if (n < 10) return '10 미만';
  return n.toLocaleString();
}

export default function KeywordExpansionPage() {
  const [seed, setSeed]         = useState('');
  const [includeText, setInc]   = useState('');
  const [excludeText, setExc]   = useState('');
  const [highPerf, setHighPerf] = useState(false);
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [searched, setSearched] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!seed.trim()) { setError('시드 키워드를 입력해주세요.'); return; }
    const includeWords = includeText.split(',').map((w) => w.trim()).filter(Boolean);
    const excludeWords = excludeText.split(',').map((w) => w.trim()).filter(Boolean);
    setLoading(true); setError(''); setResults([]);
    try {
      const res  = await fetch('/api/keyword-expansion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seedKeyword: seed.trim(), includeWords, excludeWords, highPerformance: highPerf }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data.results || []);
      setSearched(seed.trim());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadCsv = () => {
    if (!results.length) return;
    const header = ['키워드','PC 검색량','모바일 검색량','합계','경쟁강도'];
    const rows = results.map((r) => [r.keyword, r.pcSearch, r.mobileSearch, r.totalSearch, COMP_LABEL[r.competition] ?? r.competition]);
    const csv = [header, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿'+csv], { type:'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `kw-expansion-${searched}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const totalSearch = results.reduce((s, r) => s + (r.totalSearch || 0), 0);
  const highComp    = results.filter((r) => r.competition === 'high').length;
  const lowComp     = results.filter((r) => r.competition === 'low').length;

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <form onSubmit={handleSubmit}>
          {/* 시드 키워드 */}
          <div style={{ marginBottom: 16 }}>
            <label className="f-label">시드 키워드</label>
            <input
              className="input-field"
              type="text"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="예: 블루투스 이어폰"
            />
          </div>

          {/* 포함/제외 */}
          <div className="filter-row">
            <div>
              <label className="f-label">포함할 단어 <span className="f-hint">쉼표 구분</span></label>
              <input className="input-field" type="text" value={includeText} onChange={(e) => setInc(e.target.value)} placeholder="예: 추천, 가격" />
            </div>
            <div>
              <label className="f-label">제외할 단어 <span className="f-hint">쉼표 구분</span></label>
              <input className="input-field" type="text" value={excludeText} onChange={(e) => setExc(e.target.value)} placeholder="예: 중고, 도매" />
            </div>
          </div>

          {/* 고성능 옵션 */}
          <label className="checkbox-label" style={{ marginTop: 14, display: 'flex' }}>
            <input type="checkbox" checked={highPerf} onChange={(e) => setHighPerf(e.target.checked)} />
            <span>
              고성능 확장 옵션
              <span className="f-hint" style={{ marginLeft: 6 }}>여러 변형 키워드로 더 많은 연관어 발굴</span>
            </span>
          </label>

          {error && <div className="field-error">{error}</div>}

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" /> 확장 중...</> : '키워드 확장'}
            </button>
            {results.length > 0 && (
              <button type="button" className="btn btn-secondary" onClick={downloadCsv}>CSV 다운로드</button>
            )}
          </div>
        </form>
      </div>

      {results.length > 0 && (
        <>
          {/* 요약 */}
          <div className="stat-strip" style={{ marginBottom: 16 }}>
            <div className="stat-item">
              <div className="stat-val">{results.length.toLocaleString()}</div>
              <div className="stat-key">발굴 키워드</div>
            </div>
            <div className="stat-sep" />
            <div className="stat-item">
              <div className="stat-val" style={{ color: 'var(--color-primary)' }}>{totalSearch.toLocaleString()}</div>
              <div className="stat-key">총 검색량</div>
            </div>
            <div className="stat-sep" />
            <div className="stat-item">
              <div className="stat-val" style={{ color: 'var(--color-primary)' }}>{lowComp}</div>
              <div className="stat-key">경쟁 낮음</div>
            </div>
            <div className="stat-sep" />
            <div className="stat-item">
              <div className="stat-val" style={{ color: 'var(--color-danger)' }}>{highComp}</div>
              <div className="stat-key">경쟁 높음</div>
            </div>
          </div>

          <div className="card">
            <div className="card-top-row">
              <span className="section-label">'{searched}' 연관 키워드</span>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>#</th>
                    <th>키워드</th>
                    <th className="r">PC 검색량</th>
                    <th className="r">모바일</th>
                    <th className="r">합계</th>
                    <th>경쟁강도</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={r.keyword}>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{r.keyword}</td>
                      <td className="r">{fmtNum(r.pcSearch)}</td>
                      <td className="r">{fmtNum(r.mobileSearch)}</td>
                      <td className="r" style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{fmtNum(r.totalSearch)}</td>
                      <td>
                        <span style={{
                          display: 'inline-flex', padding: '2px 9px', borderRadius: 20,
                          fontSize: 11, fontWeight: 700,
                          background: COMP_BG[r.competition] || '#f3f4f6',
                          color: COMP_COLOR[r.competition] || '#6b7280',
                        }}>
                          {COMP_LABEL[r.competition] ?? r.competition}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <style>{`
        .f-label {
          display: block; font-size: 12px; font-weight: 700;
          color: var(--color-text-sub); text-transform: uppercase;
          letter-spacing: 0.04em; margin-bottom: 6px;
        }
        .f-hint { font-size: 11px; font-weight: 400; text-transform: none; letter-spacing: 0; color: var(--color-text-muted); }
        .filter-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 0; }
        .field-error {
          margin-top: 10px; padding: 8px 12px;
          background: #fef2f2; border: 1px solid #fca5a5;
          border-radius: var(--radius-sm); color: var(--color-danger); font-size: 13px;
        }
        .stat-strip {
          display: flex; align-items: center;
          background: var(--color-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          overflow: hidden;
          box-shadow: var(--shadow-xs);
        }
        .stat-item { flex: 1; padding: 14px 20px; text-align: center; }
        .stat-val { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
        .stat-key { font-size: 11px; color: var(--color-text-sub); margin-top: 2px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
        .stat-sep { width: 1px; height: 40px; background: var(--color-border); flex-shrink: 0; }
        .card-top-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        @media (max-width: 600px) {
          .filter-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
