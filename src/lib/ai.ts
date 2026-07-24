import OpenAI from 'openai';

function getClient(): OpenAI {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY not configured');
  }
  return new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey,
  });
}

export async function callDeepSeek(systemPrompt: string, userMessage: string): Promise<string> {
  const client = getClient();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('Empty response from DeepSeek');
      return content;
    } catch (err) {
      lastError = err as Error;
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError ?? new Error('DeepSeek API call failed');
}

export function repairJson(raw: string): string {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
  return cleaned;
}
