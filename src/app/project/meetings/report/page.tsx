'use client';

import { useEffect, useState, useRef } from 'react';
import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Meeting, Project } from '@/types';
import { db } from '@/db/database';
import AppShell from '@/components/layout/AppShell';
import ProjectHeader from '@/components/layout/ProjectHeader';
import Button from '@/components/shared/Button';
import { formatDate } from '@/lib/utils';

function MeetingReportPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get('p') ?? '';
  const meetingId = searchParams.get('mid') ?? '';
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      db.meetings.get(meetingId),
      db.projects.get(projectId),
    ]).then(([m, p]) => {
      setMeeting(m ?? null);
      setProject(p ?? null);
    });
  }, [meetingId, projectId]);

  function copyMarkdown() {
    if (!meeting || !project) return;
    let md = `# ${meeting.title}\n\n`;
    md += `**项目**：${project.name}　**日期**：${formatDate(meeting.date)}\n`;
    md += `**参会人**：${(meeting.attendees ?? []).join('、')}\n\n---\n\n`;
    if (meeting.summary) md += `## AI 摘要\n${meeting.summary}\n\n`;
    if ((meeting.decisions ?? []).length > 0) {
      md += `## 决议\n${meeting.decisions.map(d => `- ${d}`).join('\n')}\n\n`;
    }
    if ((meeting.actionItems ?? []).length > 0) {
      md += `## 行动项\n${meeting.actionItems.map(a => `- [${a.status === 'converted' ? 'x' : ' '}] ${a.content}（${a.owner}）${a.deadline ? ` 截止：${formatDate(a.deadline)}` : ''}`).join('\n')}\n\n`;
    }
    if ((meeting.openQuestions ?? []).length > 0) {
      md += `## 未解决问题\n${(meeting.openQuestions ?? []).map(q => `- ${q}`).join('\n')}\n\n`;
    }
    navigator.clipboard.writeText(md);
  }

  async function downloadDocx() {
    if (!reportRef.current || !meeting || !project) return;
    const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
      'body{font-family:"Noto Sans SC","Microsoft YaHei",sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#333}' +
      'h1{color:#fff;background:linear-gradient(135deg,#4f46e5,#3730a3);padding:60px 40px;border-radius:8px;margin:0 -20px 32px}' +
      'h1 small{display:block;font-size:14px;font-weight:400;opacity:.8;margin-top:8px}' +
      'h2{font-size:18px;border-bottom:2px solid #e5e7eb;padding-bottom:8px;margin:24px 0 16px;color:#1f2937}' +
      'ul{padding-left:20px;margin:8px 0}li{margin:4px 0;font-size:14px;line-height:1.6}p{font-size:14px;line-height:1.8;color:#374151}' +
      'pre{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;font-size:13px;white-space:pre-wrap}' +
      '@media print{body{margin:0;padding:0}h1{border-radius:0;margin:0;padding:40px 20px}}' +
      '</style></head><body>' + reportRef.current.innerHTML + '</body></html>';
    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meeting.title}-${formatDate(meeting.date).replace(/\//g, '-')}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!meeting || !project) {
    return (
      <AppShell>
        <ProjectHeader projectId={projectId} />
        <div className="p-4 md:p-6"><div className="animate-pulse h-8 bg-gray-100 rounded w-64" /></div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <ProjectHeader projectId={projectId} />
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-6 max-w-5xl mx-auto">
          <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-700">← 返回</button>
          <div className="flex gap-3">
            <Button variant="secondary" size="sm" onClick={() => { if (window.innerWidth < 768) { alert('导出功能请在 PC 端操作'); return; } copyMarkdown(); }}>复制 Markdown</Button>
            <Button variant="secondary" size="sm" onClick={() => { if (window.innerWidth < 768) { alert('导出功能请在 PC 端操作'); return; } downloadDocx(); }}>下载 DOC</Button>
            <Button size="sm" onClick={() => { if (window.innerWidth < 768) { alert('导出功能请在 PC 端操作'); return; } window.print(); }}>打印/PDF</Button>
          </div>
        </div>

        <div ref={reportRef} className="max-w-5xl mx-auto bg-white text-gray-900 rounded-xl shadow-2xl overflow-hidden print:shadow-none print:rounded-none">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white px-6 py-10 md:px-12 md:py-16 print:px-8 print:py-10">
            <div className="text-sm text-indigo-200 mb-2">会议记录</div>
            <h1 className="text-3xl font-bold mb-4">{meeting.title}</h1>
            <div className="flex flex-wrap gap-6 text-sm text-indigo-100">
              <span>项目：{project.name}</span>
              <span>日期：{formatDate(meeting.date)}</span>
              <span>参会人：{(meeting.attendees ?? []).join('、')}</span>
            </div>
          </div>

          <div className="px-6 py-6 md:px-12 md:py-8 print:px-8 print:py-6 space-y-8">
            {meeting.summary && (
              <section>
                <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mb-3">AI 摘要</h2>
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{meeting.summary}</div>
              </section>
            )}

            {(meeting.decisions ?? []).length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mb-3">决议事项</h2>
                <ul className="space-y-1">
                  {(meeting.decisions ?? []).map((d, i) => (
                    <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-green-600">✓</span> {d}</li>
                  ))}
                </ul>
              </section>
            )}

            {(meeting.actionItems ?? []).length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mb-3">行动项</h2>
                <div className="space-y-2">
                  {(meeting.actionItems ?? []).map((a, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <span className="text-gray-400 mt-0.5">○</span>
                      <div>
                        <span className="text-gray-700">{a.content}</span>
                        <span className="text-gray-400 ml-2">— {a.owner}</span>
                        {a.deadline && <span className="text-gray-400 ml-2">截止：{formatDate(a.deadline)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {(meeting.openQuestions ?? []).length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mb-3">未解决问题</h2>
                <ul className="space-y-1">
                  {(meeting.openQuestions ?? []).map((q, i) => (
                    <li key={i} className="text-sm text-gray-600 flex gap-2"><span className="text-yellow-600">?</span> {q}</li>
                  ))}
                </ul>
              </section>
            )}

            {meeting.transcript && (
              <section>
                <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mb-3">会议原文</h2>
                <div className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto bg-gray-50 rounded-lg p-4">{meeting.transcript}</div>
              </section>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}


export default function MeetingReportPage() {
  return <Suspense fallback={null}><MeetingReportPageContent /></Suspense>;
}
