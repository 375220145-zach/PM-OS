'use client';

import { useState } from 'react';
import type { Task, TaskStatus } from '@/types';
import { PHASES } from '@/lib/ipd';
import { formatDate, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils';
import Badge from '../shared/Badge';
import Button from '../shared/Button';

interface Props {
  tasks: Task[];
  highlightId?: string | null;
  onEdit: (task: Task) => void;
  onBatchUpdate: (ids: string[], updates: { status?: TaskStatus; assignee?: string }) => void;
  onDelete: (task: Task) => void;
}

export default function TaskList({ tasks, highlightId, onEdit, onBatchUpdate, onDelete }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);

  const grouped = new Map<string, Task[]>();
  for (const phase of PHASES) {
    const phaseTasks = tasks.filter(t => t.phase === phase.key);
    if (phaseTasks.length > 0) grouped.set(phase.key, phaseTasks);
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
    if (next.size === 0) setBatchMode(false);
  }

  function toggleAll() {
    if (selected.size === tasks.length) { setSelected(new Set()); setBatchMode(false); }
    else { setSelected(new Set(tasks.map(t => t.id))); setBatchMode(true); }
  }

  function batchStatus(status: TaskStatus) {
    onBatchUpdate(Array.from(selected), { status });
    setSelected(new Set());
    setBatchMode(false);
  }

  if (grouped.size === 0) {
    return <div className="text-center py-12 text-gray-500 text-sm">暂无任务，点击上方按钮创建</div>;
  }

  return (
    <div className="space-y-4">
      {/* Batch bar */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
          <input type="checkbox" checked={selected.size === tasks.length && tasks.length > 0} onChange={toggleAll} className="rounded" />
          {batchMode ? `已选 ${selected.size} 个` : '全选'}
        </label>
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">批量:</span>
            <Button size="sm" variant="secondary" onClick={() => batchStatus('done')}>标记完成</Button>
            <Button size="sm" variant="secondary" onClick={() => batchStatus('in-progress')}>开始进行</Button>
            <Button size="sm" variant="secondary" onClick={() => batchStatus('todo')}>重置</Button>
          </div>
        )}
      </div>

      {Array.from(grouped.entries()).map(([phaseKey, phaseTasks]) => (
        <div key={phaseKey}>
          <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
            {PHASES.find(p => p.key === phaseKey)?.label}
            <span className="ml-2 text-gray-600 font-normal">{phaseTasks.length} 个任务</span>
          </h3>
          <div className="space-y-1">
            {phaseTasks.map(t => (
              <div key={t.id} id={`task-${t.id}`}
                className={`flex items-center gap-3 bg-white border rounded-lg pl-3 pr-4 py-3 transition-all shadow-sm ${
                  highlightId === t.id ? 'ring-2 ring-indigo-400 bg-indigo-50' : ''
                } ${
                  selected.has(t.id) ? 'border-indigo-300 bg-indigo-50' :
                  'border-gray-200'
                } hover:border-gray-300`}>
                <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)}
                  onClick={e => e.stopPropagation()} className="rounded flex-shrink-0" />
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEdit(t)}>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-1 ring-offset-1"
                      style={{ backgroundColor: STATUS_COLORS[t.status], '--tw-ring-color': STATUS_COLORS[t.status] + '40' } as React.CSSProperties} />
                    <span className={`text-sm truncate ${t.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{t.name}</span>
                    {t.status !== 'done' && <Badge text={t.priority} variant={t.priority === 'P0' ? 'danger' : t.priority === 'P1' ? 'warning' : 'info'} />}
                    {t.status !== 'done' && t.risk !== 'none' && <Badge text={t.risk} variant={t.risk === 'high' ? 'danger' : 'warning'} />}
                  </div>
                  <div className={`flex items-center gap-3 mt-1 text-xs ${t.status === 'done' ? 'text-gray-400' : 'text-gray-600'}`}>
                    <span>{t.assignee}</span>
                    {t.deliverable && <span>→ {t.deliverable}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right cursor-pointer" onClick={() => onEdit(t)}>
                    <div className={`text-xs ${t.status === 'done' ? 'text-gray-400' : 'text-gray-500'}`}>{formatDate(t.startDate)} — {formatDate(t.endDate)}</div>
                    <div className={`text-xs mt-0.5 font-medium ${t.status === 'done' ? 'text-emerald-600' : t.status === 'in-progress' ? 'text-blue-600' : 'text-gray-500'}`}>{STATUS_LABELS[t.status]}</div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); onDelete(t); }}
                    className="text-[10px] text-red-700 hover:text-red-600 font-medium">删除</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
