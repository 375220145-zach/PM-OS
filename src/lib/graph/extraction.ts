// LLM-powered entity extraction engine
// Collects project/kb data → calls DeepSeek → validates → returns nodes+edges

import { db } from '@/db/database';
import { buildExtractionPrompt } from './prompt';
import { upsertNodes, upsertEdges, getExtractionMeta, setExtractionMeta, removeNodesByProject, removeEdgesByProject } from './store';
import { RELATION_CONSTRAINTS, ENTITY_TYPES, RELATION_TYPES, buildNodeId } from './types';
import type { GraphNode, GraphEdge, GraphSourceType, ExtractionMeta, GraphEntityType, GraphRelationType } from '@/types';
import { generateId, now } from '@/lib/utils';

// We import callDeepSeek dynamically to avoid bundling server code into client
async function callLLM(systemPrompt: string, userMessage: string): Promise<string> {
  const { callDeepSeek, repairJson } = await import('@/lib/ai');
  const raw = await callDeepSeek(systemPrompt, userMessage);
  return repairJson(raw);
}

// ===== Validation =====

interface ExtractionOutput {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface ValidationError {
  type: 'schema' | 'referential_integrity' | 'edge_validity' | 'id_format';
  message: string;
  index?: number;
}

export function validateExtraction(output: unknown): { valid: boolean; errors: ValidationError[]; data?: ExtractionOutput } {
  const errors: ValidationError[] = [];

  if (!output || typeof output !== 'object') {
    errors.push({ type: 'schema', message: 'Output must be a non-null object' });
    return { valid: false, errors };
  }

  const obj = output as Record<string, unknown>;
  if (!Array.isArray(obj.nodes)) {
    errors.push({ type: 'schema', message: 'Missing or invalid "nodes" array' });
    return { valid: false, errors };
  }
  if (!Array.isArray(obj.edges)) {
    errors.push({ type: 'schema', message: 'Missing or invalid "edges" array' });
    return { valid: false, errors };
  }

  const nodes = obj.nodes as GraphNode[];
  const edges = obj.edges as GraphEdge[];
  const nodeIds = new Set<string>();

  // Validate nodes
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (!n.id || !n.entityType || !n.label) {
      errors.push({ type: 'schema', message: `Node[${i}] missing required fields (id/entityType/label)`, index: i });
      continue;
    }
    if (!ENTITY_TYPES.includes(n.entityType)) {
      errors.push({ type: 'schema', message: `Node[${i}] unknown entityType: ${n.entityType}`, index: i });
    }
    // Validate ID format: {source}--{type}--{label}
    const parts = n.id.split('--');
    if (parts.length < 3) {
      errors.push({ type: 'id_format', message: `Node[${i}] invalid ID format: ${n.id}`, index: i });
    }
    nodeIds.add(n.id);
  }

  // Validate edges
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    if (!e.sourceId || !e.targetId || !e.relation) {
      errors.push({ type: 'schema', message: `Edge[${i}] missing required fields`, index: i });
      continue;
    }
    if (!RELATION_TYPES.includes(e.relation)) {
      errors.push({ type: 'schema', message: `Edge[${i}] unknown relation: ${e.relation}`, index: i });
    }
    // Referential integrity: source and target must exist in nodes
    if (!nodeIds.has(e.sourceId)) {
      errors.push({ type: 'referential_integrity', message: `Edge[${i}] sourceId "${e.sourceId}" not found in nodes`, index: i });
    }
    if (!nodeIds.has(e.targetId)) {
      errors.push({ type: 'referential_integrity', message: `Edge[${i}] targetId "${e.targetId}" not found in nodes`, index: i });
    }
    // Edge validity: check relation constraints
    const constraints = RELATION_CONSTRAINTS[e.relation];
    if (constraints) {
      const sourceNode = nodes.find(n => n.id === e.sourceId);
      const targetNode = nodes.find(n => n.id === e.targetId);
      if (sourceNode && !constraints.source.includes(sourceNode.entityType)) {
        errors.push({ type: 'edge_validity', message: `Edge[${i}] relation ${e.relation} cannot source from ${sourceNode.entityType}`, index: i });
      }
      if (targetNode && !constraints.target.includes(targetNode.entityType)) {
        errors.push({ type: 'edge_validity', message: `Edge[${i}] relation ${e.relation} cannot target ${targetNode.entityType}`, index: i });
      }
    }
  }

  return { valid: errors.length === 0, errors, data: { nodes, edges } };
}

// ===== Extraction Engine =====

export interface ExtractionInput {
  sourceType: GraphSourceType;
  sourceId: string;       // projectId for proj, 'kb-excel' for kb
  data: string;           // serialized project or kb data
  autoValidate?: boolean; // default true — reject invalid output
}

export async function extractEntities(input: ExtractionInput): Promise<ExtractionOutput> {
  // Check staleness
  const meta = await getExtractionMeta(input.sourceId);
  if (meta) {
    const sourceUpdatedAt = await getSourceUpdatedAt(input);
    if (sourceUpdatedAt && sourceUpdatedAt <= meta.lastSourceUpdatedAt) {
      // Not stale — could return cached data, but for now we re-extract
      // This is the hook for caching in Phase 4
    }
  }

  // Build prompt and call LLM
  const systemPrompt = buildExtractionPrompt(input.sourceType, input.data);
  const raw = await callLLM(systemPrompt, '请提取实体和关系，严格按 JSON 格式输出。');

  // Parse and validate
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`LLM extraction returned non-JSON: ${raw.slice(0, 200)}`);
  }

  const validation = validateExtraction(parsed);
  if (!validation.valid && input.autoValidate !== false) {
    console.warn('Extraction validation warnings:', validation.errors);
    // Still proceed with valid nodes/edges if data exists
  }

  const nodes = validation.data?.nodes || [];
  const edges = validation.data?.edges || [];

  // Assign IDs to nodes without them and source type if missing
  for (const node of nodes) {
    if (!node.source) node.source = input.sourceType;
    if (input.sourceType === 'proj' && !node.projectId) node.projectId = input.sourceId;
    if (!node.id) node.id = buildNodeId(input.sourceType, node.entityType, node.label, input.sourceType === 'proj' ? input.sourceId : undefined);
    if (!node.normalizedLabel) {
      node.normalizedLabel = node.label.toLowerCase().replace(/[\s+/#@&()（）]+/g, '-').replace(/[^\w一-鿿-]/g, '');
    }
    if (!node.properties) node.properties = {};
  }

  // Assign IDs to edges
  for (const edge of edges) {
    if (!edge.id) edge.id = `${input.sourceId.slice(0, 8)}--${edge.relation}--${(edge.sourceId || '').slice(0, 8)}--${(edge.targetId || '').slice(0, 8)}`;
    if (input.sourceType === 'proj' && !edge.projectId) edge.projectId = input.sourceId;
    if (!edge.weight) edge.weight = 1;
    if (!edge.properties) edge.properties = {};
  }

  // If re-extracting from a project source, clear old data first
  if (input.sourceType === 'proj') {
    await removeNodesByProject(input.sourceId);
    await removeEdgesByProject(input.sourceId);
  }

  // Persist
  await upsertNodes(nodes);
  await upsertEdges(edges);

  // Update extraction meta
  const sourceUpdatedAt = await getSourceUpdatedAt(input);
  await setExtractionMeta({
    id: input.sourceId,
    sourceId: input.sourceId,
    sourceType: input.sourceType,
    lastExtractedAt: now(),
    lastSourceUpdatedAt: sourceUpdatedAt || now(),
    nodeCount: nodes.length,
    edgeCount: edges.length,
  });

  return { nodes, edges };
}

async function getSourceUpdatedAt(input: ExtractionInput): Promise<number | null> {
  if (input.sourceType === 'proj') {
    const project = await db.projects.get(input.sourceId);
    return project?.updatedAt || null;
  }
  // For kb source, no auto-detection — always re-extract unless manually set
  return null;
}
