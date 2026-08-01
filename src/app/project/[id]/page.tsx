'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Project, Task, Milestone, MILEntry, Meeting } from '@/types';
import { db } from '@/db/database';
import AppShell from '@/components/layout/AppShell';
import ProjectHeader from '@/components/layout/ProjectHeader';
import MilestoneTimeline from '@/components/project/MilestoneTimeline';
import ProjectForm from '@/components/project/ProjectForm';
import Button from '@/components/shared/Button';
import ExportButton from '@/components/export/ExportButton';
import { NonDemoOnly } from '@/components/shared/DemoGuard';
import { generateId, now, formatDate } from '@/lib/utils';
import { getDefaultMilestones, PHASE_LABELS, PROJECT_MODE_LABELS } from '@/lib/ipd';

export default function ProjectOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [milEntries, setMilEntries] = useState<MILEntry[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    Promise.all([
      db.projects.get(id),
      db.tasks.where('projectId').equals(id).toArray(),
      db.milestones.where('projectId').equals(id).sortBy('order'),
      db.milEntries.where('projectId').equals(id).toArray(),
      db.meetings.where('projectId').equals(id).toArray(),
    ]).then(([p, ts, ms, mils, mets]) => {
      setProject(p ?? null);
      setTasks(ts);
      setMilestones(ms);
      setMilEntries(mils);
      setMeetings(mets);
    });
  }, [id]);

  async function initMilestones() {
    if (!project) return;
    const existing = await db.milestones.where('projectId').equals(id).count();
    if (existing > 0) return;
    const ms = getDefaultMilestones(id, now());
    await db.milestones.bulkAdd(ms.map(m => ({ ...m, id: generateId() })));
    const updated = await db.milestones.where('projectId').equals(id).sortBy('order');
    setMilestones(updated);
  }

  if (!project) {
    return (
      <AppShell>
        <div className="p-6"><div className="animate-pulse space-y-4"><div className="h-8 bg-gray-100 rounded w-64" /><div className="h-4 bg-gray-100 rounded w-96" /></div></div>
      </AppShell>
    );
  }

  // --- Computed stats ---
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const overdueTasks = tasks.filter(t => t.status !== 'done' && t.endDate <= Date.now()).length;
  const taskProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const completedMilestones = milestones.filter(m => m.status === 'completed').length;
  const totalMilestones = milestones.length;
  const delayedMilestones = milestones.filter(m => m.status === 'delayed').length;

  const totalBudget = project.budget.reduce((s, b) => s + b.estimated, 0);
  const totalActual = project.budget.reduce((s, b) => s + b.actual, 0);
  const openMIL = milEntries.filter(m => m.status !== 'closed').length;
  const aClassMIL = milEntries.filter(m => m.severity === 'A' && m.status !== 'closed').length;
  const bClassMIL = milEntries.filter(m => m.severity === 'B' && m.status !== 'closed').length;
  const highRiskTasks = tasks.filter(t => t.risk === 'high');

  // Next upcoming milestone
  const nextMilestone = milestones.find(m => m.status === 'pending' || m.status === 'in-progress');
  const daysToNext = nextMilestone ? Math.ceil((nextMilestone.plannedDate - Date.now()) / 86400000) : null;

  // Recent activity
  const recentActivity: { date: number; type: 'meeting' | 'change' | 'task'; text: string }[] = [];
  meetings.slice(-3).forEach(m => {
    recentActivity.push({ date: m.date, type: 'meeting' as const, text: `${m.title} · ${m.decisions.length} 条决议` });
  });
  tasks.filter(t => t.status === 'done').slice(-3).forEach(t => {
    recentActivity.push({ date: t.actualEndDate ?? t.endDate, type: 'task' as const, text: `${t.name} 完成 ✓` });
  });
  recentActivity.sort((a, b) => b.date - a.date);

  // Cost distribution for chart
  const categoryLabels: Record<string, string> = { mold: '模具', sample: '样品', labor: '人力', cert: '认证', patent: '专利', travel: '差旅', other: '其他' };
  const categoryTotal: Record<string, number> = {};
  project.budget.forEach(b => {
    const key = categoryLabels[b.category] || b.category;
    categoryTotal[key] = (categoryTotal[key] || 0) + b.estimated;
  });
  // Add member labor if not already in budget
  const maxCatCost = Math.max(...Object.values(categoryTotal), 1);

  return (
    <AppShell>
      <ProjectHeader projectId={id} />

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => router.push(`/project/${id}/schedule`)}>进入进度管理</Button>
          <Button variant="secondary" onClick={() => router.push(`/project/${id}/meetings/new`)}>新建会议记录</Button>
          <NonDemoOnly><Button variant="secondary" onClick={() => setShowEdit(true)}>编辑项目</Button></NonDemoOnly>
          <ExportButton projectId={id} />
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
          <MetricCard label="整体进度" value={`${taskProgress}%`} sub={`${doneTasks}/${totalTasks} 任务完成`} color="blue" />
          <MetricCard
            label="里程碑"
            value={`${completedMilestones}/${totalMilestones}`}
            sub={delayedMilestones > 0 ? `${delayedMilestones} 个延期` : '全部按时'}
            color={delayedMilestones > 0 ? 'red' : 'green'}
          />
          <MetricCard label="预算执行" value={`¥${(totalActual / 1000).toFixed(0)}K`} sub={`/ ¥${(totalBudget / 1000).toFixed(0)}K`} color={totalActual > totalBudget ? 'red' : 'blue'} />
          <MetricCard label="MIL 问题" value={`${openMIL}`} sub={`A类${aClassMIL} · B类${bClassMIL}`} color={aClassMIL > 0 ? 'red' : 'yellow'} />
          <MetricCard
            label="下次里程碑"
            value={nextMilestone ? nextMilestone.name.split(' ')[0] : '—'}
            sub={daysToNext !== null ? (daysToNext >= 0 ? `还有 ${daysToNext} 天` : `已过 ${Math.abs(daysToNext)} 天`) : '未设置'}
            color={daysToNext !== null && daysToNext < 0 ? 'red' : 'blue'}
          />
        </div>

        {/* Milestone Timeline */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">里程碑进度</h2>
            <NonDemoOnly><Button variant="secondary" size="sm" onClick={initMilestones}>初始化里程碑</Button></NonDemoOnly>
          </div>
          <MilestoneTimeline projectId={id} />
        </div>

        {/* Bottom grid: Cost Chart + Risk Radar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Cost Distribution Chart */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">成本分布</h2>
            <div className="space-y-3">
              {Object.entries(categoryTotal).map(([cat, cost]) => (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{cat}</span>
                    <span className="text-gray-700 font-medium">¥{(cost / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="h-5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(cost / maxCatCost) * 100}%`,
                        backgroundColor: cost === maxCatCost ? '#6366f1' : cost > maxCatCost * 0.5 ? '#818cf8' : '#a5b4fc',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-500">
              总预估: ¥{totalBudget.toLocaleString()}
            </div>
          </div>

          {/* Risk Radar */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">风险雷达</h2>
            <div className="space-y-4">
              <RiskRow label="逾期任务" count={overdueTasks} color="red" onClick={() => router.push(`/project/${id}/schedule`)} />
              <RiskRow label="高风险任务" count={highRiskTasks.length} color="orange" onClick={() => router.push(`/project/${id}/schedule`)} />
              <RiskRow label="A 类 MIL" count={aClassMIL} color="red" onClick={() => router.push(`/project/${id}/mil`)} />
              <RiskRow label="延期里程碑" count={delayedMilestones} color="orange" />
            </div>
            {overdueTasks === 0 && highRiskTasks.length === 0 && aClassMIL === 0 && delayedMilestones === 0 && (
              <div className="text-center py-6 text-emerald-600 text-sm font-medium">当前无风险项</div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">近期活动</h2>
          {recentActivity.length === 0 ? (
            <div className="text-center py-4 text-gray-400 text-sm">暂无活动</div>
          ) : (
            <div className="space-y-2">
              {recentActivity.slice(0, 6).map((act, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="text-xs text-gray-400 w-16">{formatDate(act.date)}</span>
                  <span className="text-gray-400 w-8 text-center">
                    {act.type === 'meeting'
                      ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block"><path d="M12 2a3 3 0 00-3 3v6a3 3 0 006 0V5a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block text-emerald-500"><path d="M5 12l5 5L20 7"/></svg>
                    }
                  </span>
                  <span className="text-gray-700">{act.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {project && (
        <ProjectForm
          open={showEdit}
          onClose={() => setShowEdit(false)}
          editProject={project}
          onCreated={() => {
            setShowEdit(false);
            db.projects.get(id).then(p => setProject(p ?? null));
            window.location.reload();
          }}
        />
      )}
    </AppShell>
  );
}

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  const textColors: Record<string, string> = {
    blue: 'text-indigo-600', green: 'text-emerald-600', red: 'text-red-600', yellow: 'text-amber-600',
  };
  const isProgress = label === '整体进度';
  const pct = isProgress ? parseInt(value) || 0 : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="text-xs text-gray-400 mb-1 tracking-wide">{label}</div>
      <div className="flex items-end gap-3">
        <span className={`text-2xl font-bold tracking-tight ${textColors[color] || 'text-gray-900'}`}>{value}</span>
        {isProgress && (
          <svg width="36" height="36" viewBox="0 0 36 36" className="shrink-0 mb-0.5">
            <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
            <circle cx="18" cy="18" r="14" fill="none" stroke="var(--brand)" strokeWidth="3"
              strokeDasharray={`${pct * 0.88} ${88 - pct * 0.88}`} strokeLinecap="round"
              transform="rotate(-90 18 18)" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
          </svg>
        )}
      </div>
      <div className="text-xs text-gray-400 mt-1">{sub}</div>
    </div>
  );
}

function RiskRow({ label, count, color, onClick }: { label: string; count: number; color: string; onClick?: () => void }) {
  const colorMap: Record<string, string> = { red: 'text-red-600', orange: 'text-amber-600', yellow: 'text-amber-600' };
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <button
        onClick={onClick}
        className={`text-sm font-bold ${count > 0 ? colorMap[color] : 'text-gray-500'} ${onClick ? 'hover:underline cursor-pointer' : ''}`}
      >
        {count > 0 ? count : '0'}
      </button>
    </div>
  );
}
