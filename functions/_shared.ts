// Shared helpers for Pages Functions (sync + AI).
// Runs on Cloudflare Pages Functions — URL 同域（pages.dev，国内可达）。

export interface Env {
  DB: D1Database;
  CLIENT_SECRET?: string;
  DEEPSEEK_API_KEY?: string;
}

// Minimal D1 typings (wrangler generates real ones; keeps tsc happy without @cloudflare/workers-types)
export interface D1PreparedStatement {
  bind(...args: unknown[]): D1PreparedStatement;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  first<T = Record<string, unknown> | null>(): Promise<T | null>;
}
export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  batch(stmts: D1PreparedStatement[]): Promise<unknown>;
}

export type PagesFunction<E = Env> = (context: {
  request: Request;
  env: E;
  params: Record<string, string>;
  data: unknown;
  next: () => Promise<Response>;
}) => Promise<Response>;

export const TABLE_WHITELIST = new Set([
  'projects', 'milestones', 'tasks', 'meetings', 'retrospectives',
  'changeRecords', 'bomItems', 'procurementCandidates', 'certRequirements',
  'milEntries', 'workLogs', 'graphNodes', 'graphEdges', 'extractionMeta', 'kbImages',
]);

export interface SyncChange {
  t: string;
  k: string;
  op: 'put' | 'del';
  obj?: unknown;
  ts: number;
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

export function authorized(request: Request, env: Env): boolean {
  if (!env.CLIENT_SECRET) return true;
  return request.headers.get('X-Client-Secret') === env.CLIENT_SECRET;
}

export async function pullHandler(env: Env): Promise<Response> {
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

export async function pushHandler(env: Env, body: unknown): Promise<Response> {
  const changes = (body as { changes?: SyncChange[] })?.changes;
  if (!Array.isArray(changes) || changes.length === 0) {
    return json({ error: 'Missing changes array' }, 400);
  }
  if (changes.length > 1000) return json({ error: 'Too many changes (max 1000)' }, 400);

  const stmts: D1PreparedStatement[] = [];
  for (const c of changes) {
    if (!TABLE_WHITELIST.has(c.t)) return json({ error: `Unknown table: ${c.t}` }, 400);
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

  stmts.push(env.DB.prepare("INSERT INTO sync_meta (k, v) VALUES ('revision', '0') ON CONFLICT(k) DO NOTHING"));
  stmts.push(env.DB.prepare("UPDATE sync_meta SET v = CAST(v AS INTEGER) + 1 WHERE k = 'revision'"));
  await env.DB.batch(stmts);

  const rev = await env.DB.prepare("SELECT v FROM sync_meta WHERE k = 'revision'").first<{ v: string }>();
  return json({ ok: true, revision: Number(rev?.v ?? 0) });
}

export async function chatHandler(env: Env, body: unknown): Promise<Response> {
  const { systemPrompt, userMessage } = body as { systemPrompt?: string; userMessage?: string };
  if (!systemPrompt || !userMessage) return json({ error: 'Missing systemPrompt or userMessage' }, 400);
  if (!env.DEEPSEEK_API_KEY) return json({ error: 'DEEPSEEK_API_KEY not configured' }, 500);

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
  if (!content) return json({ error: 'Empty DeepSeek response' }, 502);
  return json({ content });
}
