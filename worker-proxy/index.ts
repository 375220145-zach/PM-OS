/**
 * DeepSeek API Proxy Worker (方案三：纯客户端架构的 Key 隐藏层)
 *
 * PM OS 客户端直接发请求到这个 Worker，Worker 用服务端环境变量中的
 * DeepSeek API Key 转发请求。Key 永远不会暴露到前端代码中。
 *
 * 部署: cd worker-proxy && npx wrangler deploy
 * 环境变量: npx wrangler secret put DEEPSEEK_API_KEY
 */

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Client-Secret',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Only POST
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    // Shared secret — prevents casual abuse (not foolproof, but DeepSeek bills by token)
    // Set via: npx wrangler secret put CLIENT_SECRET (same value in client .env)
    if (env.CLIENT_SECRET) {
      const clientSecret = request.headers.get('X-Client-Secret');
      if (clientSecret !== env.CLIENT_SECRET) {
        return json({ error: 'Unauthorized' }, 401);
      }
    }

    // Parse request
    let body: { systemPrompt?: string; userMessage?: string };
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON' }, 400);
    }

    const { systemPrompt, userMessage } = body;
    if (!systemPrompt || !userMessage) {
      return json({ error: 'systemPrompt and userMessage are required' }, 400);
    }

    // Forward to DeepSeek
    try {
      const deepseekResp = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.3,
          max_tokens: 4096,
          response_format: { type: 'json_object' },
        }),
      });

      if (!deepseekResp.ok) {
        const errText = await deepseekResp.text();
        return json({ error: 'DeepSeek API error', status: deepseekResp.status, detail: errText }, 502);
      }

      const data = await deepseekResp.json() as Record<string, unknown>;
      const content = (data as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message?.content;

      if (!content) {
        return json({ error: 'Empty response from DeepSeek' }, 502);
      }

      return json({ content });
    } catch (err) {
      return json({ error: 'Proxy error', message: (err as Error).message }, 500);
    }
  },
};

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

interface Env {
  DEEPSEEK_API_KEY: string;
  CLIENT_SECRET?: string;
}
