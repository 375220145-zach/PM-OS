import { callDeepSeek, repairJson } from '@/lib/ai';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const body = await req.json() as { logs?: { text: string; done: boolean }[][]; projectName?: string };
    const { logs, projectName } = body;

    if (!logs || !Array.isArray(logs) || logs.length === 0) {
      return new Response(JSON.stringify({ error: 'logs array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const logTexts = logs.map((items, i) =>
      `[记录 ${i + 1}]\n` + items.map(item => `${item.done ? '[已完成]' : '[待办]'} ${item.text}`).join('\n')
    ).join('\n\n');

    const systemPrompt = `你是面向硬件产品研发项目经理的复盘分析助手。
根据项目的工作记录（含待办项及其完成状态），分析其中的模式和关键事件。

## 项目名称
${projectName ?? '未命名项目'}

## 工作记录（含完成状态）
${logTexts}

## 输出格式（严格 JSON）
{
  "summary": "对工作记录的整体分析摘要，指出主要的问题领域、重复出现的模式、关键转折点。200-300字。",
  "patterns": [
    { "category": "延期原因", "count": 5, "examples": ["供应商延期", "物料缺货"] },
    { "category": "变更请求", "count": 3, "examples": ["艺人要求改色", "产品需求变更"] }
  ],
  "timeline": [
    { "event": "关键事件描述", "impact": "对项目的影响" }
  ]
}

## 注意事项
- 类别包括但不限于：延期原因、供应商问题、变更请求、沟通问题、资源问题、技术风险
- 每个类别的 examples 给出 2-3 个具体例子
- timeline 提取 3-5 个关键事件节点`;

    const raw = await callDeepSeek(systemPrompt, '请分析以上工作记录的模式和关键事件。');
    const cleaned = repairJson(raw);
    const result = JSON.parse(cleaned);

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Analysis failed', message: (err as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
