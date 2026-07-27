'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import type { BomItem, Phase } from '@/types';
import { db } from '@/db/database';
import { PHASES, PHASE_LABELS } from '@/lib/ipd';
import AppShell from '@/components/layout/AppShell';
import ProjectHeader from '@/components/layout/ProjectHeader';
import Button from '@/components/shared/Button';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import EmptyState from '@/components/shared/EmptyState';
import { generateId } from '@/lib/utils';
import { downloadTemplate, parseExcelFile, pickFile } from '@/lib/excel';

const CATEGORY_LABELS: Record<string, string> = {
  structure: '结构', hardware: '硬件', packaging: '包装', other: '其他',
};

export default function BomPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const [projectPhase, setProjectPhase] = useState<Phase>('evt');
  const selectedPhase = (searchParams.get('phase') as Phase) || projectPhase;
  const [advanceDialog, setAdvanceDialog] = useState<{ open: boolean; targetPhase: Phase } | null>(null);
  const currentIdx = PHASES.findIndex(p => p.key === selectedPhase);
  const nextPhase = currentIdx < PHASES.length - 1 ? PHASES[currentIdx + 1] : null;
  const [items, setItems] = useState<BomItem[]>([]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'tree' | 'category' | 'cost'>('tree');

  function collapseAll() {
    const all = new Set(items.filter(i => items.some(c => c.parentId === i.id)).map(i => i.id));
    setCollapsed(all);
  }
  function expandAll() {
    setCollapsed(new Set());
  }

  // ── Batch delete ──
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; ids: string[] }>({ open: false, ids: [] });
  function toggleSelect(id: string) {
    const n = new Set(selectedIds);
    if (n.has(id)) n.delete(id); else n.add(id);
    setSelectedIds(n);
  }
  function requestDeleteSelected() {
    const all = new Set<string>();
    const addChildren = (pid: string) => { all.add(pid); items.filter(i => i.parentId === pid).forEach(c => addChildren(c.id)); };
    selectedIds.forEach(id => addChildren(id));
    setConfirmDelete({ open: true, ids: [...all] });
  }
  async function executeDelete(ids: string[]) {
    await db.bomItems.bulkDelete(ids);
    setItems(items.filter(i => !ids.includes(i.id)));
    setSelectedIds(new Set());
    setSelectionMode(false);
    setConfirmDelete({ open: false, ids: [] });
  }
  function confirmSingleDelete(item: BomItem) {
    // Also delete children
    const all = [item.id, ...items.filter(i => i.parentId === item.id).map(i => i.id)];
    setConfirmDelete({ open: true, ids: all });
  }

  useEffect(() => {
    db.projects.get(id).then(p => { if (p) { setProjectPhase(p.phase); if (!searchParams.get('phase')) setSelectedPhase(p.phase); } });
  }, [id]);
  function setSelectedPhase(p: Phase) { router.push(`/project/${id}/bom?phase=${p}`, { scroll: false }); }

  async function handleAdvance(copy: boolean) {
    if (!advanceDialog) return;
    const target = advanceDialog.targetPhase;
    if (copy) {
      const copies = items.map(i => ({ ...i, id: generateId(), phase: target, lockedAt: 0, lockedBy: undefined }));
      await db.bomItems.bulkAdd(copies);
    }
    setSelectedPhase(target);
    setAdvanceDialog(null);
  }

  useEffect(() => {
    db.bomItems.where({ projectId: id, phase: selectedPhase }).toArray().then(setItems);
  }, [id, selectedPhase]);

  function getChildren(parentId: string): BomItem[] {
    return items.filter(i => i.parentId === parentId);
  }

  function getTopLevel(): BomItem[] {
    return items.filter(i => !i.parentId);
  }

  function toggleCollapse(id: string) {
    const next = new Set(collapsed);
    if (next.has(id)) next.delete(id); else next.add(id);
    setCollapsed(next);
  }

  async function addItem(parentId?: string) {
    const item: BomItem = {
      id: generateId(), projectId: id, parentId,
      category: 'structure', name: '', description: '', isMold: false,
      quantity: 1, unitCost: 0, totalCost: 0,
      phase: selectedPhase, lockedAt: 0,
    };
    await db.bomItems.put(item);
    setItems([...items, item]);
  }

  async function updateItem(index: number, field: keyof BomItem, value: unknown) {
    const next = [...items];
    const item = { ...next[index], [field]: value } as BomItem;
    if (field === 'quantity' || field === 'unitCost') {
      item.totalCost = (item.quantity || 0) * (item.unitCost || 0);
    }
    next[index] = item;
    await db.bomItems.put(item);
    setItems(next);
  }

  async function removeItem(index: number) {
    const item = items[index];
    // Also remove children
    const children = items.filter(i => i.parentId === item.id);
    for (const child of children) await db.bomItems.delete(child.id);
    await db.bomItems.delete(item.id);
    setItems(items.filter(i => i.id !== item.id && i.parentId !== item.id));
  }

  function handleDownloadTemplate() {
    const phaseLabel = PHASE_LABELS[selectedPhase];
    downloadTemplate('BOM物料清单模板', ['父级编号(空则为顶级)', '类别', '料号', '名称', '描述', '是否开模(是/否)', '数量', '单项成本', '供应商', '备注', '阶段'], [
      ['', '结构', 'P001', '面板组件', 'ABS注塑面板总成', '否', '1', '50', '', '', phaseLabel],
      ['P001', '结构', 'P001-1', '面板注塑件', 'ABS 米白色 168*100*15.5mm', '是', '1', '30', '哆乐', '', phaseLabel],
      ['P001', '结构', 'P001-2', '面板网布', '黑色不织布', '否', '1', '5', '', '', phaseLabel],
    ]);
  }

  async function handleImport() {
    const file = await pickFile();
    if (!file) return;
    const rows = await parseExcelFile(file);
    const catMap: Record<string, string> = { '结构': 'structure', '硬件': 'hardware', '包装': 'packaging' };
    const phaseMap: Record<string, Phase> = { '概念阶段': 'concept', '设计阶段': 'design', 'HMS 手板阶段': 'hms', 'EVT 工程验证': 'evt', 'DVT 设计验证': 'dvt', 'PVT 生产验证': 'pvt', 'MP 量产': 'mp' };
    const newItems: BomItem[] = rows.map(row => ({
      id: generateId(), projectId: id,
      parentId: row['父级编号(空则为顶级)'] || undefined,
      category: (catMap[row['类别']] || 'other') as BomItem['category'],
      partNumber: row['料号'] || undefined,
      name: row['名称'] || '',
      description: row['描述'] || '',
      requirement: row['需求梳理'] || undefined,
      isMold: row['是否开模(是/否)'] === '是',
      quantity: Number(row['数量']) || 1,
      unitCost: Number(row['单项成本']) || 0,
      totalCost: (Number(row['数量']) || 1) * (Number(row['单项成本']) || 0),
      supplier: row['供应商'] || undefined,
      notes: row['备注'] || undefined,
      phase: (phaseMap[row['阶段']] || selectedPhase) as Phase,
      lockedAt: 0,
    }));
    await db.bomItems.bulkAdd(newItems);
    db.bomItems.where({ projectId: id, phase: selectedPhase }).toArray().then(setItems);
  }

  const flatTree = items.length > 0 ? flattenBomTree(items, undefined, 0, collapsed, []) : [];
  const treeNums = genTreeNums(items);
  const moldCount = items.filter(i => i.isMold).length;
  const totalBomCost = items.reduce((s, i) => s + (i.totalCost || 0), 0);
  const [mpQuantity, setMpQuantity] = useState<number>(0);
  useEffect(() => {
    db.projects.get(id).then(p => setMpQuantity(p?.goals?.mpQuantity ?? 0));
  }, [id]);
  const catCosts: Record<string, number> = {};
  items.forEach(i => { catCosts[i.category] = (catCosts[i.category] || 0) + (i.totalCost || 0); });

  return (
    <AppShell>
      <ProjectHeader projectId={id} />
      <div className="p-4 md:p-6 max-w-full">
        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="bg-white border border-gray-200 rounded-xl p-3 border-l-2 border-l-blue-300">
            <div className="text-[11px] text-gray-500">物料总数</div>
            <div className="text-lg font-bold text-blue-600 mt-0.5">{items.length}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 border-l-2 border-l-emerald-300">
            <div className="text-[11px] text-gray-500">开模数</div>
            <div className="text-lg font-bold text-emerald-700 mt-0.5">{moldCount}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 border-l-2 border-l-amber-300">
            <div className="text-[11px] text-gray-500">{PHASE_LABELS[selectedPhase]} 单台 BOM 成本</div>
            <div className="text-lg font-bold text-amber-700 mt-0.5">¥{totalBomCost.toLocaleString()}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 border-l-2 border-l-violet-300">
            <div className="text-[11px] text-gray-500">MP 总物料成本</div>
            <div className="text-lg font-bold text-violet-600 mt-0.5">¥{(totalBomCost * (mpQuantity || 1)).toLocaleString()}</div>
            {mpQuantity > 0 && <div className="text-[10px] text-gray-600">× {mpQuantity.toLocaleString()} 台</div>}
          </div>
        </div>

        {/* Category breakdown mini-table */}
        {items.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {Object.entries(catCosts).filter(([, c]) => c > 0).map(([cat, cost]) => (
              <span key={cat} className={`text-xs px-2 py-1 rounded-full ${CAT_BADGES[cat] || CAT_BADGES.other}`}>
                {CATEGORY_LABELS[cat] || cat} ¥{(cost / 1000).toFixed(1)}K
              </span>
            ))}
          </div>
        )}

        {/* Phase tabs */}
        <div className="flex items-center gap-1 mb-4 overflow-x-auto">
          {PHASES.map(ph => (
            <button key={ph.key} onClick={() => setSelectedPhase(ph.key)}
              className={`text-xs px-3 py-1.5 rounded whitespace-nowrap transition-colors ${selectedPhase === ph.key ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {ph.label}
            </button>
          ))}
          {nextPhase && (
            <button
              onClick={() => setAdvanceDialog({ open: true, targetPhase: nextPhase.key })}
              className="text-xs px-3 py-1.5 rounded whitespace-nowrap bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors border border-indigo-200 ml-3"
            >
              → {nextPhase.label}
            </button>
          )}
        </div>

        {/* Advance dialog */}
        <ConfirmDialog
          open={advanceDialog?.open ?? false}
          title="推进到下一阶段"
          message={`是否将当前「${PHASE_LABELS[selectedPhase]}」的 ${items.length} 条 BOM 复制到「${advanceDialog?.targetPhase ? PHASE_LABELS[advanceDialog.targetPhase] : ''}」作为起点？选择"是"复制全部 BOM，新阶段继续编辑。选择"否"新阶段从空白开始，原阶段 BOM 保留不变。`}
          confirmLabel="是，复制"
          variant="primary"
          onConfirm={() => handleAdvance(true)}
          onCancel={() => { setAdvanceDialog(null); if (advanceDialog) setSelectedPhase(advanceDialog.targetPhase); }}
        />

        {/* Actions bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setViewMode('tree')}
              className={`text-xs px-3 py-1.5 rounded ${viewMode === 'tree' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 hover:text-gray-700'}`}>完整 BOM</button>
            <button onClick={() => setViewMode('category')}
              className={`text-xs px-3 py-1.5 rounded ${viewMode === 'category' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 hover:text-gray-700'}`}>按类别</button>
            <button onClick={() => setViewMode('cost')}
              className={`text-xs px-3 py-1.5 rounded ${viewMode === 'cost' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 hover:text-gray-700'}`}>成本</button>
            <span className="w-px h-4 bg-gray-100 mx-1" />
            <button onClick={collapseAll} className="text-xs text-gray-400 hover:text-gray-700">全部折叠</button>
            <button onClick={expandAll} className="text-xs text-gray-400 hover:text-gray-700">全部展开</button>
          </div>
          <div className="flex items-center gap-2">
            {viewMode === 'tree' && (
              <button onClick={() => { setSelectionMode(!selectionMode); setSelectedIds(new Set()); }}
                className={`text-xs px-2.5 py-1.5 rounded border ${selectionMode ? 'bg-blue-50 border-blue-300 text-blue-600' : 'border-gray-200 text-gray-400 hover:text-gray-700'}`}>
                {selectionMode ? '退出选择' : '批量操作'}
              </button>
            )}
            {selectionMode && (
              <button onClick={() => setSelectedIds(new Set(items.map(i => i.id)))}
                className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50">
                全选 ({items.length})
              </button>
            )}
            {selectionMode && selectedIds.size > 0 && (
              <Button variant="danger" size="sm" onClick={requestDeleteSelected}>删除所选 ({selectedIds.size})</Button>
            )}
            <Button variant="secondary" size="sm" onClick={handleDownloadTemplate}>下载模板</Button>
            <Button variant="secondary" size="sm" onClick={handleImport}>批量导入</Button>
            <Button onClick={() => addItem()}>+ 添加物料</Button>
          </div>
        </div>

        {items.length === 0 ? (
          <EmptyState icon="package" title="暂无物料数据" description="BOM 支持多级层级结构。顶级物料可展开查看子组件。BOM 总成本自动汇总到成本面板。" />
        ) : viewMode === 'tree' ? (
          <BomTreeView items={items} flatTree={flatTree} treeNums={treeNums} collapsed={collapsed}
            onToggle={toggleCollapse}
            onUpdate={(item, field, val) => { const idx = items.findIndex(i => i.id === item.id); if (idx >= 0) updateItem(idx, field, val); }}
            onRemove={(item) => confirmSingleDelete(item)}
            onAddChild={(parentId) => addItem(parentId)}
            selectionMode={selectionMode} selectedIds={selectedIds} onToggleSelect={toggleSelect} />
        ) : viewMode === 'category' ? (
          <BomCategoryView items={items} catCosts={catCosts} />
        ) : (
          <BomCostView items={items} totalCost={totalBomCost} mpQuantity={mpQuantity} />
        )}

        <div className="mt-4 bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-400 flex items-center gap-4">
          <span>单台 BOM <strong className="text-blue-600">¥{totalBomCost.toLocaleString()}</strong></span>
          {mpQuantity > 0 && <span>MP 总成本 <strong className="text-emerald-600">¥{(totalBomCost * mpQuantity).toLocaleString()}</strong></span>}
          <span className="text-gray-600">— 已自动汇总到「成本」面板</span>
        </div>
      </div>

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={confirmDelete.open}
        title="删除物料"
        message={`确认删除所选 ${confirmDelete.ids.length} 个物料？此操作不可恢复，关联的子物料也会被删除。`}
        variant="danger"
        confirmLabel="删除"
        onConfirm={() => executeDelete(confirmDelete.ids)}
        onCancel={() => setConfirmDelete({ open: false, ids: [] })} />
    </AppShell>
  );
}

// ── Tree helpers ──
interface FlatBomNode {
  item: BomItem; depth: number; isLast: boolean; ancestorLasts: boolean[];
  num: string; hasChildren: boolean;
}
function flattenBomTree(items: BomItem[], parentId: string | undefined, depth: number, collapsed: Set<string>, ancestorLasts: boolean[]): FlatBomNode[] {
  const r: FlatBomNode[] = [];
  const children = items.filter(i => i.parentId === parentId);
  children.forEach((child, idx) => {
    const isLast = idx === children.length - 1;
    const hc = items.some(i => i.parentId === child.id);
    r.push({ item: child, depth, isLast, ancestorLasts, num: '', hasChildren: hc });
    if (hc && !collapsed.has(child.id)) r.push(...flattenBomTree(items, child.id, depth + 1, collapsed, [...ancestorLasts, isLast]));
  });
  return r;
}
function genTreeNums(items: BomItem[]): Map<string, string> {
  const m = new Map<string, string>();
  let changed = true;
  items.filter(i => !i.parentId).forEach((item, idx) => m.set(item.id, `${idx + 1}`));
  while (changed) {
    changed = false;
    for (const item of items) {
      if (m.has(item.id) || !item.parentId) continue;
      const pn = m.get(item.parentId);
      if (pn) {
        const siblings = items.filter(i => i.parentId === item.parentId);
        m.set(item.id, `${pn}.${siblings.findIndex(i => i.id === item.id) + 1}`);
        changed = true;
      }
    }
  }
  return m;
}
function calcSubtotal(items: BomItem[], parentId: string): number {
  return items.filter(i => i.parentId === parentId).reduce((s, i) => s + (i.totalCost || 0), 0);
}

// ── View components ──
function TreeConnector({ node }: { node: FlatBomNode }) {
  return (
    <span className="inline-flex items-center h-full gap-0 text-gray-600">
      {Array.from({ length: node.depth }, (_, i) => (
        <span key={i} className="inline-block w-4 h-full relative">
          {!node.ancestorLasts[i] && <span className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-300" />}
        </span>
      ))}
      {node.depth > 0 && (
        <span className="inline-flex items-center h-full">
          <span className={`inline-block w-3 h-0 border-t border-gray-300`} />
          {!node.isLast && <span className="inline-block w-px h-full bg-gray-300 -ml-px" />}
        </span>
      )}
    </span>
  );
}

const CAT_COLORS: Record<string, string> = {
  structure: 'border-l-blue-400 bg-blue-50',
  hardware: 'border-l-emerald-400 bg-emerald-50',
  packaging: 'border-l-amber-400 bg-amber-50',
  other: 'border-l-gray-300 bg-gray-50',
};
const CAT_BADGES: Record<string, string> = {
  structure: 'text-blue-700 bg-blue-100',
  hardware: 'text-emerald-700 bg-emerald-100',
  packaging: 'text-amber-700 bg-amber-100',
  other: 'text-gray-600 bg-gray-100',
};

// ── BomTreeView (完整 BOM) ──
function BomTreeView({
  items, flatTree, treeNums, collapsed, onToggle, onUpdate, onRemove, onAddChild,
  selectionMode, selectedIds, onToggleSelect,
}: {
  items: BomItem[]; flatTree: FlatBomNode[]; treeNums: Map<string, string>; collapsed: Set<string>;
  onToggle: (id: string) => void;
  onUpdate: (item: BomItem, field: keyof BomItem, value: unknown) => void;
  onRemove: (item: BomItem) => void; onAddChild: (parentId: string) => void;
  selectionMode: boolean; selectedIds: Set<string>; onToggleSelect: (id: string) => void;
}) {
  const nodes = flatTree.map(n => ({ ...n, num: treeNums.get(n.item.id) || '' }));
  const [descEditing, setDescEditing] = useState<string | null>(null);
  const [descValue, setDescValue] = useState('');

  function startDesc(item: BomItem) { setDescEditing(item.id); setDescValue(item.description || ''); }
  function saveDesc() {
    if (!descEditing) return;
    const item = items.find(i => i.id === descEditing);
    if (item) onUpdate(item, 'description', descValue);
    setDescEditing(null);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-gray-200 text-gray-400 text-left text-xs">
          {selectionMode && <th className="px-2 py-2.5 w-8"></th>}
          <th className="px-3 py-2.5 w-6">#</th>
          <th className="px-2 py-2.5 sticky left-0 z-10 bg-white" style={{ minWidth: 200 }}>物料名称</th>
          <th className="px-2 py-2.5">类别</th><th className="px-2 py-2.5">料号</th>
          <th className="px-2 py-2.5">描述</th>
          <th className="px-2 py-2.5 text-center w-10">模</th>
          <th className="px-2 py-2.5 text-right w-16">数量</th>
          <th className="px-2 py-2.5 text-right w-20">单价</th>
          <th className="px-2 py-2.5 text-right w-20">小计</th>
          <th className="px-2 py-2.5">备注</th>
          <th className="px-2 py-2.5 w-10" />
        </tr></thead>
        <tbody>
          {nodes.map((node) => {
            const { item, depth, isLast, ancestorLasts, num, hasChildren } = node;
            const icol = collapsed.has(item.id);
            const isAsm = hasChildren;
            const rowColor = isAsm ? 'bg-gray-100/40' : (depth % 2 === 0 ? 'bg-transparent' : 'bg-gray-50');
            return (
              <tr key={item.id} className={`border-b border-gray-200 hover:bg-gray-100 text-xs ${rowColor}`}>
                {selectionMode && (
                  <td className="px-2 py-2 align-top pt-2.5">
                    <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => onToggleSelect(item.id)}
                      className="w-3.5 h-3.5 rounded border-gray-300 bg-gray-100 text-blue-700 focus:ring-blue-500" />
                  </td>
                )}
                {/* # */}
                <td className="px-3 py-2 text-gray-600 font-mono text-[11px] align-top pt-2.5">{num}</td>
                {/* Name */}
                <td className={`px-2 py-2 border-l-2 ${CAT_COLORS[item.category] || CAT_COLORS.other} sticky left-0 z-10 ${rowColor}`}
                  style={{ paddingLeft: 8 + Math.min(depth, 10) * 18 }}>
                  <div className="flex items-center gap-1">
                    {hasChildren ? (
                      <button onClick={() => onToggle(item.id)} className="text-gray-500 hover:text-gray-700 text-xs w-5 h-5 flex items-center justify-center shrink-0 rounded hover:bg-gray-200">
                        {icol ? '▸' : '▾'}
                      </button>
                    ) : <span className="w-5 shrink-0" />}
                    <span className={`${isAsm ? 'font-semibold text-gray-900' : 'text-gray-700'} truncate max-w-[180px]`}>
                      {item.name || '(未命名)'}
                    </span>
                    {isAsm && <span className="text-[10px] text-gray-600 ml-1 shrink-0">({items.filter(i => i.parentId === item.id).length})</span>}
                    <button onClick={() => onAddChild(item.id)} className="text-gray-400 hover:text-blue-600 text-xs ml-0.5 shrink-0 px-0.5">+</button>
                  </div>
                </td>
                {/* Category */}
                <td className="px-2 py-2 align-top pt-2.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${CAT_BADGES[item.category] || CAT_BADGES.other}`}>{CATEGORY_LABELS[item.category]}</span>
                </td>
                {/* Part number */}
                <td className="px-2 py-2 align-top pt-2.5"><input value={item.partNumber ?? ''} onChange={e => onUpdate(item, 'partNumber', e.target.value)} className="bg-gray-100 border border-gray-200 rounded px-1 py-0.5 text-gray-700 text-xs w-16" /></td>
                {/* Description (editable with save) */}
                <td className="px-2 py-2 align-top pt-2.5 max-w-[160px]">
                  {descEditing === item.id ? (
                    <div className="flex gap-1">
                      <input value={descValue} onChange={e => setDescValue(e.target.value)}
                        className="flex-1 bg-gray-100 border border-blue-300 rounded px-1 py-0.5 text-gray-700 text-xs outline-none"
                        autoFocus onBlur={saveDesc} onKeyDown={e => { if (e.key === 'Enter') saveDesc(); if (e.key === 'Escape') setDescEditing(null); }} />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 group">
                      <span className="text-gray-400 text-[11px] truncate flex-1">{item.description || '-'}</span>
                      <button onClick={() => startDesc(item)} className="text-gray-600 hover:text-blue-600 opacity-0 group-hover:opacity-100 text-[10px] shrink-0"> <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="inline-block"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                    </div>
                  )}
                </td>
                {/* Mold */}
                <td className="px-2 py-2 align-top pt-2.5 text-center"><input type="checkbox" checked={item.isMold} onChange={e => onUpdate(item, 'isMold', e.target.checked)} className="w-3 h-3" /></td>
                {/* Qty */}
                <td className="px-2 py-2 align-top pt-2.5 text-right"><input type="number" value={item.quantity} onChange={e => onUpdate(item, 'quantity', Number(e.target.value))} className="bg-gray-100 border border-gray-200 rounded px-1 py-0.5 text-gray-700 text-xs w-14 text-right" /></td>
                {/* Unit cost */}
                <td className="px-2 py-2 align-top pt-2.5 text-right"><input type="number" value={item.unitCost || 0} onChange={e => onUpdate(item, 'unitCost', Number(e.target.value))} className="bg-gray-100 border border-gray-200 rounded px-1 py-0.5 text-gray-700 text-xs w-16 text-right" /></td>
                {/* Subtotal */}
                <td className="px-2 py-2 align-top pt-2.5 text-right font-medium" style={{ color: item.totalCost > 0 ? '#60a5fa' : '#6b7280' }}>¥{(item.totalCost || 0).toLocaleString()}</td>
                {/* Notes (requirement moved here) */}
                <td className="px-2 py-2 align-top pt-2.5 max-w-[120px]">
                  <input value={item.notes ?? ''} onChange={e => onUpdate(item, 'notes', e.target.value)}
                    placeholder={item.requirement || ''}
                    className="bg-gray-100 border border-gray-200 rounded px-1 py-0.5 text-gray-700 text-xs w-full"
                    title={item.requirement ? `需求: ${item.requirement}` : ''} />
                </td>
                {/* Actions */}
                <td className="px-2 py-2 align-top pt-2.5"><button onClick={() => onRemove(item)} className="text-red-700/50 hover:text-red-600 text-[10px]"> <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="inline-block"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── BomCategoryView (按类别汇总) ──
function BomCategoryView({ items, catCosts }: { items: BomItem[]; catCosts: Record<string, number>; }) {
  const cats = Object.keys(CATEGORY_LABELS).filter(c => items.some(i => i.category === c));
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {cats.map(cat => {
        const catItems = items.filter(i => i.category === cat);
        const subtotal = catItems.reduce((s, i) => s + (i.totalCost || 0), 0);
        return (
          <div key={cat} className={`bg-white border border-gray-200 rounded-xl overflow-hidden ${CAT_COLORS[cat] || CAT_COLORS.other} border-l-2`}>
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <span className="font-semibold text-sm text-gray-700">{CATEGORY_LABELS[cat]}</span>
              <span className="text-sm font-bold text-blue-600">¥{subtotal.toLocaleString()}</span>
            </div>
            <div className="divide-y divide-gray-800/50">
              {catItems.filter(i => !i.parentId).map(item => (
                <div key={item.id} className="px-4 py-2.5 flex items-center justify-between text-xs">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-700 truncate">{item.name || '(未命名)'}</span>
                      {item.isMold && <span className="text-[10px] text-amber-700 bg-amber-950/40 px-1 rounded shrink-0">模具</span>}
                    </div>
                    <div className="text-gray-600 mt-0.5 space-x-3">
                      <span>×{item.quantity}</span>
                      {item.unitCost > 0 && <span>¥{item.unitCost}/件</span>}
                      {item.partNumber && <span className="text-gray-700">{item.partNumber}</span>}
                    </div>
                  </div>
                  <span className="text-gray-400 font-medium ml-3 shrink-0">¥{(item.totalCost || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      </div>
      <MoldCostCard items={items} />
    </div>
  );
}

// ── Mold Cost Card ──
function MoldCostCard({ items }: { items: BomItem[] }) {
  const moldItems = items.filter(i => i.isMold);
  if (moldItems.length === 0) return null;
  const total = moldItems.reduce((s, i) => s + (i.totalCost || 0), 0);
  return (
    <div className="bg-white border border-gray-200 border-l-2 border-l-amber-400 rounded-xl overflow-hidden mt-4">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">开模物料</span>
        <span className="text-sm font-bold text-amber-700">¥{total.toLocaleString()}</span>
      </div>
      <div className="divide-y divide-gray-800/50">
        {moldItems.map(item => (
          <div key={item.id} className="px-4 py-2.5 flex items-center justify-between text-xs">
            <div className="flex-1 min-w-0">
              <span className="text-gray-700">{item.name || '(未命名)'}</span>
              <span className="text-gray-600 ml-2">{CATEGORY_LABELS[item.category]}</span>
            </div>
            <span className="text-gray-400 ml-3 shrink-0">¥{(item.totalCost || 0).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── BomCostView (成本视图) ──
function BomCostView({ items, totalCost, mpQuantity }: { items: BomItem[]; totalCost: number; mpQuantity: number; }) {
  const byCost = [...items].filter(i => i.totalCost > 0).sort((a, b) => (b.totalCost || 0) - (a.totalCost || 0));
  const topN = byCost.slice(0, 15);
  const otherCost = byCost.slice(15).reduce((s, i) => s + (i.totalCost || 0), 0);
  return (
    <div className="space-y-4">
      {/* Bar chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">物料成本 TOP 15</h3>
        <div className="space-y-2.5">
          {topN.map((item, i) => {
            const pct = totalCost > 0 ? (item.totalCost / totalCost) * 100 : 0;
            return (
              <div key={item.id}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400 truncate max-w-[60%]">{item.name || '(未命名)'}</span>
                  <span className="text-gray-700 font-medium">¥{item.totalCost.toLocaleString()} ({pct.toFixed(1)}%)</span>
                </div>
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: i === 0 ? '#3b82f6' : i < 3 ? '#6366f1' : '#818cf8' }} />
                </div>
              </div>
            );
          })}
          {otherCost > 0 && (
            <div className="text-xs text-gray-600 pt-1 border-t border-gray-200 mt-2">
              其他 {byCost.length - topN.length} 项合计: ¥{otherCost.toLocaleString()}
            </div>
          )}
        </div>
      </div>
      {/* Summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-400 space-y-1">
        <div className="flex justify-between"><span>单台 BOM 总成本</span><span className="text-blue-600 font-bold">¥{totalCost.toLocaleString()}</span></div>
        {mpQuantity > 0 && <div className="flex justify-between"><span>MP 总物料成本 (×{mpQuantity.toLocaleString()})</span><span className="text-emerald-600 font-bold">¥{(totalCost * mpQuantity).toLocaleString()}</span></div>}
        <div className="flex justify-between"><span>开模物料数</span><span className="text-gray-700">{items.filter(i => i.isMold).length}</span></div>
      </div>
    </div>
  );
}
