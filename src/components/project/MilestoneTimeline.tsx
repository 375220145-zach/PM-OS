'use client';

import { useEffect, useState } from 'react';
import type { Milestone, CriterionDef, CriterionState, CriterionType } from '@/types';
import { db } from '@/db/database';
import { formatDateShort } from '@/lib/utils';
import { isDemoMode } from '@/lib/demo-data';
import { MILESTONE_DEFS } from '@/lib/ipd';

interface Props {
  projectId: string;
}

const TYPE_LABELS: Record<string, string> = {
  'tr': 'TR 评审',
  'dcp': 'DCP 决策',
  'phase-gate': '阶段门',
  'production': '量产',
};

export default function MilestoneTimeline({ projectId }: Props) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    db.milestones.where('projectId').equals(projectId).sortBy('order').then(setMilestones);
  }, [projectId]);

  async function saveDate(m: Milestone) {
    const date = new Date(editDate).getTime();
    if (!isNaN(date)) {
      await db.milestones.update(m.id, { plannedDate: date });
      setMilestones(prev => prev.map(x => x.id === m.id ? { ...x, plannedDate: date } : x));
    }
    setEditingId(null);
  }

  async function toggleStatus(m: Milestone) {
    const newStatus: Milestone['status'] = m.status === 'completed' ? 'pending' : 'completed';
    await db.milestones.update(m.id, { status: newStatus });
    setMilestones(prev => prev.map(x => x.id === m.id ? { ...x, status: newStatus } : x));
  }

  if (milestones.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        暂无里程碑数据
      </div>
    );
  }

  const demo = isDemoMode();

  return (
    <div>
      <div className="overflow-x-auto pb-2">
        <div className="flex items-start min-w-max py-3">
          {milestones.map((m, i) => (
            <div key={m.id} className="flex items-start">
              <div className="flex flex-col items-center" style={{ width: 96 }}>
                <div
                  onClick={() => { if (!demo) toggleStatus(m); }}
                  className={`w-6 h-6 rounded-full mb-2 flex items-center justify-center text-xs font-bold ${demo ? '' : 'cursor-pointer hover:scale-110 transition-all'} ${m.status === 'completed' ? 'bg-emerald-500 text-white' : m.status === 'in-progress' ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-400'}`}
                  title={demo ? '' : (m.status === 'completed' ? '点击取消完成' : '点击标记完成')}
                >
                  {m.status === 'completed'
                    ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>
                    : m.status === 'in-progress'
                    ? <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="currentColor"/></svg>
                    : <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="none" stroke="currentColor" strokeWidth="1"/></svg>
                  }
                </div>
                <button onClick={() => setExpanded(expanded === m.id ? null : m.id)}
                  className="text-xs font-medium text-gray-700 text-center leading-tight hover:text-indigo-600">
                  {m.name}
                </button>
                <div className="text-[11px] text-gray-500 mt-0.5">{TYPE_LABELS[m.type]}</div>
                {editingId === m.id && !demo && (
                  <input type="date" value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    onBlur={() => saveDate(m)}
                    onKeyDown={e => { if (e.key === 'Enter') saveDate(m); if (e.key === 'Escape') setEditingId(null); }}
                    className="text-xs bg-gray-100 border border-gray-700 rounded px-1 py-0.5 text-gray-700 w-24 mt-1" autoFocus />
                )}
                {editingId !== m.id && (
                  demo ? (
                    <span className="text-xs text-gray-500 mt-1 font-medium">{formatDateShort(m.plannedDate)}</span>
                  ) : (
                    <button onClick={() => { setEditingId(m.id); setEditDate(new Date(m.plannedDate).toISOString().slice(0, 10)); }}
                      className="text-xs text-gray-500 hover:text-indigo-600 mt-1 cursor-pointer font-medium" title="点击修改日期">
                      {formatDateShort(m.plannedDate)}
                    </button>
                  )
                )}
              </div>
              {i < milestones.length - 1 && (
                <div className="flex items-center pt-1.5" style={{ width: 32 }}>
                  <div className={`h-0.5 flex-1 ${m.status === 'completed' ? 'bg-green-600' : 'bg-gray-100'}`} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Expanded milestone criteria */}
      {expanded && milestones.find(m => m.id === expanded) && (
        <MilestoneCriteria
          milestone={milestones.find(m => m.id === expanded)!}
          milestones={milestones}
          onClose={() => setExpanded(null)}
          onUpdate={updated => setMilestones(prev => prev.map(m => m.id === updated.id ? updated : m))}
        />
      )}
    </div>
  );
}

type CriterionItem = CriterionState & CriterionDef;

function MilestoneCriteria({ milestone, milestones, onClose, onUpdate }: {
  milestone: Milestone;
  milestones: Milestone[];
  onClose: () => void;
  onUpdate: (m: Milestone) => void;
}) {
  const def = MILESTONE_DEFS[milestone.name];
  const defaultEntryDefs = def?.entryCriteria ?? [];
  const defaultExitDefs = def?.exitCriteria ?? [];
  const [editing, setEditing] = useState(false);

  // Merge criteriaCheck state with MILESTONE_DEFS, ensuring each item has text+type
  function getMerged(raw: string | undefined, defaultDefs: CriterionDef[]): CriterionItem[] {
    let data: unknown[];
    try { const p = JSON.parse(raw || '{}'); data = p?.e ?? []; }
    catch { data = []; }
    // For exit criteria, read from .x
    // We call this twice externally — see init
    const norm = (arr: unknown[], defs: CriterionDef[]): CriterionItem[] => {
      const out: CriterionItem[] = [];
      for (let i = 0; i < Math.max(arr.length, defs.length); i++) {
        const rawItem = arr[i] as any;
        const d = defs[i];
        if (rawItem && rawItem.text) {
          // Already has baked-in def (was customized before)
          out.push({
            checked: rawItem.checked ?? false,
            linkUrl: rawItem.linkUrl ?? '',
            text: rawItem.text,
            type: rawItem.type ?? 'manual',
            dependsOn: rawItem.dependsOn,
          });
        } else {
          const prevChecked = typeof rawItem === 'boolean' ? rawItem : (rawItem?.checked ?? false);
          const prevLink = rawItem?.linkUrl ?? '';
          out.push({
            checked: prevChecked,
            linkUrl: prevLink,
            text: d?.text ?? `标准 ${i + 1}`,
            type: d?.type ?? 'manual',
            dependsOn: d?.dependsOn,
          });
        }
      }
      return out;
    };
    return norm(data, defaultDefs);
  }

  // Init: merge entry and exit separately
  function initItems(): { entry: CriterionItem[]; exit: CriterionItem[] } {
    const raw = milestone.criteriaCheck || '{}';
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }
    const norm = (arr: unknown[], defs: CriterionDef[]): CriterionItem[] => {
      const out: CriterionItem[] = [];
      for (let i = 0; i < Math.max(arr?.length ?? 0, defs.length); i++) {
        const rawItem = (arr as any)?.[i];
        const d = defs[i];
        if (rawItem?.text) {
          out.push({
            checked: rawItem.checked ?? false,
            linkUrl: rawItem.linkUrl ?? '',
            text: rawItem.text,
            type: rawItem.type ?? 'manual',
            dependsOn: rawItem.dependsOn,
          });
        } else {
          out.push({
            checked: typeof rawItem === 'boolean' ? rawItem : (rawItem?.checked ?? false),
            linkUrl: rawItem?.linkUrl ?? '',
            text: d?.text ?? `标准 ${i + 1}`,
            type: d?.type ?? 'manual',
            dependsOn: d?.dependsOn,
          });
        }
      }
      return out;
    };
    return {
      entry: norm(parsed.e ?? [], defaultEntryDefs),
      exit: norm(parsed.x ?? [], defaultExitDefs),
    };
  }

  const [items, setItems] = useState<{ entry: CriterionItem[]; exit: CriterionItem[] }>(initItems);

  // Auto-detect milestone dependencies on mount
  useEffect(() => {
    let changed = false;
    const next = { entry: items.entry.map(i => ({ ...i })), exit: items.exit.map(i => ({ ...i })) };

    for (let i = 0; i < next.entry.length; i++) {
      const it = next.entry[i];
      if (it.type === 'auto_milestone' && it.dependsOn && !it.checked) {
        const depDef = MILESTONE_DEFS[it.dependsOn];
        const dep = depDef ? milestones.find(m => m.name === depDef.name) : null;
        if (dep?.status === 'completed') { next.entry[i].checked = true; changed = true; }
      }
    }
    for (let i = 0; i < next.exit.length; i++) {
      const it = next.exit[i];
      if (it.type === 'auto_milestone' && it.dependsOn && !it.checked) {
        const depDef = MILESTONE_DEFS[it.dependsOn];
        const dep = depDef ? milestones.find(m => m.name === depDef.name) : null;
        if (dep?.status === 'completed') { next.exit[i].checked = true; changed = true; }
      }
    }

    if (changed) {
      setItems(next);
      saveToDb(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveToDb(data: { entry: CriterionItem[]; exit: CriterionItem[] }) {
    const toRaw = (list: CriterionItem[]) => list.map(i => ({
      checked: i.checked, linkUrl: i.linkUrl, text: i.text, type: i.type, dependsOn: i.dependsOn,
    }));
    const json = JSON.stringify({ e: toRaw(data.entry), x: toRaw(data.exit) });
    await db.milestones.update(milestone.id, { criteriaCheck: json });
    onUpdate({ ...milestone, criteriaCheck: json });
  }

  async function patch(type: 'entry' | 'exit', idx: number, patch: Partial<CriterionItem>) {
    const next = { ...items, [type]: items[type].map((it, i) => i === idx ? { ...it, ...patch } : it) };
    setItems(next);
    await saveToDb(next);
  }

  function depStatus(it: CriterionItem): { done: boolean; label: string } | null {
    if (it.type !== 'auto_milestone' || !it.dependsOn) return null;
    const dd = MILESTONE_DEFS[it.dependsOn];
    if (!dd) return null;
    const dep = milestones.find(m => m.name === dd.name);
    return { done: dep?.status === 'completed', label: dd.name };
  }

  function addItem(type: 'entry' | 'exit') {
    const next = { ...items, [type]: [...items[type], { checked: false, linkUrl: '', text: '新标准', type: 'manual' as CriterionType }] };
    setItems(next);
  }

  function removeItem(type: 'entry' | 'exit', idx: number) {
    const next = { ...items, [type]: items[type].filter((_, i) => i !== idx) };
    setItems(next);
  }

  function finishEditing() {
    saveToDb(items);
    setEditing(false);
  }

  // ── Render helpers ──

  function TypeBadge({ type }: { type: CriterionType }) {
    if (type === 'auto_milestone') return <span className="text-[10px] text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded font-medium">自动</span>;
    if (type === 'link') return <span className="text-[10px] text-purple-500 bg-purple-950/50 px-1.5 py-0.5 rounded font-medium">链接</span>;
    return <span className="text-[10px] text-gray-500 bg-gray-100/50 px-1.5 py-0.5 rounded font-medium">手动</span>;
  }

  function renderViewItem(type: 'entry' | 'exit', it: CriterionItem, idx: number) {
    const dep = depStatus(it);
    return (
      <li key={idx} className="space-y-1.5">
        <div className="flex items-start gap-2 group">
          <input type="checkbox" checked={it.checked} onChange={() => patch(type, idx, { checked: !it.checked })}
            className="mt-0.5 w-3.5 h-3.5 rounded border-gray-300 bg-gray-100 text-green-500 focus:ring-green-500 focus:ring-offset-0 cursor-pointer shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs ${it.checked ? 'text-gray-500 line-through' : 'text-gray-700'}`}>{it.text}</span>
              <TypeBadge type={it.type} />
            </div>
            {dep && (
              <div className={`text-[11px] mt-0.5 ${dep.done ? 'text-green-500' : 'text-yellow-500'}`}>
                {dep.done ? `前置 ${dep.label} 已完成` : `前置 ${dep.label} 未完成`}
              </div>
            )}
            {it.type === 'link' && (
              <input type="url" placeholder="粘贴文档/链接..."
                value={it.linkUrl ?? ''} onChange={e => patch(type, idx, { linkUrl: e.target.value })}
                onClick={e => e.stopPropagation()}
                className="mt-1 w-full text-xs bg-gray-100 border border-gray-700 rounded px-2 py-1 text-gray-700 placeholder-gray-600 focus:border-purple-500/50 outline-none" />
            )}
          </div>
        </div>
      </li>
    );
  }

  function renderEditItem(type: 'entry' | 'exit', it: CriterionItem, idx: number) {
    return (
      <li key={idx} className="flex items-start gap-2 p-2 -mx-2 rounded-lg hover:bg-gray-100">
        <input type="checkbox" checked={it.checked} onChange={() => patch(type, idx, { checked: !it.checked })}
          className="mt-1 w-3.5 h-3.5 rounded border-gray-300 bg-gray-100 text-green-500 focus:ring-green-500 focus:ring-offset-0 cursor-pointer shrink-0" />
        <div className="flex-1 space-y-1.5 min-w-0">
          <input value={it.text} onChange={e => patch(type, idx, { text: e.target.value })}
            className="w-full text-xs bg-gray-100 border border-gray-700 rounded px-2 py-1 text-gray-700 placeholder-gray-600 focus:border-blue-300 outline-none" />
          <div className="flex items-center gap-2">
            <select value={it.type} onChange={e => patch(type, idx, { type: e.target.value as CriterionType })}
              className="text-xs bg-gray-100 border border-gray-700 rounded px-2 py-1 text-gray-700 outline-none focus:border-blue-300">
              <option value="manual">手动</option>
              <option value="link">链接</option>
              <option value="auto_milestone">自动(前置里程碑)</option>
            </select>
            {it.type === 'auto_milestone' && (
              <select value={it.dependsOn ?? ''} onChange={e => patch(type, idx, { dependsOn: e.target.value || undefined })}
                className="text-xs bg-gray-100 border border-gray-700 rounded px-2 py-1 text-gray-700 outline-none focus:border-blue-300">
                <option value="">选择前置里程碑...</option>
                {Object.entries(MILESTONE_DEFS).map(([key, md]) => (
                  <option key={key} value={key}>{md.name}</option>
                ))}
              </select>
            )}
            <button onClick={() => removeItem(type, idx)}
              className="text-gray-600 hover:text-red-600 text-xs shrink-0">✕</button>
          </div>
        </div>
      </li>
    );
  }

  function renderList(type: 'entry' | 'exit') {
    const list = items[type];
    const label = type === 'entry' ? '准入标准' : '准出标准';
    const color = type === 'entry' ? 'blue' : 'green';

    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className={`text-xs font-semibold text-${color}-400 uppercase tracking-wider`}>{label}</h4>
          {editing && (
            <button onClick={() => addItem(type)}
              className="text-[11px] text-gray-500 hover:text-gray-700 border border-gray-700 rounded px-2 py-0.5">+ 新增</button>
          )}
        </div>
        {list.length === 0 ? (
          <p className="text-xs text-gray-600">暂无{label}</p>
        ) : (
          <ul className="space-y-1">
            {list.map((it, i) => editing ? renderEditItem(type, it, i) : renderViewItem(type, it, i))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-xl p-5 mt-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">{milestone.name} — 准入/准出标准</h3>
          {!editing && (
            <div className="flex gap-3 mt-1.5 text-[11px] text-gray-500">
              <span><span className="text-blue-700">自动</span> 系统自动检测</span>
              <span><span className="text-purple-500">链接</span> 可贴文档链接</span>
              <span>无标记 手动确认</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button onClick={() => { setEditing(false); setItems(initItems()); }}
                className="text-[11px] text-gray-500 hover:text-gray-700 border border-gray-700 rounded px-2.5 py-1">取消</button>
              <button onClick={finishEditing}
                className="text-[11px] text-emerald-600 hover:text-green-300 bg-green-950/50 border border-green-800/50 rounded px-2.5 py-1">保存</button>
            </>
          ) : (
            <button onClick={() => setEditing(true)}
              className="text-[11px] text-gray-400 hover:text-white border border-gray-700 rounded px-2.5 py-1">编辑标准</button>
          )}
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-lg leading-none shrink-0 ml-1">✕</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderList('entry')}
        {renderList('exit')}
      </div>
    </div>
  );
}
