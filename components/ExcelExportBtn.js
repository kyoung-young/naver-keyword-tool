'use client';

import { useState } from 'react';

/**
 * 엑셀 내보내기 버튼
 * Props:
 *   results: object  — 검색 결과 데이터
 *   keywords: string[]
 */
export default function ExcelExportBtn({ results, keywords }) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (!results || !keywords?.length) return;

    setLoading(true);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results, keywords }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`내보내기 실패: ${err.error}`);
        return;
      }

      // Blob → 다운로드
      const blob = await res.blob();
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const fileName = `naver_keyword_분석_${today}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`내보내기 오류: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className="btn btn-secondary"
      onClick={handleExport}
      disabled={loading || !results}
      style={{ gap: 6 }}
    >
      {loading ? <span className="spinner" /> : '📥'}
      {loading ? '생성 중...' : '엑셀 내보내기'}
    </button>
  );
}
