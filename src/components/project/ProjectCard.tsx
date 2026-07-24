'use client';

import Link from 'next/link';
import type { Project } from '@/types';
import { PHASE_LABELS, PROJECT_MODE_LABELS } from '@/lib/ipd';
import { formatDate } from '@/lib/utils';
import Badge from '../shared/Badge';
import { useEffect, useState } from 'react';
import { db } from '@/db/database';

interface Props {
  project: Project;
  onDelete: () => void;
}

export default function ProjectCard({ project, onDelete }: Props) {
  const [taskStats, setTaskStats] = useState({ total: 0, done: 0, overdue: 0 });

  useEffect(() => {
    db.tasks.where('projectId').equals(project.id).toArray().then(tasks => {
      const now = Date.now();
      setTaskStats({
        total: tasks.length,
        done: tasks.filter(t => t.status === 'done').length,
        overdue: tasks.filter(t => t.status !== 'done' && t.endDate <= now).length,
      });
    });
  }, [project.id]);

  const progress = taskStats.total > 0
    ? Math.round((taskStats.done / taskStats.total) * 100)
    : 0;

  return (
    <div className="relative group bg-white border border-gray-200 hover:border-gray-300 rounded-xl transition-colors">
      <Link href={`/project/${project.id}`} className="block p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{project.name}</h3>
            <div className="text-sm text-gray-500">{project.brand} · {project.productLine}</div>
          </div>
          <div className="flex gap-2">
            <Badge text={PROJECT_MODE_LABELS[project.mode]} variant="info" />
            <Badge text={PHASE_LABELS[project.phase]} variant="default" />
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
          <span>{project.members.length} 名成员</span>
          <span>·</span>
          <span>更新于 {formatDate(project.updatedAt)}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs text-gray-500 w-10 text-right">{progress}%</span>
        </div>

        <div className="flex gap-4 mt-2 text-xs text-gray-600">
          <span>{taskStats.total} 个任务</span>
          {taskStats.overdue > 0 && <span className="text-red-600">{taskStats.overdue} 个逾期</span>}
        </div>
      </Link>

      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-red-600 text-lg leading-none"
        title="删除项目"
      >
        ×
      </button>
    </div>
  );
}
