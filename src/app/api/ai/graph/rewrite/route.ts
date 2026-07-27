export const runtime = 'edge';

import { callDeepSeekChat } from '@/lib/ai';

export async function POST(req: Request) {
  try {
    const body = await req.json() as { query: string };

    if (!body.query?.trim()) {
      return Response.json({ rewritten: body.query || '' });
    }

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [
      {
        role: 'system',
        content: `你是查询改写助手。将用户的口语化问题改写为检索关键词。

规则：
1. 提取核心技术术语——用知识库中可能出现的术语替代口语表达
2. 展开缩写和简称（如"波峰焊"←"焊接"）
3. 如果用户提到具体项目名，保留项目名同时提取相关的技术关键词
4. 输出一段空格分隔的关键词，不要加解释
5. 关键词以中文为主，关键技术术语保留中英双语`,
      },
      { role: 'user', content: body.query },
    ];

    const rewritten = await callDeepSeekChat(messages);
    return Response.json({ rewritten: rewritten?.trim() || body.query });
  } catch (err) {
    console.error('Query rewrite error:', err);
    // Fallback: return original query
    const body = await req.json().catch(() => ({ query: '' }));
    return Response.json({ rewritten: body.query || '' });
  }
}
