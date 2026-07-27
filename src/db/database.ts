import Dexie, { type EntityTable } from 'dexie';
import type {
  Project, Milestone, Task, Meeting, Retrospective,
  ChangeRecord, BomItem, ProcurementCandidate, CertRequirement, MILEntry, WorkLogEntry,
  GraphNode, GraphEdge, ExtractionMeta, KbImageRecord,
} from '@/types';

export class PmOsDB extends Dexie {
  projects!: EntityTable<Project, 'id'>;
  milestones!: EntityTable<Milestone, 'id'>;
  tasks!: EntityTable<Task, 'id'>;
  meetings!: EntityTable<Meeting, 'id'>;
  retrospectives!: EntityTable<Retrospective, 'id'>;
  changeRecords!: EntityTable<ChangeRecord, 'id'>;
  bomItems!: EntityTable<BomItem, 'id'>;
  procurementCandidates!: EntityTable<ProcurementCandidate, 'id'>;
  certRequirements!: EntityTable<CertRequirement, 'id'>;
  milEntries!: EntityTable<MILEntry, 'id'>;
  workLogs!: EntityTable<WorkLogEntry, 'id'>;
  graphNodes!: EntityTable<GraphNode, 'id'>;
  graphEdges!: EntityTable<GraphEdge, 'id'>;
  extractionMeta!: EntityTable<ExtractionMeta, 'id'>;
  kbImages!: EntityTable<KbImageRecord, 'id'>;

  constructor() {
    super('PmOsDB');
    this.version(3).stores({
      projects: 'id, name, status, phase, createdAt',
      milestones: 'id, projectId, order',
      tasks: 'id, projectId, phase, status, assignee',
      meetings: 'id, projectId, date',
      retrospectives: 'id, projectId, phase',
      changeRecords: 'id, projectId, createdAt',
      bomItems: 'id, projectId, category',
      procurementCandidates: 'id, projectId',
      certRequirements: 'id, projectId, market',
      milEntries: 'id, projectId, status, severity',
      workLogs: 'id, projectId, createdAt',
    });
    this.version(4).stores({
      projects: 'id, name, status, phase, createdAt',
      milestones: 'id, projectId, order',
      tasks: 'id, projectId, phase, status, assignee',
      meetings: 'id, projectId, date',
      retrospectives: 'id, projectId, phase',
      changeRecords: 'id, projectId, createdAt',
      bomItems: 'id, projectId, category',
      procurementCandidates: 'id, projectId',
      certRequirements: 'id, projectId, market',
      milEntries: 'id, projectId, status, severity',
      workLogs: 'id, projectId, createdAt',
      graphNodes: 'id, entityType, source, normalizedLabel, [entityType+normalizedLabel]',
      graphEdges: 'id, sourceId, targetId, relation, [sourceId+relation], [targetId+relation]',
      extractionMeta: 'id, sourceId, sourceType',
      kbImages: 'id, nodeId',
    });
    this.version(5).stores({
      projects: 'id, name, status, phase, createdAt',
      milestones: 'id, projectId, order',
      tasks: 'id, projectId, phase, status, assignee',
      meetings: 'id, projectId, date',
      retrospectives: 'id, projectId, phase',
      changeRecords: 'id, projectId, createdAt',
      bomItems: 'id, projectId, category, phase, [projectId+phase]',
      procurementCandidates: 'id, projectId',
      certRequirements: 'id, projectId, market',
      milEntries: 'id, projectId, status, severity',
      workLogs: 'id, projectId, createdAt',
      graphNodes: 'id, entityType, source, normalizedLabel, [entityType+normalizedLabel]',
      graphEdges: 'id, sourceId, targetId, relation, [sourceId+relation], [targetId+relation]',
      extractionMeta: 'id, sourceId, sourceType',
      kbImages: 'id, nodeId',
    }).upgrade(async tx => {
      const bomItems = await tx.table('bomItems').toArray() as Array<{ id: string; projectId: string; phase?: string; lockedAt?: number; lockedBy?: string }>;
      const projects = await tx.table('projects').toArray() as Array<{ id: string; phase: string }>;
      const phaseByProject = new Map(projects.map(p => [p.id, p.phase]));
      for (const item of bomItems) {
        await tx.table('bomItems').update(item.id, {
          phase: item.phase || phaseByProject.get(item.projectId) || 'evt',
          lockedAt: item.lockedAt || 0,
          lockedBy: item.lockedBy || undefined,
        });
      }
    });
  }
}

export const db = new PmOsDB();
