import Dexie, { type EntityTable } from 'dexie';
import type {
  Project, Milestone, Task, Meeting, Retrospective,
  ChangeRecord, BomItem, ProcurementCandidate, CertRequirement, MILEntry, WorkLogEntry,
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
  }
}

export const db = new PmOsDB();
