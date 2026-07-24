'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Retrospective } from '@/types';
import { db } from '@/db/database';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import ProjectHeader from '@/components/layout/ProjectHeader';
import Badge from '@/components/shared/Badge';
import Button from '@/components/shared/Button';
import { formatDate } from '@/lib/utils';
import { PHASES } from '@/lib/ipd';

export default function RetroDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const retroId = params.retroId as string;
  const [retro, setRetro] = useState<Retrospective | null>(null);

  useEffect(() => {
    db.retrospectives.get(retroId).then(r => setRetro(r ?? null));
  }, [retroId]);

  if (!retro) {
    return (
      <AppShell>
        <ProjectHeader projectId={projectId} />
        <div className="p-6"><div className="animate-pulse h-8 bg-gray-100 rounded w-64" /></div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <ProjectHeader projectId={projectId} />
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-700">← 返回</button>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{retro.title}</h2>
              <div className="text-sm text-gray-400 mt-1">
                {PHASES.find(p => p.key === retro.phase)?.label} · {retro.generatedBy === 'ai' ? 'AI 辅助' : '手动'} · {formatDate(retro.createdAt)}
              </div>
            </div>
          </div>
          <Button size="sm" onClick={() => router.push(`/project/${projectId}/retro/${retroId}/report`)}>
            📄 导出复盘报告
          </Button>
        </div>

        <div className="space-y-6">
          <Section title="目标回顾" content={retro.goalReview} />
          <Section title="达成情况" content={retro.achievement} />

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-emerald-600 mb-3">亮点</h3>
            <ul className="space-y-1">
              {retro.highlights.map((h, i) => (
                <li key={i} className="text-sm text-gray-700 flex gap-2"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="inline text-emerald-500 mt-0.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> {h}</li>
              ))}
            </ul>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-red-600 mb-3">不足</h3>
            <ul className="space-y-1">
              {retro.gaps.map((g, i) => (
                <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-red-700">!</span> {g}</li>
              ))}
            </ul>
          </div>

          <Section title="根因分析" content={retro.rootCauseAnalysis} />

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-blue-600 mb-3">改进措施</h3>
            <ul className="space-y-1">
              {retro.improvements.map((imp, i) => (
                <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-blue-700">→</span> {imp}</li>
              ))}
            </ul>
          </div>

          {(retro.lessonsLearned ?? []).length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-purple-400 mb-3">经验教训库</h3>
              <div className="space-y-3">
                {(retro.lessonsLearned ?? []).map((l, i) => (
                  <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="text-sm font-semibold text-gray-700 mb-1">问题：{l.problem}</div>
                    <div className="text-xs text-gray-400 ml-3 mb-0.5">根因：{l.rootCause}</div>
                    <div className="text-xs text-blue-600 ml-3">方案：{l.solution}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Section({ title, content }: { title: string; content: string }) {
  if (!content) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-400 mb-2">{title}</h3>
      <p className="text-sm text-gray-700 whitespace-pre-wrap">{content}</p>
    </div>
  );
}
