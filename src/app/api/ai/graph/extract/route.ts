export const runtime = 'edge';

import { extractEntitiesApi } from '@/lib/graph/extract-api';
import type { GraphSourceType } from '@/types';

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      data: string;
      sourceType: GraphSourceType;
      sourceId?: string;
    };

    if (!body.data || !body.sourceType) {
      return Response.json({ error: 'Missing data or sourceType' }, { status: 400 });
    }

    const sourceId = body.sourceId || (body.sourceType === 'kb' ? 'kb-excel' : `proj-${Date.now()}`);

    const result = await extractEntitiesApi(body.sourceType, sourceId, body.data);

    return Response.json({
      success: true,
      nodesCreated: result.nodes.length,
      edgesCreated: result.edges.length,
      nodes: result.nodes,
      edges: result.edges,
    });
  } catch (err) {
    console.error('Graph extraction error:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Extraction failed' },
      { status: 500 },
    );
  }
}
