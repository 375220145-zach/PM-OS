import { callDeepSeek, repairJson } from '@/lib/ai';
import { buildMeetingSystemPrompt } from '@/lib/prompt';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const body = await req.json() as { meetingText?: string };
    const { meetingText } = body;

    if (!meetingText || typeof meetingText !== 'string') {
      return new Response(JSON.stringify({ error: 'meetingText is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = buildMeetingSystemPrompt();
    const userMessage = `<meeting_text>\n${meetingText.slice(0, 8000)}\n</meeting_text>`;

    const raw = await callDeepSeek(systemPrompt, userMessage);
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
