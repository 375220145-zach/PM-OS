'use client';

// SyncProvider — mounts the sync engine for production builds.
// - Not demo mode + API_BASE configured → gates children until first sync completes.
// - Local changes → debounced incremental push (exponential backoff on failure).
// - pagehide/visibilitychange → best-effort immediate flush.
// - First-sync dialogs: bootstrap upload (cloud empty, local has data) /
//   local-vs-cloud choice (both have data).

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { db } from '@/db/database';
import { API_BASE, CLIENT_SECRET } from '@/lib/remote';
import Button from '@/components/shared/Button';
import {
  isSyncEnabled, registerChangeListener, syncOnce, pullSnapshot, applyPull,
  pushChanges, bootstrapPush, forcePush, hasLocalData,
} from './engine';
import { stateGet, stateSet, outboxPeekCollapsed } from './sync-db';

interface SyncContextValue {
  status: 'loading' | 'ready' | 'offline';
  lastSyncAt: number | null;
  forceSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue>({
  status: 'loading', lastSyncAt: null, forceSync: async () => {},
});

export function useSync() {
  return useContext(SyncContext);
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'offline'>('loading');
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [bootstrapOpen, setBootstrapOpen] = useState(false);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [cloudLostOpen, setCloudLostOpen] = useState(false);
  const pushTimer = useRef<number | null>(null);
  const retryDelay = useRef(3000);
  const booted = useRef(false);

  const pullAndApply = useCallback(async () => {
    const snap = await pullSnapshot();
    await applyPull(snap);
    await stateSet('lastPulledRev', String(snap.revision));
  }, []);

  const doPush = useCallback(async () => {
    try {
      await pushChanges();
      retryDelay.current = 3000;
      setLastSyncAt(Date.now());
    } catch {
      retryDelay.current = Math.min(retryDelay.current * 3, 300000);
      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = window.setTimeout(() => void doPush(), retryDelay.current);
    }
  }, []);

  const schedulePush = useCallback(() => {
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = window.setTimeout(() => void doPush(), 1500);
  }, [doPush]);

  // ── startup ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSyncEnabled()) { setStatus('ready'); return; }
    if (booted.current) return;
    booted.current = true;

    async function boot() {
      try {
        await db.open();
        registerChangeListener(() => schedulePush());

        const snap = await pullSnapshot();
        const lastPulled = await stateGet('lastPulledRev');
        const localHasData = await hasLocalData();

        if (!lastPulled) {
          if (snap.revision === 0 && localHasData) {
            // cloud empty, local has data → offer bootstrap upload
            setBootstrapOpen(true);
            return; // children stay gated until user decides
          }
          if (snap.revision > 0 && localHasData) {
            // both have data → one-time choice
            setChoiceOpen(true);
            return;
          }
        } else if (snap.revision < Number(lastPulled) || (Object.keys(snap.rows).length === 0 && localHasData)) {
          // Cloud was reset/wiped (revision went backwards, or cloud rows are gone entirely
          // while local still has data) — pulling would wipe local data. Offer recovery.
          setCloudLostOpen(true);
          return;
        }

        await syncOnce();
        setStatus('ready');
        setLastSyncAt(Date.now());
      } catch {
        setStatus('offline');
      }
    }
    // No cleanup: booted guard ensures a single boot even under StrictMode double-mount.
    void boot();
  }, [schedulePush]);

  // ── immediate flush on hide/close ─────────────────────────────────────
  useEffect(() => {
    if (!isSyncEnabled()) return;
    const flush = async () => {
      const changes = await outboxPeekCollapsed();
      if (changes.length === 0) return;
      const payload = [];
      for (const c of changes) {
        if (c.op === 'del') {
          payload.push({ t: c.table, k: c.key, op: 'del', ts: c.ts });
        } else {
          const t = (db as unknown as Record<string, { get(k: string): Promise<unknown> }>)[c.table];
          const row = t ? await t.get(c.key) : undefined;
          payload.push(row === undefined
            ? { t: c.table, k: c.key, op: 'del', ts: c.ts }
            : { t: c.table, k: c.key, op: 'put', obj: row, ts: c.ts });
        }
      }
      const body = JSON.stringify({ changes: payload });
      if (body.length > 64 * 1024) return; // keepalive limit — next startup will push
      try {
        const res = await fetch(`${API_BASE}/api/sync/push`, {
          method: 'POST',
          keepalive: true,
          headers: {
            'Content-Type': 'application/json',
            ...(CLIENT_SECRET ? { 'X-Client-Secret': CLIENT_SECRET } : {}),
          },
          body,
        });
        if (res.ok) {
          const maxRev = changes[changes.length - 1].rev;
          const { outboxDeleteUpTo } = await import('./sync-db');
          await outboxDeleteUpTo(maxRev);
        }
      } catch { /* best effort */ }
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void flush();
    });
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', flush);
    };
  }, []);

  const forceSync = useCallback(async () => {
    try {
      await forcePush();
      await pullAndApply();
      setLastSyncAt(Date.now());
      setStatus('ready');
    } catch { /* stays in current status */ }
  }, [pullAndApply]);

  // ── first-sync dialogs ────────────────────────────────────────────────
  const onBootstrap = async (includeDemo: boolean) => {
    try {
      await bootstrapPush({ includeDemo });
      setStatus('ready'); setLastSyncAt(Date.now());
    } catch { setStatus('offline'); }
    setBootstrapOpen(false);
  };

  const onChoice = async (useLocal: boolean) => {
    try {
      if (useLocal) {
        await forcePush();
      }
      await pullAndApply();
      setStatus('ready'); setLastSyncAt(Date.now());
    } catch { setStatus('offline'); }
    setChoiceOpen(false);
  };

  const onCloudLost = async (useLocal: boolean) => {
    try {
      if (useLocal) {
        await forcePush(); // upload local data back to the wiped cloud
      }
      await pullAndApply();
      setStatus('ready'); setLastSyncAt(Date.now());
    } catch { setStatus('offline'); }
    setCloudLostOpen(false);
  };

  const syncEnabled = isSyncEnabled();

  return (
    <SyncContext.Provider value={{ status, lastSyncAt, forceSync }}>
      {/* Gate children until first sync completes — pages must not read an empty DB */}
      {syncEnabled && status === 'loading' && !bootstrapOpen && !choiceOpen && !cloudLostOpen && (
        <div className="flex items-center justify-center h-screen bg-white">
          <div className="text-center">
            <div className="text-gray-500 text-sm mb-2">正在同步数据...</div>
            <div className="text-xs text-gray-400">从云端拉取最新数据（首次可能需要几秒）</div>
          </div>
        </div>
      )}

      {(bootstrapOpen || choiceOpen || cloudLostOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-6 w-[420px] max-w-full">
            {cloudLostOpen ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">云端数据缺失</h3>
                <p className="text-sm text-gray-600 mb-1">
                  云端数据比本机少（可能是云端被重置或丢失）。继续拉取会用空数据覆盖本机，本机数据将丢失。
                </p>
                <p className="text-xs text-gray-400 mb-6">建议先上传本机数据恢复云端。</p>
                <div className="flex flex-col gap-2 mb-2">
                  <Button onClick={() => void onCloudLost(true)}>上传本机数据恢复云端</Button>
                  <Button variant="secondary" onClick={() => void onCloudLost(false)}>以云端为准（清空本机）</Button>
                </div>
              </>
            ) : bootstrapOpen ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">首次同步</h3>
                <p className="text-sm text-gray-600 mb-1">
                  云端还没有数据，本机已有项目数据。是否上传到云端？
                </p>
                <p className="text-xs text-gray-400 mb-6">
                  建议排除 Demo 演示数据（demo- 开头），只上传你的真实数据。
                </p>
                <div className="flex flex-col gap-2 mb-6">
                  <Button onClick={() => void onBootstrap(false)}>上传真实数据（排除 Demo）</Button>
                  <Button variant="secondary" onClick={() => void onBootstrap(true)}>全部上传（含 Demo 数据）</Button>
                  <Button variant="ghost" onClick={() => { setBootstrapOpen(false); setStatus('ready'); }}>暂不上传（仅本地使用）</Button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">检测到本地与云端都有数据</h3>
                <p className="text-sm text-gray-600 mb-6">以哪边为准？此选择只问一次。</p>
                <div className="flex flex-col gap-2 mb-2">
                  <Button onClick={() => void onChoice(true)}>以本机为准（上传本地覆盖云端）</Button>
                  <Button variant="secondary" onClick={() => void onChoice(false)}>以云端为准（下载覆盖本地）</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {(!syncEnabled || status !== 'loading') && children}
    </SyncContext.Provider>
  );
}
