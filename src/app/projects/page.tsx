'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Project, Task, MILEntry } from '@/types';
import { db } from '@/db/database';
import AppShell from '@/components/layout/AppShell';
import ProjectForm from '@/components/project/ProjectForm';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import Button from '@/components/shared/Button';
import { NonDemoOnly } from '@/components/shared/DemoGuard';
import { PHASE_LABELS, PROJECT_MODE_LABELS } from '@/lib/ipd';
import gsap from 'gsap';

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allMILs, setAllMILs] = useState<MILEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([db.projects.toArray(), db.tasks.toArray(), db.milEntries.toArray()]).then(([p, t, m]) => {
      setProjects(p.sort((a, b) => b.updatedAt - a.updatedAt));
      setAllTasks(t);
      setAllMILs(m);
    });
  }, []);

  // Card entrance stagger
  useEffect(() => {
    const cards = gridRef.current?.querySelectorAll('[data-stagger]');
    if (!cards?.length) return;
    gsap.fromTo(cards, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.07, ease: 'power2.out' });
  }, [projects]);

  function projectHealth(p: Project): 'green' | 'red' {
    const ptasks = allTasks.filter(t => t.projectId === p.id);
    const pMils = allMILs.filter(m => m.projectId === p.id && m.status !== 'closed');
    const hasOverdue = ptasks.some(t => t.status !== 'done' && t.endDate <= Date.now());
    const hasAClassMIL = pMils.some(m => m.severity === 'A');
    if (hasOverdue || hasAClassMIL) return 'red';
    return 'green';
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const pid = deleteTarget.id;
    await Promise.all([
      db.projects.delete(pid),
      db.tasks.where('projectId').equals(pid).delete(),
      db.milestones.where('projectId').equals(pid).delete(),
      db.meetings.where('projectId').equals(pid).delete(),
      db.retrospectives.where('projectId').equals(pid).delete(),
      db.changeRecords.where('projectId').equals(pid).delete(),
      db.bomItems.where('projectId').equals(pid).delete(),
      db.procurementCandidates.where('projectId').equals(pid).delete(),
      db.certRequirements.where('projectId').equals(pid).delete(),
      db.milEntries.where('projectId').equals(pid).delete(),
    ]);
    setProjects(prev => prev.filter(p => p.id !== pid));
    setDeleteTarget(null);
  }

  const activeProjects = projects.filter(p => p.status === 'active');
  const archivedProjects = projects.filter(p => p.status === 'archived');
  const terminatedProjects = projects.filter(p => p.status === 'terminated');

  return (
    <AppShell>
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">项目列表</h1>
            <p className="text-sm text-gray-400 mt-1">{projects.length} 个项目</p>
          </div>
          <NonDemoOnly>
            <Button onClick={() => setShowForm(true)}>+ 新建项目</Button>
          </NonDemoOnly>
        </div>

        {activeProjects.length > 0 && (
          <>
            <h2 className="text-sm font-semibold text-gray-400 mb-4">
              进行中 <span className="text-gray-600 font-normal">{activeProjects.length} 个</span>
            </h2>
            <div ref={gridRef} className="grid grid-cols-2 gap-4 mb-8">
              {activeProjects.map(p => (
                <div key={p.id} data-stagger className="relative group bg-white border border-gray-200 hover:border-gray-300 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <div onClick={() => router.push(`/project/${p.id}`)} className="block p-5 cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${projectHealth(p) === 'red' ? 'bg-red-500' : 'bg-green-500'}`} />
                        <h3 className="font-semibold text-gray-900">{p.name}</h3>
                      </div>
                      <span className="text-xs text-gray-600">{PHASE_LABELS[p.phase]}</span>
                    </div>
                    <div className="text-xs text-gray-500">{p.brand} · {p.productLine} · {p.members.length}人</div>
                    <div className="mt-1.5">
                      <ModeBadge mode={p.mode} />
                    </div>
                  </div>
                  <NonDemoOnly>
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteTarget(p); }}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-600 text-lg leading-none">×</button>
                  </NonDemoOnly>
                </div>
              ))}
            </div>
          </>
        )}

        {(archivedProjects.length > 0 || terminatedProjects.length > 0) && (
          <>
            <h2 className="text-sm font-semibold text-gray-600 mb-4">
              已归档 / 已终止 <span className="font-normal">{archivedProjects.length + terminatedProjects.length} 个</span>
            </h2>
            <div className="grid grid-cols-2 gap-4 opacity-60 hover:opacity-80 transition-opacity">
              {[...archivedProjects, ...terminatedProjects].map(p => (
                <div key={p.id} data-stagger className="relative group bg-white border border-gray-200 hover:border-gray-300 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <div onClick={() => router.push(`/project/${p.id}`)} className="block p-5 cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${p.status === 'archived' ? 'bg-gray-200 text-gray-600' : 'bg-red-100 text-red-700'}`}>
                          {p.status === 'archived' ? '已归档' : '已终止'}
                        </span>
                        <h3 className="font-semibold text-gray-500">{p.name}</h3>
                      </div>
                      <span className="text-xs text-gray-600">{PHASE_LABELS[p.phase]}</span>
                    </div>
                    <div className="text-xs text-gray-600">{p.brand} · {p.productLine} · {p.members.length}人</div>
                    <div className="mt-1.5">
                      <ModeBadge mode={p.mode} muted />
                    </div>
                  </div>
                  <NonDemoOnly>
                    <button onClick={async (e) => { e.preventDefault(); e.stopPropagation(); await db.projects.update(p.id, { status: 'active' }); setProjects(prev => prev.map(pp => pp.id === p.id ? { ...pp, status: 'active' as const } : pp)); }}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-emerald-600 text-xs px-2 py-1 rounded border border-gray-200 hover:border-green-700 transition-all">
                      还原
                    </button>
                  </NonDemoOnly>
                </div>
              ))}
            </div>
          </>
        )}

        {projects.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">暂无项目，点击右上角创建</div>
        )}

        <ProjectForm open={showForm} onClose={() => setShowForm(false)}
          onCreated={(id) => { setShowForm(false); router.push(`/project/${id}`); }} />
        <ConfirmDialog open={!!deleteTarget} title="删除项目"
          message={`确定要删除「${deleteTarget?.name}」吗？所有关联数据将被永久删除。`}
          confirmLabel="确认删除" variant="danger" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      </div>
    </AppShell>
  );
}

const MODE_STYLES: Record<string, string> = {
  'odm': 'bg-amber-100 text-amber-700 border-amber-300',
  'oem': 'bg-indigo-100 text-indigo-700 border-indigo-300',
  'self-develop': 'bg-emerald-100 text-emerald-700 border-emerald-300',
  'expand': 'bg-sky-100 text-sky-700 border-sky-300',
};
const MODE_STYLES_MUTED: Record<string, string> = {
  'odm': 'bg-amber-100 text-amber-500 border-amber-200',
  'oem': 'bg-indigo-100 text-indigo-500 border-indigo-200',
  'self-develop': 'bg-emerald-100 text-emerald-500 border-emerald-200',
  'expand': 'bg-sky-100 text-sky-500 border-sky-800/20',
};

function ModeBadge({ mode, muted }: { mode: string; muted?: boolean }) {
  const styles = muted ? MODE_STYLES_MUTED : MODE_STYLES;
  const label = (PROJECT_MODE_LABELS as Record<string, string>)[mode] || mode;
  return (
    <span className={`text-[11px] px-1.5 py-0.5 rounded border ${styles[mode] || 'bg-gray-100 text-gray-400 border-gray-200'}`}>
      {label}
    </span>
  );
}
