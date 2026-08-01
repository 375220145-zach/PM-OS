// Server-safe entity extraction — NO IndexedDB/Dexie imports
// Called from API routes (Edge runtime compatible)
// Returns raw nodes+edges, caller is responsible for persistence

import { callDeepSeek, repairJson } from '@/lib/ai';
import { buildExtractionPrompt } from './prompt';
import { validateExtractionOutput, fillNodeDefaults, fillEdgeDefaults } from './extract-shared';
import type { GraphNode, GraphEdge, GraphSourceType } from '@/types';

export async function extractEntitiesApi(
  sourceType: GraphSourceType,
  sourceId: string,
  data: string,
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const systemPrompt = buildExtractionPrompt(sourceType, data);
  const raw = await callDeepSeek(systemPrompt, '请提取实体和关系，严格按 JSON 格式输出。', 16384);
  const cleaned = repairJson(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Extraction returned non-JSON: ${cleaned.slice(0, 200)}`);
  }

  const validation = validateExtractionOutput(parsed);
  if (validation.errors.length > 0) {
    console.warn(`Extraction dropped ${validation.errors.length} invalid item(s):`, validation.errors.slice(0, 5));
  }

  const nodes = (validation.data?.nodes || []) as GraphNode[];
  const edges = (validation.data?.edges || []) as GraphEdge[];

  // Fill in defaults
  for (const node of nodes) fillNodeDefaults(node, sourceType, sourceId);
  for (const edge of edges) fillEdgeDefaults(edge, sourceType, sourceId);

  return { nodes, edges };
}
