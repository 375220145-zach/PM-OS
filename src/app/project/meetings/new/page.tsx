'use client';

import { useState, useEffect } from 'react';
import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Project, Meeting, ActionItem } from '@/types';
import { db } from '@/db/database';
import AppShell from '@/components/layout/AppShell';
import ProjectHeader from '@/components/layout/ProjectHeader';
import Button from '@/components/shared/Button';
import { generateId } from '@/lib/utils';
import { aiAnalyzeMeeting } from '@/lib/ai-remote';

interface AIResult {
  summary?: string;
  decisions?: string[];
  meetingType?: string;
  participants?: string[];
  openQuestions?: string[];
  keyInsights?: string[];
  actionItems?: Array<{
    content: string;
    owner: string;
    deadline: string | null;
    priority: 'P0' | 'P1' | 'P2';
    risk: 'none' | 'low' | 'medium' | 'high';
  }>;
}

function NewMeetingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('p') ?? '';
  const [project, setProject] = useState<Project | null>(null);
  const [title, setTitle] = useState('');
  const [attendees, setAttendees] = useState('');
  const [transcript, setTranscript] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    db.projects.get(id).then(p => setProject(p ?? null));
  }, [id]);

  async function analyze() {
    if (!transcript.trim()) return;
    setAnalyzing(true);
    setError('');

    try {
      const data: AIResult = await aiAnalyzeMeeting(transcript);
      setAiResult(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function save() {
    const actionItems: ActionItem[] = (aiResult?.actionItems ?? []).map(item => ({
      id: generateId(),
      meetingId: '', // will be updated after meeting is saved
      content: item.content,
      owner: item.owner,
      deadline: item.deadline ? new Date(item.deadline).getTime() : undefined,
      priority: item.priority,
      risk: item.risk,
      status: 'pending' as const,
    }));

    const meeting: Meeting = {
      id: generateId(),
      projectId: id,
      title: title || `会议 ${new Date().toLocaleDateString('zh-CN')}`,
      date: Date.now(),
      attendees: attendees.split(',').map(s => s.trim()).filter(Boolean),
      transcript,
      summary: aiResult?.summary,
      actionItems,
      decisions: aiResult?.decisions ?? [],
      meetingType: (aiResult?.meetingType as Meeting['meetingType']) ?? 'general',
      openQuestions: aiResult?.openQuestions ?? [],
      keyInsights: aiResult?.keyInsights ?? [],
      status: aiResult ? 'completed' : 'draft',
    };

    // Update meetingIds on action items
    meeting.actionItems = meeting.actionItems.map(a => ({ ...a, meetingId: meeting.id }));

    await db.meetings.put(meeting);
    router.push(`/project/meetings/detail?p=${id}&mid=${meeting.id}`);
  }

  return (
    <AppShell>
      <ProjectHeader projectId={id} />
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-700">← 返回</button>
          <h2 className="text-xl font-bold text-gray-900">新建会议记录</h2>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">会议标题</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="如：Pocket Wave CDCP 评审会"
                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">参会人（逗号分隔）</label>
              <input type="text" value={attendees} onChange={e => setAttendees(e.target.value)}
                placeholder={project?.members.map(m => m.name).join(', ') ?? ''}
                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">会议内容</label>
            <textarea
              value={transcript} onChange={e => setTranscript(e.target.value)}
              rows={12}
              placeholder="粘贴会议文本或手动记录会议要点&#10;&#10;AI 将自动提取：&#10;· 会议摘要&#10;· 决议事项&#10;· 行动项（负责人+截止日期+优先级）"
              className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-gray-900 text-sm focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div className="flex gap-3">
            <Button onClick={analyze} disabled={analyzing || !transcript.trim()}>
              {analyzing ? 'AI 分析中...' : 'AI 分析'}
            </Button>
            <Button variant="secondary" onClick={save}>
              保存会议记录
            </Button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-300 rounded-lg px-4 py-3 text-red-600 text-sm">{error}</div>
          )}

          {aiResult && (
            <div className="space-y-4 pt-4 border-t border-gray-200">
              {aiResult.summary && (
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">AI 摘要</h3>
                  <p className="text-sm text-gray-700">{aiResult.summary}</p>
                </div>
              )}

              {aiResult.decisions && aiResult.decisions.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">决议</h3>
                  <ul className="space-y-1">
                    {aiResult.decisions.map((d, i) => (
                      <li key={i} className="text-sm text-gray-700 flex gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="inline text-emerald-500"><path d="M5 12l5 5L20 7"/></svg> {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {aiResult.actionItems && aiResult.actionItems.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">行动项</h3>
                  <div className="space-y-2">
                    {aiResult.actionItems.map((item, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-100 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                            item.priority === 'P0' ? 'bg-red-100 text-red-700' :
                            item.priority === 'P1' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                          }`}>{item.priority}</span>
                          <span className="text-sm text-gray-700">{item.content}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{item.owner}</span>
                          {item.deadline && <span>{new Date(item.deadline).toLocaleDateString('zh-CN')}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}


export default function NewMeetingPage() {
  return <Suspense fallback={null}><NewMeetingPageContent /></Suspense>;
}
