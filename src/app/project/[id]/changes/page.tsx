'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { ChangeRecord } from '@/types';
import { db } from '@/db/database';
import AppShell from '@/components/layout/AppShell';
import ProjectHeader from '@/components/layout/ProjectHeader';
import Button from '@/components/shared/Button';
import EmptyState from '@/components/shared/EmptyState';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { generateId, formatDate } from '@/lib/utils';
import { downloadTemplate, parseExcelFile, pickFile } from '@/lib/excel';

export default function ChangesPage() {
  const params = useParams();
  const id = params.id as string;
  const [records, setRecords] = useState<ChangeRecord[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<ChangeRecord | null>(null);

  useEffect(() => {
    db.changeRecords.where('projectId').equals(id).reverse().sortBy('createdAt').then(result => setRecords(result.reverse()));
  }, [id]);

  async function add() {
    const r: ChangeRecord = { id: generateId(), projectId: id, applicant: '', type: '', content: '', reviewResult: '', impact: '', createdAt: Date.now() };
    await db.changeRecords.put(r);
    setRecords([r, ...records]);
  }

  async function updateItem(index: number, field: keyof ChangeRecord, value: unknown) {
    const next = [...records];
    next[index] = { ...next[index], [field]: value };
    await db.changeRecords.put(next[index]);
    setRecords(next);
  }

  async function removeItem(id: string) {
    await db.changeRecords.delete(id);
    setRecords(records.filter(r => r.id !== id));
    setDeleteTarget(null);
  }

  function handleDownloadTemplate() {
    downloadTemplate('变更记录模板', ['申请人', '变更类型', '变更内容', '评审结果', '影响范围'], [
      ['潘子健', '设计变更', '面板材质由ABS改为PC+ABS', '通过', '影响模具、成本'],
    ]);
  }

  async function handleImport() {
    const file = await pickFile();
    if (!file) return;
    const rows = await parseExcelFile(file);
    const newItems: ChangeRecord[] = rows.map(row => ({
      id: generateId(), projectId: id,
      applicant: row['申请人'] || '',
      type: row['变更类型'] || '',
      content: row['变更内容'] || '',
      reviewResult: row['评审结果'] || '',
      impact: row['影响范围'] || '',
      createdAt: Date.now(),
    }));
    await db.changeRecords.bulkAdd(newItems);
    db.changeRecords.where('projectId').equals(id).reverse().sortBy('createdAt').then(setRecords);
  }

  return (
    <AppShell>
      <ProjectHeader projectId={id} />
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div><h2 className="text-xl font-bold text-gray-900">变更管理 (ECN)</h2><p className="text-sm text-gray-400 mt-1">{records.length} 条变更记录</p></div>
          <div className="flex gap-3">
            <Button variant="secondary" size="sm" onClick={handleDownloadTemplate}>下载模板</Button>
            <Button variant="secondary" size="sm" onClick={handleImport}>批量导入</Button>
            <Button onClick={add}>+ 新增变更</Button>
          </div>
        </div>

        {records.length === 0 ? (
          <EmptyState icon="history" title="暂无变更记录" description="记录项目过程中的设计变更和评审结果，或下载 Excel 模板批量导入" />
        ) : (
          <div className="space-y-3">
            {records.map((r, i) => (
              <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs text-gray-600">{formatDate(r.createdAt)}</span>
                  <input value={r.applicant} onChange={e => updateItem(i, 'applicant', e.target.value)} placeholder="申请人" title={r.applicant} className="bg-gray-100 border border-gray-200 rounded px-2 py-1 text-gray-700 text-xs w-28" />
                  <input value={r.type} onChange={e => updateItem(i, 'type', e.target.value)} placeholder="变更类型" title={r.type} className="bg-gray-100 border border-gray-200 rounded px-2 py-1 text-gray-700 text-xs w-32" />
                  <input value={r.reviewResult} onChange={e => updateItem(i, 'reviewResult', e.target.value)} placeholder="评审结果" title={r.reviewResult} className="bg-gray-100 border border-gray-200 rounded px-2 py-1 text-gray-700 text-xs w-36" />
                  <button onClick={() => setDeleteTarget(records[i])} className="text-red-600 hover:text-red-300 text-xs ml-auto">删除</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-gray-400 mb-1 block">变更内容</label><textarea value={r.content} onChange={e => updateItem(i, 'content', e.target.value)} rows={2} className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 text-xs resize-none" /></div>
                  <div><label className="text-xs text-gray-400 mb-1 block">影响范围</label><textarea value={r.impact} onChange={e => updateItem(i, 'impact', e.target.value)} rows={2} className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 text-xs resize-none" /></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="删除变更记录"
        message="确认删除这条变更记录？此操作不可恢复。"
        confirmLabel="删除"
        onConfirm={() => deleteTarget && removeItem(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppShell>
  );
}
