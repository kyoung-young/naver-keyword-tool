'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import KeywordInput from '../../components/KeywordInput';

export default function CompetitorsPage() {
  const router = useRouter();
  const [groups, setGroups]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [formName, setFormName]   = useState('');
  const [formKws, setFormKws]     = useState([]);
  const [saving, setSaving]       = useState(false);
  const [editId, setEditId]       = useState(null);
  const [toast, setToast]         = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/competitors');
      const data = await res.json();
      setGroups(data.groups || []);
    } catch {
      showToast('그룹 목록을 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGroups(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formName.trim()) { showToast('그룹명을 입력하세요.', 'error'); return; }
    if (!formKws.length)  { showToast('키워드를 입력하세요.', 'error'); return; }

    setSaving(true);
    try {
      const isEdit = !!editId;
      const res = await fetch('/api/competitors', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editId, name: formName, keywords: formKws }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(isEdit ? '그룹이 수정되었습니다.' : '그룹이 추가되었습니다.');
      setFormName('');
      setFormKws([]);
      setEditId(null);
      fetchGroups();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (group) => {
    setEditId(group.id);
    setFormName(group.name);
    setFormKws([...group.keywords]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm('이 그룹을 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/competitors?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('그룹이 삭제되었습니다.');
      fetchGroups();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleLoadToDashboard = (group) => {
    // 키워드를 URL 파라미터로 전달하거나 sessionStorage 사용
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('loadKeywords', JSON.stringify(group.keywords));
    }
    router.push('/');
  };

  const cancelEdit = () => {
    setEditId(null);
    setFormName('');
    setFormKws([]);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">경쟁사 키워드 관리</h1>
        <p className="page-desc">키워드 그룹을 저장하고 대시보드에서 바로 불러올 수 있습니다.</p>
      </div>

      {/* 등록/수정 폼 */}
      <div className="card" style={{ marginBottom: 28, maxWidth: 600 }}>
        <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>
          {editId ? '그룹 수정' : '새 그룹 등록'}
        </h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 6 }}>그룹명</label>
            <input
              type="text"
              className="input-field"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="예: 경쟁사 A, 우리 브랜드..."
              maxLength={50}
            />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 6 }}>
              키워드 <span style={{ color: 'var(--color-text-sub)', fontWeight: 400 }}>(최대 5개)</span>
            </label>
            <KeywordInput keywords={formKws} onChange={setFormKws} max={5} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? <><span className="spinner" style={{ width:16,height:16 }} /> 저장 중...</> : (editId ? '✏️ 수정 완료' : '➕ 그룹 추가')}
            </button>
            {editId && (
              <button type="button" className="btn btn-ghost" onClick={cancelEdit}>취소</button>
            )}
          </div>
        </form>
      </div>

      {/* 그룹 목록 */}
      <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>
        저장된 그룹 <span style={{ color: 'var(--color-text-sub)', fontWeight: 400, fontSize: 13 }}>({groups.length}개)</span>
      </h3>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-sub)' }}>
          <span className="spinner" /> 불러오는 중...
        </div>
      ) : groups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-sub)', background: 'var(--color-card)', borderRadius: 'var(--radius)', border: '2px dashed var(--color-border)' }}>
          아직 등록된 그룹이 없습니다.<br />
          <span style={{ fontSize: 12 }}>위 폼에서 첫 번째 그룹을 추가해보세요.</span>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {groups.map((group) => (
            <div key={group.id} className="card competitor-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <h4 style={{ fontWeight: 700, fontSize: 15 }}>{group.name}</h4>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '4px 8px', fontSize: 12 }}
                    onClick={() => handleEdit(group)}
                  >✏️</button>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '4px 8px', fontSize: 12, color: 'var(--color-danger)' }}
                    onClick={() => handleDelete(group.id)}
                  >🗑</button>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {group.keywords.map((kw) => (
                  <span key={kw} style={{
                    background: 'rgba(3,199,90,0.1)',
                    color: 'var(--color-primary-dark)',
                    padding: '3px 10px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 500,
                  }}>{kw}</span>
                ))}
              </div>

              <div style={{ fontSize: 11, color: 'var(--color-text-sub)', marginBottom: 12 }}>
                {new Date(group.updatedAt).toLocaleDateString('ko-KR')} 업데이트
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', fontSize: 13 }}
                onClick={() => handleLoadToDashboard(group)}
              >
                🔍 대시보드에서 분석
              </button>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
        </div>
      )}

      <style>{`
        .competitor-card {
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .competitor-card:hover {
          box-shadow: var(--shadow-md);
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
}
