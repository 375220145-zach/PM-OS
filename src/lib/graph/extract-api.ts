// Server-safe entity extraction — NO IndexedDB/Dexie imports
// Called from API routes (Edge runtime compatible)
// Returns raw nodes+edges, caller is responsible for persistence

import { callDeepSeek, repairJson } from '@/lib/ai';
import { buildExtractionPrompt } from './prompt';
import { RELATION_CONSTRAINTS, ENTITY_TYPES, RELATION_TYPES, buildNodeId } from './types';
import type { GraphNode, GraphEdge, GraphSourceType } from '@/types';

interface ExtractionOutput {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface ValidationError {
  type: string;
  message: string;
  index?: number;
}

function validateExtractionOutput(output: unknown): { valid: boolean; errors: ValidationError[]; data?: ExtractionOutput } {
  const errors: ValidationError[] = [];
  if (!output || typeof output !== 'object') {
    errors.push({ type: 'schema', message: 'Output must be an object' });
    return { valid: false, errors };
  }
  const obj = output as Record<string, unknown>;
  if (!Array.isArray(obj.nodes)) {
    errors.push({ type: 'schema', message: 'Missing nodes array' });
    return { valid: false, errors };
  }
  if (!Array.isArray(obj.edges)) {
    errors.push({ type: 'schema', message: 'Missing edges array' });
    return { valid: false, errors };
  }

  const nodes = obj.nodes as GraphNode[];
  const edges = obj.edges as GraphEdge[];
  const nodeIds = new Set<string>();

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (!n.id || !n.entityType || !n.label) {
      errors.push({ type: 'schema', message: `Node[${i}] missing id/entityType/label`, index: i });
      continue;
    }
    if (!ENTITY_TYPES.includes(n.entityType)) {
      errors.push({ type: 'schema', message: `Node[${i}] unknown type: ${n.entityType}`, index: i });
    }
    nodeIds.add(n.id);
  }

  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    if (!e.sourceId || !e.targetId || !e.relation) {
      errors.push({ type: 'schema', message: `Edge[${i}] missing fields`, index: i });
      continue;
    }
    if (!RELATION_TYPES.includes(e.relation)) {
      errors.push({ type: 'schema', message: `Edge[${i}] unknown relation: ${e.relation}`, index: i });
    }
    if (!nodeIds.has(e.sourceId)) {
      errors.push({ type: 'referential_integrity', message: `Edge[${i}] source ${e.sourceId.slice(0, 20)} not found`, index: i });
    }
    if (!nodeIds.has(e.targetId)) {
      errors.push({ type: 'referential_integrity', message: `Edge[${i}] target ${e.targetId.slice(0, 20)} not found`, index: i });
    }
  }

  return { valid: errors.length === 0, errors, data: { nodes, edges } };
}

export async function extractEntitiesApi(
  sourceType: GraphSourceType,
  sourceId: string,
  data: string,
): Promise<ExtractionOutput> {
  const systemPrompt = buildExtractionPrompt(sourceType, data);
  const raw = await callDeepSeek(systemPrompt, '请提取实体和关系，严格按 JSON 格式输出。');
  const cleaned = repairJson(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Extraction returned non-JSON: ${cleaned.slice(0, 200)}`);
  }

  const validation = validateExtractionOutput(parsed);
  if (!validation.valid) {
    console.warn('Extraction validation warnings:', validation.errors.slice(0, 5));
  }

  const nodes = (validation.data?.nodes || []) as GraphNode[];
  const edges = (validation.data?.edges || []) as GraphEdge[];

  // Fill in defaults
  const now = Date.now();
  for (const node of nodes) {
    if (!node.source) node.source = sourceType;
    if (sourceType === 'proj' && !node.projectId) node.projectId = sourceId;
    if (!node.id) node.id = buildNodeId(sourceType, node.entityType, node.label, sourceType === 'proj' ? sourceId : undefined);
    if (!node.normalizedLabel) {
      node.normalizedLabel = node.label.toLowerCase().replace(/[\s+/#@&()（）]+/g, '-').replace(/[^\w一-鿿-]/g, '');
    }
    if (!node.properties) node.properties = {};
    if (!node.createdAt) node.createdAt = now;
    if (!node.updatedAt) node.updatedAt = now;
  }

  for (const edge of edges) {
    if (!edge.id) edge.id = `${sourceId.slice(0, 8)}--${edge.relation}--${(edge.sourceId || '').slice(0, 8)}--${(edge.targetId || '').slice(0, 8)}`;
    if (sourceType === 'proj' && !edge.projectId) edge.projectId = sourceId;
    if (!edge.weight) edge.weight = 1;
    if (!edge.properties) edge.properties = {};
    if (!edge.createdAt) edge.createdAt = now;
  }

  return { nodes, edges };
}
