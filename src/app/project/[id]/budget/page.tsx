'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Project, BudgetItem, BudgetCategory } from '@/types';
import { db } from '@/db/database';
import AppShell from '@/components/layout/AppShell';
import ProjectHeader from '@/components/layout/ProjectHeader';
import Button from '@/components/shared/Button';
import EmptyState from '@/components/shared/EmptyState';
import { downloadTemplate, parseExcelFile, pickFile } from '@/lib/excel';

const CATEGORY_LABELS: Record<string, string> = {
  mold: '模具费', sample: '样品费', labor: '人力成本',
  cert: '认证费', patent: '专利费', travel: '差旅费', other: '其他',
};
const CATEGORY_COLORS: Record<string, string> = {
  mold: '#3b82f6', sample: '#6366f1', labor: '#8b5cf6', cert: '#a855f7',
  patent: '#d946ef', travel: '#ec4899', other: '#6b7280',
};

export default function BudgetPage() {
  const params = useParams();
  const id = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [budget, setBudget] = useState<(BudgetItem & { otherLabel?: string })[]>([]);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    db.projects.get(id).then(p => {
      setProject(p ?? null);
      setBudget((p?.budget ?? []).map(b => ({ ...b, otherLabel: '' })));
    });
  }, [id]);

  async function save() {
    if (!project) return;
    const clean = budget.map(({ otherLabel, ...b }) => b);
    await db.projects.update(id, { budget: clean, updatedAt: Date.now() });
    setEditing(false);
  }

  function addItem() {
    setBudget([...budget, { category: 'mold', name: '', estimated: 0, actual: 0, otherLabel: '' }]);
    setEditing(true);
  }

  function updateItem(index: number, field: string, value: string | number) {
    const next = [...budget];
    next[index] = { ...next[index], [field]: value };
    setBudget(next);
  }

  function removeItem(index: number) {
    setBudget(budget.filter((_, i) => i !== index));
  }

  function handleDownloadTemplate() {
    downloadTemplate('项目成本模板', ['类别', '项目', '预估费用', '实际费用', '其他说明'], [
      ['模具费', '面板模具', '30000', '0', ''],
      ['人力成本', '结构工程师', '50000', '0', ''],
    ]);
  }

  async function handleImport() {
    if (!project) return;
    const file = await pickFile();
    if (!file) return;
    const rows = await parseExcelFile(file);
    const catMap: Record<string, BudgetCategory> = { '模具费': 'mold', '样品费': 'sample', '人力成本': 'labor', '认证费': 'cert', '专利费': 'patent', '差旅费': 'travel' };
    const newItems: BudgetItem[] = rows.map(row => ({
      category: catMap[row['类别']] || 'other',
      name: row['项目'] || (row['其他说明'] || ''),
      estimated: Number(row['预估费用']) || 0,
      actual: Number(row['实际费用']) || 0,
    }));
    const merged = [...budget.map(({ otherLabel, ...b }) => b), ...newItems];
    setBudget(merged.map(b => ({ ...b, otherLabel: '' })));
    setEditing(true);
    await db.projects.update(id, { budget: merged, updatedAt: Date.now() });
    setEditing(false);
  }

  const totalEst = budget.reduce((s, i) => s + i.estimated, 0);
  const totalAct = budget.reduce((s, i) => s + i.actual, 0);

  // Auto-aggregate BOM total cost (单台 × MP 量产数量)
  const [bomTotalCost, setBomTotalCost] = useState(0);
  const [mpQuantity, setMpQuantity] = useState(0);
  useEffect(() => {
    db.bomItems.where('projectId').equals(id).toArray().then(items => {
      const unitBomCost = items.reduce((s, i) => s + (i.totalCost || 0), 0);
      db.projects.get(id).then(p => {
        const mp = p?.goals?.mpQuantity ?? 0;
        setMpQuantity(mp);
        setBomTotalCost(unitBomCost * (mp > 0 ? mp : 1));  // mpQuantity=0 时视为 1（单台）
      });
    });
  }, [id]);

  // Compute category totals for chart
  const catTotals: Record<string, number> = {};
  budget.forEach(b => {
    const key = CATEGORY_LABELS[b.category] || b.category;
    catTotals[key] = (catTotals[key] || 0) + b.estimated;
  });
  if (bomTotalCost > 0) {
    catTotals['BOM物料'] = bomTotalCost;
  }
  const maxCat = Math.max(...Object.values(catTotals), 1);

  return (
    <AppShell>
      <ProjectHeader projectId={id} />
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">成本管理</h2>
            <div className="flex gap-4 mt-1 text-sm text-gray-500">
              <span>预估: ¥{totalEst.toLocaleString()}</span>
              <span>实际: ¥{totalAct.toLocaleString()}</span>
              {bomTotalCost > 0 && <span className="text-blue-600">BOM: ¥{bomTotalCost.toLocaleString()}</span>}
              {totalEst > 0 && <span className={totalAct > totalEst ? 'text-red-600' : 'text-emerald-600'}>偏差: {((totalAct - totalEst) / totalEst * 100).toFixed(1)}%</span>}
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" size="sm" onClick={handleDownloadTemplate}>下载模板</Button>
            <Button variant="secondary" size="sm" onClick={handleImport}>批量导入</Button>
            {editing ? (
              <><Button variant="secondary" onClick={() => { setBudget((project?.budget ?? []).map(b => ({ ...b, otherLabel: '' }))); setEditing(false); }}>取消</Button><Button onClick={save}>保存</Button></>
            ) : (
              <Button onClick={addItem}>+ 添加费用项</Button>
            )}
          </div>
        </div>

        {/* Cost Distribution Chart */}
        {budget.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
            <h3 className="text-sm font-semibold text-gray-400 mb-4">成本分布</h3>
            <div className="space-y-3">
              {Object.entries(catTotals).map(([cat, cost]) => (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">{cat}</span>
                    <span className="text-gray-700">¥{(cost / 1000).toFixed(0)}K ({maxCat > 0 ? ((cost / maxCat) * 100).toFixed(0) : 0}%)</span>
                  </div>
                  <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all flex items-center justify-end pr-2 text-xs text-white font-medium"
                      style={{ width: `${(cost / maxCat) * 100}%`, backgroundColor: CATEGORY_COLORS[Object.keys(CATEGORY_LABELS).find(k => CATEGORY_LABELS[k] === cat) || ''] || '#6b7280' }}
                    >
                      {((cost / maxCat) * 100) > 15 ? `¥${(cost / 1000).toFixed(0)}K` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {budget.length === 0 ? (
          <EmptyState icon="wallet" title="暂无费用数据" description="添加模具费、样品费、人力等预算项。BOM 物料总成本自动带入。" />
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 text-left">
                  <th className="px-4 py-3">类别</th><th className="px-4 py-3">项目</th>
                  <th className="px-4 py-3 text-right">预估 (¥)</th><th className="px-4 py-3 text-right">实际 (¥)</th>
                  <th className="px-4 py-3 text-right">偏差</th>
                  {editing && <th className="px-4 py-3 w-10" />}
                </tr>
              </thead>
              <tbody>
                {budget.map((item, i) => (
                  <tr key={i} className="border-b border-gray-200">
                    <td className="px-4 py-2">
                      {editing ? (
                        <div className="flex items-center gap-1">
                          <select value={item.category} onChange={e => updateItem(i, 'category', e.target.value)} className="bg-gray-100 border border-gray-200 rounded px-2 py-1 text-gray-700 text-xs">
                            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                          {item.category === 'other' && (
                            <input value={item.otherLabel ?? ''} onChange={e => updateItem(i, 'otherLabel', e.target.value)}
                              placeholder="说明" className="bg-gray-100 border border-gray-200 rounded px-1 py-1 text-gray-700 text-xs w-16" />
                          )}
                        </div>
                      ) : <span className="text-gray-700">{item.category === 'other' && item.name ? item.name : CATEGORY_LABELS[item.category]}</span>}
                    </td>
                    <td className="px-4 py-2">
                      {editing ? <input value={item.name} onChange={e => updateItem(i, 'name', e.target.value)} className="bg-gray-100 border border-gray-200 rounded px-2 py-1 text-gray-700 text-xs w-full" />
                        : <span className="text-gray-700">{item.name}</span>}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {editing ? <input type="number" value={item.estimated} onChange={e => updateItem(i, 'estimated', Number(e.target.value))} className="bg-gray-100 border border-gray-200 rounded px-2 py-1 text-gray-700 text-xs w-24 text-right" />
                        : <span className="text-gray-700">¥{item.estimated.toLocaleString()}</span>}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {editing ? <input type="number" value={item.actual} onChange={e => updateItem(i, 'actual', Number(e.target.value))} className="bg-gray-100 border border-gray-200 rounded px-2 py-1 text-gray-700 text-xs w-24 text-right" />
                        : <span className="text-gray-700">¥{item.actual.toLocaleString()}</span>}
                    </td>
                    <td className={`px-4 py-2 text-right ${item.actual > item.estimated ? 'text-red-600' : 'text-emerald-600'}`}>
                      {item.estimated > 0 ? `${((item.actual - item.estimated) / item.estimated * 100).toFixed(0)}%` : '-'}
                    </td>
                    {editing && <td className="px-4 py-2"><button onClick={() => removeItem(i)} className="text-red-600 hover:text-red-300 text-xs">删除</button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Auto-aggregation summary */}
        <div className="mt-4 bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">自动汇总</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">BOM 物料总成本: </span>
              <span className="text-blue-600">¥{bomTotalCost.toLocaleString()}</span>
              {mpQuantity > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">单台 BOM × MP 量产 {mpQuantity.toLocaleString()} 台</p>
              )}
              {mpQuantity === 0 && (
                <p className="text-xs text-gray-600 mt-0.5">来自 BOM 面板的数量 × 单项成本（未设置 MP 量产数量，默认按单台计算）</p>
              )}
            </div>
            <div>
              <span className="text-gray-500">专利成本合计: </span>
              <span className="text-purple-400">¥{budget.filter(b => b.category === 'patent').reduce((s, b) => s + b.estimated, 0).toLocaleString()}</span>
              <p className="text-xs text-gray-600 mt-0.5">来自费用项中类别为专利费的预估总和</p>
            </div>
            <div>
              <span className="text-gray-500">费用项总计: </span>
              <span className="text-gray-700">¥{totalEst.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
