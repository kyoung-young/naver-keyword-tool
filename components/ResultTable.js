'use client';

/**
 * 검색 결과 테이블 컴포넌트
 * Props:
 *   items: Array<{ title, link, description, pubDate, bloggername, cafename }>
 *   channel: 'blog' | 'cafe' | 'news' | 'web'
 */
export default function ResultTable({ items = [], channel = 'blog' }) {
  if (!items.length) {
    return (
      <div className="result-empty">
        결과가 없습니다.
      </div>
    );
  }

  return (
    <div className="result-table-wrap">
      <table className="result-table">
        <thead>
          <tr>
            <th style={{ width: '40%' }}>제목</th>
            <th style={{ width: '15%' }}>출처</th>
            <th style={{ width: '12%' }}>날짜</th>
            <th>설명</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="result-title-link"
                >
                  {item.title || '(제목 없음)'}
                </a>
              </td>
              <td className="result-source">
                {channel === 'blog' && item.bloggername}
                {channel === 'cafe' && item.cafename}
                {channel === 'news' && extractDomain(item.link)}
                {channel === 'web'  && extractDomain(item.link)}
              </td>
              <td className="result-date">
                {formatDate(item.pubDate)}
              </td>
              <td className="result-desc">
                {item.description || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <style>{`
        .result-table-wrap {
          overflow-x: auto;
        }
        .result-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .result-table th {
          text-align: left;
          padding: 10px 12px;
          background: var(--color-bg);
          color: var(--color-text-sub);
          font-weight: 600;
          border-bottom: 1px solid var(--color-border);
          white-space: nowrap;
        }
        .result-table td {
          padding: 10px 12px;
          border-bottom: 1px solid var(--color-border);
          vertical-align: top;
        }
        .result-table tr:last-child td {
          border-bottom: none;
        }
        .result-table tr:hover td {
          background: rgba(3,199,90,0.04);
        }
        .result-title-link {
          color: var(--color-primary-dark);
          font-weight: 500;
          text-decoration: none;
          transition: color 0.15s;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .result-title-link:hover {
          color: var(--color-primary);
          text-decoration: underline;
        }
        .result-source {
          color: var(--color-text-sub);
          font-size: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 120px;
        }
        .result-date {
          color: var(--color-text-sub);
          font-size: 12px;
          white-space: nowrap;
        }
        .result-desc {
          color: var(--color-text-sub);
          font-size: 12px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          max-width: 320px;
        }
        .result-empty {
          padding: 40px;
          text-align: center;
          color: var(--color-text-sub);
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}

function extractDomain(url) {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url.slice(0, 30);
  }
}

function formatDate(str) {
  if (!str) return '-';
  // pubDate 형식: "Mon, 01 Jan 2024 00:00:00 +0900" or "20240101"
  if (/^\d{8}$/.test(str)) {
    return `${str.slice(0,4)}.${str.slice(4,6)}.${str.slice(6,8)}`;
  }
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
  } catch {
    return str;
  }
}
