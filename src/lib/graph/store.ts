// IndexedDB CRUD operations for the knowledge graph
// Manages graphNodes, graphEdges, extractionMeta, kbImages tables

import { db } from '@/db/database';
import type { GraphNode, GraphEdge, GraphData, ExtractionMeta, KbImageRecord, GraphSourceType } from '@/types';
import { generateId, now } from '@/lib/utils';

// ===== Node Operations =====

export async function getAllNodes(): Promise<GraphNode[]> {
  return db.graphNodes.toArray();
}

export async function getNodesBySource(source: GraphSourceType): Promise<GraphNode[]> {
  return db.graphNodes.where('source').equals(source).toArray();
}

export async function getNodesByProject(projectId: string): Promise<GraphNode[]> {
  return db.graphNodes.filter(n => n.projectId === projectId).toArray();
}

export async function getNodesByType(entityType: string): Promise<GraphNode[]> {
  return db.graphNodes.where('entityType').equals(entityType).toArray();
}

export async function getNodeById(id: string): Promise<GraphNode | undefined> {
  return db.graphNodes.get(id);
}

export async function getNodeByNormalizedLabel(normalizedLabel: string): Promise<GraphNode | undefined> {
  return db.graphNodes.where('normalizedLabel').equals(normalizedLabel).first();
}

export async function upsertNode(node: GraphNode): Promise<void> {
  const existing = await db.graphNodes.get(node.id);
  if (existing) {
    await db.graphNodes.update(node.id, { ...node, updatedAt: now() });
  } else {
    await db.graphNodes.put({ ...node, createdAt: now(), updatedAt: now() });
  }
}

export async function upsertNodes(nodes: GraphNode[]): Promise<void> {
  const now_ = now();
  for (const node of nodes) {
    const existing = await db.graphNodes.get(node.id);
    if (existing) {
      await db.graphNodes.update(node.id, {
        label: node.label,
        properties: { ...existing.properties, ...node.properties },
        updatedAt: now_,
      });
    } else {
      await db.graphNodes.put({ ...node, createdAt: now_, updatedAt: now_ });
    }
  }
}

export async function removeNodesByProject(projectId: string): Promise<void> {
  const nodes = await getNodesByProject(projectId);
  for (const n of nodes) {
    await db.graphNodes.delete(n.id);
  }
}

export async function removeNodesBySource(source: GraphSourceType): Promise<void> {
  const nodes = await getNodesBySource(source);
  for (const n of nodes) {
    await db.graphNodes.delete(n.id);
  }
}

// ===== Edge Operations =====

export async function getAllEdges(): Promise<GraphEdge[]> {
  return db.graphEdges.toArray();
}

export async function getEdgesBySource(sourceId: string): Promise<GraphEdge[]> {
  return db.graphEdges.where('sourceId').equals(sourceId).toArray();
}

export async function getEdgesByTarget(targetId: string): Promise<GraphEdge[]> {
  return db.graphEdges.where('targetId').equals(targetId).toArray();
}

export async function getEdgesByNode(nodeId: string): Promise<GraphEdge[]> {
  const [outgoing, incoming] = await Promise.all([
    db.graphEdges.where('sourceId').equals(nodeId).toArray(),
    db.graphEdges.where('targetId').equals(nodeId).toArray(),
  ]);
  return [...outgoing, ...incoming];
}

export async function getEdgesByProject(projectId: string): Promise<GraphEdge[]> {
  return db.graphEdges.filter(e => e.projectId === projectId).toArray();
}

export async function upsertEdge(edge: GraphEdge): Promise<void> {
  const existing = await db.graphEdges.get(edge.id);
  if (existing) {
    await db.graphEdges.update(edge.id, { ...edge });
  } else {
    await db.graphEdges.put({ ...edge, createdAt: now() });
  }
}

export async function upsertEdges(edges: GraphEdge[]): Promise<void> {
  for (const edge of edges) {
    await upsertEdge(edge);
  }
}

export async function removeEdgesByProject(projectId: string): Promise<void> {
  const edges = await getEdgesByProject(projectId);
  for (const e of edges) {
    await db.graphEdges.delete(e.id);
  }
}

// ===== Graph-wide Operations =====

/** Build adjacency list from all edges (in-memory) */
export function buildAdjacencyList(nodes: GraphNode[], edges: GraphEdge[]): Map<string, string[]> {
  const nodeIds = new Set(nodes.map(n => n.id));
  const adj = new Map<string, string[]>();

  for (const n of nodes) {
    adj.set(n.id, []);
  }

  for (const e of edges) {
    if (!nodeIds.has(e.sourceId) || !nodeIds.has(e.targetId)) continue;
    const neighbors = adj.get(e.sourceId) || [];
    neighbors.push(e.targetId);
    adj.set(e.sourceId, neighbors);
    // Undirected for traversal purposes
    const revNeighbors = adj.get(e.targetId) || [];
    revNeighbors.push(e.sourceId);
    adj.set(e.targetId, revNeighbors);
  }

  return adj;
}

/** Load entire graph into memory */
export async function loadGraph(): Promise<GraphData> {
  const [nodes, edges] = await Promise.all([
    db.graphNodes.toArray(),
    db.graphEdges.toArray(),
  ]);
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const adjacencyList = buildAdjacencyList(nodes, edges);
  return { nodes: nodeMap, edges, adjacencyList };
}

// ===== Extraction Metadata =====

export async function getExtractionMeta(sourceId: string): Promise<ExtractionMeta | undefined> {
  return db.extractionMeta.where('sourceId').equals(sourceId).first();
}

export async function setExtractionMeta(meta: ExtractionMeta): Promise<void> {
  await db.extractionMeta.put(meta);
}

export async function isExtractionStale(sourceId: string, currentUpdatedAt: number): Promise<boolean> {
  const meta = await getExtractionMeta(sourceId);
  if (!meta) return true;
  return meta.lastSourceUpdatedAt < currentUpdatedAt;
}

// ===== Image Operations =====

export async function getImageByNode(nodeId: string): Promise<KbImageRecord | undefined> {
  return db.kbImages.where('nodeId').equals(nodeId).first();
}

export async function upsertImage(image: KbImageRecord): Promise<void> {
  const existing = await getImageByNode(image.nodeId);
  if (existing) {
    await db.kbImages.update(existing.id, image);
  } else {
    await db.kbImages.put({ ...image, createdAt: now() });
  }
}

// ===== Clean =====

export async function clearAllGraphData(): Promise<void> {
  await Promise.all([
    db.graphNodes.clear(),
    db.graphEdges.clear(),
    db.extractionMeta.clear(),
    db.kbImages.clear(),
  ]);
}
