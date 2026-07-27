'use client';

import { useState } from 'react';
import type { ProjectSnapshot } from '@/types';
import { db } from '@/db/database';
import Button from '../shared/Button';
import Modal from '../shared/Modal';
import { NonDemoOnly } from '../shared/DemoGuard';

interface Props {
  projectId: string;
}

export default function ExportButton({ projectId }: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('');

  async function exportJSON() {
    setStatus('导出中...');
    const project = await db.projects.get(projectId);
    if (!project) return;

    const [milestones, tasks, meetings, retrospectives, changeRecords, bomItems, procurementCandidates, certRequirements, milEntries, workLogs] =
      await Promise.all([
        db.milestones.where('projectId').equals(projectId).toArray(),
        db.tasks.where('projectId').equals(projectId).toArray(),
        db.meetings.where('projectId').equals(projectId).toArray(),
        db.retrospectives.where('projectId').equals(projectId).toArray(),
        db.changeRecords.where('projectId').equals(projectId).toArray(),
        db.bomItems.where('projectId').equals(projectId).toArray(),
        db.procurementCandidates.where('projectId').equals(projectId).toArray(),
        db.certRequirements.where('projectId').equals(projectId).toArray(),
        db.milEntries.where('projectId').equals(projectId).toArray(),
        db.workLogs.where('projectId').equals(projectId).toArray(),
      ]);

    const snapshot: ProjectSnapshot = {
      version: 2,
      exportedAt: Date.now(),
      project,
      milestones,
      tasks,
      meetings,
      retrospectives,
      changeRecords,
      bomItems,
      procurementCandidates,
      certRequirements,
      milEntries,
      workLogs,
    };

    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}-${new Date().toISOString().slice(0, 10)}.pmos.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus('导出完成');
    setTimeout(() => { setStatus(''); setOpen(false); }, 1500);
  }

  async function importJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.pmos';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setStatus('导入中...');
      try {
        const text = await file.text();
        const snapshot: ProjectSnapshot = JSON.parse(text);

        await db.projects.put(snapshot.project);
        if (snapshot.milestones) await db.milestones.bulkPut(snapshot.milestones);
        if (snapshot.tasks) await db.tasks.bulkPut(snapshot.tasks);
        if (snapshot.meetings) await db.meetings.bulkPut(snapshot.meetings);
        if (snapshot.retrospectives) await db.retrospectives.bulkPut(snapshot.retrospectives);
        if (snapshot.changeRecords) await db.changeRecords.bulkPut(snapshot.changeRecords);
        if (snapshot.bomItems) {
          // Patch old snapshots missing phase/lockedAt fields
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const patched = snapshot.bomItems.map((item: any) => ({
            ...item,
            phase: item.phase || snapshot.project.phase || 'evt',
            lockedAt: item.lockedAt ?? 0,
          }));
          await db.bomItems.bulkPut(patched);
        }
        if (snapshot.procurementCandidates) await db.procurementCandidates.bulkPut(snapshot.procurementCandidates);
        if (snapshot.certRequirements) await db.certRequirements.bulkPut(snapshot.certRequirements);
        if (snapshot.milEntries) await db.milEntries.bulkPut(snapshot.milEntries);
        if (snapshot.workLogs) await db.workLogs.bulkPut(snapshot.workLogs);

        setStatus('导入成功，刷新页面...');
        setTimeout(() => window.location.reload(), 1000);
      } catch (err) {
        setStatus(`导入失败: ${(err as Error).message}`);
      }
    };
    input.click();
  }

  return (
    <NonDemoOnly>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        导出/导入
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="项目数据导出/导入">
        <div className="space-y-4">
          <div className="bg-gray-100 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">导出项目</h4>
            <p className="text-xs text-gray-500 mb-3">
              导出为 .pmos.json 文件，包含项目所有数据（任务、会议、复盘、物料、采购、认证等）。可跨设备导入还原。
            </p>
            <Button onClick={exportJSON}>下载 JSON</Button>
          </div>

          <div className="bg-gray-100 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">导入项目</h4>
            <p className="text-xs text-gray-500 mb-3">
              选择之前导出的 .pmos.json 文件。如果项目 ID 已存在则覆盖。
            </p>
            <Button variant="secondary" onClick={importJSON}>选择文件导入</Button>
          </div>

          {status && (
            <div className={`text-sm text-center py-2 rounded-lg ${
              status.includes('失败') ? 'text-red-600 bg-red-900/20' : 'text-blue-600 bg-blue-900/20'
            }`}>
              {status}
            </div>
          )}
        </div>
      </Modal>
    </NonDemoOnly>
  );
}
