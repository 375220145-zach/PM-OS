/**
 * PM OS Sync Worker
 * - GET  /api/sync/pull   → 全量拉取（{ revision, rows: Record<tbl, unknown[]> }）
 * - POST /api/sync/push   → 增量变更（upsert/delete，batch 原子，revision+1）
 * - POST /api/ai/chat     → DeepSeek 转发（{ systemPrompt, userMessage } → { content }）
 *
 * 鉴权：X-Client-Secret header === env.CLIENT_SECRET
 * 表名白名单校验（永不进入 SQL 拼接，只作参数）
 */

// Minimal D1 typings (wrangler generates real ones; this keeps tsc happy without @cloudflare/workers-types)
export interface D1PreparedStatement {
  bind(...args: unknown[]): D1PreparedStatement;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  first<T = Record<string, unknown> | null>(): Promise<T | null>;
}
export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  batch(stmts: D1PreparedStatement[]): Promise<unknown>;
}

export interface Env {
  DB: D1Database;
  CLIENT_SECRET?: string;
  DEEPSEEK_API_KEY?: string;
}

const TABLE_WHITELIST = new Set([
  'projects', 'milestones', 'tasks', 'meetings', 'retrospectives',
  'changeRecords', 'bomItems', 'procurementCandidates', 'certRequirements',
  'milEntries', 'workLogs', 'graphNodes', 'graphEdges', 'extractionMeta', 'kbImages',
]);

interface SyncChange {
  t: string;          // table name
  k: string;          // row id
  op: 'put' | 'del';
  obj?: unknown;
  ts: number;         // client monotonic clock
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

function authorized(request: Request, env: Env): boolean {
  if (!env.CLIENT_SECRET) return true; // no secret configured → open (dev)
  return request.headers.get('X-Client-Secret') === env.CLIENT_SECRET;
}

// ── pull ────────────────────────────────────────────────────────────────

async function pullHandler(env: Env): Promise<Response> {
  const rows = await env.DB.prepare('SELECT tbl, id, data FROM sync_rows').all<{ tbl: string; id: string; data: string }>();
  const meta = await env.DB.prepare("SELECT v FROM sync_meta WHERE k = 'revision'").first<{ v: string }>();

  const grouped: Record<string, unknown[]> = {};
  for (const r of rows.results) {
    let parsed: unknown;
    try { parsed = JSON.parse(r.data); } catch { continue; }
    (grouped[r.tbl] ??= []).push(parsed);
  }

  return json({ revision: Number(meta?.v ?? 0), rows: grouped });
}

// ── push ────────────────────────────────────────────────────────────────

async function pushHandler(env: Env, body: unknown): Promise<Response> {
  const changes = (body as { changes?: SyncChange[] })?.changes;
  if (!Array.isArray(changes) || changes.length === 0) {
    return json({ error: 'Missing changes array' }, 400);
  }
  if (changes.length > 1000) {
    return json({ error: 'Too many changes (max 1000)' }, 400);
  }

  const stmts: D1PreparedStatement[] = [];
  for (const c of changes) {
    if (!TABLE_WHITELIST.has(c.t)) {
      return json({ error: `Unknown table: ${c.t}` }, 400);
    }
    if (c.op === 'del') {
      stmts.push(env.DB.prepare('DELETE FROM sync_rows WHERE tbl = ? AND id = ?').bind(c.t, c.k));
    } else {
      stmts.push(
        env.DB.prepare(
          `INSERT INTO sync_rows (tbl, id, data, updated_at) VALUES (?, ?, ?, ?)
           ON CONFLICT(tbl, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
        ).bind(c.t, c.k, JSON.stringify(c.obj ?? {}), c.ts ?? Date.now()),
      );
    }
  }

  // Ensure revision row exists, then bump it
  stmts.push(env.DB.prepare("INSERT INTO sync_meta (k, v) VALUES ('revision', '0') ON CONFLICT(k) DO NOTHING"));
  stmts.push(env.DB.prepare("UPDATE sync_meta SET v = CAST(v AS INTEGER) + 1 WHERE k = 'revision'"));
  await env.DB.batch(stmts);

  const rev = await env.DB.prepare("SELECT v FROM sync_meta WHERE k = 'revision'").first<{ v: string }>();
  return json({ ok: true, revision: Number(rev?.v ?? 0) });
}

// ── DeepSeek chat (same contract as worker-proxy) ──────────────────────

async function chatHandler(env: Env, body: unknown): Promise<Response> {
  const { systemPrompt, userMessage } = body as { systemPrompt?: string; userMessage?: string };
  if (!systemPrompt || !userMessage) {
    return json({ error: 'Missing systemPrompt or userMessage' }, 400);
  }
  if (!env.DEEPSEEK_API_KEY) {
    return json({ error: 'DEEPSEEK_API_KEY not configured' }, 500);
  }

  const resp = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 16384,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    return json({ error: `DeepSeek error (${resp.status}): ${errText.slice(0, 300)}` }, 502);
  }

  const data = await resp.json() as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    return json({ error: 'Empty DeepSeek response' }, 502);
  }
  return json({ content });
}

// ── router ──────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Client-Secret',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (!authorized(request, env)) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const url = new URL(request.url);
    try {
      if (url.pathname === '/api/sync/pull' && request.method === 'GET') {
        return await pullHandler(env);
      }
      if (url.pathname === '/api/sync/push' && request.method === 'POST') {
        return await pushHandler(env, await request.json());
      }
      if (url.pathname === '/api/ai/chat' && request.method === 'POST') {
        return await chatHandler(env, await request.json());
      }
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : 'Internal error' }, 500);
    }

    return json({ error: 'Not found' }, 404);
  },
};
