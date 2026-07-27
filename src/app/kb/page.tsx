'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/db/database';
import { getKbStats } from '@/lib/graph/excel-importer';
import { clearAllGraphData } from '@/lib/graph/store';
import type { GraphNode } from '@/types';
import AppShell from '@/components/layout/AppShell';
import KBCategoryTree from './components/KBCategoryTree';
import KBEntryCard from './components/KBEntryCard';
import KBSearchBar from './components/KBSearchBar';
import KBNeighborPanel from './components/KBNeighborPanel';
import KBImportPanel from './components/KBImportPanel';

interface KbStats { conceptCount: number; categoryCount: number; imageCount: number }

export default function KbPage() {
  const [allNodes, setAllNodes] = useState<GraphNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filteredNodes, setFilteredNodes] = useState<GraphNode[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<KbStats>({ conceptCount: 0, categoryCount: 0, imageCount: 0 });
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const s = await getKbStats();
      setStats(s);
      const nodes = await db.graphNodes.toArray();
      setAllNodes(nodes);
      // Don't apply search filter here — search is handled independently
      applyFilter(nodes, activeCategory, '');
    } catch { /* DB not ready */ }
    finally { setLoading(false); }
  }, [activeCategory]);

  useEffect(() => { loadData(); }, [loadData]);

  const applyFilter = (nodes: GraphNode[], cat: string | null, q: string) => {
    let result = nodes;
    if (cat) result = result.filter(n => {
      const c1 = (n.properties?.category1 as string) || '';
      const c2 = (n.properties?.category2 as string) || '';
      return c1 === cat || c2 === cat;
    });
    if (q) {
      const ql = q.toLowerCase();
      result = result.filter(n =>
        n.label.toLowerCase().includes(ql) ||
        String(n.properties?.content || '').toLowerCase().includes(ql),
      );
    }
    setFilteredNodes(result.filter(n => n.entityType === 'concept'));
  };

  const handleCategorySelect = (cat: string | null) => {
    setActiveCategory(cat);
    setSelectedNode(null);
    applyFilter(allNodes, cat, searchQuery);
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    applyFilter(allNodes, activeCategory, q);
  };

  return (
    <AppShell>
      {loading ? (
        <div className="flex items-center justify-center h-64 text-sm text-gray-400">加载知识库...</div>
      ) : (
      <div className="flex h-full">
        {/* Collapsible Category Sidebar */}
        <aside className={`${sidebarOpen ? 'w-48' : 'w-0'} border-r border-gray-200 bg-white overflow-hidden flex-shrink-0 transition-all duration-200`}>
          <div className="w-48">
            <KBCategoryTree nodes={allNodes} activeCategory={activeCategory} onSelect={handleCategorySelect} stats={stats} />
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="flex items-center gap-0.5 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                title={sidebarOpen ? '收起侧边栏' : '展开侧边栏'}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="3" y1="5" x2="21" y2="5"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="19" x2="21" y2="19"/>
                </svg>
                <svg className={`w-3 h-3 transition-transform ${sidebarOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="8,4 16,12 8,20"/>
                </svg>
              </button>
              <KBSearchBar onChange={handleSearch} resultCount={filteredNodes.length} />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {stats.conceptCount > 0 && (
                <button
                  onClick={async () => { setClearing(true); await clearAllGraphData(); setClearing(false); loadData(); }}
                  disabled={clearing}
                  className="text-xs font-medium px-3 py-1.5 rounded border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                >
                  {clearing ? '清空中...' : '清空知识库'}
                </button>
              )}
              <button
                onClick={() => setShowImport(!showImport)}
                className="text-xs font-medium px-3 py-1.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
              >
                {showImport ? '收起导入' : '导入 Excel'}
              </button>
            </div>
          </div>

          {showImport && (
            <div className="px-4 pt-3 pb-2 border-b border-gray-100 bg-gray-50/50">
              <KBImportPanel onComplete={() => { setShowImport(false); loadData(); }} />
            </div>
          )}

          {/* Entry list + Detail (split) */}
          <div className="flex-1 flex min-h-0">
            {/* Entry list */}
            <div className="flex-1 overflow-y-auto p-3 border-r border-gray-100">
              {filteredNodes.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  {stats.conceptCount === 0 ? '知识库为空，点击「导入 Excel」上传知识库文件' : '没有匹配的条目'}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredNodes.map(node => (
                    <KBEntryCard key={node.id} node={node} isSelected={selectedNode?.id === node.id}
                      onClick={() => {
                        // Always look up from allNodes to get latest edits
                        const latest = allNodes.find(n => n.id === node.id);
                        setSelectedNode(latest || node);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Detail panel */}
            <div className="w-80 overflow-y-auto flex-shrink-0 bg-white">
              {selectedNode ? (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-900">{selectedNode.label}</h3>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={async () => {
                          if (editing) {
                            const updated = { ...selectedNode, properties: { ...selectedNode.properties, content: editContent, notes: editNotes }, updatedAt: Date.now() };
                            await db.graphNodes.put(updated);
                            setSelectedNode(updated);
                            setAllNodes(prev => prev.map(n => n.id === updated.id ? updated : n));
                          } else {
                            setEditContent(String(selectedNode.properties?.content ?? ''));
                            setEditNotes(String(selectedNode.properties?.notes ?? ''));
                          }
                          setEditing(!editing);
                        }}
                        className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                      >
                        {editing ? '保存' : '编辑'}
                      </button>
                      <button onClick={() => { setSelectedNode(null); setEditing(false); }} className="text-gray-400 hover:text-gray-600 text-xs p-1">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  {selectedNode.properties?.imagePath ? (
                    <img src={String(selectedNode.properties.imagePath)} alt={selectedNode.label}
                      className="w-full rounded border border-gray-200 object-contain max-h-48 bg-gray-50 mb-4" />
                  ) : null}
                  <div className="mb-4">
                    <div className="text-xs text-gray-400 mb-1">详细内容</div>
                    {editing ? (
                      <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded p-2 min-h-[120px] resize-y focus:outline-none focus:ring-1 focus:ring-indigo-300"
                      />
                    ) : (
                      <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {String(selectedNode.properties?.content ?? '无详细内容')}
                      </div>
                    )}
                  </div>
                  <div className="mb-4">
                    <div className="text-xs text-gray-400 mb-1">备注</div>
                    {editing ? (
                      <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded p-2 min-h-[60px] resize-y focus:outline-none focus:ring-1 focus:ring-indigo-300"
                      />
                    ) : (
                      <div className="text-sm text-gray-600 leading-relaxed">
                        {String(selectedNode.properties?.notes ?? '无')}
                      </div>
                    )}
                  </div>
                  <div className="mb-4">
                    <div className="text-xs text-gray-400 mb-1">所属类目</div>
                    <div className="flex flex-wrap gap-1">
                      {selectedNode.properties?.category1 ? <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">{String(selectedNode.properties.category1)}</span> : null}
                      {selectedNode.properties?.category2 ? <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">{String(selectedNode.properties.category2)}</span> : null}
                    </div>
                  </div>
                  <KBNeighborPanel nodeId={selectedNode.id} allNodes={allNodes} />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-gray-400 p-8 text-center">
                  点击左侧条目查看详情和关联实体
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}
    </AppShell>
  );
}
