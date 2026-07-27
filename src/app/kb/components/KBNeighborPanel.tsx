'use client';

import { useState, useEffect } from 'react';
import { getEdgesByNode } from '@/lib/graph/store';
import type { GraphNode, GraphEdge } from '@/types';
import { RELATION_LABELS, ENTITY_LABELS } from '@/lib/graph/types';
import { getImageByNode } from '@/lib/graph/store';

interface Props {
  nodeId: string;
  allNodes: GraphNode[];
}

export default function KBNeighborPanel({ nodeId, allNodes }: Props) {
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [hasImage, setHasImage] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    getEdgesByNode(nodeId).then(setEdges);
    getImageByNode(nodeId).then(img => {
      if (img) {
        setHasImage(true);
        setImageSrc(img.base64);
      }
    });
  }, [nodeId]);

  const neighborEdges = edges.filter(e => e.relation !== 'has_image');
  const imageEdges = edges.filter(e => e.relation === 'has_image');

  if (neighborEdges.length === 0 && !hasImage) {
    return (
      <div className="text-xs text-gray-400 py-4">
        暂无关联实体
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Image preview */}
      {hasImage && (
        <div>
          <div className="text-xs text-gray-400 mb-1">附图</div>
          {imageSrc ? (
            <img
              src={imageSrc}
              alt="知识库图片"
              className="w-full rounded-md border border-gray-200 object-contain max-h-48"
            />
          ) : (
            <div className="text-xs text-gray-400 bg-gray-50 rounded-md p-3 text-center">
              图片已导入（点击查看）
            </div>
          )}
        </div>
      )}

      {/* Related entities */}
      {neighborEdges.length > 0 && (
        <div>
          <div className="text-xs text-gray-400 mb-1">关联实体</div>
          <div className="space-y-1">
            {neighborEdges.map(edge => {
              const otherId = edge.sourceId === nodeId ? edge.targetId : edge.sourceId;
              const otherNode = allNodes.find(n => n.id === otherId);
              const relLabel = RELATION_LABELS[edge.relation] || edge.relation;

              return (
                <div
                  key={edge.id}
                  className="flex items-center gap-2 text-xs py-1 px-2 rounded bg-gray-50 border border-gray-100"
                >
                  <span className="text-gray-400 flex-shrink-0">{relLabel}</span>
                  <span className="text-gray-300">→</span>
                  <span className="text-gray-700 font-medium truncate">
                    {otherNode?.label || otherId.slice(0, 20)}
                  </span>
                  {otherNode && (
                    <span className="text-gray-400 text-[10px] ml-auto flex-shrink-0">
                      {ENTITY_LABELS[otherNode.entityType] || otherNode.entityType}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
