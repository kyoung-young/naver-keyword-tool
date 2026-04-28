'use client';

import { useState, useEffect } from 'react';

const KEY_LABELS = [
  { envKey: 'hasClientId',      label: '네이버 Client ID',        group: '검색 API' },
  { envKey: 'hasClientSecret',  label: '네이버 Client Secret',    group: '검색 API' },
  { envKey: 'hasCustomerId',    label: '검색광고 Customer ID',    group: '검색광고 API (선택)' },
  { envKey: 'hasAccessLicense', label: '검색광고 Access License', group: '검색광고 API (선택)' },
  { envKey: 'hasSecretKey',     label: '검색광고 Secret Key',     group: '검색광고 API (선택)' },
];

export default function SettingsPage() {
  const [envStatus, setEnvStatus] = useState(null);
  const [testing, setTesting]     = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    fetch('/api/env-status')
      .then((r) => r.json())
      .then(setEnvStatus)
      .catch(() => setEnvStatus({}));
  }, []);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: ['테스트'], channels: ['blog'] }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult({ ok: true, msg: `연결 성공! (블로그 총 ${data.results?.['테스트']?.blog?.total?.toLocaleString() ?? 0}건)` });
      } else {
        setTestResult({ ok: false, msg: `연결 실패: ${data.error}` });
      }
    } catch (err) {
      setTestResult({ ok: false, msg: `오류: ${err.message}` });
    } finally {
      setTesting(false);
    }
  };

  const searchOk = envStatus?.hasClientId && envStatus?.hasClientSecret;
  const adOk     = envStatus?.hasCustomerId && envStatus?.hasAccessLicense && envStatus?.hasSecretKey;

  const groups = ['검색 API', '검색광고 API (선택)'];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">API 설정 상태</h1>
        <p className="page-desc">API 키는 서버에만 저장되어 있습니다. 외부에서 확인할 수 없습니다.</p>
      </div>

      {/* 전체 상태 배너 */}
      <div style={{
        padding: '16px 20px',
        borderRadius: 10,
        marginBottom: 24,
        background: searchOk ? '#f0fdf4' : '#fef2f2',
        border: `1px solid ${searchOk ? '#86efac' : '#fca5a5'}`,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        maxWidth: 560,
      }}>
        <span style={{ fontSize: 28 }}>{searchOk ? '🔒' : '⚠️'}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
            {searchOk ? 'API 키 정상 등록됨' : 'API 키 미등록'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-sub)' }}>
            {searchOk
              ? '키는 서버(.env.local)에만 존재합니다. 브라우저에서 읽을 수 없습니다.'
              : '.env.local 파일에 NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 을 입력하세요.'}
          </div>
        </div>
      </div>

      {/* 키별 등록 상태 */}
      <div className="card" style={{ maxWidth: 560, marginBottom: 24 }}>
        {envStatus === null ? (
          <div style={{ textAlign: 'center', padding: 20 }}><span className="spinner" /></div>
        ) : (
          groups.map((group) => (
            <div key={group} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-sub)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                {group}
              </div>
              {KEY_LABELS.filter((k) => k.group === group).map(({ envKey, label }) => (
                <div key={envKey} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: 8, marginBottom: 6,
                  background: envStatus[envKey] ? 'rgba(3,199,90,0.06)' : '#fafafa',
                  border: `1px solid ${envStatus[envKey] ? 'rgba(3,199,90,0.2)' : 'var(--color-border)'}`,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
                    background: envStatus[envKey] ? 'rgba(3,199,90,0.15)' : '#f3f4f6',
                    color: envStatus[envKey] ? 'var(--color-primary)' : 'var(--color-text-sub)',
                  }}>
                    {envStatus[envKey] ? '✓ 등록됨' : '✗ 미등록'}
                  </span>
                </div>
              ))}
            </div>
          ))
        )}

        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 18, display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={handleTest} disabled={testing || !searchOk}>
            {testing ? <><span className="spinner" style={{ width:16,height:16 }} /> 테스트 중...</> : '🔗 API 연결 테스트'}
          </button>
        </div>

        {testResult && (
          <div style={{
            marginTop: 12, padding: '10px 14px', borderRadius: 8, fontSize: 13,
            background: testResult.ok ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${testResult.ok ? '#86efac' : '#fca5a5'}`,
            color: testResult.ok ? '#166534' : '#dc2626',
          }}>
            {testResult.ok ? '✅ ' : '❌ '}{testResult.msg}
          </div>
        )}
      </div>

      {/* 수정 방법 안내 */}
      <div className="card" style={{ maxWidth: 560 }}>
        <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>키 변경 방법</h3>
        <p style={{ fontSize: 13, color: 'var(--color-text-sub)', marginBottom: 12, lineHeight: 1.7 }}>
          프로젝트 루트의 <code style={{ background:'#f3f4f6', padding:'2px 7px', borderRadius:4, fontSize:12 }}>.env.local</code> 파일을 직접 수정한 뒤
          서버를 재시작하면 적용됩니다.
        </p>
        <pre style={{
          background: '#1a1a1a', color: '#e5e7eb',
          padding: '14px 18px', borderRadius: 8, fontSize: 12, lineHeight: 1.8,
          overflowX: 'auto', userSelect: 'none',
        }}>{`NAVER_CLIENT_ID=••••••••••••••••••••
NAVER_CLIENT_SECRET=••••••••••

# 검색광고 API (선택)
NAVER_AD_CUSTOMER_ID=
NAVER_AD_ACCESS_LICENSE=
NAVER_AD_SECRET_KEY=`}</pre>
        <p style={{ fontSize: 12, color: 'var(--color-text-sub)', marginTop: 10 }}>
          변경 후: <code style={{ background:'#f3f4f6', padding:'2px 6px', borderRadius:4 }}>npm run build && npm start</code>
        </p>
      </div>
    </div>
  );
}
