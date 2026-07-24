'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { ProcurementCandidate } from '@/types';
import { db } from '@/db/database';
import AppShell from '@/components/layout/AppShell';
import ProjectHeader from '@/components/layout/ProjectHeader';
import Button from '@/components/shared/Button';
import Badge from '@/components/shared/Badge';
import EmptyState from '@/components/shared/EmptyState';
import { generateId } from '@/lib/utils';
import { downloadTemplate, parseExcelFile, pickFile } from '@/lib/excel';

export default function ProcurementPage() {
  const params = useParams();
  const id = params.id as string;
  const [candidates, setCandidates] = useState<ProcurementCandidate[]>([]);

  useEffect(() => {
    db.procurementCandidates.where('projectId').equals(id).toArray().then(setCandidates);
  }, [id]);

  async function add() {
    const c: ProcurementCandidate = { id: generateId(), projectId: id, name: '', location: '', summary: '', strengths: '', risks: '', countermeasures: '', isSelected: false };
    await db.procurementCandidates.put(c);
    setCandidates([...candidates, c]);
  }

  async function updateItem(index: number, field: keyof ProcurementCandidate, value: unknown) {
    const next = [...candidates];
    next[index] = { ...next[index], [field]: value };
    await db.procurementCandidates.put(next[index]);
    setCandidates(next);
  }

  async function removeItem(index: number) {
    await db.procurementCandidates.delete(candidates[index].id);
    setCandidates(candidates.filter((_, i) => i !== index));
  }

  function handleDownloadTemplate() {
    downloadTemplate('采购供应策略模板', ['供应商名称', '地点', '供方简介', '优势', '风险说明', '风险对策', '是否入选(是/否)'], [
      ['江门哆乐科技', '江门', '蓝深自建工厂，2022年成立', '成本优势、保密性好', '开发经验不足', '军团研发品质给予技术指导', '是'],
    ]);
  }

  async function handleImport() {
    const file = await pickFile();
    if (!file) return;
    const rows = await parseExcelFile(file);
    const newItems: ProcurementCandidate[] = rows.map(row => ({
      id: generateId(), projectId: id,
      name: row['供应商名称'] || '',
      location: row['地点'] || '',
      summary: row['供方简介'] || '',
      strengths: row['优势'] || '',
      risks: row['风险说明'] || '',
      countermeasures: row['风险对策'] || '',
      isSelected: row['是否入选(是/否)'] === '是',
    }));
    await db.procurementCandidates.bulkAdd(newItems);
    db.procurementCandidates.where('projectId').equals(id).toArray().then(setCandidates);
  }

  return (
    <AppShell>
      <ProjectHeader projectId={id} />
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div><h2 className="text-xl font-bold text-gray-900">采购策略</h2><p className="text-sm text-gray-400 mt-1">{candidates.length} 个候选供应商</p></div>
          <div className="flex gap-3">
            <Button variant="secondary" size="sm" onClick={handleDownloadTemplate}>下载模板</Button>
            <Button variant="secondary" size="sm" onClick={handleImport}>批量导入</Button>
            <Button onClick={add}>+ 添加候选</Button>
          </div>
        </div>

        {candidates.length === 0 ? (
          <EmptyState icon="building-factory-2" title="暂无供应商数据" description="添加候选供应商对比分析，或下载 Excel 模板批量导入" />
        ) : (
          <div className="space-y-4">
            {candidates.map((c, i) => (
              <div key={c.id} className={`bg-white border rounded-xl p-5 ${c.isSelected ? 'border-green-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3 mb-3">
                  <input value={c.name} onChange={e => updateItem(i, 'name', e.target.value)} placeholder="供应商名称" className="bg-transparent text-lg font-semibold text-gray-900 flex-1 focus:outline-none focus:border-b focus:border-blue-500" />
                  <input value={c.location} onChange={e => updateItem(i, 'location', e.target.value)} placeholder="地点" className="bg-gray-100 border border-gray-200 rounded px-2 py-1 text-gray-700 text-xs w-20" />
                  <label className="flex items-center gap-1 text-xs text-gray-500"><input type="checkbox" checked={c.isSelected} onChange={e => updateItem(i, 'isSelected', e.target.checked)} />入选</label>
                  {c.isSelected && <Badge text="入选" variant="success" />}
                  <button onClick={() => removeItem(i)} className="text-red-600 hover:text-red-300 text-xs ml-auto">删除</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {(['summary', 'strengths', 'risks', 'countermeasures'] as const).map((field, j) => (
                    <div key={j}>
                      <label className="text-xs text-gray-400 mb-1 block">{j === 0 ? '供方简介' : j === 1 ? '优势' : j === 2 ? '风险说明' : '风险对策'}</label>
                      <textarea value={c[field]} onChange={e => updateItem(i, field, e.target.value)} rows={3} className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 text-xs resize-none" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
