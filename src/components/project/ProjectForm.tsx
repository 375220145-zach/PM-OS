'use client';

import { useState, useEffect } from 'react';
import type { Project, ProjectMode, Phase, ProjectStatus } from '@/types';
import { generateId, now } from '@/lib/utils';
import { PHASES, PROJECT_MODE_LABELS, getDefaultMilestones } from '@/lib/ipd';
import { db } from '@/db/database';
import Button from '../shared/Button';
import Modal from '../shared/Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
  editProject?: Project;
}

const defaultGoals = {
  costTarget: 0,
  qualityTargets: {},
  timelineTarget: '',
};

export default function ProjectForm({ open, onClose, onCreated, editProject }: Props) {
  const [name, setName] = useState(editProject?.name ?? '');
  const [brand, setBrand] = useState(editProject?.brand ?? 'DONNER');
  const [productLine, setProductLine] = useState(editProject?.productLine ?? '');
  const [mode, setMode] = useState<ProjectMode>(editProject?.mode ?? 'self-develop');
  const [phase, setPhase] = useState<Phase>(editProject?.phase ?? 'concept');
  const [status, setStatus] = useState<ProjectStatus>(editProject?.status ?? 'active');
  const [description, setDescription] = useState(editProject?.description ?? '');
  const [costTarget, setCostTarget] = useState(editProject?.goals?.costTarget ?? 0);
  const [mpQuantity, setMpQuantity] = useState(editProject?.goals?.mpQuantity ?? 0);
  const [timelineTarget, setTimelineTarget] = useState(editProject?.goals?.timelineTarget ?? '');
  const [templateProjectId, setTemplateProjectId] = useState('');
  const [existingProjects, setExistingProjects] = useState<Project[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && !editProject) {
      db.projects.toArray().then(arr => setExistingProjects(arr.sort((a, b) => b.updatedAt - a.updatedAt)));
    }
  }, [open, editProject]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !brand.trim() || !productLine.trim()) return;

    setSaving(true);
    const id = editProject?.id ?? generateId();
    const project: Project = {
      id,
      name: name.trim(),
      brand: brand.trim(),
      productLine: productLine.trim(),
      mode,
      status: status,
      phase,
      goals: {
        costTarget,
        mpQuantity: mpQuantity || undefined,
        qualityTargets: editProject?.goals?.qualityTargets ?? {},
        timelineTarget,
      },
      members: editProject?.members ?? [],
      budget: editProject?.budget ?? [],
      description: description.trim() || undefined,
      createdAt: editProject?.createdAt ?? now(),
      updatedAt: now(),
    };

    await db.projects.put(project);

    // If new project with template, copy milestones and tasks
    if (!editProject && templateProjectId) {
      const srcMs = await db.milestones.where('projectId').equals(templateProjectId).sortBy('order');
      if (srcMs.length > 0) {
        const newMs = srcMs.map(m => ({ ...m, id: generateId(), projectId: id, plannedDate: now() + m.order * 30 * 86400000, status: 'pending' as const, completedDate: undefined }));
        await db.milestones.bulkAdd(newMs);
      }
      // Copy tasks as templates (reset dates and assignee, mark as backlog)
      const srcTasks = await db.tasks.where('projectId').equals(templateProjectId).toArray();
      if (srcTasks.length > 0) {
        const newTasks = srcTasks.map(t => ({
          ...t, id: generateId(), projectId: id, status: 'backlog' as const,
          startDate: now(), endDate: now() + 7 * 86400000,
          actualStartDate: undefined, actualEndDate: undefined, meetingId: undefined,
          source: 'manual' as const,
        }));
        await db.tasks.bulkAdd(newTasks);
      }
    } else if (!editProject && !templateProjectId) {
      // Default milestones
      const ms = getDefaultMilestones(id, now());
      await db.milestones.bulkAdd(ms.map(m => ({ ...m, id: generateId() })));
    }

    setSaving(false);
    onCreated(id);
  }

  return (
    <Modal open={open} onClose={onClose} title={editProject ? '编辑项目' : '新建项目'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">项目名称 *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="如：Pocket Wave 吉他音箱"
            className="w-full bg-gray-100 border border-gray-700 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500" required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">品牌 *</label>
            <input type="text" value={brand} onChange={e => setBrand(e.target.value)} placeholder="DONNER"
              className="w-full bg-gray-100 border border-gray-700 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500" required />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">产品线 *</label>
            <input type="text" value={productLine} onChange={e => setProductLine(e.target.value)} placeholder="吉他音箱"
              className="w-full bg-gray-100 border border-gray-700 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500" required />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">项目模式</label>
            <select value={mode} onChange={e => setMode(e.target.value as ProjectMode)}
              className="w-full bg-gray-100 border border-gray-700 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-blue-500">
              {(Object.entries(PROJECT_MODE_LABELS) as [ProjectMode, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">当前阶段</label>
            <select value={phase} onChange={e => setPhase(e.target.value as Phase)}
              className="w-full bg-gray-100 border border-gray-700 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-blue-500">
              {PHASES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
        </div>

        {!editProject && existingProjects.length > 0 && (
          <div>
            <label className="block text-sm text-gray-400 mb-1">复制已有项目模板（可选）</label>
            <select value={templateProjectId} onChange={e => setTemplateProjectId(e.target.value)}
              className="w-full bg-gray-100 border border-gray-700 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-blue-500">
              <option value="">不复制，使用默认模板</option>
              {existingProjects.map(p => <option key={p.id} value={p.id}>{p.name} ({PHASES.find(ph => ph.key === p.phase)?.label})</option>)}
            </select>
            <p className="text-xs text-gray-600 mt-1">将复制选中项目的里程碑和任务结构，日期重置为今天</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">目标成本 (¥)</label>
            <input type="number" value={costTarget} onChange={e => setCostTarget(Number(e.target.value))}
              placeholder="整机 BOM 目标成本"
              className="w-full bg-gray-100 border border-gray-700 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500" min={0} />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">MP 量产数量</label>
            <input type="number" value={mpQuantity} onChange={e => setMpQuantity(Number(e.target.value))}
              placeholder="量产目标台数"
              className="w-full bg-gray-100 border border-gray-700 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500" min={0} />
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">交付目标</label>
          <input type="text" value={timelineTarget} onChange={e => setTimelineTarget(e.target.value)}
            placeholder="如：2026/1/16 MP 出货"
            className="w-full bg-gray-100 border border-gray-700 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500" />
        </div>

        {editProject && (
          <div>
            <label className="block text-sm text-gray-400 mb-1">项目状态</label>
            <select value={status} onChange={e => setStatus(e.target.value as ProjectStatus)}
              className="w-full bg-gray-100 border border-gray-700 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-blue-500">
              <option value="active">进行中</option>
              <option value="archived">已归档</option>
              <option value="terminated">已终止</option>
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm text-gray-400 mb-1">备注</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
            placeholder="项目背景、市场定位等..."
            className="w-full bg-gray-100 border border-gray-700 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>取消</Button>
          <Button type="submit" disabled={saving}>
            {saving ? '保存中...' : editProject ? '保存' : '创建项目'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
