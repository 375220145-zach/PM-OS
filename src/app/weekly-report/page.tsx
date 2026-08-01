'use client';

import { useEffect, useState } from 'react';
import type { Task, Meeting, MILEntry, Project } from '@/types';
import { db } from '@/db/database';
import AppShell from '@/components/layout/AppShell';
import Button from '@/components/shared/Button';
import Badge from '@/components/shared/Badge';
import EmptyState from '@/components/shared/EmptyState';
import { formatDate, generateId } from '@/lib/utils';
import { downloadTemplate } from '@/lib/excel';
import { aiAnalyzeMeeting } from '@/lib/ai-remote';
import * as XLSX from 'xlsx';

export default function WeeklyReportPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [milEntries, setMilEntries] = useState<MILEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [generating, setGenerating] = useState(false);
  const [aiReport, setAiReport] = useState('');

  const now = Date.now();
  const weekStart = now - 7 * 86400000;

  useEffect(() => {
    Promise.all([
      db.tasks.toArray(), db.meetings.toArray(), db.milEntries.toArray(), db.projects.toArray(),
    ]).then(([t, m, mil, p]) => {
      setTasks(t); setMeetings(m); setMilEntries(mil); setProjects(p);
    });
  }, []);

  function getProjectName(pid: string) { return projects.find(p => p.id === pid)?.name ?? ''; }

  const doneThisWeek = tasks.filter(t => t.status === 'done' && (t.actualEndDate || t.endDate) >= weekStart);
  const newMILThisWeek = milEntries.filter(m => m.createdAt >= weekStart);
  const meetingsThisWeek = meetings.filter(m => m.date >= weekStart);
  const overdueTasks = tasks.filter(t => t.status !== 'done' && t.endDate <= Date.now());

  function exportExcel() {
    const wsData = [
      ['本周周报', `${new Date(weekStart).toLocaleDateString('zh-CN')} — ${new Date(now).toLocaleDateString('zh-CN')}`],
      [], ['一、完成任务', '负责人', '项目'],
      ...doneThisWeek.map(t => [t.name, t.assignee, getProjectName(t.projectId)]),
      [], ['二、新增MIL', '严重度', '责任人', '项目'],
      ...newMILThisWeek.map(m => [m.title, m.severity, m.responsible, getProjectName(m.projectId)]),
      [], ['三、会议', '决议数', '行动项数'],
      ...meetingsThisWeek.map(m => [m.title, String(m.decisions.length), String(m.actionItems.length)]),
      [], ['四、逾期任务'],
      ...overdueTasks.map(t => [t.name, t.assignee, getProjectName(t.projectId)]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 40 }, { wch: 15 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '周报');
    XLSX.writeFile(wb, `周报-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function copyMarkdown() {
    let md = `# 周报 ${new Date(weekStart).toLocaleDateString('zh-CN')} — ${new Date(now).toLocaleDateString('zh-CN')}\n\n`;
    md += `## 数据\n- 完成任务: ${doneThisWeek.length}\n- 新增MIL: ${newMILThisWeek.length}\n- 会议: ${meetingsThisWeek.length}\n- 逾期: ${overdueTasks.length}\n\n`;
    md += `## 完成任务\n${doneThisWeek.map(t => `- ${t.name} (${t.assignee}, ${getProjectName(t.projectId)})`).join('\n') || '无'}\n\n`;
    md += `## 新增MIL\n${newMILThisWeek.map(m => `- [${m.severity}] ${m.title} (${m.responsible})`).join('\n') || '无'}\n\n`;
    md += `## 会议\n${meetingsThisWeek.map(m => `- ${m.title}: ${m.decisions.length}条决议`).join('\n') || '无'}\n\n`;
    md += `## 逾期\n${overdueTasks.map(t => `- ${t.name} (${t.assignee})`).join('\n') || '无'}\n`;
    navigator.clipboard.writeText(md);
    alert('已复制 Markdown 到剪贴板');
  }

  async function generateAIReport() {
    setGenerating(true);
    const summary = `本周完成 ${doneThisWeek.length} 个任务，新增 ${newMILThisWeek.length} 个 MIL 问题，召开了 ${meetingsThisWeek.length} 场会议，当前有 ${overdueTasks.length} 个逾期任务。`;
    try {
      const data = (await aiAnalyzeMeeting(
        `本周工作总结：\n${summary}\n\n完成的任务：\n${doneThisWeek.map(t => `- ${t.name} [${getProjectName(t.projectId)}]`).join('\n')}\n\n新增MIL：\n${newMILThisWeek.map(m => `- [${m.severity}] ${m.title} [${getProjectName(m.projectId)}]`).join('\n')}\n\n逾期任务：\n${overdueTasks.map(t => `- ${t.name} [${getProjectName(t.projectId)}]`).join('\n')}`,
      )) as unknown as { summary?: string };
      setAiReport(data.summary ?? JSON.stringify(data));
    } catch (e) {
      setAiReport('生成失败: ' + (e as Error).message);
    }
    setGenerating(false);
  }

  return (
    <AppShell>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">周报</h1>
            <p className="text-sm text-gray-400 mt-1">
              {`${new Date(weekStart).toLocaleDateString('zh-CN')} — ${new Date(now).toLocaleDateString('zh-CN')}`}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" size="sm" onClick={exportExcel}>Excel</Button>
            <Button variant="secondary" size="sm" onClick={copyMarkdown}>Markdown</Button>
            <Button onClick={generateAIReport} disabled={generating}>
              {generating ? '生成中...' : 'AI 生成摘要'}
            </Button>
          </div>
        </div>

        {aiReport && (
          <div className="bg-blue-50 border border-blue-300 rounded-xl p-5 mb-6">
            <h2 className="text-sm font-semibold text-blue-600 mb-2">AI 摘要</h2>
            <p className="text-sm text-gray-700">{aiReport}</p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="完成任务" value={doneThisWeek.length} color="green" />
          <StatCard label="新增MIL" value={newMILThisWeek.length} color="yellow" />
          <StatCard label="会议" value={meetingsThisWeek.length} color="blue" />
          <StatCard label="逾期" value={overdueTasks.length} color="red" />
        </div>

        {/* Completed Tasks */}
        <Section title="本周完成任务" count={doneThisWeek.length}>
          {doneThisWeek.map(t => (
            <Row key={t.id} title={t.name} sub={`${t.assignee} · ${getProjectName(t.projectId)}`} date={formatDate(t.actualEndDate || t.endDate)} />
          ))}
        </Section>

        {/* New MIL */}
        <Section title="新增 MIL 问题" count={newMILThisWeek.length}>
          {newMILThisWeek.map(m => (
            <div key={m.id} className="flex items-center gap-3 py-2 border-b border-gray-200">
              <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${m.severity === 'A' ? 'bg-red-600 text-white' : m.severity === 'B' ? 'bg-yellow-600 text-white' : 'bg-gray-300 text-gray-700'}`}>{m.severity}</span>
              <div className="flex-1"><span className="text-sm text-gray-700">{m.title}</span><span className="text-xs text-gray-600 ml-2">{m.responsible} · {getProjectName(m.projectId)}</span></div>
              <span className="text-xs text-gray-600">{formatDate(m.createdAt)}</span>
            </div>
          ))}
        </Section>

        {/* Meetings */}
        <Section title="本周会议" count={meetingsThisWeek.length}>
          {meetingsThisWeek.map(m => (
            <Row key={m.id} title={m.title} sub={`${m.decisions.length} 条决议 · ${m.actionItems.length} 个行动项`} date={formatDate(m.date)} />
          ))}
        </Section>
      </div>
    </AppShell>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = { green: 'text-emerald-600', yellow: 'text-amber-600', blue: 'text-blue-600', red: 'text-red-600' };
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${colors[color]}`}>{value}</div>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-gray-400 mb-3">{title} ({count})</h2>
      {count === 0 ? <div className="text-sm text-gray-600 py-4">暂无</div> : children}
    </div>
  );
}

function Row({ title: name, sub, date }: { title: string; sub: string; date: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-200">
      <div>
        <div className="text-sm text-gray-700">{name}</div>
        <div className="text-xs text-gray-600">{sub}</div>
      </div>
      <span className="text-xs text-gray-500">{date}</span>
    </div>
  );
}
