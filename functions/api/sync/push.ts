// POST /api/sync/push — 增量变更
import { json, authorized, pushHandler, type PagesFunction } from '../../_shared';

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  if (!authorized(request, env)) return json({ error: 'Unauthorized' }, 401);
  return pushHandler(env, await request.json());
};
