import type { Phase, ProjectMode, MilestoneType, MilestoneStatus, CriterionDef } from '@/types';

export interface PhaseDef {
  key: Phase;
  label: string;
  labelEn: string;
  order: number;
}

export const PHASES: PhaseDef[] = [
  { key: 'concept', label: '概念阶段', labelEn: 'Concept', order: 0 },
  { key: 'design', label: '设计阶段', labelEn: 'Design', order: 1 },
  { key: 'hms', label: 'HMS 手板阶段', labelEn: 'HMS', order: 2 },
  { key: 'evt', label: 'EVT 工程验证', labelEn: 'EVT', order: 3 },
  { key: 'dvt', label: 'DVT 设计验证', labelEn: 'DVT', order: 4 },
  { key: 'pvt', label: 'PVT 生产验证', labelEn: 'PVT', order: 5 },
  { key: 'mp', label: 'MP 量产', labelEn: 'MP', order: 6 },
];

export interface MilestoneDef {
  name: string;
  type: MilestoneType;
  entryCriteria: CriterionDef[];
  exitCriteria: CriterionDef[];
}

export const MILESTONE_DEFS: Record<string, MilestoneDef> = {
  TR1: {
    name: 'TR1 概念设计交互评审',
    type: 'tr',
    entryCriteria: [
      { text: 'PRD 初版完成', type: 'link' },
      { text: 'ID 设计草图完成', type: 'link' },
      { text: '关键技术可行性分析完成', type: 'manual' },
    ],
    exitCriteria: [
      { text: '评审投票通过', type: 'manual' },
      { text: '问题记录并分配责任人', type: 'manual' },
    ],
  },
  CDCP: {
    name: 'CDCP 概念决策评审',
    type: 'dcp',
    entryCriteria: [
      { text: 'TR1 通过', type: 'auto_milestone', dependsOn: 'TR1' },
      { text: '初始 BOM 清单', type: 'link' },
      { text: '成本测算初版', type: 'link' },
      { text: '产品质量策划完成', type: 'manual' },
    ],
    exitCriteria: [
      { text: 'CDCP 评审通过', type: 'manual' },
      { text: '项目正式立项', type: 'manual' },
    ],
  },
  TR2: {
    name: 'TR2 设计评审',
    type: 'tr',
    entryCriteria: [
      { text: '结构 3D 图完成', type: 'link' },
      { text: '硬件原理图/PCB 完成', type: 'link' },
      { text: '软件/算法方案设计完成', type: 'manual' },
    ],
    exitCriteria: [
      { text: '评审投票通过', type: 'manual' },
      { text: '设计方案锁定', type: 'manual' },
    ],
  },
  HMS: {
    name: 'HMS 手板样机',
    type: 'phase-gate',
    entryCriteria: [
      { text: 'TR2 通过', type: 'auto_milestone', dependsOn: 'TR2' },
      { text: '手板样机报价/审核完成', type: 'link' },
      { text: 'HMS 数量规划确认', type: 'manual' },
    ],
    exitCriteria: [
      { text: '手板样机评审通过', type: 'manual' },
      { text: '结构/电子问题清单关闭', type: 'manual' },
    ],
  },
  TR3: {
    name: 'TR3 手板评审',
    type: 'tr',
    entryCriteria: [
      { text: 'HMS1 样机组装完成', type: 'manual' },
      { text: '软件/算法 DEMO 可演示', type: 'manual' },
      { text: '工艺制程流程图输出', type: 'link' },
    ],
    exitCriteria: [
      { text: '评审投票通过', type: 'manual' },
      { text: '开模前问题全部关闭', type: 'manual' },
    ],
  },
  PDCP: {
    name: 'PDCP 计划决策评审',
    type: 'dcp',
    entryCriteria: [
      { text: 'TR3 通过', type: 'auto_milestone', dependsOn: 'TR3' },
      { text: '模具方案确认', type: 'manual' },
      { text: '专利检索报告', type: 'link' },
      { text: '项目计划书更新', type: 'link' },
      { text: '目标成本锁定', type: 'manual' },
    ],
    exitCriteria: [
      { text: 'PDCP 评审通过', type: 'manual' },
      { text: '进入 EVT 阶段', type: 'manual' },
    ],
  },
  EVT: {
    name: 'EVT 工程验证测试',
    type: 'phase-gate',
    entryCriteria: [
      { text: 'PDCP 通过', type: 'auto_milestone', dependsOn: 'PDCP' },
      { text: 'T0 模具完成', type: 'manual' },
      { text: 'EVT 样机投产物料齐套', type: 'manual' },
    ],
    exitCriteria: [
      { text: 'EVT 样机组装完成', type: 'manual' },
      { text: '功能测试通过', type: 'manual' },
      { text: 'MIL 问题 A=0 B≤3 C≤5', type: 'manual' },
    ],
  },
  TR4: {
    name: 'TR4 EVT 评审',
    type: 'tr',
    entryCriteria: [
      { text: 'EVT 样机完成', type: 'manual' },
      { text: '包装结构验证', type: 'manual' },
      { text: 'MIL 问题跟踪', type: 'manual' },
    ],
    exitCriteria: [
      { text: '评审投票通过', type: 'manual' },
      { text: 'A类缺陷=0, B类≤3, C类≤5', type: 'manual' },
    ],
  },
  DVT: {
    name: 'DVT 设计验证测试',
    type: 'phase-gate',
    entryCriteria: [
      { text: 'TR4 通过', type: 'auto_milestone', dependsOn: 'TR4' },
      { text: 'T1 模具完成', type: 'manual' },
      { text: 'DVT 样机物料齐套', type: 'manual' },
    ],
    exitCriteria: [
      { text: 'DVT 样机完成', type: 'manual' },
      { text: '工艺覆盖率≥90%', type: 'manual' },
      { text: 'MIL 问题 A=0 B≤1 C≤5', type: 'manual' },
    ],
  },
  TR5: {
    name: 'TR5 DVT 评审',
    type: 'tr',
    entryCriteria: [
      { text: 'DVT 样机完成', type: 'manual' },
      { text: '产线验证完成', type: 'manual' },
      { text: '产线良率≥85%', type: 'manual' },
    ],
    exitCriteria: [
      { text: '评审投票通过', type: 'manual' },
      { text: 'A类缺陷=0, B类≤1, C类≤5, 产线良率≥85%', type: 'manual' },
    ],
  },
  ADCP1: {
    name: 'ADCP1 可获得性决策评审',
    type: 'dcp',
    entryCriteria: [
      { text: 'TR5 通过', type: 'auto_milestone', dependsOn: 'TR5' },
      { text: '供应计划确认', type: 'manual' },
      { text: '首单预测', type: 'link' },
      { text: '售后方案', type: 'link' },
      { text: '营销方案', type: 'link' },
    ],
    exitCriteria: [
      { text: 'ADCP1 评审通过', type: 'manual' },
      { text: '进入 PVT 阶段', type: 'manual' },
    ],
  },
  PVT: {
    name: 'PVT 生产验证测试',
    type: 'phase-gate',
    entryCriteria: [
      { text: 'ADCP1 通过', type: 'auto_milestone', dependsOn: 'ADCP1' },
      { text: '量产模具完成', type: 'manual' },
      { text: '产线准备就绪', type: 'manual' },
    ],
    exitCriteria: [
      { text: 'PVT 完成', type: 'manual' },
      { text: 'MIL 全部关闭', type: 'manual' },
      { text: '工艺覆盖率 100%', type: 'manual' },
      { text: 'A=0 B=0 C≤3 产线良率≥90%', type: 'manual' },
    ],
  },
  MP: {
    name: 'MP 量产',
    type: 'production',
    entryCriteria: [
      { text: 'PVT 通过', type: 'auto_milestone', dependsOn: 'PVT' },
      { text: '物料齐套', type: 'manual' },
      { text: '爬坡计划确认', type: 'manual' },
    ],
    exitCriteria: [
      { text: '首批大货交付', type: 'manual' },
      { text: '量产良率≥95%', type: 'manual' },
      { text: '验货合格率≥95%', type: 'manual' },
    ],
  },
};

export const MILESTONE_ORDER: string[] = [
  'TR1', 'CDCP', 'TR2', 'HMS', 'TR3', 'PDCP',
  'EVT', 'TR4', 'DVT', 'TR5', 'ADCP1', 'PVT', 'MP',
];

export function getDefaultMilestones(projectId: string, plannedStartDate: number): Array<{
  name: string;
  type: MilestoneType;
  order: number;
  plannedDate: number;
  status: MilestoneStatus;
  entryCriteria: string[];
  exitCriteria: string[];
  projectId: string;
}> {
  return MILESTONE_ORDER.map((key, i) => {
    const def = MILESTONE_DEFS[key];
    const offsetDays = i * 30;
    const d = new Date(plannedStartDate);
    d.setDate(d.getDate() + offsetDays);
    return {
      name: def.name,
      type: def.type,
      order: i,
      plannedDate: d.getTime(),
      status: 'pending' as MilestoneStatus,
      entryCriteria: def.entryCriteria.map(c => c.text),
      exitCriteria: def.exitCriteria.map(c => c.text),
      projectId,
    };
  });
}

export function getPhaseForMilestone(order: number): Phase {
  if (order <= 1) return 'concept';
  if (order <= 2) return 'design';
  if (order <= 4) return 'hms';
  if (order <= 6) return 'evt';
  if (order <= 8) return 'dvt';
  if (order <= 10) return 'pvt';
  return 'mp';
}

export const PROJECT_MODE_LABELS: Record<ProjectMode, string> = {
  'odm': '外采',
  'oem': '合作研发',
  'self-develop': '自主研发',
  'expand': '拓展品',
};

export const PHASE_LABELS: Record<Phase, string> = {
  'concept': '概念阶段',
  'design': '设计阶段',
  'hms': 'HMS 手板阶段',
  'evt': 'EVT 工程验证',
  'dvt': 'DVT 设计验证',
  'pvt': 'PVT 生产验证',
  'mp': 'MP 量产',
};
