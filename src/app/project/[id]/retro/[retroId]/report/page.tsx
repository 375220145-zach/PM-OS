'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Project, Retrospective, WorkLogEntry, ChangeRecord, Task, Milestone, MILEntry, Meeting, Lesson } from '@/types';
import { db } from '@/db/database';
import AppShell from '@/components/layout/AppShell';
import ProjectHeader from '@/components/layout/ProjectHeader';
import Button from '@/components/shared/Button';
import { formatDate } from '@/lib/utils';
import { PHASES } from '@/lib/ipd';

export default function RetroReportPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const retroId = params.retroId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [retro, setRetro] = useState<Retrospective | null>(null);
  const [logs, setLogs] = useState<WorkLogEntry[]>([]);
  const [changes, setChanges] = useState<ChangeRecord[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [milEntries, setMilEntries] = useState<MILEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editGoal, setEditGoal] = useState('');
  const [editAchievement, setEditAchievement] = useState('');
  const [editHighlights, setEditHighlights] = useState('');
  const [editGaps, setEditGaps] = useState('');
  const [editRootCause, setEditRootCause] = useState('');
  const [editImprovements, setEditImprovements] = useState('');
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      db.projects.get(projectId),
      db.retrospectives.get(retroId),
      db.workLogs.where('projectId').equals(projectId).reverse().sortBy('createdAt'),
      db.changeRecords.where('projectId').equals(projectId).reverse().sortBy('createdAt'),
      db.tasks.where('projectId').equals(projectId).toArray(),
      db.milestones.where('projectId').equals(projectId).sortBy('order'),
      db.milEntries.where('projectId').equals(projectId).toArray(),
    ]).then(([p, r, wl, cr, ts, ms, mils]) => {
      setProject(p ?? null);
      setRetro(r ?? null);
      setLogs(wl);
      setChanges(cr);
      setTasks(ts);
      setMilestones(ms);
      setMilEntries(mils);
      setLoading(false);
    });
  }, [projectId, retroId]);

  async function analyzeLogs() {
    if (logs.length === 0) return;
    setAnalyzing(true);
    try {
      const res = await fetch('/api/ai/analyze-work-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logs: logs.map(l => l.items ?? []),
          projectName: project?.name ?? '',
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAiAnalysis(data.summary ?? JSON.stringify(data));
    } catch {
      setAiAnalysis(null);
    }
    setAnalyzing(false);
  }

  useEffect(() => {
    if (logs.length > 0 && !aiAnalysis && !analyzing) {
      analyzeLogs();
    }
  }, [logs]);

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const overdueTasks = tasks.filter(t => t.status !== 'done' && t.endDate <= Date.now()).length;
  const taskProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const delayedMilestones = milestones.filter(m => m.status === 'delayed').length;
  const completedMilestones = milestones.filter(m => m.status === 'completed').length;
  const totalMilestones = milestones.length;
  const totalBudget = project?.budget.reduce((s, b) => s + b.estimated, 0) ?? 0;
  const totalActual = project?.budget.reduce((s, b) => s + b.actual, 0) ?? 0;
  const openMIL = milEntries.filter(m => m.status !== 'closed').length;
  const aClassMIL = milEntries.filter(m => m.severity === 'A' && m.status !== 'closed').length;

  function copyMarkdown() {
    if (!retro || !project) return;
    const phaseLabel = PHASES.find(p => p.key === retro.phase)?.label ?? retro.phase;
    let md = `# ${retro.title}\n\n`;
    md += `**项目**：${project.name}　**阶段**：${phaseLabel}　**日期**：${formatDate(retro.createdAt)}\n\n---\n\n`;
    md += `## 项目概览\n- 任务进度：${doneTasks}/${totalTasks}（${taskProgress}%）\n- 里程碑：${completedMilestones}/${totalMilestones}，${delayedMilestones > 0 ? `${delayedMilestones}个延期` : '全部按时'}\n- 预算执行：¥${totalActual.toLocaleString()} / ¥${totalBudget.toLocaleString()}\n- 变更次数：${changes.length}\n- MIL 问题：${milEntries.length}，未关闭 ${openMIL}，A类 ${aClassMIL}\n\n`;
    md += `## 目标回顾\n${retro.goalReview}\n\n`;
    md += `## 达成情况\n${retro.achievement}\n\n`;
    md += `## 亮点 & 可复用方法\n${(retro.highlights ?? []).map(h => `- ${h}`).join('\n')}\n`;
    if ((retro.improvements ?? []).length > 0) md += `\n**可复用方法**\n${(retro.improvements ?? []).map(i => `- ${i}`).join('\n')}\n`;
    md += `\n## 不足 & 改进措施\n${(retro.gaps ?? []).map(g => `- ${g}`).join('\n')}\n\n`;
    md += `## 根因分析\n${retro.rootCauseAnalysis}\n\n`;
    if ((retro.lessonsLearned ?? []).length > 0) {
      md += `## 经验教训\n`;
      (retro.lessonsLearned ?? []).forEach(l => {
        md += `- **${l.problem}** → ${l.rootCause} → ${l.solution}\n`;
      });
      md += '\n';
    }
    if (logs.length > 0) {
      const totalLogItems = logs.reduce((s, l) => s + (l.items ?? []).length, 0);
      md += `## 工作记录分析\n共 ${logs.length} 条记录，${totalLogItems} 项待办\n`;
      logs.slice(0, 10).forEach(log => {
        const safeItems = log.items ?? [];
        md += `\n**${formatDate(log.createdAt)}**\n`;
        safeItems.forEach(item => {
          md += `- ${item.done ? '[x]' : '[ ]'} ${item.text}\n`;
        });
      });
      if (aiAnalysis) md += `\n${aiAnalysis}\n\n`;
    }
    navigator.clipboard.writeText(md);
  }

  function openEdit() {
    if (!retro) return;
    setEditGoal(retro.goalReview);
    setEditAchievement(retro.achievement);
    setEditHighlights((retro.highlights ?? []).join('\n'));
    setEditGaps((retro.gaps ?? []).join('\n'));
    setEditRootCause(retro.rootCauseAnalysis);
    setEditImprovements((retro.improvements ?? []).join('\n'));
    setEditing(true);
  }

  async function saveEdit() {
    if (!retro || !project) return;
    const updated: Retrospective = {
      ...retro,
      goalReview: editGoal,
      achievement: editAchievement,
      highlights: editHighlights.split('\n').filter(Boolean),
      gaps: editGaps.split('\n').filter(Boolean),
      rootCauseAnalysis: editRootCause,
      improvements: editImprovements.split('\n').filter(Boolean),
    };
    await db.retrospectives.put(updated);
    setRetro(updated);
    setEditing(false);
  }

  async function downloadDocx() {
    if (!reportRef.current || !retro || !project) return;
    const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
      'body{font-family:"Noto Sans SC","Microsoft YaHei",sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#333}' +
      'h1{color:#fff;background:linear-gradient(135deg,#2563eb,#1e40af);padding:60px 40px;border-radius:8px;margin:0 -20px 32px}' +
      'h1 small{display:block;font-size:14px;font-weight:400;opacity:.8;margin-top:8px}' +
      'h2{font-size:18px;border-bottom:2px solid #e5e7eb;padding-bottom:8px;margin:24px 0 16px;color:#1f2937}' +
      '.grid{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px}' +
      '.card{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;flex:1;min-width:100px}' +
      '.card-label{font-size:12px;color:#6b7280;margin-bottom:4px}.card-value{font-size:20px;font-weight:700;color:#1f2937}.card-sub{font-size:12px;color:#9ca3af}' +
      'ul{padding-left:20px;margin:8px 0}li{margin:4px 0;font-size:14px;line-height:1.6}p{font-size:14px;line-height:1.8;color:#374151}' +
      '.lesson{border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin:8px 0;background:#fafafa}' +
      '.log-item{padding:4px 0;font-size:14px}.done{color:#9ca3af;text-decoration:line-through}' +
      '@media print{body{margin:0;padding:0}h1{border-radius:0;margin:0;padding:40px 20px}}' +
      '</style></head><body>' + reportRef.current.innerHTML + '</body></html>';
    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}-复盘报告-${formatDate(retro.createdAt).replace(/\//g, '-')}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading || !retro || !project) {
    return (
      <AppShell>
        <ProjectHeader projectId={projectId} />
        <div className="p-4 md:p-6"><div className="animate-pulse h-8 bg-gray-100 rounded w-64" /></div>
      </AppShell>
    );
  }

  const phaseLabel = PHASES.find(p => p.key === retro.phase)?.label ?? retro.phase;

  return (
    <AppShell>
      <ProjectHeader projectId={projectId} />
      <div className="p-4 md:p-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6 max-w-5xl mx-auto">
          <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-700">← 返回</button>
          <div className="flex gap-3">
            {editing ? (
              <>
                <Button variant="secondary" size="sm" onClick={() => { setEditing(false); openEdit(); }}>取消</Button>
                <Button size="sm" onClick={saveEdit}>保存修改</Button>
              </>
            ) : (
              <>
                <Button variant="secondary" size="sm" onClick={openEdit}>编辑</Button>
                <Button variant="secondary" size="sm" onClick={() => { if (window.innerWidth < 768) { alert('导出功能请在 PC 端操作'); return; } copyMarkdown(); }}>复制 Markdown</Button>
                <Button variant="secondary" size="sm" onClick={() => { if (window.innerWidth < 768) { alert('导出功能请在 PC 端操作'); return; } downloadDocx(); }}>下载 DOC</Button>
                <Button size="sm" onClick={() => { if (window.innerWidth < 768) { alert('导出功能请在 PC 端操作'); return; } window.print(); }}>打印/PDF</Button>
              </>
            )}
          </div>
        </div>

        {/* Report Document */}
        <div ref={reportRef} id="retro-report" className="max-w-5xl mx-auto bg-white text-gray-900 rounded-xl shadow-2xl overflow-hidden print:shadow-none print:rounded-none">
          {/* Cover */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white px-6 py-10 md:px-12 md:py-16 print:px-8 print:py-10">
            <div className="text-sm text-blue-200 mb-2">项目复盘报告</div>
            <h1 className="text-3xl font-bold mb-4">{retro.title}</h1>
            <div className="flex flex-wrap gap-6 text-sm text-blue-100">
              <span>项目：{project.name}</span>
              <span>阶段：{phaseLabel}</span>
              <span>日期：{formatDate(retro.createdAt)}</span>
              <span>生成方式：{retro.generatedBy === 'ai' ? 'AI 辅助' : '手动'}</span>
            </div>
          </div>

          <div className="px-6 py-6 md:px-12 md:py-8 print:px-8 print:py-6 space-y-8">
            {/* Project Snapshot */}
            <section>
              <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4">项目快照</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <SnapshotCard label="任务进度" value={`${taskProgress}%`} sub={`${doneTasks}/${totalTasks}`} />
                <SnapshotCard label="里程碑" value={`${completedMilestones}/${totalMilestones}`} sub={delayedMilestones > 0 ? `${delayedMilestones} 延期` : '全部按时'} />
                <SnapshotCard label="预算" value={`¥${(totalActual / 1000).toFixed(0)}K`} sub={`/ ¥${(totalBudget / 1000).toFixed(0)}K`} />
                <SnapshotCard label="变更" value={String(changes.length)} sub="次" />
                <SnapshotCard label="MIL" value={String(openMIL)} sub={`A类 ${aClassMIL}`} />
              </div>
            </section>

            {/* Goal Review */}
            {editing ? <EditSection title="目标回顾" value={editGoal} onChange={setEditGoal} /> : <ReportSection title="目标回顾" content={retro.goalReview} />}

            {/* Achievement */}
            {editing ? <EditSection title="达成情况" value={editAchievement} onChange={setEditAchievement} /> : <ReportSection title="达成情况" content={retro.achievement} />}

            {/* Highlights & Gaps */}
            {editing ? (
              <div className="grid grid-cols-2 gap-6">
                <EditSection title="亮点（每行一条）" value={editHighlights} onChange={setEditHighlights} />
                <EditSection title="不足（每行一条）" value={editGaps} onChange={setEditGaps} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h2 className="text-lg font-bold text-green-700 border-b border-green-200 pb-2 mb-3">亮点 & 可复用方法</h2>
                  <ul className="space-y-2">{(retro.highlights ?? []).map((h, i) => (<li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-green-600 mt-0.5">★</span> {h}</li>))}</ul>
                  {(retro.improvements ?? []).length > 0 && (
                    <>
                      <div className="mt-4 pt-3 border-t border-green-100">
                        <p className="text-xs font-semibold text-green-600 mb-2">可复用方法</p>
                        <ul className="space-y-1">
                          {(retro.improvements ?? []).map((imp, i) => (
                            <li key={i} className="text-sm text-gray-600 flex gap-2"><span className="text-green-500">→</span> {imp}</li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-red-700 border-b border-red-200 pb-2 mb-3">不足 & 改进措施</h2>
                  <ul className="space-y-2">{(retro.gaps ?? []).map((g, i) => (<li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-red-600 mt-0.5">!</span> {g}</li>))}</ul>
                </div>
              </div>
            )}

            {/* Root Cause */}
            {editing ? <EditSection title="根因分析" value={editRootCause} onChange={setEditRootCause} /> : <ReportSection title="根因分析" content={retro.rootCauseAnalysis} />}

            {/* Lessons Learned */}
            {(retro.lessonsLearned ?? []).length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mb-3">经验教训</h2>
                <div className="space-y-3">
                  {(retro.lessonsLearned ?? []).map((l, i) => (
                    <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="text-sm font-semibold text-gray-800 mb-1">问题：{l.problem}</div>
                      <div className="text-sm text-gray-600 ml-4">根因：{l.rootCause}</div>
                      <div className="text-sm text-blue-700 ml-4">方案：{l.solution}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Work Log Analysis */}
            {logs.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mb-3">工作记录分析</h2>
                <p className="text-sm text-gray-400 mb-3">共 {logs.length} 条工作记录</p>

                {aiAnalysis && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
                    <h3 className="text-sm font-semibold text-blue-700 mb-2">AI 分析摘要</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{aiAnalysis}</p>
                  </div>
                )}

                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {logs.map(log => {
                    const done = log.items.filter(i => i.done).length;
                    return (
                      <details key={log.id} className="text-sm border border-gray-100 rounded-lg">
                        <summary className="px-3 py-2 cursor-pointer text-gray-600 hover:text-gray-800">
                          {formatDate(log.createdAt)} — {done}/{log.items.length} · {log.items[0]?.text.slice(0, 40)}…
                        </summary>
                        <div className="px-3 pb-3 space-y-1">
                          {log.items.map((item, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <span className={item.done ? 'text-green-500' : 'text-gray-500'}>
                                {item.done ? '✅' : '⚪'}
                              </span>
                              <span className={item.done ? 'text-gray-400 line-through' : 'text-gray-700'}>
                                {item.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Appendix: Changes */}
            {changes.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mb-3">附录：变更记录</h2>
                <div className="space-y-1 text-sm text-gray-600">
                  {changes.map(c => (
                    <div key={c.id} className="flex justify-between py-1 border-b border-gray-50">
                      <span>{c.content}</span>
                      <span className="text-gray-500">{formatDate(c.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          #__next { background: white !important; }
          .print\\:shadow-none { box-shadow: none !important; }
        }
      `}</style>
    </AppShell>
  );
}

function SnapshotCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-xl font-bold text-gray-800">{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
    </div>
  );
}

function ReportSection({ title, content }: { title: string; content: string }) {
  if (!content) return null;
  return (
    <section>
      <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mb-3">{title}</h2>
      <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{content}</div>
    </section>
  );
}

function EditSection({ title, value, onChange }: { title: string; value: string; onChange: (v: string) => void }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mb-3">{title}</h2>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={4}
        className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500 resize-y" />
    </section>
  );
}
