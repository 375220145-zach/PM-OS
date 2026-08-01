// Independent Dexie DB for sync bookkeeping (outbox + state).
// Fully isolated from the main PmOsDB — main db stays untouched (zero risk to 35 importers).

import Dexie, { type EntityTable } from 'dexie';
import type { SyncChange, TableName } from './types';

export interface OutboxRow {
  rev: number;          // autoincrement
  table: TableName;
  key: string;
  op: 'put' | 'del';
  ts: number;
}

class PmOsSyncDB extends Dexie {
  outbox!: EntityTable<OutboxRow, 'rev'>;
  state!: EntityTable<{ key: string; value: string }, 'key'>;

  constructor() {
    super('PmOsSyncDB');
    this.version(1).stores({
      outbox: '++rev, [table+key]',
      state: 'key',
    });
  }
}

export const syncDb = new PmOsSyncDB();

// ── outbox ──────────────────────────────────────────────────────────────

export async function outboxAdd(c: { t: TableName; k: string; op: 'put' | 'del'; ts: number }): Promise<void> {
  // rev is autoincrement — must NOT be passed explicitly (0 would collide as a real key)
  await syncDb.outbox.add({ table: c.t, key: c.k, op: c.op, ts: c.ts } as unknown as OutboxRow);
}

export async function outboxCount(): Promise<number> {
  return syncDb.outbox.count();
}

/**
 * Fold outbox to final-state changes: group by [table+key], keep the LAST entry.
 * created→deleted collapses to a single `del`; deleted→created collapses to `put`.
 * Returns changes sorted by rev (oldest first).
 */
export async function outboxPeekCollapsed(): Promise<OutboxRow[]> {
  const all = await syncDb.outbox.orderBy('rev').toArray();
  const lastByKey = new Map<string, OutboxRow>();
  for (const row of all) {
    lastByKey.set(`${row.table}::${row.key}`, row);
  }
  return Array.from(lastByKey.values()).sort((a, b) => a.rev - b.rev);
}

/** Delete outbox entries with rev <= maxRev (after successful push). */
export async function outboxDeleteUpTo(maxRev: number): Promise<void> {
  await syncDb.outbox.where('rev').belowOrEqual(maxRev).delete();
}

// ── state ───────────────────────────────────────────────────────────────

export async function stateGet(key: string): Promise<string | undefined> {
  const row = await syncDb.state.get(key);
  return row?.value;
}

export async function stateSet(key: string, value: string): Promise<void> {
  await syncDb.state.put({ key, value });
}
