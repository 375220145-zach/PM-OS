'use client';

import type { GraphNode } from '@/types';

interface Props {
  node: GraphNode;
  isSelected: boolean;
  onClick: () => void;
}

export default function KBEntryCard({ node, isSelected, onClick }: Props) {
  const content = (node.properties?.content as string) || '';
  const preview = content.slice(0, 120) + (content.length > 120 ? '...' : '');
  const cat2 = (node.properties?.category2 as string) || '';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-md border transition-colors ${
        isSelected
          ? 'border-indigo-200 bg-indigo-50/50 ring-1 ring-indigo-200'
          : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium text-gray-900 truncate">{node.label}</span>
            {cat2 && (
              <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">
                {cat2}
              </span>
            )}
          </div>
          {preview && (
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{preview}</p>
          )}
        </div>
        {isSelected && (
          <span className="text-xs text-indigo-500 flex-shrink-0 mt-0.5">查看</span>
        )}
      </div>
    </button>
  );
}
