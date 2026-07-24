export const runtime = 'edge';

import { callDeepSeek, repairJson } from '@/lib/ai';
import { buildScheduleHealthPrompt } from '@/lib/prompt';

export async function POST(req: Request) {
  try {
    const { data } = await req.json() as { data: string };
    if (!data) {
      return Response.json({ error: 'Missing project data' }, { status: 400 });
    }

    const systemPrompt = buildScheduleHealthPrompt(data);
    const raw = await callDeepSeek(systemPrompt, '请分析以上项目数据中的排期健康度。');
    const cleaned = repairJson(raw);
    const result = JSON.parse(cleaned);

    return Response.json(result);
  } catch (err) {
    console.error('Schedule health check error:', err);
    return Response.json({ error: 'Schedule health check failed' }, { status: 500 });
  }
}
