import { callDeepSeek, repairJson } from '@/lib/ai';
import { buildRetroSystemPrompt } from '@/lib/prompt';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const body = await req.json() as { projectData?: string };
    const { projectData } = body;

    if (!projectData || typeof projectData !== 'string') {
      return new Response(JSON.stringify({ error: 'projectData is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = buildRetroSystemPrompt(projectData.slice(0, 10000));
    const userMessage = '请根据以上项目数据生成复盘报告。';

    const raw = await callDeepSeek(systemPrompt, userMessage);
    const cleaned = repairJson(raw);
    const result = JSON.parse(cleaned);

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Generation failed', message: (err as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
