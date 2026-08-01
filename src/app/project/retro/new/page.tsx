'use client';

import { useState, useEffect } from 'react';
import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Project, Retrospective, Phase, Lesson } from '@/types';
import { db } from '@/db/database';
import AppShell from '@/components/layout/AppShell';
import ProjectHeader from '@/components/layout/ProjectHeader';
import Button from '@/components/shared/Button';
import { PHASES } from '@/lib/ipd';
import { generateId } from '@/lib/utils';
import { aiGenerateRetro } from '@/lib/ai-remote';

function NewRetroPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('p') ?? '';
  const [project, setProject] = useState<Project | null>(null);
  const [title, setTitle] = useState('');
  const [phase, setPhase] = useState<Phase>('concept');
  const [goalReview, setGoalReview] = useState('');
  const [achievement, setAchievement] = useState('');
  const [highlights, setHighlights] = useState('');
  const [gaps, setGaps] = useState('');
  const [rootCauseAnalysis, setRootCauseAnalysis] = useState('');
  const [improvements, setImprovements] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    db.projects.get(id).then(p => {
      setProject(p ?? null);
      if (p) setPhase(p.phase);
    });
  }, [id]);

  async function generateWithAI() {
    if (!project) return;
    setGenerating(true);
    setError('');

    try {
      const tasks = await db.tasks.where('projectId').equals(id).toArray();
      const meetings = await db.meetings.where('projectId').equals(id).toArray();
      const milestones = await db.milestones.where('projectId').equals(id).sortBy('order');

      const doneTasks = tasks.filter(t => t.status === 'done').length;
      const overdueTasks = tasks.filter(t => t.status !== 'done' && t.endDate <= Date.now()).length;
      const totalTasks = tasks.length;
      const onTime = milestones.filter(m => m.status !== 'delayed').length;
      const delayed = milestones.filter(m => m.status === 'delayed').length;

      const projectData = `
项目名称: ${project.name}
当前阶段: ${phase}
总任务数: ${totalTasks}，已完成: ${doneTasks}，逾期: ${overdueTasks}
里程碑: ${milestones.length} 个，按时: ${onTime}，延期: ${delayed}
会议记录: ${meetings.length} 场，共 ${meetings.reduce((s, m) => s + m.decisions.length, 0)} 条决议
预算总预估: ¥${project.budget.reduce((s, b) => s + b.estimated, 0)}，实际: ¥${project.budget.reduce((s, b) => s + b.actual, 0)}
变更记录: ${(await db.changeRecords.where('projectId').equals(id).count())} 条
${meetings.length > 0 ? '最近会议: ' + meetings.map(m => `[${m.title}] ${m.summary ?? ''}`).join('; ') : ''}`;

      const data = (await aiGenerateRetro(projectData)) as unknown as {
        title?: string; goalReview?: string; achievement?: string;
        highlights?: string[]; gaps?: string[]; rootCauseAnalysis?: string; improvements?: string[];
      };

      setTitle(data.title ?? `${phase} 阶段复盘`);
      setGoalReview(data.goalReview ?? '');
      setAchievement(data.achievement ?? '');
      setHighlights((data.highlights ?? []).join('\n'));
      setGaps((data.gaps ?? []).join('\n'));
      setRootCauseAnalysis(data.rootCauseAnalysis ?? '');
      setImprovements((data.improvements ?? []).join('\n'));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    const retro: Retrospective = {
      id: generateId(),
      projectId: id,
      phase,
      title: title || `${PHASES.find(p => p.key === phase)?.label} 复盘`,
      goalReview,
      achievement,
      highlights: highlights.split('\n').filter(Boolean),
      gaps: gaps.split('\n').filter(Boolean),
      rootCauseAnalysis,
      improvements: improvements.split('\n').filter(Boolean),
      lessonsLearned: [],
      generatedBy: 'ai',
      createdAt: Date.now(),
    };

    await db.retrospectives.put(retro);
    router.push(`/project/retro/detail?p=${id}&rid=${retro.id}`);
  }

  return (
    <AppShell>
      <ProjectHeader projectId={id} />
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-700">← 返回</button>
            <h2 className="text-xl font-bold text-gray-900">新建复盘</h2>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={generateWithAI} disabled={generating}>
              {generating ? 'AI 生成中...' : 'AI 辅助生成'}
            </Button>
            <Button onClick={save}>保存复盘</Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-800 rounded-lg px-4 py-3 text-red-600 text-sm mb-4">{error}</div>
        )}

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">复盘标题</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">阶段</label>
              <select value={phase} onChange={e => setPhase(e.target.value as Phase)}
                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-blue-500">
                {PHASES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">目标回顾</label>
            <textarea value={goalReview} onChange={e => setGoalReview(e.target.value)} rows={3}
              placeholder="项目原定目标是什么？包括成本、质量、进度目标..."
              className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-gray-900 text-sm focus:outline-none focus:border-blue-500 resize-none" />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">达成情况</label>
            <textarea value={achievement} onChange={e => setAchievement(e.target.value)} rows={3}
              placeholder="实际 vs 目标的定量对比..."
              className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-gray-900 text-sm focus:outline-none focus:border-blue-500 resize-none" />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">亮点（每行一条）</label>
            <textarea value={highlights} onChange={e => setHighlights(e.target.value)} rows={3}
              className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-gray-900 text-sm focus:outline-none focus:border-blue-500 resize-none" />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">不足（每行一条）</label>
            <textarea value={gaps} onChange={e => setGaps(e.target.value)} rows={3}
              className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-gray-900 text-sm focus:outline-none focus:border-blue-500 resize-none" />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">根因分析</label>
            <textarea value={rootCauseAnalysis} onChange={e => setRootCauseAnalysis(e.target.value)} rows={4}
              placeholder="用 5 Whys 或鱼骨图分析关键问题的根本原因..."
              className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-gray-900 text-sm focus:outline-none focus:border-blue-500 resize-none" />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">改进措施（每行一条）</label>
            <textarea value={improvements} onChange={e => setImprovements(e.target.value)} rows={3}
              className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-gray-900 text-sm focus:outline-none focus:border-blue-500 resize-none" />
          </div>
        </div>
      </div>
    </AppShell>
  );
}


export default function NewRetroPage() {
  return <Suspense fallback={null}><NewRetroPageContent /></Suspense>;
}
