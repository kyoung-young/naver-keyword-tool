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

export default function KeywordAnalysisPage() {
  const [input, setInput]       = useState('');
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [hasAdApi, setHasAdApi] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const keywords = input.split('\n').map((k) => k.trim()).filter(Boolean);
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
    const header = ['키워드','PC 검색량','모바일 검색량','합계','경쟁강도','월 블로그 발행(추정)','누적 발행량'];
    const rows = results.map((r) => [
      r.keyword, r.pcSearch ?? '-', r.mobileSearch ?? '-', r.totalSearch ?? '-',
      r.competition ? (COMP_LABEL[r.competition] ?? r.competition) : '-',
      r.blogMonthly, r.blogTotal,
    ]);
    const csv = [header, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'keyword-analysis.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* 입력 카드 */}
      <div className="card" style={{ marginBottom: 20 }}>
        <form onSubmit={handleSubmit}>
          <label className="kw-label">
            키워드 목록
            <span className="kw-label-hint">한 줄에 하나 · 최대 30개</span>
          </label>
          <textarea
            className="kw-textarea"
            rows={6}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={'블루투스 이어폰\n무선 이어폰 추천\n노이즈캔슬링 이어폰'}
          />
          {error && <div className="field-error">{error}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" /> 조회 중...</> : '검색량 분석'}
            </button>
            {results.length > 0 && (
              <button type="button" className="btn btn-secondary" onClick={downloadCsv}>
                CSV 다운로드
              </button>
            )}
          </div>
        </form>
      </div>

      {!hasAdApi && results.length > 0 && (
        <div className="notice-warn">
          검색광고 API 키가 미설정 상태입니다. 설정 페이지에서 API 키를 등록하면 PC/모바일 검색량이 표시됩니다.
        </div>
      )}

      {results.length > 0 && (
        <div className="card">
          <div className="card-top-row">
            <span className="section-label">분석 결과</span>
            <span style={{ fontSize: 12, color: 'var(--color-text-sub)' }}>{results.length}개 키워드</span>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>키워드</th>
                  <th className="r">PC 검색량</th>
                  <th className="r">모바일 검색량</th>
                  <th className="r">합계</th>
                  <th>경쟁강도</th>
                  <th className="r">월 발행(추정)</th>
                  <th className="r">누적 발행량</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.keyword}>
                    <td style={{ fontWeight: 600 }}>{r.keyword}</td>
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
                          background: COMP_BG[r.competition],
                          color: COMP_COLOR[r.competition],
                        }}>
                          {COMP_LABEL[r.competition] ?? r.competition}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="r">{r.blogMonthly.toLocaleString()}+</td>
                    <td className="r">{r.blogTotal.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: 10, fontSize: 11, color: 'var(--color-text-muted)' }}>
            * 월 발행(추정): 최근 100건 pubDate 기준 추정 · 누적 발행량: 네이버 블로그 검색 총 결과수
          </p>
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
        .kw-textarea:focus { border-color: var(--color-primary); outline: none; box-shadow: 0 0 0 3px rgba(3,199,90,0.12); }
        .field-error {
          margin-top: 8px; padding: 8px 12px;
          background: #fef2f2; border: 1px solid #fca5a5;
          border-radius: var(--radius-sm); color: var(--color-danger); font-size: 13px;
        }
        .notice-warn {
          background: #fffbeb; border: 1px solid #fde68a;
          border-radius: var(--radius-sm); padding: 10px 14px;
          font-size: 12px; color: #92400e; margin-bottom: 16px;
        }
        .card-top-row {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 16px;
        }
      `}</style>
    </div>
  );
}
