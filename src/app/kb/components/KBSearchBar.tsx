'use client';

import { useState, useRef, useEffect } from 'react';

interface Props {
  onChange: (q: string) => void;
  resultCount: number;
}

export default function KBSearchBar({ onChange, resultCount }: Props) {
  const [value, setValue] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (val: string) => {
    setValue(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(val), 200);
  };

  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="relative flex-1 max-w-xs">
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7"/>
          <line x1="20" y1="20" x2="16" y2="16"/>
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => handleChange(e.target.value)}
          placeholder="搜索..."
          className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md
            focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:border-indigo-300
            placeholder-gray-400"
        />
      </div>
      <span className="text-xs text-gray-400 flex-shrink-0">{resultCount} 条</span>
    </div>
  );
}
