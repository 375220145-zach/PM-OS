export const runtime = 'edge';

import { callDeepSeekChat } from '@/lib/ai';

const SYSTEM_PROMPT = `你是 Zach 的 PM 知识库助手，整合项目实时数据和知识图谱来回答问题。

回答优先级：
1. 先看「项目实时数据」——这里的工作记录、成本预算、任务状态、MIL问题、会议纪要是该项目的真实情况，回答必须以这些数据为准
2. 再看「知识条目」——来自知识库的通用 PM 知识，用于补充解释和提供参考框架
3. 如果项目数据中已经包含相关信息（如具体成本数字、逾期任务、MIL问题），直接引用这些数据回答，不要用知识库的通用条目替代

回答规则：
- 使用 Markdown 格式，先给出结论再展开
- 项目数据明明有信息却说"无法判断"是错误的——先查项目数据再下结论
- 不要编造任何不在上下文中的信息，包括例子、数字、推测
- 引用时标注来源：项目数据用 [项目数据]，知识条目用 [来源: 条目名]`;

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      query: string;
      context: string;
      history?: { role: 'user' | 'assistant'; content: string }[];
    };

    if (!body.query?.trim()) {
      return Response.json({ error: 'Missing query' }, { status: 400 });
    }

    if (!body.context?.trim()) {
      return Response.json({
        answer: '知识库中暂未收录与你的问题相关的条目。请尝试其他关键词，或先导入 Excel 知识库。',
        sources: [],
      });
    }

    // Build messages
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT },
    ];

    // Recent history
    if (body.history?.length) {
      for (const msg of body.history.slice(-12)) {
        messages.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
      }
    }

    // User message with context
    const userMsg = `参考知识条目：

${body.context}

---
用户问题：${body.query}

请基于以上知识条目回答。如果知识条目不足以回答问题，请明确说明。`;

    messages.push({ role: 'user', content: userMsg });

    // Call DeepSeek
    const answer = await callDeepSeekChat(messages);

    return Response.json({ answer: answer || 'AI 未能生成回答，请重试。' });
  } catch (err) {
    console.error('Graph chat error:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Graph chat failed' },
      { status: 500 },
    );
  }
}
