// BFS graph traversal for retrieving cross-project context
// Mirrors vault-rag's graph_expand() pattern adapted for PM OS domain entities

import type { GraphData, GraphContext, GraphNode, GraphEdge, GraphEntityType } from '@/types';
import { ENTITY_LABELS, RELATION_LABELS } from './types';

interface TraversalOptions {
  maxDepth: number;       // default 2
  maxNodes: number;       // default 50 — hard cap on visited nodes
  entityTypeFilter?: GraphEntityType[];  // only include these types in result
}

const DEFAULT_OPTIONS: TraversalOptions = {
  maxDepth: 2,
  maxNodes: 50,
};

/** BFS from seed node IDs. Returns all visited nodes + edges, respecting depth/node limits. */
export function bfsTraverse(
  seedNodeIds: string[],
  graph: GraphData,
  options: Partial<TraversalOptions> = {},
): { visitedNodes: GraphNode[]; visitedEdges: GraphEdge[] } {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const visited = new Set<string>();
  const visitedEdges: GraphEdge[] = [];
  const queue: { nodeId: string; depth: number }[] = seedNodeIds.map(id => ({ nodeId: id, depth: 0 }));

  for (const seed of seedNodeIds) {
    visited.add(seed);
  }

  let head = 0;
  while (head < queue.length && visited.size < opts.maxNodes) {
    const { nodeId, depth } = queue[head++];
    if (depth >= opts.maxDepth) continue;

    const neighbors = graph.adjacencyList.get(nodeId) || [];
    for (const neighborId of neighbors) {
      // Find the edge connecting these two (either direction)
      const edge = graph.edges.find(
        e => (e.sourceId === nodeId && e.targetId === neighborId) ||
             (e.sourceId === neighborId && e.targetId === nodeId),
      );

      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        visitedEdges.push(...(edge ? [edge] : []));
        queue.push({ nodeId: neighborId, depth: depth + 1 });
      } else if (edge && !visitedEdges.includes(edge)) {
        visitedEdges.push(edge);
      }
    }
  }

  const visitedNodes = Array.from(visited)
    .map(id => graph.nodes.get(id))
    .filter((n): n is GraphNode => {
      if (!n) return false;
      if (opts.entityTypeFilter && !opts.entityTypeFilter.includes(n.entityType)) return false;
      return true;
    });

  return { visitedNodes, visitedEdges };
}

/** Format traversal results into human-readable context for agent prompts */
export function formatContext(
  seedProjectId: string,
  visitedNodes: GraphNode[],
  visitedEdges: GraphEdge[],
): GraphContext {
  const crossProjectEntities: GraphContext['crossProjectEntities'] = [];
  const relatedNodes: GraphContext['relatedNodes'] = [];
  const seenPairs = new Set<string>();

  for (const node of visitedNodes) {
    // Cross-project entities (same real-world entity appearing in multiple projects)
    if (node.source === 'proj' && node.projectId && node.projectId !== seedProjectId) {
      const key = `${node.entityType}--${node.normalizedLabel}`;
      if (!seenPairs.has(key)) {
        seenPairs.add(key);
        const edge = visitedEdges.find(e => e.sourceId === node.id || e.targetId === node.id);
        crossProjectEntities.push({
          entityType: ENTITY_LABELS[node.entityType] || node.entityType,
          label: node.label,
          sourceProjectIds: [node.projectId],
          relevance: edge ? `${RELATION_LABELS[edge.relation] || edge.relation}关联` : '',
        });
      }
    }

    // Related nodes (direct neighbors)
    const edgesForNode = visitedEdges.filter(
      e => e.sourceId === node.id || e.targetId === node.id,
    );
    for (const edge of edgesForNode) {
      const otherId = edge.sourceId === node.id ? edge.targetId : edge.sourceId;
      const pairKey = `${node.id}<->${otherId}`;
      if (!seenPairs.has(pairKey) && node.id !== otherId) {
        seenPairs.add(pairKey);
        const otherNode = visitedNodes.find(n => n.id === otherId);
        if (otherNode) {
          relatedNodes.push({
            nodeId: otherNode.id,
            label: otherNode.label,
            entityType: ENTITY_LABELS[otherNode.entityType] || otherNode.entityType,
            relation: RELATION_LABELS[edge.relation] || edge.relation,
            distance: 1,
          });
        }
      }
    }
  }

  // Build natural language summary
  const summaryParts: string[] = [];
  if (crossProjectEntities.length > 0) {
    const entities = crossProjectEntities.slice(0, 5);
    summaryParts.push(
      entities.map(e =>
        `${e.entityType}「${e.label}」在项目 ${e.sourceProjectIds.join('、')} 中出现过`
      ).join('；'),
    );
  }
  if (relatedNodes.length > 0 && crossProjectEntities.length === 0) {
    summaryParts.push(`该项目的实体与其他 ${relatedNodes.length} 个知识条目关联`);
  }
  const summary = summaryParts.length > 0
    ? `[跨项目知识图谱] ${summaryParts.join('。')}。`
    : '暂无跨项目关联数据。';

  return { crossProjectEntities, relatedNodes, summary };
}

/** Convenience: traverse from seed nodes and return formatted GraphContext */
export function collectGraphContext(
  seedProjectId: string,
  seedNodeIds: string[],
  graph: GraphData,
  options?: Partial<TraversalOptions>,
): GraphContext {
  if (seedNodeIds.length === 0) {
    return { crossProjectEntities: [], relatedNodes: [], summary: '暂无跨项目关联数据。' };
  }
  const { visitedNodes, visitedEdges } = bfsTraverse(seedNodeIds, graph, options);
  return formatContext(seedProjectId, visitedNodes, visitedEdges);
}
