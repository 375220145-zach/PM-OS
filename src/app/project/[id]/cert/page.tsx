'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { CertRequirement } from '@/types';
import { db } from '@/db/database';
import AppShell from '@/components/layout/AppShell';
import ProjectHeader from '@/components/layout/ProjectHeader';
import Button from '@/components/shared/Button';
import EmptyState from '@/components/shared/EmptyState';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { generateId } from '@/lib/utils';
import { downloadTemplate, parseExcelFile, pickFile } from '@/lib/excel';

export default function CertPage() {
  const params = useParams();
  const id = params.id as string;
  const [items, setItems] = useState<CertRequirement[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<CertRequirement | null>(null);

  useEffect(() => {
    db.certRequirements.where('projectId').equals(id).toArray().then(setItems);
  }, [id]);

  async function add() {
    const item: CertRequirement = { id: generateId(), projectId: id, market: '', certName: '', deliverable: '', estimatedCost: 0, sampleRequirement: '' };
    await db.certRequirements.put(item);
    setItems([item, ...items]);
  }

  async function updateItem(index: number, field: keyof CertRequirement, value: unknown) {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    await db.certRequirements.put(next[index]);
    setItems(next);
  }

  async function removeItem(id: string) {
    await db.certRequirements.delete(id);
    setItems(items.filter(i => i.id !== id));
    setDeleteTarget(null);
  }

  const totalCost = items.reduce((s, i) => s + i.estimatedCost, 0);

  function handleDownloadTemplate() {
    downloadTemplate('认证需求模板', ['目标市场', '认证项目', '报告/证书', '预估费用', '样品需求', '备注'], [
      ['欧洲', 'CE-RED', '报告+证书', '4500', '2个整机+2个定频', '无线产品'],
      ['美国', 'FCC ID', '报告+证书', '4500', '', ''],
    ]);
  }

  async function handleImport() {
    const file = await pickFile();
    if (!file) return;
    const rows = await parseExcelFile(file);
    const newItems: CertRequirement[] = rows.map(row => ({
      id: generateId(), projectId: id,
      market: row['目标市场'] || '',
      certName: row['认证项目'] || '',
      deliverable: row['报告/证书'] || '',
      estimatedCost: Number(row['预估费用']) || 0,
      sampleRequirement: row['样品需求'] || '',
      notes: row['备注'] || undefined,
    }));
    await db.certRequirements.bulkAdd(newItems);
    db.certRequirements.where('projectId').equals(id).toArray().then(setItems);
  }

  return (
    <AppShell>
      <ProjectHeader projectId={id} />
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div><h2 className="text-xl font-bold text-gray-900">认证需求</h2><p className="text-sm text-gray-400 mt-1">{items.length} 个认证项 · 总费用 ¥{totalCost.toLocaleString()}</p></div>
          <div className="flex gap-3">
            <Button variant="secondary" size="sm" onClick={handleDownloadTemplate}>下载模板</Button>
            <Button variant="secondary" size="sm" onClick={handleImport}>批量导入</Button>
            <Button onClick={add}>+ 添加认证</Button>
          </div>
        </div>

        {items.length === 0 ? (
          <EmptyState icon="certificate" title="暂无认证数据" description="按目标市场添加认证需求，或下载 Excel 模板批量导入" />
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 text-left">
                  <th className="px-4 py-3">目标市场</th><th className="px-4 py-3">认证项目</th><th className="px-4 py-3">报告/证书</th><th className="px-4 py-3 text-right">预估费用</th><th className="px-4 py-3">样品需求</th><th className="px-4 py-3">备注</th><th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.id} className="border-b border-gray-200">
                    <td className="px-4 py-2 min-w-[100px]"><input value={item.market} onChange={e => updateItem(i, 'market', e.target.value)} title={item.market} className="w-full bg-gray-100 border border-gray-200 rounded px-2 py-1 text-gray-700 text-xs" /></td>
                    <td className="px-4 py-2 min-w-[120px]"><input value={item.certName} onChange={e => updateItem(i, 'certName', e.target.value)} title={item.certName} className="w-full bg-gray-100 border border-gray-200 rounded px-2 py-1 text-gray-700 text-xs" /></td>
                    <td className="px-4 py-2 min-w-[120px]"><input value={item.deliverable} onChange={e => updateItem(i, 'deliverable', e.target.value)} title={item.deliverable} className="w-full bg-gray-100 border border-gray-200 rounded px-2 py-1 text-gray-700 text-xs" /></td>
                    <td className="px-4 py-2 text-right min-w-[100px]"><input type="number" value={item.estimatedCost} onChange={e => updateItem(i, 'estimatedCost', Number(e.target.value))} title={String(item.estimatedCost)} className="w-full bg-gray-100 border border-gray-200 rounded px-2 py-1 text-gray-700 text-xs text-right" /></td>
                    <td className="px-4 py-2 min-w-[160px]"><input value={item.sampleRequirement} onChange={e => updateItem(i, 'sampleRequirement', e.target.value)} title={item.sampleRequirement} className="w-full bg-gray-100 border border-gray-200 rounded px-2 py-1 text-gray-700 text-xs" /></td>
                    <td className="px-4 py-2 min-w-[160px]"><input value={item.notes ?? ''} onChange={e => updateItem(i, 'notes', e.target.value)} title={item.notes ?? ''} className="w-full bg-gray-100 border border-gray-200 rounded px-2 py-1 text-gray-700 text-xs" /></td>
                    <td className="px-4 py-2"><button onClick={() => setDeleteTarget(items[i])} className="text-red-600 hover:text-red-300 text-xs">删除</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="删除认证要求"
        message={`确认删除「${deleteTarget?.certName || ''}」？此操作不可恢复。`}
        confirmLabel="删除"
        onConfirm={() => deleteTarget && removeItem(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppShell>
  );
}
