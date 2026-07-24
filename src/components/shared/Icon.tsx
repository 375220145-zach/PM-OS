// Tabler Icons 内联 SVG — 零外部依赖
// 接口：<Icon name="dashboard" size={20} stroke={1.5} className="..." />

import type { CSSProperties } from 'react';

export type IconName =
  | 'layout-dashboard' | 'folder' | 'clipboard-list' | 'notebook' | 'file-text'
  | 'home' | 'calendar' | 'users' | 'wallet' | 'package'
  | 'building-factory-2' | 'certificate' | 'history' | 'search' | 'microphone'
  | 'pencil' | 'check' | 'alert-triangle' | 'chevron-down' | 'chevron-right'
  | 'x' | 'plus' | 'download' | 'dots-vertical' | 'sparkles' | 'brain'
  | 'arrow-up' | 'arrow-down' | 'edit' | 'trash' | 'external-link'
  | 'filter' | 'refresh-cw';

const paths: Record<IconName, string> = {
  'layout-dashboard': 'M3 3h7v9H3V3zm11 0h7v5h-7V3zm0 7h7v11h-7V10zM3 14h7v8H3v-8z',
  'folder': 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-7l-2-2H5a2 2 0 00-2 2z',
  'clipboard-list': 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  'notebook': 'M4 4h16v16H4V4zm4 0v16m-4-4h4m-4-4h4',
  'file-text': 'M14 3v4a1 1 0 001 1h4M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2zM9 9h1m-1 4h6m-6 2h6',
  'home': 'M5 12H3l9-9 9 9h-2v7a2 2 0 01-2 2H7a2 2 0 01-2-2v-7z',
  'calendar': 'M4 7a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7zm12-4v4M8 3v4m-4 4h16m-10 4h1m0 0v3',
  'users': 'M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2m8-10a4 4 0 110-8 4 4 0 010 8zm8 10v-2a4 4 0 00-3-3.87M21 7a4 4 0 11-8 0 4 4 0 018 0z',
  'wallet': 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-1M3 7V5a2 2 0 012-2h12l3 4M3 7h18m-4 4h1',
  'package': 'M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zm0 9l8-4.5M12 12v9m0-9L4 7.5m12-1.5l-4 2.25L8 6m8 6v4.5',
  'building-factory-2': 'M3 21h18M6 17v-4l4-2 4 2v4M6 17h4m-4 0v4m4-4v4m4-8v8m0-12l2 2v2h-4v-2l2-2zM10 7V3h4v4',
  'certificate': 'M15 15l-3 5-3-5m6-4a3 3 0 11-6 0 3 3 0 016 0zM9 3h6l3 5-6 10L6 8l3-5z',
  'history': 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  'search': 'M21 21l-5-5m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  'microphone': 'M12 2a3 3 0 00-3 3v6a3 3 0 006 0V5a3 3 0 00-3-3zm-3 15a7.001 7.001 0 01-6-7m6 0h6m-6 0a7.001 7.001 0 006 7M12 19v3',
  'pencil': 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L7.5 20.036 3 21l.964-4.5L16.732 3.732z',
  'check': 'M5 12l5 5L20 7',
  'alert-triangle': 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01',
  'chevron-down': 'M6 9l6 6 6-6',
  'chevron-right': 'M9 6l6 6-6 6',
  'x': 'M18 6L6 18M6 6l12 12',
  'plus': 'M12 5v14M5 12h14',
  'download': 'M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 11l5 5 5-5M12 4v12',
  'dots-vertical': 'M12 5h.01M12 12h.01M12 19h.01',
  'sparkles': 'M9.937 15.5A2 2 0 008 17.063l-6.135 1.872 1.872-6.135A2 2 0 015.625 11.5l7.188-2.188L10.625 2.5 9.937 8.312 4.5 9.937l5.437 5.563zM20 3l.5 2-1.5 1 1.5 1-.5 2M19 10l.5 2-1.5 1 1.5 1-.5 2M22 6l.5 2-1.5 1 1.5 1-.5 2',
  'brain': 'M15.5 12a2.5 2.5 0 01-5 0V8.5a2.5 2.5 0 015 0V12zM8.5 12a2.5 2.5 0 005 0V8.5a2.5 2.5 0 00-5 0V12zM3 17.5A2.5 2.5 0 015.5 15h1a2.5 2.5 0 012.5 2.5v1A2.5 2.5 0 016.5 21h-1A2.5 2.5 0 013 18.5v-1zm12 0a2.5 2.5 0 012.5-2.5h1a2.5 2.5 0 012.5 2.5v1a2.5 2.5 0 01-2.5 2.5h-1a2.5 2.5 0 01-2.5-2.5v-1zM12 15a2.5 2.5 0 00-2.5 2.5v1a2.5 2.5 0 005 0v-1A2.5 2.5 0 0012 15z',
  'arrow-up': 'M12 19V5M5 12l7-7 7 7',
  'arrow-down': 'M12 5v14M5 12l7 7 7-7',
  'edit': 'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z',
  'trash': 'M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3',
  'external-link': 'M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3',
  'filter': 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
  'refresh-cw': 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15',
};

interface Props {
  name: IconName;
  size?: number;
  stroke?: number;
  className?: string;
  style?: CSSProperties;
}

export default function Icon({ name, size = 20, stroke = 1.5, className = '', style }: Props) {
  const d = paths[name];
  if (!d) return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
