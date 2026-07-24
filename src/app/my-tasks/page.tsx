'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Task, Project, MILEntry } from '@/types';
import { db } from '@/db/database';
import AppShell from '@/components/layout/AppShell';
import Badge from '@/components/shared/Badge';
import Button from '@/components/shared/Button';
import { formatDate } from '@/lib/utils';
import { PHASE_LABELS } from '@/lib/ipd';

function MyTasksContent() {
  const searchParams = useSearchParams();
  const filterParam = searchParams.get('filter') ?? 'all';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [milEntries, setMilEntries] = useState<MILEntry[]>([]);
  const [filter, setFilter] = useState(filterParam);
  const [assigneeFilter, setAssigneeFilter] = useState('');

  useEffect(() => {
    Promise.all([
      db.tasks.toArray(), db.projects.toArray(), db.milEntries.toArray(),
    ]).then(([t, p, m]) => {
      setTasks(t); setProjects(p); setMilEntries(m);
    });
  }, []);

  function getProjectName(pid: string) { return projects.find(p => p.id === pid)?.name ?? ''; }

  const allAssignees = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach(t => { if (t.assignee) set.add(t.assignee); });
    milEntries.forEach(m => { if (m.responsible) set.add(m.responsible); });
    return Array.from(set).sort();
  }, [tasks, milEntries]);

  const now = useMemo(() => Date.now(), [tasks, milEntries]);
  const todayEnd = useMemo(() => { const d = new Date(); d.setHours(23, 59, 59, 999); return d; }, [tasks, milEntries]);
  const todayTs = todayEnd.getTime();
  const fourteenDaysLater = now + 14 * 86400000;

  // Active tasks (not done, all sources)
  const activeTasks = useMemo(() => {
    let result = tasks.filter(t => t.status !== 'done');
    if (filter === 'overdue') result = result.filter(t => t.endDate <= todayTs);
    else if (filter === 'soon') result = result.filter(t => t.endDate > todayTs && t.endDate <= fourteenDaysLater);
    else if (filter === 'high') result = result.filter(t => t.priority === 'P0' || t.risk === 'high');
    else if (filter === 'done') result = [];
    if (assigneeFilter) result = result.filter(t => t.assignee === assigneeFilter);
    return result.sort((a, b) => a.endDate - b.endDate);
  }, [tasks, filter, assigneeFilter, todayTs, fourteenDaysLater]);

  // Completed tasks (all sources, for the "done" filter)
  const completedTasks = useMemo(() => {
    if (filter !== 'done' && filter !== 'all') return [];
    let result = tasks.filter(t => t.status === 'done');
    if (assigneeFilter) result = result.filter(t => t.assignee === assigneeFilter);
    return result.sort((a, b) => (b.actualEndDate || b.endDate) - (a.actualEndDate || a.endDate)).slice(0, 20);
  }, [tasks, filter, assigneeFilter]);

  const filteredMILs = useMemo(() => {
    if (filter === 'mil' || filter === 'all') {
      let result = milEntries.filter(m => m.status !== 'closed');
      if (assigneeFilter) result = result.filter(m => m.responsible === assigneeFilter);
      return result.sort((a, b) => (a.deadline || 0) - (b.deadline || 0));
    }
    return [];
  }, [milEntries, filter, assigneeFilter]);

  const isOverdue = (ts: number) => ts <= todayTs;

  async function completeTask(taskId: string) {
    await db.tasks.update(taskId, { status: 'done', actualEndDate: Date.now() });
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: 'done' as const, actualEndDate: Date.now() } : t));
  }

  async function restoreTask(taskId: string) {
    await db.tasks.update(taskId, { status: 'todo', actualEndDate: undefined });
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: 'todo' as const, actualEndDate: undefined } : t));
  }

  return (
    <AppShell>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">我的待办</h1>
            <p className="text-sm text-gray-400 mt-1">跨项目聚合 · {activeTasks.length} 个待办</p>
          </div>
          <div className="flex gap-3">
            <select value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)}
              className="bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 text-sm">
              <option value="">全部人员</option>
              {allAssignees.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {[
                { key: 'all', label: '待办' }, { key: 'overdue', label: '已逾期' },
                { key: 'soon', label: '即将到期' },
                { key: 'high', label: '高风险' }, { key: 'mil', label: 'MIL' },
                { key: 'done', label: '已完成' },
              ].map(opt => (
                <button key={opt.key} onClick={() => setFilter(opt.key)}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${filter === opt.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Active Tasks */}
        {filter !== 'done' && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-400 mb-4">待办任务</h2>
            {activeTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-600 text-sm">暂无待办任务</div>
            ) : (
              <div className="space-y-1">
                {activeTasks.map(t => {
                  const overdue = isOverdue(t.endDate);
                  return (
                    <div key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg ${overdue ? 'bg-red-50 border border-red-200' : 'bg-white border border-gray-200'}`}>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${overdue ? 'bg-red-500' : 'bg-blue-500'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-medium">{getProjectName(t.projectId)}</span>
                          <span className="text-sm text-gray-700 truncate">{t.name}</span>
                          <Badge text={t.priority} variant={t.priority === 'P0' ? 'danger' : t.priority === 'P1' ? 'warning' : 'info'} />
                          {t.risk !== 'none' && <Badge text={t.risk} variant={t.risk === 'high' ? 'danger' : 'warning'} />}
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {t.assignee} · {PHASE_LABELS[t.phase]}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 flex items-center gap-3">
                        <div className={`text-xs ${overdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                          {overdue ? '已逾期' : formatDate(t.endDate)}
                        </div>
                        <Button size="sm" onClick={() => completeTask(t.id)}>完成</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* MIL Section */}
        {filteredMILs.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-400 mb-4">MIL 问题</h2>
            <div className="space-y-1">
              {filteredMILs.map(m => {
                const overdue = m.deadline && isOverdue(m.deadline);
                return (
                  <div key={m.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg ${overdue ? 'bg-red-50 border border-red-200' : 'bg-white border border-gray-200'}`}>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${m.severity === 'A' ? 'bg-red-600 text-white' : m.severity === 'B' ? 'bg-yellow-600 text-white' : 'bg-gray-300 text-gray-700'}`}>{m.severity}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-medium">{getProjectName(m.projectId)}</span>
                        <span className="text-sm text-gray-700 truncate">{m.title}</span>
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">{m.responsible}</div>
                    </div>
                    <div className={`text-xs ${overdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                      {m.deadline ? (overdue ? '已逾期' : formatDate(m.deadline)) : '-'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Completed Tasks (always at bottom) */}
        {completedTasks.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-400 mb-4">已完成（近 20 条）</h2>
            <div className="space-y-1">
              {completedTasks.map(t => {
                const wasOverdue = t.actualEndDate && t.endDate < t.actualEndDate;
                return (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white border border-gray-200">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${wasOverdue ? 'bg-orange-500' : 'bg-green-500'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{getProjectName(t.projectId)}</span>
                        <span className="text-sm text-gray-400 line-through truncate">{t.name}</span>
                        <Badge text={wasOverdue ? '逾期完成' : '按时完成'} variant={wasOverdue ? 'warning' : 'success'} />
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        {t.assignee} · 原截止 {formatDate(t.endDate)}
                        {t.actualEndDate && <span className="ml-2">实际完成 {formatDate(t.actualEndDate)}</span>}
                      </div>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => restoreTask(t.id)}>还原</Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function MyTasksPage() {
  return (
    <Suspense fallback={<AppShell><div className="p-6"><div className="animate-pulse h-8 bg-gray-100 rounded w-48" /></div></AppShell>}>
      <MyTasksContent />
    </Suspense>
  );
}
