'use client';

import { useEffect, useState } from 'react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Project, Task, Milestone, Phase, Priority, RiskLevel, TaskStatus } from '@/types';
import { db } from '@/db/database';
import AppShell from '@/components/layout/AppShell';
import ProjectHeader from '@/components/layout/ProjectHeader';
import TaskList from '@/components/schedule/TaskList';
import TaskForm from '@/components/schedule/TaskForm';
import GanttChart from '@/components/schedule/GanttChart';
import Button from '@/components/shared/Button';
import EmptyState from '@/components/shared/EmptyState';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { downloadTemplate, parseExcelFile, pickFile } from '@/lib/excel';
import { generateId } from '@/lib/utils';

type ViewMode = 'list' | 'gantt';

function SchedulePageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('p') ?? '';
  const hlId = searchParams.get('hl');
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [view, setView] = useState<ViewMode>('list');
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState<Task | undefined>();
  const [highlightId, setHighlightId] = useState<string | null>(hlId);
  const [incompleteOnly, setIncompleteOnly] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

  useEffect(() => {
    db.projects.get(id).then(p => setProject(p ?? null));
    db.tasks.where('projectId').equals(id).toArray().then(ts => {
      setTasks(ts);
      // Scroll to and highlight the task from ?hl= param
      if (hlId) {
        setHighlightId(hlId);
        setTimeout(() => {
          const el = document.getElementById(`task-${hlId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-2', 'ring-indigo-400', 'bg-indigo-50');
            setTimeout(() => {
              el.classList.remove('ring-2', 'ring-indigo-400', 'bg-indigo-50');
              setHighlightId(null);
            }, 2000);
          }
        }, 300);
      }
    });
    db.milestones.where('projectId').equals(id).sortBy('order').then(setMilestones);
  }, [id, hlId]);

  async function refreshTasks(savedTask?: Task) {
    const ts = await db.tasks.where('projectId').equals(id).toArray();
    // Newly created tasks go to the top of their phase group
    if (savedTask && !editTask) {
      const idx = ts.findIndex(t => t.id === savedTask.id);
      if (idx > 0) {
        const [moved] = ts.splice(idx, 1);
        const firstSamePhase = ts.findIndex(t => t.phase === moved.phase);
        ts.splice(firstSamePhase === -1 ? 0 : firstSamePhase, 0, moved);
      }
    }
    setTasks(ts);
    setShowForm(false);
    setEditTask(undefined);
  }

  async function handleBatchUpdate(ids: string[], updates: { status?: string; assignee?: string }) {
    for (const tid of ids) {
      await db.tasks.update(tid, updates as Partial<Task>);
    }
    refreshTasks();
  }

  async function handleDeleteTask(task: Task) {
    // Remove this task, plus any dependency references pointing to it
    await db.tasks.delete(task.id);
    const referencing = tasks.filter(t => t.dependencies?.includes(task.id));
    for (const t of referencing) {
      await db.tasks.update(t.id, { dependencies: t.dependencies.filter(d => d !== task.id) });
    }
    setDeleteTarget(null);
    refreshTasks();
  }

  function handleDownloadTemplate() {
    downloadTemplate('项目进度模板', ['阶段', '任务名称', '负责人', '交付物', '开始日期', '结束日期', '优先级', '风险', '状态', '标签'], [
      ['概念阶段', 'PRD文档编写', '产品经理', 'PRD', '2026-01-01', '2026-01-10', 'P0', 'none', 'todo', '产品'],
      ['设计阶段', '结构3D图设计', '结构工程师', '3D图', '2026-01-11', '2026-01-25', 'P1', 'medium', 'todo', '结构,模具'],
    ]);
  }

  async function handleImport() {
    const file = await pickFile();
    if (!file) return;
    const rows = await parseExcelFile(file);
    const newTasks: Task[] = rows.map(row => ({
      id: generateId(),
      projectId: id,
      phase: (row['阶段']?.includes('概念') ? 'concept' : row['阶段']?.includes('设计') ? 'design' : row['阶段']?.includes('HMS') ? 'hms' : row['阶段']?.includes('EVT') ? 'evt' : row['阶段']?.includes('DVT') ? 'dvt' : row['阶段']?.includes('PVT') ? 'pvt' : 'mp') as Phase,
      name: row['任务名称'] || '',
      assignee: row['负责人'] || '',
      deliverable: row['交付物'] || undefined,
      startDate: row['开始日期'] ? new Date(row['开始日期']).getTime() : Date.now(),
      endDate: row['结束日期'] ? new Date(row['结束日期']).getTime() : Date.now() + 7 * 86400000,
      priority: (row['优先级'] || 'P1') as Priority,
      risk: (row['风险'] || 'none') as RiskLevel,
      status: (row['状态'] || 'todo') as TaskStatus,
      tags: (row['标签'] || '').split(/[,，]/).map(t => t.trim()).filter(Boolean),
      dependencies: [],
      source: 'manual',
    }));
    await db.tasks.bulkAdd(newTasks);
    refreshTasks();
  }

  const editConflicts = editTask?.dependencies?.filter(depId => {
    const dep = tasks.find(t => t.id === depId);
    return dep && (editTask.startDate < dep.endDate);
  }) ?? [];

  return (
    <AppShell>
      <ProjectHeader projectId={id} />

      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">进度管理</h2>
            <p className="text-sm text-gray-400 mt-1">
              {tasks.length} 个任务 · {tasks.filter(t => t.status === 'done').length} 完成 · {tasks.filter(t => t.status !== 'done' && t.endDate <= Date.now()).length} 逾期
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" size="sm" onClick={handleDownloadTemplate}>下载模板</Button>
            <Button variant="secondary" size="sm" onClick={handleImport}>批量导入</Button>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setView('list')}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${view === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                列表
              </button>
              <button
                onClick={() => setView('gantt')}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${view === 'gantt' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                甘特图
              </button>
            </div>
            <button
              onClick={() => setIncompleteOnly(!incompleteOnly)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors border ${incompleteOnly ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
            >
              {incompleteOnly ? '仅未完成' : '全部'}
            </button>
            <Button onClick={() => { setEditTask(undefined); setShowForm(true); }}>
              + 新建任务
            </Button>
          </div>
        </div>

        {tasks.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="暂无任务"
            description="按 IPD 阶段创建任务，自动生成甘特图。"
            action={{ label: '新建任务', onClick: () => setShowForm(true) }}
          />
        ) : view === 'list' ? (
          <TaskList tasks={incompleteOnly ? tasks.filter(t => t.status !== 'done') : tasks} highlightId={highlightId} onEdit={(t) => { setEditTask(t); setShowForm(true); }} onBatchUpdate={handleBatchUpdate} onDelete={setDeleteTarget} />
        ) : (
          <GanttChart tasks={incompleteOnly ? tasks.filter(t => t.status !== 'done') : tasks} milestones={milestones} onEdit={(t) => { setEditTask(t); setShowForm(true); }} />
        )}

        <TaskForm
          key={editTask?.id ?? 'new'}
          open={showForm}
          onClose={() => { setShowForm(false); setEditTask(undefined); }}
          projectId={id}
          members={project?.members.map(m => m.name) ?? []}
          editTask={editTask}
          conflicts={editConflicts}
          onSaved={refreshTasks}
        />

        <ConfirmDialog
          open={!!deleteTarget}
          title="删除任务"
          message={`确认删除任务「${deleteTarget?.name || ''}」？此操作不可恢复。`}
          confirmLabel="删除"
          onConfirm={() => deleteTarget && handleDeleteTask(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      </div>
    </AppShell>
  );
}


export default function SchedulePage() {
  return <Suspense fallback={null}><SchedulePageContent /></Suspense>;
}
