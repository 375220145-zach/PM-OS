'use client';

import { useState, useEffect } from 'react';
import type { Task, Phase, Priority, RiskLevel, TaskStatus } from '@/types';
import { generateId, now, formatDateShort } from '@/lib/utils';
import { db } from '@/db/database';
import { PHASES } from '@/lib/ipd';
import Button from '../shared/Button';
import Modal from '../shared/Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  members: string[];
  editTask?: Task;
  conflicts?: string[];
  onSaved: () => void;
}

export default function TaskForm({ open, onClose, projectId, members, editTask, conflicts, onSaved }: Props) {
  const [name, setName] = useState(editTask?.name ?? '');
  const [assignee, setAssignee] = useState(editTask?.assignee ?? '');
  const [phase, setPhase] = useState<Phase>(editTask?.phase ?? 'concept');
  const [priority, setPriority] = useState<Priority>(editTask?.priority ?? 'P1');
  const [risk, setRisk] = useState<RiskLevel>(editTask?.risk ?? 'none');
  const [status, setStatus] = useState<TaskStatus>(editTask?.status ?? 'todo');
  const [startDate, setStartDate] = useState(editTask ? new Date(editTask.startDate).toISOString().slice(0, 10) : '');
  const [endDate, setEndDate] = useState(editTask ? new Date(editTask.endDate).toISOString().slice(0, 10) : '');
  const [deliverable, setDeliverable] = useState(editTask?.deliverable ?? '');
  const [notes, setNotes] = useState(editTask?.notes ?? '');
  const [tags, setTags] = useState(editTask?.tags.join(', ') ?? '');
  const [deps, setDeps] = useState<string[]>(editTask?.dependencies ?? []);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      db.tasks.where('projectId').equals(projectId).toArray().then(ts => {
        setAllTasks(ts.filter(t => t.id !== (editTask?.id ?? '')));
      });
    }
  }, [open, projectId, editTask]);

  // State resets via key prop from parent when editTask changes

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !assignee.trim() || !startDate || !endDate) return;

    setSaving(true);
    const task: Task = {
      id: editTask?.id ?? generateId(),
      projectId,
      phase,
      name: name.trim(),
      description: undefined,
      assignee: assignee.trim(),
      deliverable: deliverable.trim() || undefined,
      startDate: new Date(startDate).getTime(),
      endDate: new Date(endDate).getTime(),
      actualStartDate: editTask?.actualStartDate,
      actualEndDate: editTask?.actualEndDate,
      status,
      priority,
      risk,
      dependencies: deps,
      source: editTask?.source ?? 'manual',
      meetingId: editTask?.meetingId,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      notes: notes.trim() || undefined,
    };

    await db.tasks.put(task);
    setSaving(false);
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title={editTask ? '编辑任务' : '新建任务'} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        {conflicts && conflicts.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
            <span className="text-red-700 font-medium"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="inline-block mr-1"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01"/></svg>依赖冲突</span>
            <p className="text-red-600 text-xs mt-1">
              此任务的开工日期早于 {conflicts.length} 个前置任务的结束日期，请在甘特图中调整日期或检查前置依赖。
            </p>
          </div>
        )}
        <div>
          <label className="block text-sm text-gray-400 mb-1">任务名称 *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="如：结构 3D 图设计"
            className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
            required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">负责人 *</label>
            <input type="text" value={assignee} onChange={e => setAssignee(e.target.value)}
              placeholder="如：梅榕锋" list="members-list"
              className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
              required />
            <datalist id="members-list">
              {members.map(m => <option key={m} value={m} />)}
            </datalist>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">阶段</label>
            <select value={phase} onChange={e => setPhase(e.target.value as Phase)}
              className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400">
              {PHASES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">开始日期 *</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
              required />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">结束日期 *</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
              required />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">优先级</label>
            <select value={priority} onChange={e => setPriority(e.target.value as Priority)}
              className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400">
              <option value="P0">P0 紧急</option>
              <option value="P1">P1 高</option>
              <option value="P2">P2 中</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">风险</label>
            <select value={risk} onChange={e => setRisk(e.target.value as RiskLevel)}
              className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400">
              <option value="none">无</option>
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">状态</label>
            <select value={status} onChange={e => setStatus(e.target.value as TaskStatus)}
              className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400">
              <option value="backlog">待规划</option>
              <option value="todo">待开始</option>
              <option value="in-progress">进行中</option>
              <option value="done">已完成</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">交付物</label>
          <input type="text" value={deliverable} onChange={e => setDeliverable(e.target.value)}
            placeholder="如：结构 3D 图"
            className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400" />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">标签（逗号分隔）</label>
          <input type="text" value={tags} onChange={e => setTags(e.target.value)}
            placeholder="结构, 模具, ID"
            className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400" />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">备注</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 resize-none" />
        </div>

        {allTasks.length > 0 && (
          <div>
            <label className="block text-sm text-gray-400 mb-2">前置依赖（可选，勾选此任务依赖的前置任务）</label>
            <div className="max-h-40 overflow-y-auto space-y-1 bg-gray-100 rounded-lg p-2">
              {allTasks.map(t => (
                <label key={t.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 cursor-pointer text-sm">
                  <input type="checkbox" checked={deps.includes(t.id)} onChange={e => {
                    setDeps(e.target.checked ? [...deps, t.id] : deps.filter(d => d !== t.id));
                  }} className="rounded" />
                  <span className="text-gray-700 truncate min-w-0 flex-1">{t.name}</span>
                  <span className="text-[11px] text-gray-500 shrink-0">{formatDateShort(t.startDate)} — {formatDateShort(t.endDate)}</span>
                  <span className="text-xs text-gray-600 ml-1 shrink-0">{t.assignee}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>取消</Button>
          <Button type="submit" disabled={saving}>
            {saving ? '保存中...' : editTask ? '保存' : '创建任务'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
