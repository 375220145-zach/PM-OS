// GET /api/sync/pull — 全量拉取
import { json, authorized, pullHandler, type PagesFunction } from '../../_shared';

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  if (!authorized(request, env)) return json({ error: 'Unauthorized' }, 401);
  return pullHandler(env);
};
