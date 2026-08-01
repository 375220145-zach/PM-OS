'use client';

import { useEffect, useState } from 'react';
import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Meeting, Task, ActionItem, Phase } from '@/types';
import { db } from '@/db/database';
import AppShell from '@/components/layout/AppShell';
import ProjectHeader from '@/components/layout/ProjectHeader';
import Button from '@/components/shared/Button';
import Badge from '@/components/shared/Badge';
import Modal from '@/components/shared/Modal';
import EmptyState from '@/components/shared/EmptyState';
import { formatDate, generateId } from '@/lib/utils';

function MeetingDetailPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get('p') ?? '';
  const meetingId = searchParams.get('mid') ?? '';
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [projectPhase, setProjectPhase] = useState<Phase>('concept');
  const [editing, setEditing] = useState(false);
  const [editSummary, setEditSummary] = useState('');
  const [editDecisions, setEditDecisions] = useState('');
  const [editActionItems, setEditActionItems] = useState('');

  useEffect(() => {
    db.meetings.get(meetingId).then(m => setMeeting(m ?? null));
    db.projects.get(projectId).then(p => { if (p) setProjectPhase(p.phase); });
  }, [meetingId, projectId]);

  async function convertToTask(item: ActionItem) {
    if (!meeting) return;

    const task: Task = {
      id: generateId(),
      projectId,
      phase: projectPhase,
      name: item.content,
      assignee: item.owner,
      startDate: Date.now(),
      endDate: item.deadline ?? Date.now() + 7 * 86400000,
      status: 'todo',
      priority: item.priority,
      risk: item.risk,
      dependencies: [],
      source: 'meeting',
      meetingId: meeting.id,
      tags: [],
    };

    await db.tasks.put(task);

    // Update action item status
    const updatedItems = meeting.actionItems.map(a =>
      a.id === item.id ? { ...a, status: 'converted' as const, convertedTaskId: task.id } : a
    );
    const updatedMeeting = { ...meeting, actionItems: updatedItems };
    await db.meetings.put(updatedMeeting);
    setMeeting(updatedMeeting);
  }

  if (!meeting) {
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
              <h2 className="text-xl font-bold text-gray-900">{meeting.title}</h2>
              <div className="text-sm text-gray-400 mt-1">
                {formatDate(meeting.date)} · {(meeting.attendees ?? []).join(', ')}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" variant="secondary" onClick={() => {
              setEditSummary(meeting.summary ?? '');
              setEditDecisions((meeting.decisions ?? []).join('\n'));
              setEditActionItems((meeting.actionItems ?? []).map(a => `${a.content}（${a.owner}）`).join('\n'));
              setEditing(true);
            }}>编辑</Button>
            <Button size="sm" variant="secondary" onClick={() => router.push(`/project/meetings/report?p=${projectId}&mid=${meetingId}`)}>
              📄 导出
            </Button>
            <Badge text={meeting.status === 'completed' ? 'AI 已分析' : '草稿'} variant={meeting.status === 'completed' ? 'success' : 'default'} />
          </div>
        </div>

        {meeting.summary && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">AI 摘要</h3>
            <p className="text-gray-700">{meeting.summary}</p>
          </div>
        )}

        {meeting.decisions.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">决议事项</h3>
            <ul className="space-y-1">
              {meeting.decisions.map((d, i) => (
                <li key={i} className="text-gray-700 text-sm flex gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="inline text-emerald-500"><path d="M5 12l5 5L20 7"/></svg> {d}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">
            行动项 ({meeting.actionItems.length})
          </h3>
          {meeting.actionItems.length === 0 ? (
            <div className="text-sm text-gray-600">暂无行动项</div>
          ) : (
            <div className="space-y-2">
              {meeting.actionItems.map(item => (
                <div key={item.id} className="flex items-center justify-between bg-gray-100 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                      item.priority === 'P0' ? 'bg-red-100 text-red-700' :
                      item.priority === 'P1' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>{item.priority}</span>
                    <span className="text-sm text-gray-700 truncate">{item.content}</span>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <span className="text-xs text-gray-500">{item.owner}</span>
                    {item.deadline && <span className="text-xs text-gray-600">{formatDate(item.deadline)}</span>}
                    <Badge text={item.status === 'converted' ? '已转任务' : item.status === 'confirmed' ? '已确认' : '待处理'}
                      variant={item.status === 'converted' ? 'success' : item.status === 'confirmed' ? 'info' : 'default'} />
                    {item.status !== 'converted' && (
                      <Button size="sm" variant="secondary" onClick={() => convertToTask(item)}>
                        转为任务
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">原始文本</h3>
          <pre className="text-sm text-gray-400 whitespace-pre-wrap font-sans">{meeting.transcript}</pre>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal open={editing} onClose={() => setEditing(false)} title="编辑会议记录">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">AI 摘要</label>
            <textarea value={editSummary} onChange={e => setEditSummary(e.target.value)} rows={3}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500 resize-none" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">决议事项（每行一条）</label>
            <textarea value={editDecisions} onChange={e => setEditDecisions(e.target.value)} rows={3}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500 resize-none" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">行动项（每行一条，格式：内容（负责人））</label>
            <textarea value={editActionItems} onChange={e => setEditActionItems(e.target.value)} rows={4}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500 resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setEditing(false)}>取消</Button>
            <Button onClick={async () => {
              if (!meeting) return;
              const lines = editActionItems.split('\n').filter(Boolean);
              const items = lines.map((line, i) => {
                const match = line.match(/(.+?)（(.+?)）/);
                const existing = meeting.actionItems[i];
                return {
                  id: existing?.id ?? generateId(),
                  meetingId,
                  content: match?.[1]?.trim() ?? line.trim(),
                  owner: match?.[2]?.trim() ?? '',
                  deadline: existing?.deadline,
                  priority: existing?.priority ?? 'P2' as const,
                  risk: existing?.risk ?? 'none' as const,
                  status: existing?.status ?? 'pending' as const,
                  convertedTaskId: existing?.convertedTaskId,
                } as ActionItem;
              });
              const updated: Meeting = {
                ...meeting,
                summary: editSummary,
                decisions: editDecisions.split('\n').filter(Boolean),
                actionItems: items,
              };
              await db.meetings.put(updated);
              setMeeting(updated);
              setEditing(false);
            }}>保存</Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}


export default function MeetingDetailPage() {
  return <Suspense fallback={null}><MeetingDetailPageContent /></Suspense>;
}
