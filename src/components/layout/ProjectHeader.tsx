'use client';

import { useEffect, useState } from 'react';
import type { Project } from '@/types';
import { db } from '@/db/database';
import { PHASE_LABELS, PROJECT_MODE_LABELS } from '@/lib/ipd';
import Badge from '../shared/Badge';

interface Props {
  projectId: string;
}

export default function ProjectHeader({ projectId }: Props) {
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    db.projects.get(projectId).then(p => setProject(p ?? null));
  }, [projectId]);

  if (!project) {
    return (
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="h-8 bg-gray-100 rounded animate-pulse w-64" />
      </div>
    );
  }

  return (
    <div className="px-6 py-4 border-b border-gray-200">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
        <Badge text={PROJECT_MODE_LABELS[project.mode]} variant="info" />
        <Badge text={PHASE_LABELS[project.phase]} variant="default" />
      </div>
      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
        <span>{project.brand}</span>
        <span>·</span>
        <span>{project.productLine}</span>
        <span>·</span>
        <span>{project.members.length} 名成员</span>
      </div>
    </div>
  );
}
