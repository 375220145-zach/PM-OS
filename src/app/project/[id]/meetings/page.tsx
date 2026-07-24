'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Meeting } from '@/types';
import { db } from '@/db/database';
import AppShell from '@/components/layout/AppShell';
import ProjectHeader from '@/components/layout/ProjectHeader';
import Button from '@/components/shared/Button';
import Badge from '@/components/shared/Badge';
import EmptyState from '@/components/shared/EmptyState';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { useToast } from '@/components/shared/Toast';
import { formatDate } from '@/lib/utils';

export default function MeetingsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    db.meetings.where('projectId').equals(id).reverse().sortBy('date').then(result => setMeetings(result.reverse()));
  }, [id]);

  async function remove(meetingId: string) {
    await db.meetings.delete(meetingId);
    setMeetings(meetings.filter(m => m.id !== meetingId));
    setDeleteTarget(null);
    addToast('会议记录已删除');
  }

  return (
    <AppShell>
      <ProjectHeader projectId={id} />
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">会议记录</h2>
            <p className="text-sm text-gray-400 mt-1">{meetings.length} 场会议</p>
          </div>
          <Button onClick={() => router.push(`/project/${id}/meetings/new`)}>+ 新建会议</Button>
        </div>

        {meetings.length === 0 ? (
          <EmptyState icon="microphone" title="暂无会议记录" description="记录会议内容，AI 自动提取行动项" action={{ label: '新建会议', onClick: () => router.push(`/project/${id}/meetings/new`) }} />
        ) : (
          <div className="space-y-3">
            {meetings.map(m => (
              <div
                key={m.id}
                onClick={() => router.push(`/project/${id}/meetings/${m.id}`)}
                className="bg-white border border-gray-200 hover:border-gray-200 rounded-xl p-4 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">{m.title}</h3>
                    <Badge text={m.status === 'completed' ? '已完成' : m.status === 'analyzing' ? '分析中' : '草稿'} variant={m.status === 'completed' ? 'success' : m.status === 'analyzing' ? 'warning' : 'default'} />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-600">{formatDate(m.date)}</span>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteTarget(m.id); }}
                      className="text-red-600 hover:text-red-300 text-xs"
                    >
                      删除
                    </button>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {m.attendees.length} 位参会人 · {m.actionItems.length} 个行动项 · {m.decisions.length} 条决议
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog open={!!deleteTarget} title="删除会议"
        message="确定要删除此会议记录吗？关联的行动项将一并删除。"
        confirmLabel="确认删除" variant="danger"
        onConfirm={() => deleteTarget && remove(deleteTarget)}
        onCancel={() => setDeleteTarget(null)} />
    </AppShell>
  );
}
