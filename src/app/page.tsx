'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import gsap from 'gsap';
import type { Project, Task, Milestone, MILEntry } from '@/types';
import { db } from '@/db/database';
import AppShell from '@/components/layout/AppShell';
import ProjectForm from '@/components/project/ProjectForm';
import Button from '@/components/shared/Button';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import Icon from '@/components/shared/Icon';
import { NonDemoOnly } from '@/components/shared/DemoGuard';
import AIInsightsCard from '@/components/dashboard/AIInsightsCard';
import { collectProjectDataWithGraph } from '@/lib/insights';
import AnimatedNumber from '@/components/shared/AnimatedNumber';
import { isDemoMode } from '@/lib/demo-data';
import { addDays } from '@/lib/utils';
import RungWaterfall from '@/components/charts/RungWaterfall';
import TickGauge from '@/components/charts/TickGauge';

function loadProjects(): Promise<Project[]> {
  return db.projects.toArray().then(arr => arr.sort((a, b) => b.updatedAt - a.updatedAt));
}

type TimeEntry = { date: number; type: 'milestone' | 'task'; label: string; projectName: string; projectId: string; urgent: boolean; id: string };

export default function HomePage() {
  const router = useRouter();
  const pathname = usePathname();
  const [projects, setProjects] = useState<Project[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allMilestones, setAllMilestones] = useState<Milestone[]>([]);
  const [allMILs, setAllMILs] = useState<MILEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const [, setTick] = useState(0);
  const staggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([loadProjects(), db.tasks.toArray(), db.milestones.toArray(), db.milEntries.toArray()])
      .then(([p, t, ms, mils]) => {
        setProjects(p); setAllTasks(t); setAllMilestones(ms); setAllMILs(mils);
        setLoading(false); setTick(Date.now());
      });
  }, [pathname]);

  async function handleDelete() {
    if (!deleteTarget) return;
    const pid = deleteTarget.id;
    await Promise.all([
      db.projects.delete(pid), db.milestones.where('projectId').equals(pid).delete(),
      db.tasks.where('projectId').equals(pid).delete(), db.meetings.where('projectId').equals(pid).delete(),
      db.retrospectives.where('projectId').equals(pid).delete(), db.changeRecords.where('projectId').equals(pid).delete(),
      db.bomItems.where('projectId').equals(pid).delete(), db.procurementCandidates.where('projectId').equals(pid).delete(),
      db.certRequirements.where('projectId').equals(pid).delete(), db.milEntries.where('projectId').equals(pid).delete(),
      db.workLogs.where('projectId').equals(pid).delete(),
    ]);
    setDeleteTarget(null);
    setProjects(await loadProjects());
  }

  // --- Filter by selected project ---
  const activeProjectIds = new Set(projects.filter(p => p.status === 'active').map(p => p.id));
  const scopeTasks = allTasks.filter(t => {
    if (!activeProjectIds.has(t.projectId)) return false;
    return !selectedProjectId || t.projectId === selectedProjectId;
  });
  const scopeMILs = allMILs.filter(m => {
    if (!activeProjectIds.has(m.projectId)) return false;
    return !selectedProjectId || m.projectId === selectedProjectId;
  });
  const scopeMilestones = allMilestones.filter(m => {
    if (!activeProjectIds.has(m.projectId)) return false;
    return !selectedProjectId || m.projectId === selectedProjectId;
  });

  const now = useMemo(() => Date.now(), [allTasks]);
  const todayEnd = useMemo(() => { const d = new Date(); d.setHours(23,59,59,999); return d; }, [allTasks]);
  const todayTs = todayEnd.getTime();
  const sevenDaysLater = addDays(now, 7);
  const fourteenDaysLater = addDays(now, 14);

  const tasksDue7Days = scopeTasks.filter(t => t.status !== 'done' && t.endDate > todayTs && t.endDate <= sevenDaysLater);
  const tasksDue14Days = scopeTasks.filter(t => t.status !== 'done' && t.endDate > todayTs && t.endDate <= fourteenDaysLater);
  const overdueTasks = scopeTasks.filter(t => t.status !== 'done' && t.endDate <= todayTs);
  const openMILs = scopeMILs.filter(m => m.status !== 'closed');
  const aClassMILs = openMILs.filter(m => m.severity === 'A');

  const activeProjects = projects.filter(p => p.status === 'active');
  const archivedProjects = projects.filter(p => p.status === 'archived');
  const terminatedProjects = projects.filter(p => p.status === 'terminated');
  const selectedProject = selectedProjectId ? projects.find(p => p.id === selectedProjectId) : null;

  // --- On-time completion rate ---
  const onTimeStats = useMemo(() => {
    const doneTasks = scopeTasks.filter(t => t.status === 'done');
    const onTime = doneTasks.filter(t => {
      const actual = t.actualEndDate || t.endDate;
      return actual <= t.endDate;
    });
    const doneMS = scopeMilestones.filter(m => m.status === 'completed');
    const msOnTime = doneMS.filter(m => {
      const actual = m.actualDate || m.plannedDate;
      return actual <= m.plannedDate;
    });
    return {
      taskTotal: doneTasks.length,
      taskOnTime: onTime.length,
      taskRate: doneTasks.length > 0 ? Math.round((onTime.length / doneTasks.length) * 100) : 0,
      msTotal: doneMS.length,
      msOnTime: msOnTime.length,
      msRate: doneMS.length > 0 ? Math.round((msOnTime.length / doneMS.length) * 100) : 0,
      overallRate: (doneTasks.length + doneMS.length) > 0
        ? Math.round(((onTime.length + msOnTime.length) / (doneTasks.length + doneMS.length)) * 100) : 0,
    };
  }, [scopeTasks, scopeMilestones]);

  // --- Overdue aging ---
  const aging = useMemo(() => {
    const msPerDay = 86400000;
    const buckets = [
      { label: '1-3 天', min: 1, max: 3, count: 0 },
      { label: '4-7 天', min: 4, max: 7, count: 0 },
      { label: '8-14 天', min: 8, max: 14, count: 0 },
      { label: '15 天以上', min: 15, max: Infinity, count: 0 },
    ];
    overdueTasks.forEach(t => {
      const days = Math.ceil((now - t.endDate) / msPerDay);
      for (const b of buckets) { if (days >= b.min && days <= b.max) { b.count++; break; } }
    });
    return buckets.filter(b => b.count > 0);
  }, [overdueTasks, now]);

  // --- This week's key dates ---
  const thisWeekEntries = useMemo((): TimeEntry[] => {
    const entries: TimeEntry[] = [];
    const weekEnd = addDays(now, 7);
    const projMap = new Map(projects.map(p => [p.id, p]));
    scopeTasks.filter(t => t.status !== 'done' && t.endDate >= now && t.endDate <= weekEnd)
      .forEach(t => {
        const p = projMap.get(t.projectId);
        entries.push({ date: t.endDate, type: 'task', label: t.name, projectName: p?.name ?? '', projectId: t.projectId, urgent: t.priority === 'P0' || t.endDate <= addDays(now, 2), id: t.id });
      });
    scopeMilestones.filter(m => m.status !== 'completed' && m.plannedDate >= now && m.plannedDate <= weekEnd)
      .forEach(m => {
        const p = projMap.get(m.projectId);
        entries.push({ date: m.plannedDate, type: 'milestone', label: m.name, projectName: p?.name ?? '', projectId: m.projectId, urgent: m.plannedDate <= addDays(now, 2) || m.status === 'delayed', id: m.id });
      });
    return entries.sort((a, b) => a.date - b.date);
  }, [scopeTasks, scopeMilestones, projects, now]);

  const groupedByDay = useMemo(() => {
    const map = new Map<string, TimeEntry[]>();
    thisWeekEntries.forEach(e => {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return map;
  }, [thisWeekEntries]);

  function dayLabel(dateStr: string): string {
    const d = new Date(dateStr);
    const diff = Math.ceil((d.getTime() - now) / 86400000);
    if (diff === 0) return '今天'; if (diff === 1) return '明天'; if (diff === 2) return '后天';
    const weekdays = ['周日','周一','周二','周三','周四','周五','周六'];
    return `${d.getMonth()+1}/${d.getDate()} ${weekdays[d.getDay()]}`;
  }
  function getProjectName(pid: string) { return projects.find(p => p.id === pid)?.name ?? '未知项目'; }

  // GSAP animations
  useEffect(() => {
    if (loading) return;
    const ctx = gsap.context(() => {
      const cards = staggerRef.current?.querySelectorAll('[data-stagger]');
      if (cards && cards.length > 0)
        gsap.fromTo(cards, { y: 20, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.06, duration: 0.45, ease: 'power2.out' });
    });
    return () => ctx.revert();
  }, [loading]);

  if (loading) {
    return (
      <AppShell><div className="p-4 md:p-6 space-y-4">
        <div className="animate-pulse space-y-4"><div className="h-8 bg-gray-100 rounded w-48" /><div className="h-4 bg-gray-100 rounded w-72" /></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">{[1,2,3,4].map(i=><div key={i} className="h-24 bg-gray-50 rounded-xl animate-pulse" />)}</div>
      </div></AppShell>
    );
  }

  const pickProject = (pid: string | null) => { setSelectedProjectId(pid); setTick(Date.now()); };

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-5 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">工作台</h1>
              <p className="text-sm text-gray-500 mt-1">
                {selectedProject ? (
                  <><span className="font-medium text-gray-700">{selectedProject.name}</span><span className="ml-2 text-gray-400">· {scopeTasks.length} 个任务</span></>
                ) : (
                  <><span className="font-medium text-gray-700">{activeProjects.length}</span> 个进行中
                    {archivedProjects.length > 0 && <span className="ml-2 text-gray-400">· {archivedProjects.length} 个已归档</span>}
                    <span className="ml-2 text-gray-400">· {scopeTasks.length} 个任务</span></>
                )}
              </p>
            </div>
            {/* Project selector */}
            <select value={selectedProjectId ?? ''} onChange={e => pickProject(e.target.value || null)}
              className="ml-4 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400">
              <option value="">全部项目</option>
              {activeProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" size="sm" onClick={() => router.push('/my-tasks')}>我的待办</Button>
            <NonDemoOnly><Button onClick={() => setShowForm(true)}>+ 新建项目</Button></NonDemoOnly>
          </div>
        </div>

        {/* Alert Cards */}
        <div ref={staggerRef} className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <AlertCard label="逾期任务" count={overdueTasks.length} color="red" icon="alert-triangle" onClick={() => router.push('/my-tasks?filter=overdue')} />
          <AlertCard label="7天内到期" count={tasksDue7Days.length} color="amber" icon="calendar" onClick={() => router.push('/my-tasks?filter=soon')} />
          <AlertCard label="14天内到期" count={tasksDue14Days.length} color="blue" icon="calendar" sub="含7天内" onClick={() => router.push('/my-tasks?filter=soon')} />
          <AlertCard label="A类MIL" count={aClassMILs.length} color="red" icon="alert-triangle" sub={`${openMILs.length}个未关闭`} onClick={() => router.push('/my-tasks?filter=mil')} />
        </div>

        {/* Overdue Aging + On-time Rate */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Overdue Aging */}
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">逾期老化分布</h2>
            <RungWaterfall total={overdueTasks.length} buckets={aging} />
          </div>

          {/* On-time Completion Rate */}
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">准时完成率</h2>
            <TickGauge
              rate={onTimeStats.overallRate}
              details={[
                { label: '任务', onTime: onTimeStats.taskOnTime, total: onTimeStats.taskTotal },
                { label: '里程碑', onTime: onTimeStats.msOnTime, total: onTimeStats.msTotal },
              ]}
            />
          </div>
        </div>

        {/* This Week Key Dates */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-5">本周关键日期</h2>
          {groupedByDay.size === 0 ? (
            <div className="text-sm text-gray-400 py-4 text-center">本周暂无到期任务或里程碑</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from(groupedByDay.entries()).map(([dateStr, entries]) => (
                <div key={dateStr}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    <span className="text-xs font-semibold text-gray-700">{dayLabel(dateStr)}</span>
                    <span className="text-xs text-gray-400">{entries.length} 项</span>
                  </div>
                  <div className="ml-3.5 space-y-1.5 border-l-2 border-gray-100 pl-4">
                    {entries.map((e, i) => (
                      <button key={i} onClick={() => router.push(`/project/${e.projectId}${e.type==='milestone'?'':'/schedule'}?hl=${e.id}`)} className="block w-full text-left group">
                        <div className="flex items-center gap-2">
                          {e.type === 'milestone'
                            ? <svg width="10" height="10" viewBox="0 0 10 10"><polygon points="5,0 10,5 5,10 0,5" fill={e.urgent?'#ef4444':'#6366f1'} /></svg>
                            : <div className={`w-2 h-2 rounded-full ${e.urgent?'bg-red-500':'bg-gray-300'}`} />}
                          <span className={`text-sm truncate group-hover:underline ${e.urgent?'text-gray-900 font-medium':'text-gray-600'}`}>{e.label}</span>
                        </div>
                        <div className="text-xs text-gray-400 ml-4">{e.projectName}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overdue Tasks Detail */}
        {overdueTasks.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-red-600 uppercase tracking-wide mb-3">逾期任务详情 ({overdueTasks.length})</h2>
            <div className="space-y-1">
              {overdueTasks.map(t => {
                const days = Math.ceil((now - t.endDate) / 86400000);
                return (
                  <div key={t.id} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${t.priority==='P0'?'bg-red-100 text-red-700':'bg-gray-100 text-gray-600'}`}>{t.priority}</span>
                      <span className="text-sm text-gray-800">{t.name}</span>
                      <span className="text-xs text-gray-500">{t.assignee}</span>
                      <span className="text-xs text-red-500 font-medium">逾期 {days} 天</span>
                    </div>
                    <span className="text-xs text-gray-500">{getProjectName(t.projectId)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AI Insights */}
        <AIInsightsCard
          isDemo={isDemoMode()}
          hasSelectedProject={!!selectedProjectId}
          onRunAnalysis={async () => {
            if (!selectedProjectId) return null;
            const data = await collectProjectDataWithGraph(selectedProjectId);
            if (!data) return null;
            const [riskRes, costRes, scheduleRes] = await Promise.all([
              fetch('/api/ai/risk', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ data }) }).then(r=>r.json()).catch(()=>null),
              fetch('/api/ai/cost', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ data }) }).then(r=>r.json()).catch(()=>null),
              fetch('/api/ai/schedule', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ data }) }).then(r=>r.json()).catch(()=>null),
            ]);
            return { risk: riskRes, cost: costRes, schedule: scheduleRes };
          }}
        />

        <ProjectForm open={showForm} onClose={() => setShowForm(false)}
          onCreated={(id) => { setShowForm(false); router.push(`/project/${id}`); }} />
        <ConfirmDialog open={!!deleteTarget} title="删除项目"
          message={`确定要删除「${deleteTarget?.name}」吗？所有关联数据将被永久删除。`}
          confirmLabel="确认删除" variant="danger" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      </div>
    </AppShell>
  );
}

function AlertCard({ label, count, color, icon, sub, onClick }: {
  label: string; count: number; color: 'red' | 'amber' | 'blue'; icon: 'alert-triangle' | 'calendar'; sub?: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} data-stagger className="bg-white border border-gray-200 rounded-xl p-4 text-left transition-all hover:shadow-md">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100"><Icon name={icon} size={14} stroke={2} className="text-gray-500" /></span>
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900"><AnimatedNumber value={count} duration={0.6} /></div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </button>
  );
}
