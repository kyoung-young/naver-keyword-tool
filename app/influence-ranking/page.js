'use client';

import { useState } from 'react';

const CH_INFO = { blog:'블로그', cafe:'카페', news:'뉴스', web:'웹' };

function RankBadge({ rank }) {
  if (!rank) return <span style={{ color:'var(--color-text-muted)', fontSize:12 }}>미노출</span>;
  const [bg, color] =
    rank <= 3  ? ['#dcfce7','#15803d'] :
    rank <= 10 ? ['#dbeafe','#1d4ed8'] :
    rank <= 30 ? ['#fef9c3','#a16207'] :
                 ['#f3f4f6','#6b7280'];
  return (
    <span style={{ display:'inline-flex', padding:'2px 9px', borderRadius:20, fontSize:12, fontWeight:700, background:bg, color }}>
      {rank}위
    </span>
  );
}

function ScoreBar({ score }) {
  const color = score >= 70 ? 'var(--color-primary)' : score >= 40 ? '#3b82f6' : score >= 15 ? 'var(--color-warning)' : 'var(--color-danger)';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ flex:1, height:5, background:'#e5e7eb', borderRadius:3, overflow:'hidden' }}>
        <div style={{ width:`${score}%`, height:'100%', background:color, borderRadius:3, transition:'width 0.4s ease' }} />
      </div>
      <span style={{ fontWeight:700, color, minWidth:32, textAlign:'right', fontSize:13 }}>{score}</span>
    </div>
  );
}

function levelOf(s) {
  if (s >= 70) return { label:'매우 높음', color:'var(--color-primary)' };
  if (s >= 40) return { label:'높음',      color:'#3b82f6' };
  if (s >= 15) return { label:'보통',      color:'var(--color-warning)' };
  return               { label:'낮음',     color:'var(--color-danger)' };
}

export default function InfluenceRankingPage() {
  const [target, setTarget]     = useState('');
  const [kwInput, setKwInput]   = useState('');
  const [channels, setChannels] = useState({ blog:true, cafe:false, news:false, web:false });
  const [results, setResults]   = useState([]);
  const [summary, setSummary]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const toggle = (ch) => setChannels((p) => ({ ...p, [ch]: !p[ch] }));
  const selected = Object.keys(channels).filter((ch) => channels[ch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const keywords = kwInput.split('\n').map((k) => k.trim()).filter(Boolean);
    if (!target.trim()) { setError('조회 대상을 입력해주세요.'); return; }
    if (!keywords.length) { setError('키워드를 입력해주세요.'); return; }
    if (keywords.length > 20) { setError('최대 20개까지 가능합니다.'); return; }
    if (!selected.length) { setError('채널을 1개 이상 선택하세요.'); return; }
    setLoading(true); setError(''); setResults([]); setSummary(null);
    try {
      const res  = await fetch('/api/influence-ranking', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ target: target.trim(), keywords, channels: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data.results || []);
      setSummary({ totalScore: data.totalScore, exposedCount: data.exposedCount, total: keywords.length, target: data.target });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* 입력 카드 */}
      <div className="card" style={{ marginBottom: 20 }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label className="f-label">조회 대상</label>
            <input
              className="input-field"
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="예: 아이센스블랙라벨pc존  또는  blog.naver.com/myblog"
            />
            <div style={{ marginTop:5, fontSize:11, color:'var(--color-text-muted)' }}>
              블로그명, 도메인 키워드, URL 일부 중 아무거나 입력
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="f-label">키워드 목록 <span className="f-hint">한 줄에 하나 · 최대 20개</span></label>
            <textarea
              className="kw-textarea"
              rows={5}
              value={kwInput}
              onChange={(e) => setKwInput(e.target.value)}
              placeholder={'블루투스 이어폰\n무선 이어폰 추천\n노이즈캔슬링'}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="f-label">채널</label>
            <div style={{ display:'flex', gap:18, flexWrap:'wrap' }}>
              {Object.keys(CH_INFO).map((ch) => (
                <label key={ch} className="checkbox-label">
                  <input type="checkbox" checked={!!channels[ch]} onChange={() => toggle(ch)} />
                  {CH_INFO[ch]}
                </label>
              ))}
            </div>
          </div>

          {error && <div className="field-error">{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? <><span className="spinner" /> 분석 중 ({selected.length}채널)...</> : '영향력 분석 시작'}
          </button>
        </form>
      </div>

      {/* 요약 */}
      {summary && (() => {
        const lv = levelOf(summary.totalScore);
        return (
          <div className="score-banner" style={{ marginBottom: 20 }}>
            <div className="score-main">
              <div className="score-num" style={{ color: lv.color }}>{summary.totalScore}</div>
              <div className="score-denom">/100</div>
              <div className="score-tag" style={{ background: lv.color + '18', color: lv.color }}>{lv.label}</div>
            </div>
            <div className="score-divider" />
            <div className="score-stat">
              <div className="score-stat-val">{summary.exposedCount}<span className="score-stat-unit">/{summary.total}개</span></div>
              <div className="score-stat-key">노출 키워드</div>
            </div>
            <div className="score-divider" />
            <div className="score-stat">
              <div className="score-stat-val">{Math.round((summary.exposedCount/summary.total)*100)}<span className="score-stat-unit">%</span></div>
              <div className="score-stat-key">노출률</div>
            </div>
            <div className="score-divider" />
            <div className="score-stat" style={{ flex: 2 }}>
              <div style={{ fontWeight:700, fontSize:14, color:'var(--color-text)' }}>{summary.target}</div>
              <div className="score-stat-key">채널: {selected.map((c) => CH_INFO[c]).join(' · ')}</div>
            </div>
          </div>
        );
      })()}

      {results.length > 0 && (
        <div className="card">
          <div className="section-label" style={{ marginBottom: 14 }}>키워드별 노출 현황</div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>키워드</th>
                  {selected.map((ch) => <th key={ch} style={{ textAlign:'center' }}>{CH_INFO[ch]}</th>)}
                  <th style={{ minWidth: 160 }}>점수</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.keyword}>
                    <td style={{ fontWeight:600 }}>{r.keyword}</td>
                    {selected.map((ch) => (
                      <td key={ch} style={{ textAlign:'center' }}>
                        <RankBadge rank={r.channels[ch]?.rank} />
                      </td>
                    ))}
                    <td><ScoreBar score={r.score} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop:10, fontSize:11, color:'var(--color-text-muted)' }}>
            점수: 1위=100 · 2위=80 · 3위=70 · 4위=60 · 5위=55 · 6~10위=40 · 11~30위=20 · 31~50위=10 · 51~100위=5 · 미노출=0
          </p>
        </div>
      )}

      <style>{`
        .f-label {
          display:block; font-size:12px; font-weight:700;
          color:var(--color-text-sub); text-transform:uppercase;
          letter-spacing:0.04em; margin-bottom:6px;
        }
        .f-hint { font-size:11px; font-weight:400; text-transform:none; letter-spacing:0; color:var(--color-text-muted); }
        .kw-textarea {
          width:100%; padding:10px 12px;
          border:1px solid var(--color-border); border-radius:var(--radius-sm);
          font-size:14px; font-family:var(--font-base);
          resize:vertical; background:var(--color-bg); color:var(--color-text);
        }
        .kw-textarea:focus { border-color:var(--color-primary); outline:none; box-shadow:0 0 0 3px rgba(3,199,90,0.12); }
        .field-error {
          margin-top:10px; padding:8px 12px;
          background:#fef2f2; border:1px solid #fca5a5;
          border-radius:var(--radius-sm); color:var(--color-danger); font-size:13px;
        }
        .score-banner {
          display:flex; align-items:center;
          background:var(--color-card); border:1px solid var(--color-border);
          border-radius:var(--radius); box-shadow:var(--shadow-xs);
          overflow:hidden;
          padding:16px 24px; gap:0;
        }
        .score-main { display:flex; align-items:baseline; gap:4px; padding-right:24px; }
        .score-num { font-size:36px; font-weight:800; letter-spacing:-1px; }
        .score-denom { font-size:14px; color:var(--color-text-muted); }
        .score-tag {
          margin-left:10px; padding:2px 10px; border-radius:20px;
          font-size:11px; font-weight:700;
        }
        .score-divider { width:1px; height:40px; background:var(--color-border); flex-shrink:0; margin:0 24px; }
        .score-stat { display:flex; flex-direction:column; gap:2px; flex:1; }
        .score-stat-val { font-size:20px; font-weight:700; }
        .score-stat-unit { font-size:12px; font-weight:400; color:var(--color-text-muted); margin-left:2px; }
        .score-stat-key { font-size:11px; color:var(--color-text-sub); font-weight:600; text-transform:uppercase; letter-spacing:0.04em; }
        @media (max-width:640px) {
          .score-banner { flex-direction:column; align-items:flex-start; gap:14px; }
          .score-divider { width:100%; height:1px; margin:0; }
        }
      `}</style>
    </div>
  );
}
