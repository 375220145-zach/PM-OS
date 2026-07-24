'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { WorkLogEntry, Project } from '@/types';
import { db } from '@/db/database';
import AppShell from '@/components/layout/AppShell';
import Button from '@/components/shared/Button';
import Modal from '@/components/shared/Modal';
import EmptyState from '@/components/shared/EmptyState';
import { generateId } from '@/lib/utils';

function WorkLogsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialProject = searchParams.get('project') ?? '';

  const [logs, setLogs] = useState<WorkLogEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState(initialProject);
  const [showNew, setShowNew] = useState(false);
  const [newProject, setNewProject] = useState(initialProject || '');
  const [newItems, setNewItems] = useState<string[]>(['']);
  const [editing, setEditing] = useState<WorkLogEntry | null>(null);
  const [editItems, setEditItems] = useState<string[]>(['']);

  useEffect(() => {
    db.projects.toArray().then(setProjects);
  }, []);

  useEffect(() => {
    if (selectedProject) {
      db.workLogs.where('projectId').equals(selectedProject).reverse().sortBy('createdAt').then(list => setLogs(sortLogs(list)));
    } else {
      db.workLogs.toArray().then(all => setLogs(sortLogs(all)));
    }
  }, [selectedProject]);

  function sortLogs(list: WorkLogEntry[]): WorkLogEntry[] {
    return [...list].sort((a, b) => {
      const aDone = (a.items ?? []).length > 0 && (a.items ?? []).every(i => i.done);
      const bDone = (b.items ?? []).length > 0 && (b.items ?? []).every(i => i.done);
      if (aDone && !bDone) return 1;
      if (!aDone && bDone) return -1;
      return b.createdAt - a.createdAt;
    });
  }

  function addNewLine() { setNewItems([...newItems, '']); }
  function removeNewLine(i: number) { setNewItems(newItems.filter((_, idx) => idx !== i)); }
  function updateNewLine(i: number, v: string) { setNewItems(newItems.map((x, idx) => idx === i ? v : x)); }

  async function saveNew() {
    const items = (newItems.filter(t => t.trim())).map(t => ({ text: t.trim(), done: false }));
    if (items.length === 0 || !newProject) return;
    const entry: WorkLogEntry = {
      id: generateId(), projectId: newProject,
      items, createdAt: Date.now(), updatedAt: Date.now(),
    };
    await db.workLogs.put(entry);
    setLogs(sortLogs([entry, ...logs]));
    setShowNew(false);
    setNewItems(['']);
  }

  function openEdit(log: WorkLogEntry) {
    setEditing(log);
    setEditItems((log.items ?? []).map(i => i.text));
  }
  function addEditLine() { setEditItems([...editItems, '']); }
  function removeEditLine(i: number) { setEditItems(editItems.filter((_, idx) => idx !== i)); }
  function updateEditLine(i: number, v: string) { setEditItems(editItems.map((x, idx) => idx === i ? v : x)); }

  async function saveEdit() {
    if (!editing) return;
    const items = editItems.filter(t => t.trim()).map(t => {
      const existing = (editing.items ?? []).find(i => i.text === t);
      return { text: t.trim(), done: existing?.done ?? false };
    });
    if (items.length === 0) return;
    const updated = { ...editing, items, updatedAt: Date.now() };
    await db.workLogs.put(updated);
    setLogs(sortLogs(logs.map(l => l.id === updated.id ? updated : l)));
    setEditing(null);
  }

  async function toggleItem(logId: string, itemIdx: number) {
    const log = logs.find(l => l.id === logId);
    if (!log || !log.items) return;
    const items = log.items.map((item, i) => i === itemIdx ? { ...item, done: !item.done } : item);
    const updated = { ...log, items, updatedAt: Date.now() };
    await db.workLogs.put(updated);
    setLogs(sortLogs(logs.map(l => l.id === logId ? updated : l)));
  }

  async function remove(logId: string) {
    await db.workLogs.delete(logId);
    setLogs(logs.filter(l => l.id !== logId));
  }

  function formatTime(ts: number) {
    return new Date(ts).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
  function getProjectName(pid: string) { return projects.find(p => p.id === pid)?.name ?? pid; }

  const filteredLogs = selectedProject ? logs : logs;
  const totalItems = filteredLogs.reduce((s, l) => s + (l.items ?? []).length, 0);
  const doneItems = filteredLogs.reduce((s, l) => s + (l.items ?? []).filter(i => i.done).length, 0);

  return (
    <AppShell>
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">工作记录</h2>
            <p className="text-sm text-gray-400 mt-1">
              {filteredLogs.length} 条记录 · {doneItems}/{totalItems} 已完成
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedProject}
              onChange={e => {
                setSelectedProject(e.target.value);
                router.replace(e.target.value ? `/work-logs?project=${e.target.value}` : '/work-logs');
              }}
              className="bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 text-sm"
            >
              <option value="">全部项目</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <Button onClick={() => { setNewProject(selectedProject); setShowNew(true); }}>+ 新建记录</Button>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <EmptyState icon="notebook" title="暂无工作记录" description="以 todo list 的形式记录项目中的待办事项、遇到的问题、下一步计划等" />
        ) : (
          <div className="space-y-4">
            {filteredLogs.map(log => {
              const safeItems = log.items ?? [];
              const logDone = safeItems.filter(i => i.done).length;
              return (
                <div key={log.id} className="bg-white border border-gray-200 rounded-xl">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">{formatTime(log.createdAt)}</span>
                      <span className="text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">{getProjectName(log.projectId)}</span>
                      <span className="text-xs text-gray-600">{logDone}/{safeItems.length}</span>
                      <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${safeItems.length > 0 ? (logDone / safeItems.length) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => openEdit(log)} className="text-xs text-gray-400 hover:text-gray-700">编辑</button>
                      <button onClick={() => remove(log.id)} className="text-xs text-red-700 hover:text-red-600">删除</button>
                    </div>
                  </div>
                  <div className="px-5 py-3 space-y-1">
                    {safeItems.map((item, idx) => (
                      <label key={idx} className="flex items-start gap-3 py-1 cursor-pointer group">
                        <input type="checkbox" checked={item.done} onChange={() => toggleItem(log.id, idx)}
                          className="mt-1 w-4 h-4 rounded border-gray-300 bg-gray-100 text-green-500 focus:ring-green-500 focus:ring-offset-0 cursor-pointer" />
                        <span className={`text-sm flex-1 ${item.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{item.text}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Modal */}
      <Modal open={showNew} onClose={() => { setShowNew(false); setNewItems(['']); }}>
        <div className="p-4 md:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">新建工作记录</h3>
          <select value={newProject} onChange={e => setNewProject(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 text-sm mb-4">
            <option value="">选择项目</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="space-y-2 mb-4">
            {newItems.map((item, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-gray-400 mt-2.5 text-sm">•</span>
                <input value={item} onChange={e => updateNewLine(i, e.target.value)} placeholder="输入待办事项..."
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500" />
                {newItems.length > 1 && <button onClick={() => removeNewLine(i)} className="text-gray-600 hover:text-red-600 text-sm px-1"> <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="inline-block"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>}
              </div>
            ))}
          </div>
          <button onClick={addNewLine} className="text-sm text-blue-600 hover:text-blue-500 mb-4 inline-block">+ 添加一行</button>
          <div className="flex justify-end gap-3 mt-4 border-t border-gray-200 pt-4">
            <Button variant="secondary" onClick={() => { setShowNew(false); setNewItems(['']); }}>取消</Button>
            <Button onClick={saveNew} disabled={!newItems.some(t => t.trim()) || !newProject}>保存</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)}>
        <div className="p-4 md:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">编辑工作记录</h3>
          <div className="space-y-2 mb-4">
            {editItems.map((item, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-gray-400 mt-2.5 text-sm">•</span>
                <input value={item} onChange={e => updateEditLine(i, e.target.value)} placeholder="输入待办事项..."
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500" />
                {editItems.length > 1 && <button onClick={() => removeEditLine(i)} className="text-gray-600 hover:text-red-600 text-sm px-1"> <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="inline-block"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>}
              </div>
            ))}
          </div>
          <button onClick={addEditLine} className="text-sm text-blue-600 hover:text-blue-500 mb-4 inline-block">+ 添加一行</button>
          <div className="flex justify-end gap-3 mt-4 border-t border-gray-200 pt-4">
            <Button variant="secondary" onClick={() => setEditing(null)}>取消</Button>
            <Button onClick={saveEdit} disabled={!editItems.some(t => t.trim())}>保存</Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}

export default function WorkLogsPage() {
  return (
    <Suspense fallback={<AppShell><div className="p-4 md:p-6"><div className="animate-pulse h-8 bg-gray-100 rounded w-48" /></div></AppShell>}>
      <WorkLogsContent />
    </Suspense>
  );
}
