'use client';

import { useEffect, useState } from 'react';
import { isDemoMode, seedDemoData } from '@/lib/demo-data';
import { db } from '@/db/database';

export function DemoInitWrapper({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isDemoMode()) { setReady(true); return; }
    // Always re-seed in demo mode to ensure latest data
    seedDemoData().then(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-gray-500 text-sm">加载 Demo 数据...</div>
      </div>
    );
  }

  return <>{children}</>;
}

export function NonDemoOnly({ children }: { children: React.ReactNode }) {
  if (!isDemoMode()) return <>{children}</>;
  return null;
}

