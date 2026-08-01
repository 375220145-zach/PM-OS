'use client';

import { useEffect, useState } from 'react';
import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Retrospective } from '@/types';
import { db } from '@/db/database';
import AppShell from '@/components/layout/AppShell';
import ProjectHeader from '@/components/layout/ProjectHeader';
import Button from '@/components/shared/Button';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import EmptyState from '@/components/shared/EmptyState';
import { useToast } from '@/components/shared/Toast';
import { formatDate } from '@/lib/utils';
import { PHASES } from '@/lib/ipd';

function RetroPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('p') ?? '';
  const [retros, setRetros] = useState<Retrospective[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    db.retrospectives.where('projectId').equals(id).reverse().sortBy('createdAt').then(setRetros);
  }, [id]);

  async function remove(retroId: string) {
    await db.retrospectives.delete(retroId);
    setRetros(retros.filter(r => r.id !== retroId));
    setDeleteTarget(null);
    addToast('复盘记录已删除');
  }

  return (
    <AppShell>
      <ProjectHeader projectId={id} />
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">项目复盘</h2>
            <p className="text-sm text-gray-400 mt-1">{retros.length} 条复盘记录</p>
          </div>
          <Button onClick={() => router.push(`/project/retro/new?p=${id}`)}>+ 新建复盘</Button>
        </div>

        {retros.length === 0 ? (
          <EmptyState icon="pencil" title="暂无复盘记录" description="阶段结束时创建复盘，AI 辅助生成结构化报告" action={{ label: '新建复盘', onClick: () => router.push(`/project/retro/new?p=${id}`) }} />
        ) : (
          <div className="space-y-3">
            {retros.map(r => (
              <div
                key={r.id}
                onClick={() => router.push(`/project/retro/detail?p=${id}&rid=${r.id}`)}
                className="bg-white border border-gray-200 hover:border-gray-200 rounded-xl p-4 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{r.title}</h3>
                    <div className="text-xs text-gray-400 mt-1">
                      {PHASES.find(p => p.key === r.phase)?.label} · {r.generatedBy === 'ai' ? 'AI 生成' : '手动创建'} · {formatDate(r.createdAt)}
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setDeleteTarget(r.id); }}
                    className="text-red-600 hover:text-red-300 text-xs"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog open={!!deleteTarget} title="删除复盘"
        message="确定要删除此复盘记录吗？"
        confirmLabel="确认删除" variant="danger"
        onConfirm={() => deleteTarget && remove(deleteTarget)}
        onCancel={() => setDeleteTarget(null)} />
    </AppShell>
  );
}


export default function RetroPage() {
  return <Suspense fallback={null}><RetroPageContent /></Suspense>;
}
