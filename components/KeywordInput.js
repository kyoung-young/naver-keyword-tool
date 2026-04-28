'use client';

import { useState, useRef } from 'react';

const MAX_KEYWORDS = 5;

/**
 * 키워드 태그 입력 컴포넌트
 * Props:
 *   keywords: string[]
 *   onChange: (keywords: string[]) => void
 *   max?: number (기본 5)
 *   placeholder?: string
 */
export default function KeywordInput({
  keywords = [],
  onChange,
  max = MAX_KEYWORDS,
  placeholder = '키워드 입력 후 Enter',
}) {
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef(null);

  const addKeyword = (val) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    if (keywords.length >= max) return;
    if (keywords.includes(trimmed)) return;
    onChange([...keywords, trimmed]);
    setInputVal('');
  };

  const removeKeyword = (kw) => {
    onChange(keywords.filter((k) => k !== kw));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword(inputVal);
    } else if (e.key === 'Backspace' && inputVal === '' && keywords.length > 0) {
      removeKeyword(keywords[keywords.length - 1]);
    }
  };

  return (
    <div className="keyword-input-wrap" onClick={() => inputRef.current?.focus()}>
      {keywords.map((kw) => (
        <span key={kw} className="keyword-tag">
          {kw}
          <button
            type="button"
            className="keyword-tag-remove"
            onClick={(e) => { e.stopPropagation(); removeKeyword(kw); }}
            aria-label={`${kw} 제거`}
          >
            ×
          </button>
        </span>
      ))}

      {keywords.length < max && (
        <input
          ref={inputRef}
          type="text"
          className="keyword-tag-input"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={keywords.length === 0 ? placeholder : ''}
        />
      )}

      {keywords.length >= max && (
        <span className="keyword-max-notice">최대 {max}개</span>
      )}

      <style>{`
        .keyword-input-wrap {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          background: #fff;
          cursor: text;
          min-height: 44px;
          transition: border-color 0.15s;
        }
        .keyword-input-wrap:focus-within {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(3,199,90,0.12);
        }
        .keyword-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(3,199,90,0.12);
          color: var(--color-primary-dark);
          padding: 3px 10px 3px 10px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
        }
        .keyword-tag-remove {
          background: none;
          border: none;
          color: var(--color-primary-dark);
          font-size: 15px;
          line-height: 1;
          padding: 0;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.15s;
        }
        .keyword-tag-remove:hover { opacity: 1; }
        .keyword-tag-input {
          border: none;
          outline: none;
          font-size: 14px;
          flex: 1;
          min-width: 120px;
          background: transparent;
          color: var(--color-text);
        }
        .keyword-max-notice {
          font-size: 12px;
          color: var(--color-text-sub);
          margin-left: 4px;
        }
      `}</style>
    </div>
  );
}
