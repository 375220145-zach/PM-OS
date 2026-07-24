/**
 * Client-side DeepSeek API adapter (方案三：纯客户端架构)
 *
 * 替代 src/lib/ai.ts 的服务端版本。
 * 调用 DeepSeek Proxy Worker 而非直接调用 DeepSeek API。
 * Worker URL 和密钥通过环境变量配置，构建时注入。
 */

const PROXY_URL = process.env.NEXT_PUBLIC_DEEPSEEK_PROXY_URL || '';
const CLIENT_SECRET = process.env.NEXT_PUBLIC_CLIENT_SECRET || '';

export async function callDeepSeekClient(systemPrompt: string, userMessage: string): Promise<string> {
  if (!PROXY_URL) {
    throw new Error('NEXT_PUBLIC_DEEPSEEK_PROXY_URL not configured');
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (CLIENT_SECRET) {
    headers['X-Client-Secret'] = CLIENT_SECRET;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await fetch(PROXY_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ systemPrompt, userMessage }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: resp.statusText }));
        throw new Error(`Proxy error (${resp.status}): ${(err as { error?: string }).error}`);
      }

      const data = await resp.json() as { content?: string; error?: string };
      if (data.error) throw new Error(data.error);
      if (!data.content) throw new Error('Empty response from proxy');

      return data.content;
    } catch (err) {
      lastError = err as Error;
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError ?? new Error('DeepSeek proxy call failed');
}

/**
 * JSON 修复工具 — 与服务端版本相同的逻辑
 */
export function repairJson(raw: string): string {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
  return cleaned;
}
