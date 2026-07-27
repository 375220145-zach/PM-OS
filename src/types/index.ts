export type Phase = 'concept' | 'design' | 'hms' | 'evt' | 'dvt' | 'pvt' | 'mp';

export type ProjectMode = 'odm' | 'oem' | 'self-develop' | 'expand';

export type ProjectStatus = 'active' | 'archived' | 'terminated';

export type TaskStatus = 'backlog' | 'todo' | 'in-progress' | 'done';

export type Priority = 'P0' | 'P1' | 'P2';

export type RiskLevel = 'none' | 'low' | 'medium' | 'high';

export type MilestoneType = 'tr' | 'dcp' | 'phase-gate' | 'production';

export type MilestoneStatus = 'pending' | 'in-progress' | 'completed' | 'delayed';

export type BudgetCategory = 'mold' | 'sample' | 'labor' | 'cert' | 'patent' | 'travel' | 'other';

export type CriterionType = 'manual' | 'auto_milestone' | 'link';

export interface CriterionDef {
  text: string;
  type: CriterionType;
  /** 自动检测依赖的里程碑 key（如 'TR1'），仅在 auto_milestone 时有效 */
  dependsOn?: string;
}

/** criteriaCheck 中每条标准的勾选状态 */
export interface CriterionState {
  checked: boolean;
  linkUrl?: string;
}

export type MeetingStatus = 'draft' | 'analyzing' | 'completed';

export type ActionItemStatus = 'pending' | 'confirmed' | 'converted';

export type TaskSource = 'manual' | 'meeting';

export type RetroGeneratedBy = 'manual' | 'ai';

export interface ProjectGoals {
  costTarget: number;
  qualityTargets: {
    massProductionYield?: number;
    inspectionPassRate?: number;
    overallRefundRate?: string;
    qualityRefundRate?: string;
  };
  timelineTarget: string;
  mpQuantity?: number;   // MP 量产目标数量，用于 BOM 总成本 = 单台成本 × mpQuantity
}

export interface Member {
  name: string;
  role: string;
  email?: string;
  phone?: string;
  estimatedHours?: number;     // 项目预计耗时
  actualHours?: number;         // 项目实际耗时
}

export interface BudgetItem {
  category: BudgetCategory;
  name: string;
  estimated: number;
  actual: number;
}

export interface Project {
  id: string;
  name: string;
  brand: string;
  productLine: string;
  mode: ProjectMode;
  status: ProjectStatus;
  phase: Phase;
  goals: ProjectGoals;
  members: Member[];
  budget: BudgetItem[];
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  type: MilestoneType;
  order: number;
  plannedDate: number;
  actualDate?: number;
  status: MilestoneStatus;
  entryCriteria?: string[];
  exitCriteria?: string[];
  criteriaCheck?: string;  // JSON: { e: boolean[], x: boolean[] } for entry/exit checkbox state
}

export interface Task {
  id: string;
  projectId: string;
  phase: Phase;
  name: string;
  description?: string;
  assignee: string;
  deliverable?: string;
  startDate: number;
  endDate: number;
  actualStartDate?: number;
  actualEndDate?: number;
  status: TaskStatus;
  priority: Priority;
  risk: RiskLevel;
  dependencies: string[];
  source: TaskSource;
  meetingId?: string;
  tags: string[];
  notes?: string;
}

export interface ActionItem {
  id: string;
  meetingId: string;
  content: string;
  owner: string;
  deadline?: number;
  priority: Priority;
  risk: RiskLevel;
  status: ActionItemStatus;
  convertedTaskId?: string;
}

export type MeetingType = 'standup' | 'review' | 'retro' | 'weekly' | 'interview' | 'one-on-one' | 'kickoff' | 'general';

export interface Meeting {
  id: string;
  projectId: string;
  title: string;
  date: number;
  attendees: string[];
  transcript: string;
  summary?: string;
  actionItems: ActionItem[];
  decisions: string[];
  openQuestions?: string[];
  keyInsights?: string[];
  meetingType?: MeetingType;
  status: MeetingStatus;
}

export interface Lesson {
  problem: string;
  rootCause: string;
  solution: string;
}

export interface Retrospective {
  id: string;
  projectId: string;
  phase: Phase;
  title: string;
  goalReview: string;
  achievement: string;
  highlights: string[];
  gaps: string[];
  rootCauseAnalysis: string;
  improvements: string[];
  lessonsLearned: Lesson[];
  generatedBy: RetroGeneratedBy;
  createdAt: number;
}

export interface ChangeRecord {
  id: string;
  projectId: string;
  applicant: string;
  type: string;
  content: string;
  reviewResult: string;
  impact: string;
  createdAt: number;
}

export interface BomItem {
  id: string;
  projectId: string;
  parentId?: string;            // 父级 BOM ID，用于层级展开
  category: 'structure' | 'hardware' | 'packaging' | 'other';
  partNumber?: string;
  name: string;
  description: string;
  requirement?: string;         // 需求梳理
  isMold: boolean;
  quantity: number;             // 数量
  unitCost: number;             // 单项成本
  totalCost: number;            // 数量 × 单项成本，自动核算
  supplier?: string;
  notes?: string;
}

export interface ProcurementCandidate {
  id: string;
  projectId: string;
  name: string;
  location: string;
  summary: string;
  strengths: string;
  risks: string;
  countermeasures: string;
  isSelected: boolean;
}

export interface CertRequirement {
  id: string;
  projectId: string;
  market: string;
  certName: string;
  deliverable: string;
  estimatedCost: number;
  sampleRequirement: string;
  notes?: string;
}

export type MILStatus = 'open' | 'in-progress' | 'resolved' | 'closed';
export type MILSeverity = 'A' | 'B' | 'C';

export interface MILEntry {
  id: string;
  projectId: string;
  issueId: string;              // 编号如 "MIL-001"
  title: string;
  description: string;
  severity: MILSeverity;        // A/B/C
  status: MILStatus;
  source: string;               // 发现来源：测试/评审/生产
  foundAt: string;              // 发现阶段
  responsible: string;          // 责任人
  deadline?: number;
  resolvedAt?: number;
  rootCause?: string;
  solution?: string;
  verifiedBy?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface WorkLogItem {
  text: string;
  done: boolean;
}

export interface WorkLogEntry {
  id: string;
  projectId: string;
  items: WorkLogItem[];
  createdAt: number;
  updatedAt: number;
}

export interface ProjectSnapshot {
  version: number;
  exportedAt: number;
  project: Project;
  milestones: Milestone[];
  tasks: Task[];
  meetings: Meeting[];
  retrospectives: Retrospective[];
  changeRecords: ChangeRecord[];
  bomItems: BomItem[];
  procurementCandidates: ProcurementCandidate[];
  certRequirements: CertRequirement[];
  milEntries: MILEntry[];
  workLogs: WorkLogEntry[];
}

// ===== Knowledge Graph Types =====

export type GraphEntityType = 'material' | 'supplier' | 'risk_type' | 'milestone' | 'project' | 'member' | 'concept' | 'category';

export type GraphRelationType = 'supplied_by' | 'belongs_to' | 'used_in' | 'has_risk' | 'alternative' | 'depends_on' | 'assigned_to' | 'has_image';

export type GraphSourceType = 'kb' | 'proj';

export interface GraphNode {
  id: string;            // {source}--{entityType}--{normalizedLabel}
  entityType: GraphEntityType;
  source: GraphSourceType;
  projectId?: string;    // only for proj source
  label: string;
  normalizedLabel: string;
  properties: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface GraphEdge {
  id: string;
  sourceId: string;      // GraphNode.id
  targetId: string;      // GraphNode.id
  relation: GraphRelationType;
  projectId?: string;    // which project this edge was extracted from
  weight: number;        // default 1
  properties: Record<string, unknown>;
  createdAt: number;
}

export interface GraphData {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  adjacencyList: Map<string, string[]>;  // nodeId → connected nodeIds
}

export interface ExtractionMeta {
  id: string;
  sourceId: string;      // projectId or 'kb-excel'
  sourceType: GraphSourceType;
  lastExtractedAt: number;
  lastSourceUpdatedAt: number;
  nodeCount: number;
  edgeCount: number;
}

export interface CrossProjectInsight {
  entityLabel: string;
  entityType: GraphEntityType;
  relatedProjects: string[];
  pattern: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface GraphContext {
  crossProjectEntities: {
    entityType: string;
    label: string;
    sourceProjectIds: string[];
    relevance: string;
  }[];
  relatedNodes: {
    nodeId: string;
    label: string;
    entityType: string;
    relation: string;
    distance: number;
  }[];
  summary: string;
}

export interface KbImageRecord {
  id: string;
  nodeId: string;
  base64: string;
  mimeType: string;
  createdAt: number;
}
