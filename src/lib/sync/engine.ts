// Sync engine — IndexedDB ⇄ D1 via sync worker.
// Strategy (flush-first): on startup, flush pending outbox changes to cloud,
// then pull the full snapshot and overwrite local (clear + bulkPut).
// Local writes are captured via db.on('changes') into a persistent outbox.

import { db } from '@/db/database';
import { API_BASE, apiFetch } from '@/lib/remote';
import { isDemoMode } from '@/lib/demo-data';
import type { PullPayload, SyncChange, TableName } from './types';
import {
  outboxAdd, outboxCount, outboxPeekCollapsed, outboxDeleteUpTo, stateGet, stateSet,
} from './sync-db';

const applyingRemoteFlag = { value: false };

export function isSyncEnabled(): boolean {
  return !isDemoMode() && !!API_BASE;
}

export function debugSyncInfo(): { enabled: boolean; apiBase: string; demoMode: boolean } {
  return { enabled: isSyncEnabled(), apiBase: API_BASE, demoMode: isDemoMode() };
}

export function getDeviceId(): string {
  return `dev-${Math.random().toString(36).slice(2, 10)}`;
}

// ── change capture via table hooks ──────────────────────────────────────
// Dexie 4 core has NO db.on('changes') (that's the dexie-observable plugin).
// Table-level hooks (creating/updating/deleting) fire on every write path
// (put/add/bulkPut/update/delete/where().delete()) and are built-in.
// Outbox stores { table, key, op } only; push reads the latest object from
// the main DB at push time — always pushing current state.

const HOOK_TABLES: TableName[] = ['projects', 'milestones', 'tasks', 'meetings', 'retrospectives',
  'changeRecords', 'bomItems', 'procurementCandidates', 'certRequirements',
  'milEntries', 'workLogs', 'graphNodes', 'graphEdges', 'extractionMeta', 'kbImages'];

let hooksRegistered = false;
let changeCallback: (() => void) | null = null;

function queueChange(table: TableName, key: string, op: 'put' | 'del'): void {
  if (applyingRemoteFlag.value) return;
  outboxAdd({ t: table, k: key, op, ts: Date.now() }).catch(e => console.error('[sync] outboxAdd failed:', (e as Error).message || e));
  changeCallback?.(); // notify provider to schedule a push
}

export function registerChangeListener(onChanged?: () => void): void {
  changeCallback = onChanged ?? null;
  if (hooksRegistered) return;
  hooksRegistered = true;
  // Table hooks (creating/updating/deleting) fire on every write path —
  // put/add/bulkPut/update/delete/where().delete() — built into Dexie core.
  for (const tableName of HOOK_TABLES) {
    const t = (db as unknown as Record<string, {
      hook: (evt: 'creating' | 'updating' | 'deleting', cb: (...args: unknown[]) => unknown) => void;
    }>)[tableName];
    if (!t) { console.warn('[sync] table missing:', tableName); continue; }
    t.hook('creating', (primKey: unknown) => {
      queueChange(tableName, String(primKey), 'put');
      return primKey;
    });
    t.hook('updating', (_mods: unknown, primKey: unknown) => {
      queueChange(tableName, String(primKey), 'put');
    });
    t.hook('deleting', (primKey: unknown) => {
      queueChange(tableName, String(primKey), 'del');
    });
  }
  onChanged?.(); // provider may want an initial schedule tick
}

/** Does the local DB hold any real (non-demo) data? Used by first-sync decision. */
export async function hasLocalData(includeDemo = false): Promise<boolean> {
  const tables = ['projects', 'milestones', 'tasks', 'meetings', 'retrospectives',
    'changeRecords', 'bomItems', 'procurementCandidates', 'certRequirements',
    'milEntries', 'workLogs', 'graphNodes', 'graphEdges', 'extractionMeta', 'kbImages'] as const;
  for (const table of tables) {
    const rows = await (db as unknown as Record<string, { toArray(): Promise<Array<Record<string, unknown>>> }>)[table].toArray();
    if (rows.some(r => includeDemo || !String(r.id).startsWith('demo-'))) return true;
  }
  return false;
}

// ── push (outbox → cloud) ───────────────────────────────────────────────

async function readRow(table: TableName, key: string): Promise<unknown | undefined> {
  const t = (db as unknown as Record<string, { get(k: string): Promise<unknown> }>)[table];
  return t ? t.get(key) : undefined;
}

export async function pushChanges(): Promise<void> {
  const changes = await outboxPeekCollapsed();
  if (changes.length === 0) return;

  // Read latest object from the main DB at push time (row deleted meanwhile → del)
  const payload: SyncChange[] = [];
  for (const c of changes) {
    if (c.op === 'del') {
      payload.push({ t: c.table, k: c.key, op: 'del', ts: c.ts });
    } else {
      const row = await readRow(c.table, c.key);
      if (row === undefined) {
        payload.push({ t: c.table, k: c.key, op: 'del', ts: c.ts });
      } else {
        payload.push({ t: c.table, k: c.key, op: 'put', obj: row, ts: c.ts });
      }
    }
  }

  const res = await apiFetch('/api/sync/push', {
    method: 'POST',
    body: JSON.stringify({ changes: payload }),
  });
  const result = await res.json() as { ok?: boolean; revision?: number; error?: string };
  if (!result.ok) throw new Error(result.error ?? 'push failed');

  const maxRev = changes[changes.length - 1].rev;
  await outboxDeleteUpTo(maxRev);
  await stateSet('lastSyncAt', String(Date.now()));
}

/** Flush outbox repeatedly until empty (handles changes arriving during push). */
export async function flushOutbox(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    if (await outboxCount() === 0) return;
    await pushChanges();
  }
}

// ── pull (cloud → local) ────────────────────────────────────────────────

export async function pullSnapshot(): Promise<PullPayload> {
  const res = await apiFetch('/api/sync/pull');
  return res.json() as Promise<PullPayload>;
}

/** Overwrite local tables from snapshot. Echo-suppressed (no outbox writes). */
export async function applyPull(snap: PullPayload): Promise<void> {
  applyingRemoteFlag.value = true;
  try {
    for (const [table, rows] of Object.entries(snap.rows)) {
      const dexieTable = (db as unknown as Record<string, { clear(): Promise<void>; bulkPut(items: unknown[]): Promise<unknown> }>)[table];
      if (!dexieTable) continue;
      await dexieTable.clear();
      if (rows.length > 0) await dexieTable.bulkPut(rows);
    }
  } finally {
    applyingRemoteFlag.value = false;
  }
}

// ── startup sync (flush-first) ──────────────────────────────────────────

export async function syncOnce(): Promise<{ revision: number }> {
  await flushOutbox();               // local pending changes win first
  const snap = await pullSnapshot(); // then overwrite local with cloud
  await applyPull(snap);
  await stateSet('lastPulledRev', String(snap.revision));
  return { revision: snap.revision };
}

// ── bootstrap (first sync, local has data but cloud empty) ──────────────

export async function bootstrapPush(opts: { includeDemo: boolean }): Promise<void> {
  // Put every local row (optionally excluding demo- prefixed ids) into outbox, then push.
  const tables = ['projects', 'milestones', 'tasks', 'meetings', 'retrospectives',
    'changeRecords', 'bomItems', 'procurementCandidates', 'certRequirements',
    'milEntries', 'workLogs', 'graphNodes', 'graphEdges', 'extractionMeta', 'kbImages'] as const;

  const ts = Date.now();
  for (const table of tables) {
    const rows = await (db as unknown as Record<string, { toArray(): Promise<Array<Record<string, unknown>>> }>)[table].toArray();
    for (const row of rows) {
      const id = String(row.id);
      if (!opts.includeDemo && id.startsWith('demo-')) continue;
      await outboxAdd({ t: table as TableName, k: id, op: 'put', ts });
    }
  }
  await flushOutbox();
  await stateSet('lastPulledRev', '0');
}

// ── escape hatch ────────────────────────────────────────────────────────

/** Manual "upload everything local to cloud" — recovery if cloud was wiped. */
export async function forcePush(): Promise<void> {
  await bootstrapPush({ includeDemo: true });
}
