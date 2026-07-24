// Client-side data collection + pre-check logic for AI Agent pipeline
// Logic judgment stays on client; AI only does natural language summarization

import type { Project, Task, Milestone, MILEntry, BomItem } from '@/types';
import { db } from '@/db/database';

export interface PreCheckResult {
  projectName: string;
  overdueTasks: { name: string; assignee: string; overdueDays: number; priority: string; phase: string }[];
  aClassMILs: { title: string; description: string; severity: string }[];
  milestoneStatus: { name: string; plannedDate: string; status: string; isDelayed: boolean }[];
  budgetSummary: { category: string; estimated: number; actual: number }[];
  bomTotal: number;
  topLoadedMembers: { name: string; taskCount: number }[];
  totalTasks: number;
  doneTasks: number;
}

export async function collectProjectData(projectId: string): Promise<PreCheckResult | null> {
  const project = await db.projects.get(projectId);
  if (!project) return null;

  const [tasks, milestones, mils, bomItems] = await Promise.all([
    db.tasks.where('projectId').equals(projectId).toArray(),
    db.milestones.where('projectId').equals(projectId).toArray(),
    db.milEntries.where('projectId').equals(projectId).toArray(),
    db.bomItems.where('projectId').equals(projectId).toArray(),
  ]);

  const now = Date.now();
  const msPerDay = 86400000;

  // Overdue tasks (client-side judgment: Date.now() > endDate)
  const overdueTasks = tasks
    .filter(t => t.status !== 'done' && t.endDate <= now)
    .map(t => ({
      name: t.name,
      assignee: t.assignee,
      overdueDays: Math.ceil((now - t.endDate) / msPerDay),
      priority: t.priority,
      phase: t.phase,
    }));

  // A-class MILs
  const aClassMILs = mils
    .filter(m => m.severity === 'A' && m.status !== 'closed')
    .map(m => ({
      title: m.title,
      description: m.description,
      severity: m.severity,
    }));

  // Milestone health (client-side)
  const milestoneStatus = milestones.map(m => {
    const isDelayed = m.status === 'delayed' || (m.status !== 'completed' && m.plannedDate < now);
    return {
      name: m.name,
      plannedDate: new Date(m.plannedDate).toISOString().split('T')[0],
      status: m.status === 'completed' ? 'completed' : isDelayed ? 'delayed' : 'on-track',
      isDelayed,
    };
  });

  // Budget
  const budgetSummary = project.budget.map(b => ({
    category: b.category,
    estimated: b.estimated,
    actual: b.actual,
  }));

  // BOM total
  const bomTotal = bomItems.reduce((sum, item) => sum + item.totalCost, 0);

  // Top loaded members (client-side)
  const loadMap = new Map<string, number>();
  tasks.filter(t => t.status !== 'done').forEach(t => {
    loadMap.set(t.assignee, (loadMap.get(t.assignee) || 0) + 1);
  });
  const topLoadedMembers = Array.from(loadMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, taskCount]) => ({ name, taskCount }));

  return {
    projectName: project.name,
    overdueTasks,
    aClassMILs,
    milestoneStatus,
    budgetSummary,
    bomTotal,
    topLoadedMembers,
    totalTasks: tasks.length,
    doneTasks: tasks.filter(t => t.status === 'done').length,
  };
}
