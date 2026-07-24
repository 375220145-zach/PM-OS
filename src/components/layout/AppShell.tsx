'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

const SCROLL_KEY = 'pmos-scroll';

export function saveScrollBeforeNav() {
  const main = document.querySelector('main');
  if (!main || main.scrollTop <= 0) return;
  try {
    const data = JSON.parse(sessionStorage.getItem(SCROLL_KEY) || '{}');
    data[location.pathname] = main.scrollTop;
    sessionStorage.setItem(SCROLL_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const close = useCallback(() => setSidebarOpen(false), []);
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);

  // Scroll save + restore: use a polling approach for reliability
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    // 1. Continuous save on scroll (debounced)
    let saveTimer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        try {
          const data = JSON.parse(sessionStorage.getItem(SCROLL_KEY) || '{}');
          data[pathname] = main.scrollTop;
          sessionStorage.setItem(SCROLL_KEY, JSON.stringify(data));
        } catch { /* ignore */ }
      }, 100);
    };
    main.addEventListener('scroll', onScroll, { passive: true });

    // 2. Restore: poll for 1.5 seconds after navigation
    let attempts = 0;
    const maxAttempts = 15;
    const poll = setInterval(() => {
      attempts++;
      try {
        const data = JSON.parse(sessionStorage.getItem(SCROLL_KEY) || '{}');
        const saved = data[pathname];
        if (saved && saved > 0 && main.scrollTop < 50) {
          main.scrollTop = saved;
        }
      } catch { /* ignore */ }
      if (attempts >= maxAttempts) clearInterval(poll);
    }, 100);

    return () => {
      main.removeEventListener('scroll', onScroll);
      clearTimeout(saveTimer);
      clearInterval(poll);
    };
  }, [pathname]);

  return (
    <div className="flex h-screen bg-white text-gray-900">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={close} />
          <div className="relative z-10">
            <Sidebar onNavigate={close} />
          </div>
        </div>
      )}

      <main ref={mainRef} className="flex-1 overflow-y-auto">
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-500 hover:text-gray-700 p-1"
            aria-label="菜单"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-indigo-600">PM OS</span>
        </div>

        {children}
      </main>
    </div>
  );
}
