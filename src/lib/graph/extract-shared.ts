// Pure, client-safe extraction validation + default filling.
// Shared by extract-api.ts (server route) and ai-remote.ts (client direct call).
// No server-only imports here.

import { RELATION_CONSTRAINTS, ENTITY_TYPES, RELATION_TYPES, buildNodeId } from './types';
import type { GraphNode, GraphEdge, GraphSourceType } from '@/types';

export interface ExtractionOutput {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ValidationError {
  type: string;
  message: string;
  index?: number;
}

export function validateExtractionOutput(output: unknown): { valid: boolean; errors: ValidationError[]; data?: ExtractionOutput } {
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
  const validNodes: GraphNode[] = [];
  const validEdges: GraphEdge[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (!n.id || !n.entityType || !n.label) {
      errors.push({ type: 'schema', message: `Node[${i}] missing id/entityType/label`, index: i });
      continue;
    }
    if (!ENTITY_TYPES.includes(n.entityType)) {
      errors.push({ type: 'schema', message: `Node[${i}] unknown type: ${n.entityType}`, index: i });
      continue;
    }
    nodeIds.add(n.id);
    validNodes.push(n);
  }

  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    if (!e.sourceId || !e.targetId || !e.relation) {
      errors.push({ type: 'schema', message: `Edge[${i}] missing fields`, index: i });
      continue;
    }
    if (!RELATION_TYPES.includes(e.relation)) {
      errors.push({ type: 'schema', message: `Edge[${i}] unknown relation: ${e.relation}`, index: i });
      continue;
    }
    if (!nodeIds.has(e.sourceId)) {
      errors.push({ type: 'referential_integrity', message: `Edge[${i}] source ${e.sourceId.slice(0, 20)} not found`, index: i });
      continue;
    }
    if (!nodeIds.has(e.targetId)) {
      errors.push({ type: 'referential_integrity', message: `Edge[${i}] target ${e.targetId.slice(0, 20)} not found`, index: i });
      continue;
    }
    const constraints = RELATION_CONSTRAINTS[e.relation];
    if (constraints) {
      const sourceNode = validNodes.find(n => n.id === e.sourceId);
      const targetNode = validNodes.find(n => n.id === e.targetId);
      if (sourceNode && !constraints.source.includes(sourceNode.entityType)) {
        errors.push({ type: 'edge_validity', message: `Edge[${i}] relation ${e.relation} cannot source from ${sourceNode.entityType}`, index: i });
        continue;
      }
      if (targetNode && !constraints.target.includes(targetNode.entityType)) {
        errors.push({ type: 'edge_validity', message: `Edge[${i}] relation ${e.relation} cannot target ${targetNode.entityType}`, index: i });
        continue;
      }
    }
    validEdges.push(e);
  }

  return { valid: errors.length === 0, errors, data: { nodes: validNodes, edges: validEdges } };
}

export function fillNodeDefaults(node: GraphNode, sourceType: GraphSourceType, sourceId: string): GraphNode {
  const now = Date.now();
  if (!node.source) node.source = sourceType;
  if (sourceType === 'proj' && !node.projectId) node.projectId = sourceId;
  if (!node.id) node.id = buildNodeId(sourceType, node.entityType, node.label, sourceType === 'proj' ? sourceId : undefined);
  if (!node.normalizedLabel) {
    node.normalizedLabel = node.label.toLowerCase().replace(/[\s+/#@&()（）]+/g, '-').replace(/[^\w一-鿿-]/g, '');
  }
  if (!node.properties) node.properties = {};
  if (!node.createdAt) node.createdAt = now;
  if (!node.updatedAt) node.updatedAt = now;
  return node;
}

export function fillEdgeDefaults(edge: GraphEdge, sourceType: GraphSourceType, sourceId: string): GraphEdge {
  const now = Date.now();
  // Full node IDs in the key — short slices collide and overwrite same-type edges
  if (!edge.id) edge.id = `${sourceId.slice(0, 8)}--${edge.relation}--${edge.sourceId || 'none'}--${edge.targetId || 'none'}`;
  if (sourceType === 'proj' && !edge.projectId) edge.projectId = sourceId;
  if (!edge.weight) edge.weight = 1;
  if (!edge.properties) edge.properties = {};
  if (!edge.createdAt) edge.createdAt = now;
  return edge;
}
