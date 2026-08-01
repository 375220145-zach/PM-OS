// Client-side data collection + pre-check logic for AI Agent pipeline
// Logic judgment stays on client; AI only does natural language summarization

import type { Project, Task, Milestone, MILEntry, BomItem } from '@/types';
import { db } from '@/db/database';
import { loadGraph, getNodesByProject } from '@/lib/graph/store';
import { collectGraphContext, bfsTraverse } from '@/lib/graph/traversal';
import { aiGraphExtract } from '@/lib/ai-remote';

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

  const [tasks, milestones, mils, proj, allBomItems] = await Promise.all([
    db.tasks.where('projectId').equals(projectId).toArray(),
    db.milestones.where('projectId').equals(projectId).toArray(),
    db.milEntries.where('projectId').equals(projectId).toArray(),
    db.projects.get(projectId),
    db.bomItems.where('projectId').equals(projectId).toArray(),
  ]);
  const currentPhase = proj?.phase || 'evt';
  const bomItems = allBomItems.filter(item => item.phase === currentPhase);

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

/** Collect project data enhanced with cross-project knowledge graph context */
export async function collectProjectDataWithGraph(projectId: string): Promise<string | null> {
  const data = await collectProjectData(projectId);
  if (!data) return null;

  let graphContext = '暂无跨项目知识图谱数据。';

  try {
    // 1. Check if project needs (re-)extraction
    const { getExtractionMeta, upsertNodes, upsertEdges, setExtractionMeta, removeNodesByProject: rmNodes, removeEdgesByProject: rmEdges } = await import('@/lib/graph/store');

    const project = await db.projects.get(projectId);
    const existingMeta = await getExtractionMeta(projectId);
    const needsExtraction = !existingMeta || (project && existingMeta.lastSourceUpdatedAt < project.updatedAt);

    if (needsExtraction && project) {
      try {
        // Build enriched extraction payload with all project content
        const [tasks, milestones, mils, meetings, retros, workLogs] = await Promise.all([
          db.tasks.where('projectId').equals(projectId).toArray(),
          db.milestones.where('projectId').equals(projectId).toArray(),
          db.milEntries.where('projectId').equals(projectId).toArray(),
          db.meetings.where('projectId').equals(projectId).toArray(),
          db.retrospectives.where('projectId').equals(projectId).toArray(),
          db.workLogs.where('projectId').equals(projectId).toArray(),
        ]);

        const extractPayload = {
          project: { name: project.name, brand: project.brand, phase: project.phase, mode: project.mode, status: project.status },
          budget: project.budget,
          tasks: tasks.slice(0, 50).map(t => ({ name: t.name, status: t.status, priority: t.priority, assignee: t.assignee, phase: t.phase, risk: t.risk })),
          milestones: milestones.map(m => ({ name: m.name, status: m.status, plannedDate: m.plannedDate ? new Date(m.plannedDate).toISOString().slice(0, 10) : '' })),
          milEntries: mils.filter(m => m.status !== 'closed').slice(0, 20).map(m => ({ title: m.title, severity: m.severity, status: m.status, rootCause: m.rootCause || '', solution: m.solution || '' })),
          workLogs: workLogs.sort((a, b) => b.updatedAt - a.updatedAt).map(w => ({
            date: new Date(w.createdAt).toISOString().slice(0, 10),
            items: w.items.filter(i => i.text.trim()).map(i => ({ text: i.text, done: i.done })),
          })),
          meetings: meetings.sort((a, b) => b.date - a.date).slice(0, 10).map(m => ({
            title: m.title, date: new Date(m.date).toISOString().slice(0, 10), type: m.meetingType || '',
            summary: m.summary || '', decisions: m.decisions || [], keyInsights: m.keyInsights || [],
            actionItems: (m.actionItems || []).slice(0, 10).map(a => ({ content: a.content, owner: a.owner, priority: a.priority })),
          })),
          retros: retros.sort((a, b) => b.createdAt - a.createdAt).slice(0, 5).map(r => ({
            title: r.title, phase: r.phase,
            highlights: r.highlights || [], gaps: r.gaps || [],
            lessonsLearned: (r.lessonsLearned || []).map(l => ({ problem: l.problem, rootCause: l.rootCause, solution: l.solution })),
          })),
        };

        const result = await aiGraphExtract('proj', projectId, JSON.stringify(extractPayload));

        if (result.nodes?.length > 0) {
            await rmNodes(projectId);
            await rmEdges(projectId);
            await upsertNodes(result.nodes);
            await upsertEdges(result.edges);
            await setExtractionMeta({
              id: projectId,
              sourceId: projectId,
              sourceType: 'proj',
              lastExtractedAt: Date.now(),
              lastSourceUpdatedAt: project.updatedAt,
              nodeCount: result.nodes.length,
              edgeCount: result.edges.length,
            });
        }
      } catch {
        // Extraction failed — agents still work without graph
      }
    }

    // 2. Load graph and find cross-project context
    const graph = await loadGraph();
    if (graph.nodes.size > 0) {
      const projNodes = Array.from(graph.nodes.values()).filter(
        n => n.projectId === projectId || (n.source === 'proj' && n.id.includes(projectId.slice(0, 8))),
      );
      const seedIds = projNodes.map(n => n.id);

      if (seedIds.length > 0) {
        const { collectGraphContext } = await import('@/lib/graph/traversal');
        const ctx = collectGraphContext(projectId, seedIds, graph, { maxDepth: 2, maxNodes: 40 });
        if (ctx.crossProjectEntities.length > 0 || ctx.relatedNodes.length > 0) {
          const parts: string[] = [];

          for (const e of ctx.crossProjectEntities.slice(0, 5)) {
            parts.push(`${e.entityType}「${e.label}」在以下项目中也有记录：${e.sourceProjectIds.join('、')}。关联原因：${e.relevance}`);
          }

          if (ctx.relatedNodes.length > 0) {
            const related = ctx.relatedNodes.slice(0, 8)
              .map(n => `${n.entityType}「${n.label}」(关系: ${n.relation})`)
              .join('、');
            parts.push(`知识库关联实体：${related}`);
          }

          graphContext = `[跨项目知识图谱]\n${parts.join('\n')}`;
        }
      }
    }
  } catch (e) {
    console.warn('Graph context unavailable:', e);
  }

  const dataStr = JSON.stringify(data);
  return `项目数据：\n${dataStr}\n\n${graphContext}`;
}
