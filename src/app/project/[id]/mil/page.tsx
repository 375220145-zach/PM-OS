'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import type { MILEntry, MILStatus, MILSeverity } from '@/types';
import { db } from '@/db/database';
import AppShell from '@/components/layout/AppShell';
import ProjectHeader from '@/components/layout/ProjectHeader';
import Button from '@/components/shared/Button';
import Badge from '@/components/shared/Badge';
import EmptyState from '@/components/shared/EmptyState';
import Modal from '@/components/shared/Modal';
import { generateId, formatDate } from '@/lib/utils';
import { downloadTemplate, parseExcelFile, pickFile } from '@/lib/excel';

const STATUS_MAP: Record<MILStatus, string> = { open: '待处理', 'in-progress': '处理中', resolved: '已验证', closed: '已关闭' };
const STATUS_COLORS: Record<MILStatus, string> = { open: 'bg-red-100 text-red-700', 'in-progress': 'bg-amber-100 text-amber-700', resolved: 'bg-blue-100 text-blue-700', closed: 'bg-emerald-100 text-emerald-700' };
const SEVERITY_COLORS: Record<MILSeverity, string> = { A: 'bg-red-600 text-white', B: 'bg-yellow-600 text-white', C: 'bg-gray-300 text-gray-700' };
const KANBAN_COLS: { status: MILStatus; label: string }[] = [
  { status: 'open', label: '待处理' },
  { status: 'in-progress', label: '处理中' },
  { status: 'resolved', label: '已验证' },
  { status: 'closed', label: '已关闭' },
];

export default function MILPage() {
  const params = useParams();
  const id = params.id as string;
  const [entries, setEntries] = useState<MILEntry[]>([]);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState<MILEntry | null>(null);
  const [sevFilter, setSevFilter] = useState<string>('all');
  const [respFilter, setRespFilter] = useState<string>('');

  const filteredEntries = entries.filter(e => {
    if (sevFilter !== 'all' && e.severity !== sevFilter) return false;
    if (respFilter && e.responsible !== respFilter) return false;
    return true;
  });
  const allResponsibles = [...new Set(entries.map(e => e.responsible).filter(Boolean))];

  const refresh = useCallback(() => {
    db.milEntries.where('projectId').equals(id).toArray().then(setEntries);
  }, [id]);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleSave(form: Partial<MILEntry>) {
    const entry: MILEntry = {
      id: editEntry?.id ?? generateId(),
      projectId: id,
      issueId: form.issueId ?? `MIL-${String(entries.length + 1).padStart(3, '0')}`,
      title: form.title ?? '',
      description: form.description ?? '',
      severity: form.severity ?? 'C',
      status: form.status ?? 'open',
      source: form.source ?? '',
      foundAt: form.foundAt ?? '',
      responsible: form.responsible ?? '',
      deadline: form.deadline,
      rootCause: form.rootCause,
      solution: form.solution,
      verifiedBy: form.verifiedBy,
      tags: form.tags ?? [],
      createdAt: editEntry?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };
    await db.milEntries.put(entry);
    setShowForm(false);
    setEditEntry(null);
    refresh();
  }

  async function handleDownloadTemplate() {
    downloadTemplate('MIL问题库模板', ['编号', '标题', '描述', '严重度(A/B/C)', '状态', '发现来源', '发现阶段', '责任人', '截止日期', '根因', '解决方案', '验证人'], [
      ['MIL-001', '音频噪声超标', 'DVT样机测试时发现底噪超过规格', 'A', 'open', '测试', 'DVT', '廖永帆', '2026-01-15', '', '', ''],
    ]);
  }

  async function handleImport() {
    const file = await pickFile();
    if (!file) return;
    const rows = await parseExcelFile(file);
    const newEntries: MILEntry[] = rows.map((row, i) => ({
      id: generateId(),
      projectId: id,
      issueId: row['编号'] || `MIL-${String(entries.length + i + 1).padStart(3, '0')}`,
      title: row['标题'] || '',
      description: row['描述'] || '',
      severity: (row['严重度(A/B/C)'] || 'C') as MILSeverity,
      status: (row['状态'] || 'open') as MILStatus,
      source: row['发现来源'] || '',
      foundAt: row['发现阶段'] || '',
      responsible: row['责任人'] || '',
      deadline: row['截止日期'] ? new Date(row['截止日期']).getTime() : undefined,
      rootCause: row['根因'] || undefined,
      solution: row['解决方案'] || undefined,
      verifiedBy: row['验证人'] || undefined,
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));
    await db.milEntries.bulkAdd(newEntries);
    refresh();
  }

  async function moveStatus(entry: MILEntry, newStatus: MILStatus) {
    await db.milEntries.update(entry.id, { status: newStatus, updatedAt: Date.now() });
    refresh();
  }

  const aCount = filteredEntries.filter(e => e.severity === 'A' && e.status !== 'closed').length;
  const bCount = filteredEntries.filter(e => e.severity === 'B' && e.status !== 'closed').length;
  const totalOpen = filteredEntries.filter(e => e.status !== 'closed').length;

  return (
    <AppShell>
      <ProjectHeader projectId={id} />
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">MIL 问题库</h2>
            <div className="flex gap-3 mt-1 text-sm text-gray-500">
              <span>{entries.length} 个问题</span>
              <span className="text-red-600">A类: {aCount}</span>
              <span className="text-amber-600">B类: {bCount}</span>
              <span>未关闭: {totalOpen}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <select value={sevFilter} onChange={e => setSevFilter(e.target.value)}
              className="bg-gray-100 border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 text-xs">
              <option value="all">全部严重度</option>
              <option value="A">A类</option><option value="B">B类</option><option value="C">C类</option>
            </select>
            <select value={respFilter} onChange={e => setRespFilter(e.target.value)}
              className="bg-gray-100 border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 text-xs">
              <option value="">全部责任人</option>
              {allResponsibles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button onClick={() => setView('kanban')} className={`px-3 py-1.5 text-xs rounded-md ${view === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>看板</button>
              <button onClick={() => setView('list')} className={`px-3 py-1.5 text-xs rounded-md ${view === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>列表</button>
            </div>
            <Button variant="secondary" size="sm" onClick={handleDownloadTemplate}>下载模板</Button>
            <Button variant="secondary" size="sm" onClick={handleImport}>批量导入</Button>
            <Button onClick={() => { setEditEntry(null); setShowForm(true); }}>+ 新增问题</Button>
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <EmptyState icon="search" title="暂无 MIL 问题" description="MIL (Master Issue List) 追踪研发过程中的所有问题，按严重度 A/B/C 分级管理。可下载 Excel 模板批量导入。" action={{ label: '新增问题', onClick: () => setShowForm(true) }} />
        ) : view === 'kanban' ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {KANBAN_COLS.map(col => {
              const colEntries = filteredEntries.filter(e => e.status === col.status);
              return (
                <div key={col.status} className="bg-white border border-gray-200 rounded-xl p-4 min-h-[300px]">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center justify-between">
                    {col.label}
                    <span className="text-xs text-gray-600">{colEntries.length}</span>
                  </h3>
                  <div className="space-y-2">
                    {colEntries.map(e => (
                      <div
                        key={e.id}
                        onClick={() => { setEditEntry(e); setShowForm(true); }}
                        className="bg-gray-100 rounded-lg p-3 cursor-pointer hover:ring-1 hover:ring-gray-600 transition-all"
                        draggable
                        onDragStart={(ev) => ev.dataTransfer.setData('text/plain', e.id)}
                        onDragOver={(ev) => ev.preventDefault()}
                        onDrop={(ev) => { ev.preventDefault(); moveStatus(e, col.status); }}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${SEVERITY_COLORS[e.severity]}`}>{e.severity}</span>
                          <span className="text-xs text-gray-500">{e.issueId}</span>
                        </div>
                        <div className="text-sm text-gray-700 mb-1.5 line-clamp-2">{e.title}</div>
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>{e.responsible}</span>
                          {e.deadline && <span>{formatDate(e.deadline)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 text-left">
                  <th className="px-4 py-3">编号</th>
                  <th className="px-4 py-3">严重度</th>
                  <th className="px-4 py-3">标题</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3">责任人</th>
                  <th className="px-4 py-3">发现阶段</th>
                  <th className="px-4 py-3">截止日期</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map(e => (
                  <tr key={e.id} onClick={() => { setEditEntry(e); setShowForm(true); }} className="border-b border-gray-200 hover:bg-gray-100/50 cursor-pointer">
                    <td className="px-4 py-2 text-gray-500">{e.issueId}</td>
                    <td className="px-4 py-2"><span className={`text-xs px-1.5 py-0.5 rounded font-bold ${SEVERITY_COLORS[e.severity]}`}>{e.severity}</span></td>
                    <td className="px-4 py-2 text-gray-700">{e.title}</td>
                    <td className="px-4 py-2"><Badge text={STATUS_MAP[e.status]} variant={e.status === 'closed' ? 'success' : e.status === 'open' ? 'danger' : 'warning'} /></td>
                    <td className="px-4 py-2 text-gray-500">{e.responsible}</td>
                    <td className="px-4 py-2 text-gray-500">{e.foundAt}</td>
                    <td className="px-4 py-2 text-gray-500">{e.deadline ? formatDate(e.deadline) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <MILEntryForm open={showForm} onClose={() => { setShowForm(false); setEditEntry(null); }} entry={editEntry} onSave={handleSave} />
      </div>
    </AppShell>
  );
}

function MILEntryForm({ open, onClose, entry, onSave }: { open: boolean; onClose: () => void; entry: MILEntry | null; onSave: (f: Partial<MILEntry>) => void }) {
  const [form, setForm] = useState<Partial<MILEntry>>(entry ?? {});

  useEffect(() => { setForm(entry ?? {}); }, [entry]);

  return (
    <Modal open={open} onClose={onClose} title={entry ? '编辑 MIL 问题' : '新增 MIL 问题'} wide>
      <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">编号</label>
            <input value={form.issueId ?? ''} onChange={e => setForm({ ...form, issueId: e.target.value })} placeholder="MIL-001" className="w-full bg-gray-100 border border-gray-200 rounded px-3 py-2 text-gray-700 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">严重度</label>
            <select value={form.severity ?? 'C'} onChange={e => setForm({ ...form, severity: e.target.value as MILSeverity })} className="w-full bg-gray-100 border border-gray-200 rounded px-3 py-2 text-gray-700 text-sm">
              <option value="A">A - 严重</option><option value="B">B - 中等</option><option value="C">C - 轻微</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">状态</label>
            <select value={form.status ?? 'open'} onChange={e => setForm({ ...form, status: e.target.value as MILStatus })} className="w-full bg-gray-100 border border-gray-200 rounded px-3 py-2 text-gray-700 text-sm">
              <option value="open">待处理</option><option value="in-progress">处理中</option><option value="resolved">已验证</option><option value="closed">已关闭</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">责任人</label>
            <input value={form.responsible ?? ''} onChange={e => setForm({ ...form, responsible: e.target.value })} className="w-full bg-gray-100 border border-gray-200 rounded px-3 py-2 text-gray-700 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">标题</label>
          <input value={form.title ?? ''} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full bg-gray-100 border border-gray-200 rounded px-3 py-2 text-gray-700 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">描述</label>
          <textarea value={form.description ?? ''} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="w-full bg-gray-100 border border-gray-200 rounded px-3 py-2 text-gray-700 text-sm resize-none" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">发现来源</label>
            <input value={form.source ?? ''} onChange={e => setForm({ ...form, source: e.target.value })} placeholder="测试/评审/生产" className="w-full bg-gray-100 border border-gray-200 rounded px-3 py-2 text-gray-700 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">发现阶段</label>
            <input value={form.foundAt ?? ''} onChange={e => setForm({ ...form, foundAt: e.target.value })} placeholder="DVT/EVT/PVT" className="w-full bg-gray-100 border border-gray-200 rounded px-3 py-2 text-gray-700 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">截止日期</label>
            <input type="date" value={form.deadline ? new Date(form.deadline).toISOString().slice(0, 10) : ''} onChange={e => setForm({ ...form, deadline: e.target.value ? new Date(e.target.value).getTime() : undefined })} className="w-full bg-gray-100 border border-gray-200 rounded px-3 py-2 text-gray-700 text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">根因</label>
            <textarea value={form.rootCause ?? ''} onChange={e => setForm({ ...form, rootCause: e.target.value })} rows={2} className="w-full bg-gray-100 border border-gray-200 rounded px-3 py-2 text-gray-700 text-sm resize-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">解决方案</label>
            <textarea value={form.solution ?? ''} onChange={e => setForm({ ...form, solution: e.target.value })} rows={2} className="w-full bg-gray-100 border border-gray-200 rounded px-3 py-2 text-gray-700 text-sm resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={onClose}>取消</Button>
          <Button type="submit">保存</Button>
        </div>
      </form>
    </Modal>
  );
}
