// Sync engine types — mirrors src/db/database.ts table list (keep in sync)

export const SYNC_TABLES = [
  'projects', 'milestones', 'tasks', 'meetings', 'retrospectives',
  'changeRecords', 'bomItems', 'procurementCandidates', 'certRequirements',
  'milEntries', 'workLogs', 'graphNodes', 'graphEdges', 'extractionMeta', 'kbImages',
] as const;

export type TableName = (typeof SYNC_TABLES)[number];

export type SyncOp = 'put' | 'del';

export interface SyncChange {
  t: TableName;
  k: string;
  op: SyncOp;
  obj?: unknown;
  ts: number;
}

export interface PullPayload {
  revision: number;
  rows: Record<string, unknown[]>;
}
