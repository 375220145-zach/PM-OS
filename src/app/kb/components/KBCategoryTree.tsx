'use client';

import type { GraphNode } from '@/types';
import { ENTITY_LABELS } from '@/lib/graph/types';

interface Props {
  nodes: GraphNode[];
  activeCategory: string | null;
  onSelect: (cat: string | null) => void;
  stats: { conceptCount: number; categoryCount: number; imageCount: number };
}

export default function KBCategoryTree({ nodes, activeCategory, onSelect, stats }: Props) {
  // Build category hierarchy from concept nodes
  const catMap = new Map<string, { cat2Set: Set<string>; count: number }>();
  for (const node of nodes) {
    if (node.entityType !== 'concept') continue;
    const cat1 = (node.properties?.category1 as string) || '未分类';
    const cat2 = (node.properties?.category2 as string) || '';
    if (!catMap.has(cat1)) catMap.set(cat1, { cat2Set: new Set(), count: 0 });
    const entry = catMap.get(cat1)!;
    entry.count++;
    if (cat2) entry.cat2Set.add(cat2);
  }

  const categories = Array.from(catMap.entries()).sort((a, b) => b[1].count - a[1].count);

  return (
    <div className="py-3">
      {/* Header */}
      <div className="px-4 mb-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">知识库</h3>
        <div className="flex gap-3 mt-2 text-xs text-gray-500">
          <span>{stats.conceptCount} 条目</span>
          <span>{stats.imageCount} 图片</span>
        </div>
      </div>

      {/* All */}
      <button
        onClick={() => onSelect(null)}
        className={`w-full text-left px-4 py-1.5 text-sm transition-colors ${
          activeCategory === null
            ? 'bg-indigo-50 text-indigo-700 border-l-2 border-indigo-600 font-medium'
            : 'text-gray-600 hover:bg-gray-50 border-l-2 border-transparent'
        }`}
      >
        全部条目
      </button>

      {/* Category list */}
      <div className="mt-2">
        {categories.map(([cat1, { cat2Set, count }]) => (
          <div key={cat1}>
            <button
              onClick={() => onSelect(cat1)}
              className={`w-full text-left px-4 py-1.5 text-sm transition-colors flex items-center justify-between ${
                activeCategory === cat1
                  ? 'bg-indigo-50 text-indigo-700 border-l-2 border-indigo-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 border-l-2 border-transparent'
              }`}
            >
              <span>{cat1}</span>
              <span className="text-xs text-gray-400">{count}</span>
            </button>
            {/* Sub-categories — shown when this category is selected */}
            {activeCategory === cat1 && cat2Set.size > 0 && (
              <div className="ml-3">
                {Array.from(cat2Set).sort().map(cat2 => (
                  <div
                    key={cat2}
                    className="px-4 py-1 text-xs text-gray-500 border-l-2 border-transparent ml-[2px]"
                  >
                    {cat2}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
