// Domain-specific entity and relationship definitions for PM OS Knowledge Graph
// These are runtime helpers — compile-time types are in @/types

import type { GraphEntityType, GraphRelationType, GraphSourceType } from '@/types';

// ===== Entity Type Registry =====

export const ENTITY_TYPES: GraphEntityType[] = [
  'material', 'supplier', 'risk_type', 'milestone', 'project', 'member', 'concept', 'category',
];

export const ENTITY_LABELS: Record<GraphEntityType, string> = {
  material: '物料',
  supplier: '供应商',
  risk_type: '风险类型',
  milestone: '里程碑',
  project: '项目',
  member: '成员',
  concept: '知识条目',
  category: '类目',
};

// ===== Relationship Type Registry =====

export const RELATION_TYPES: GraphRelationType[] = [
  'supplied_by', 'belongs_to', 'used_in', 'has_risk', 'alternative', 'depends_on', 'assigned_to', 'has_image',
];

export const RELATION_LABELS: Record<GraphRelationType, string> = {
  supplied_by: '供应商',
  belongs_to: '归属类别',
  used_in: '用于项目',
  has_risk: '存在风险',
  alternative: '替代方案',
  depends_on: '依赖',
  assigned_to: '分配给',
  has_image: '附图',
};

// Allowed source→target entity type pairs for each relation
// Used by validation to reject impossible edges
export const RELATION_CONSTRAINTS: Record<GraphRelationType, { source: GraphEntityType[]; target: GraphEntityType[] }> = {
  supplied_by:    { source: ['material'],              target: ['supplier'] },
  belongs_to:     { source: ['concept', 'material'],   target: ['category'] },
  used_in:        { source: ['material', 'supplier', 'member'], target: ['project'] },
  has_risk:       { source: ['supplier', 'material', 'project', 'milestone'], target: ['risk_type'] },
  alternative:    { source: ['material'],              target: ['material'] },
  depends_on:     { source: ['milestone', 'concept'],  target: ['milestone', 'concept'] },
  assigned_to:    { source: ['concept'],               target: ['member'] },
  has_image:      { source: ['concept', 'material'],   target: ['concept'] },
};

// ===== Source Type Helpers =====

export const SOURCE_LABELS: Record<GraphSourceType, string> = {
  kb: '知识库导入',
  proj: '项目抽取',
};

// ===== Node ID Helpers =====

/** Normalize a label for use in node IDs: lowercase, strip special chars, collapse whitespace */
export function normalizeLabel(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[\s+/#@&()（）]+/g, '-')
    .replace(/[^\w一-鿿-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Build a deterministic node ID */
export function buildNodeId(source: GraphSourceType, entityType: GraphEntityType, label: string, projectId?: string): string {
  const base = `${source}--${entityType}--${normalizeLabel(label)}`;
  return projectId ? `${base}--${projectId}` : base;
}
