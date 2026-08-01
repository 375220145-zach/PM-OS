// POST /api/ai/chat — DeepSeek 转发（{ systemPrompt, userMessage } → { content }）
import { json, authorized, chatHandler, type PagesFunction } from '../../_shared';

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  if (!authorized(request, env)) return json({ error: 'Unauthorized' }, 401);
  return chatHandler(env, await request.json());
};
