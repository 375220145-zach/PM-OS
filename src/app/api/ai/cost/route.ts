export const runtime = 'edge';

import { callDeepSeek, repairJson } from '@/lib/ai';
import { buildCostAnalysisPrompt } from '@/lib/prompt';

export async function POST(req: Request) {
  try {
    const { data } = await req.json() as { data: string };
    if (!data) {
      return Response.json({ error: 'Missing project data' }, { status: 400 });
    }

    const systemPrompt = buildCostAnalysisPrompt(data);
    const raw = await callDeepSeek(systemPrompt, '请分析以上项目数据中的成本偏差。');
    const cleaned = repairJson(raw);
    const result = JSON.parse(cleaned);

    return Response.json(result);
  } catch (err) {
    console.error('Cost analysis error:', err);
    return Response.json({ error: 'Cost analysis failed' }, { status: 500 });
  }
}
