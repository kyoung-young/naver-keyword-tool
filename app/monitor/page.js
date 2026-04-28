'use client';

import { useState, useEffect } from 'react';
import KeywordInput from '../../components/KeywordInput';

export default function MonitorPage() {
  const [monitors, setMonitors] = useState([]);
  const [groups, setGroups]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState(null);

  // 폼 상태
  const [formKws, setFormKws]         = useState([]);
  const [formGroupName, setFormGroupName] = useState('');
  const [formSchedule, setFormSchedule]   = useState('daily');
  const [formEmail, setFormEmail]         = useState('');
  const [formGroupId, setFormGroupId]     = useState('');
  const [saving, setSaving]           = useState(false);

  // 수동 실행 상태
  const [running, setRunning] = useState({});

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mRes, gRes] = await Promise.all([
        fetch('/api/monitor'),
        fetch('/api/competitors'),
      ]);
      const mData = await mRes.json();
      const gData = await gRes.json();
      setMonitors(mData.monitors || []);
      setGroups(gData.groups || []);
    } catch {
      showToast('데이터를 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // 경쟁사 그룹 선택 시 키워드 자동 로드
  const handleGroupSelect = (e) => {
    const id = e.target.value;
    setFormGroupId(id);
    if (id) {
      const group = groups.find((g) => g.id === id);
      if (group) {
        setFormGroupName(group.name);
        setFormKws([...group.keywords]);
      }
    } else {
      setFormGroupName('');
      setFormKws([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formKws.length) { showToast('키워드를 입력하세요.', 'error'); return; }
    if (!formGroupName.trim()) { showToast('그룹명을 입력하세요.', 'error'); return; }

    setSaving(true);
    try {
      const res = await fetch('/api/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: formGroupId || null,
          groupName: formGroupName,
          keywords: formKws,
          schedule: formSchedule,
          email: formEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast('모니터링이 등록되었습니다.');
      setFormKws([]);
      setFormGroupName('');
      setFormGroupId('');
      setFormEmail('');
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('모니터링을 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/monitor?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('삭제되었습니다.');
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleToggleActive = async (monitor) => {
    try {
      await fetch('/api/monitor', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: monitor.id, active: !monitor.active }),
      });
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // 수동 즉시 실행 (키는 서버에서만 처리)
  const handleRun = async (monitor) => {
    setRunning((prev) => ({ ...prev, [monitor.id]: true }));
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: monitor.keywords,
          channels: ['blog', 'cafe', 'news', 'web'],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // 채널별 총 문서수 집계
      const totals = {};
      for (const kw of monitor.keywords) {
        for (const ch of ['blog', 'cafe', 'news', 'web']) {
          totals[`${kw}_${ch}`] = data.results?.[kw]?.[ch]?.total ?? 0;
        }
      }

      // 히스토리 업데이트
      const historyEntry = { runAt: new Date().toISOString(), totals };
      const updatedHistory = [historyEntry, ...(monitor.history || [])].slice(0, 30);

      await fetch('/api/monitor', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: monitor.id,
          lastRunAt: new Date().toISOString(),
          history: updatedHistory,
        }),
      });

      showToast(`"${monitor.groupName}" 즉시 실행 완료!`);
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setRunning((prev) => ({ ...prev, [monitor.id]: false }));
    }
  };

  const formatDateTime = (iso) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">모니터링 스케줄러</h1>
        <p className="page-desc">키워드 문서 수 변화를 정기적으로 추적합니다.</p>
      </div>

      {/* 스케줄링 안내 */}
      <div style={{
        padding: '14px 18px',
        background: '#f0fdf4',
        border: '1px solid #86efac',
        borderRadius: 8,
        fontSize: 13,
        color: '#166534',
        marginBottom: 24,
        lineHeight: 1.7,
      }}>
        <strong>✅ 자동 실행 방법:</strong> 터미널을 하나 더 열고 아래 명령어를 실행하세요.<br />
        <code style={{
          display: 'inline-block', marginTop: 6,
          background: '#dcfce7', border: '1px solid #86efac',
          borderRadius: 5, padding: '3px 10px',
          fontFamily: 'monospace', fontSize: 13, letterSpacing: 0.3,
        }}>
          npm run worker
        </code>
        <span style={{ color: '#166534', marginLeft: 10, fontSize: 12 }}>
          → 매 1분마다 nextRunAt을 확인해 자동 실행됩니다.
        </span>
      </div>

      {/* 등록 폼 */}
      <div className="card" style={{ marginBottom: 28, maxWidth: 600 }}>
        <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>모니터링 등록</h3>
        <form onSubmit={handleSubmit}>

          {/* 경쟁사 그룹 선택 */}
          {groups.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 6 }}>경쟁사 그룹에서 불러오기 (선택)</label>
              <select className="select-field" style={{ width: '100%' }} value={formGroupId} onChange={handleGroupSelect}>
                <option value="">-- 직접 입력 --</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name} ({g.keywords.join(', ')})</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 6 }}>그룹명</label>
            <input
              type="text"
              className="input-field"
              value={formGroupName}
              onChange={(e) => setFormGroupName(e.target.value)}
              placeholder="모니터링 이름"
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 6 }}>키워드</label>
            <KeywordInput keywords={formKws} onChange={setFormKws} max={5} />
          </div>

          <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
            <div>
              <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 6 }}>실행 주기</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['daily', 'weekly'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`btn ${formSchedule === s ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ padding: '6px 16px', fontSize: 13 }}
                    onClick={() => setFormSchedule(s)}
                  >
                    {s === 'daily' ? '매일' : '매주'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 6 }}>알림 이메일 (선택)</label>
              <input
                type="email"
                className="input-field"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="example@email.com"
              />
            </div>
          </div>

          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? <><span className="spinner" style={{ width:16,height:16 }} /> 등록 중...</> : '➕ 모니터링 등록'}
          </button>
        </form>
      </div>

      {/* 모니터링 목록 */}
      <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>
        등록된 모니터링 <span style={{ color: 'var(--color-text-sub)', fontWeight: 400, fontSize: 13 }}>({monitors.length}개)</span>
      </h3>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-sub)' }}><span className="spinner" /></div>
      ) : monitors.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-sub)', background: 'var(--color-card)', borderRadius: 'var(--radius)', border: '2px dashed var(--color-border)' }}>
          등록된 모니터링이 없습니다.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {monitors.map((mon) => (
            <div key={mon.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                {/* 왼쪽 정보 */}
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <h4 style={{ fontWeight: 700, fontSize: 15 }}>{mon.groupName}</h4>
                    <span style={{
                      padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      background: mon.active ? 'rgba(3,199,90,0.12)' : '#f3f4f6',
                      color: mon.active ? 'var(--color-primary)' : 'var(--color-text-sub)',
                    }}>
                      {mon.active ? '활성' : '비활성'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-sub)' }}>
                      {mon.schedule === 'daily' ? '매일' : '매주'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {mon.keywords.map((kw) => (
                      <span key={kw} style={{
                        background: 'rgba(3,199,90,0.1)', color: 'var(--color-primary-dark)',
                        padding: '2px 8px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                      }}>{kw}</span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--color-text-sub)' }}>
                    <span>마지막 실행: {formatDateTime(mon.lastRunAt)}</span>
                    <span>다음 예정: {formatDateTime(mon.nextRunAt)}</span>
                  </div>

                  {/* 히스토리 */}
                  {mon.history?.length > 0 && (
                    <div style={{ marginTop: 12, overflowX: 'auto' }}>
                      <table style={{ fontSize: 11, borderCollapse: 'collapse', minWidth: 400 }}>
                        <thead>
                          <tr>
                            <th style={{ padding: '4px 8px', color: 'var(--color-text-sub)', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>실행 시간</th>
                            {mon.keywords.map((kw) => (
                              ['blog','cafe','news','web'].map((ch) => (
                                <th key={`${kw}_${ch}`} style={{ padding: '4px 8px', color: 'var(--color-text-sub)', textAlign: 'right', borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap' }}>
                                  {kw} {ch}
                                </th>
                              ))
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {mon.history.slice(0, 5).map((h, i) => (
                            <tr key={i}>
                              <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--color-border)' }}>{formatDateTime(h.runAt)}</td>
                              {mon.keywords.map((kw) =>
                                ['blog','cafe','news','web'].map((ch) => (
                                  <td key={`${kw}_${ch}`} style={{ padding: '4px 8px', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>
                                    {(h.totals?.[`${kw}_${ch}`] ?? 0).toLocaleString()}
                                  </td>
                                ))
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 오른쪽 버튼 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                  <button
                    className="btn btn-primary"
                    style={{ fontSize: 13, padding: '7px 14px' }}
                    onClick={() => handleRun(mon)}
                    disabled={running[mon.id]}
                  >
                    {running[mon.id] ? <><span className="spinner" style={{ width:14,height:14 }} /> 실행 중...</> : '▶ 즉시 실행'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: 12, padding: '6px 12px' }}
                    onClick={() => handleToggleActive(mon)}
                  >
                    {mon.active ? '⏸ 비활성화' : '▶ 활성화'}
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 12, padding: '6px 12px', color: 'var(--color-danger)' }}
                    onClick={() => handleDelete(mon.id)}
                  >
                    🗑 삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
        </div>
      )}
    </div>
  );
}
