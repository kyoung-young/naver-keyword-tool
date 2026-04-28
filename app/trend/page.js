'use client';

import { useState } from 'react';
import KeywordInput from '../../components/KeywordInput';
import TrendChart from '../../components/TrendChart';

const PERIOD_OPTIONS = [
  { label: '1개월', months: 1  },
  { label: '3개월', months: 3  },
  { label: '6개월', months: 6  },
  { label: '1년',   months: 12 },
];

const DEVICE_OPTIONS  = [{ v: '',   l: '전체' }, { v: 'pc', l: 'PC' }, { v: 'mo', l: '모바일' }];
const GENDER_OPTIONS  = [{ v: '',   l: '전체' }, { v: 'm', l: '남성'  }, { v: 'f',  l: '여성'  }];
const AGE_OPTIONS = [
  { v: '', l: '전체' },
  { v: '1', l: '10대' }, { v: '2', l: '20대' }, { v: '3', l: '30대' },
  { v: '4', l: '40대' }, { v: '5', l: '50대+' },
];

function getDateRange(months) {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - months);
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return { startDate: fmt(start), endDate: fmt(end) };
}

export default function TrendPage() {
  const [keywords, setKeywords]   = useState([]);
  const [period, setPeriod]       = useState(3);
  const [device, setDevice]       = useState('');
  const [gender, setGender]       = useState('');
  const [age, setAge]             = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [trendData, setTrendData] = useState(null);
  const [kwStats, setKwStats]     = useState(null);

  const handleSearch = async () => {
    if (!keywords.length) { setError('키워드를 입력하세요.'); return; }

    setLoading(true);
    setError('');
    setTrendData(null);
    setKwStats(null);

    const { startDate, endDate } = getDateRange(period);
    const timeUnit = period <= 1 ? 'date' : period <= 3 ? 'week' : 'month';

    const keywordGroups = keywords.map((kw) => ({
      groupName: kw,
      keywords: [kw],
    }));

    try {
      // DataLab 트렌드 호출 (키는 서버에서만 처리)
      const trendRes = await fetch('/api/trend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate, endDate, timeUnit,
          keywordGroups,
          device: device || undefined,
          ages: age ? [age] : [],
          gender: gender || undefined,
        }),
      });

      const trendJson = await trendRes.json();
      if (!trendRes.ok) throw new Error(trendJson.error || 'DataLab 오류');
      setTrendData(trendJson);

      // 검색광고 키워드도구 (서버 env에 설정된 경우 자동 호출)
      const kwRes = await fetch('/api/keyword-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords }),
      });
      if (kwRes.ok) {
        const kwJson = await kwRes.json();
        setKwStats(kwJson.stats);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">트렌드 그래프</h1>
        <p className="page-desc">네이버 DataLab 기반 키워드 검색 트렌드를 시각화합니다.</p>
      </div>

      {/* 필터 패널 */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 8 }}>
            키워드 <span style={{ color: 'var(--color-text-sub)', fontWeight: 400 }}>(최대 5개)</span>
          </label>
          <KeywordInput keywords={keywords} onChange={setKeywords} max={5} />
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          {/* 기간 */}
          <div>
            <label style={{ fontWeight: 600, fontSize: 12, display: 'block', marginBottom: 6, color: 'var(--color-text-sub)' }}>기간</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.months}
                  className={`btn ${period === opt.months ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '6px 14px', fontSize: 13 }}
                  onClick={() => setPeriod(opt.months)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 기기 */}
          <div>
            <label style={{ fontWeight: 600, fontSize: 12, display: 'block', marginBottom: 6, color: 'var(--color-text-sub)' }}>기기</label>
            <select className="select-field" value={device} onChange={(e) => setDevice(e.target.value)}>
              {DEVICE_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>

          {/* 성별 */}
          <div>
            <label style={{ fontWeight: 600, fontSize: 12, display: 'block', marginBottom: 6, color: 'var(--color-text-sub)' }}>성별</label>
            <select className="select-field" value={gender} onChange={(e) => setGender(e.target.value)}>
              {GENDER_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>

          {/* 연령대 */}
          <div>
            <label style={{ fontWeight: 600, fontSize: 12, display: 'block', marginBottom: 6, color: 'var(--color-text-sub)' }}>연령대</label>
            <select className="select-field" value={age} onChange={(e) => setAge(e.target.value)}>
              {AGE_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#dc2626', fontSize: 13, marginBottom: 14 }}>
            {error}
          </div>
        )}

        <button
          className="btn btn-primary"
          onClick={handleSearch}
          disabled={loading}
          style={{ minWidth: 120, justifyContent: 'center' }}
        >
          {loading ? <><span className="spinner" style={{ width:16,height:16 }} /> 조회 중...</> : '📈 트렌드 조회'}
        </button>
      </div>

      {/* 트렌드 차트 */}
      {trendData && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 20 }}>검색 트렌드</h3>
          <TrendChart data={trendData} />
        </div>
      )}

      {/* 월간 검색량 (검색광고 API) */}
      {kwStats && (
        <div className="card">
          <h3 style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>월간 검색량 (검색광고 API)</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['키워드', '연관 키워드', 'PC 검색량', '모바일 검색량', '총 검색량', 'PC 클릭률', '모바일 클릭률'].map((h) => (
                    <th key={h} style={{ padding: '8px 12px', background: 'var(--color-bg)', textAlign: 'left', borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap', color: 'var(--color-text-sub)', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {keywords.map((kw) =>
                  (kwStats[kw] || []).slice(0, 10).map((item, i) => (
                    <tr key={`${kw}-${i}`}>
                      {i === 0 && <td rowSpan={Math.min(10, kwStats[kw]?.length || 1)} style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-border)', fontWeight: 600, verticalAlign: 'top' }}>{kw}</td>}
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-border)' }}>{item.relKeyword}</td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-border)', textAlign: 'right' }}>{(item.monthlyPcQcCnt ?? 0).toLocaleString()}</td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-border)', textAlign: 'right' }}>{(item.monthlyMobileQcCnt ?? 0).toLocaleString()}</td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-border)', textAlign: 'right', fontWeight: 600 }}>
                        {((item.monthlyPcQcCnt ?? 0) + (item.monthlyMobileQcCnt ?? 0)).toLocaleString()}
                      </td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-border)', textAlign: 'right' }}>{item.plAvgDepth ?? '-'}</td>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-border)', textAlign: 'right' }}>{item.mobileAvgDepth ?? '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
