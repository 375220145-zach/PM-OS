import type { Project, Milestone, Task, MILEntry, Meeting, BomItem, ChangeRecord, CertRequirement, ProcurementCandidate, Retrospective, WorkLogEntry } from '@/types';

/* ============================================================
   Demo Projects
   demo-nano — Pocket Nano 掌上效果器（已归档）
   demo-miyavi — MIYAVI 联名款 3-in-1（进行中，真实数据脱敏）
   人员脱敏规则：三字姓名 → 姓XX，两字姓名 → 姓X
   ============================================================ */

const D = 86400000;
const NANO_BASE = Date.now() - 320 * D;  // Pocket Nano kickoff ~2025-07-29
const MIYAVI_BASE = Date.now() - 270 * D; // MIYAVI kickoff ~2025-09-11

const DEMO_PROJECTS: Project[] = [
  /* ============================================================
     demo-nano — Pocket Nano 掌上吉他效果器（已归档）
     周期：2025/7 → 2025/12
     ============================================================ */
  {
    id: 'demo-nano',
    name: 'Pocket Nano 掌上吉他效果器',
    brand: 'DONNER',
    productLine: '吉他效果器',
    mode: 'self-develop',
    status: 'archived',
    phase: 'evt',
    description: 'Pocket 系列首款自研迷你综合效果器。掌机形态，纯手操，不含踏板。复用 Pocket X 物料体系（屏幕 28×28mm）。项目推进至 EVT 阶段后终止。核心竞品：Sonicake Pocket Master。',
    goals: {
      costTarget: 120,
      qualityTargets: { massProductionYield: 0.93, inspectionPassRate: 0.95 },
      timelineTarget: 'EVT 阶段后终止',
    },
    members: [
      { name: '陈XX', role: '项目经理', estimatedHours: 400, actualHours: 380 },
      { name: '潘XX', role: '项目助理', estimatedHours: 200, actualHours: 220 },
      { name: '邹XX', role: 'ID设计师', estimatedHours: 180, actualHours: 200 },
      { name: '梅XX', role: '结构工程师', estimatedHours: 300, actualHours: 280 },
      { name: '廖XX', role: '硬件工程师', estimatedHours: 250, actualHours: 260 },
      { name: '邓X', role: '软件工程师', estimatedHours: 400, actualHours: 420 },
      { name: '何XX', role: '测试工程师', estimatedHours: 150, actualHours: 160 },
    ],
    budget: [
      { category: 'mold', name: '外壳模具', estimated: 35000, actual: 32000, phase: 'evt' },
      { category: 'mold', name: '硅胶按键模具', estimated: 8000, actual: 7500, phase: 'evt' },
      { category: 'sample', name: '手板打样', estimated: 10000, actual: 9000, phase: 'evt' },
      { category: 'labor', name: '人力成本', estimated: 280000, actual: 270000, phase: 'evt' },
      { category: 'cert', name: 'FCC/CE 认证', estimated: 20000, actual: 18000, phase: 'evt' },
    ],
    createdAt: NANO_BASE,
    updatedAt: NANO_BASE + 90 * D,
  },

  /* ============================================================
     demo-miyavi — MIYAVI 联名款 3-in-1 吉他效果器（进行中）
     周期：2025/9/11 → 2026/1/16，128 自然日
     指标：项目周期缩短 21%，整机成本偏差 1.93%-2.41%，MP 良率 92%+
     ============================================================ */
  {
    id: 'demo-miyavi',
    name: 'MIYAVI 联名款 3-in-1 吉他效果器',
    brand: 'DONNER',
    productLine: '吉他效果器',
    mode: 'odm',
    status: 'active',
    phase: 'mp',
    description: '与日本艺人 MIYAVI 联名开发 Double Swords 3-in-1 吉他效果器。项目中途从外采转为合作开发，项目团队中后期介入。红色/蓝色双 SKU + 限量套装款，含 MIYAVI 粉丝周边。预售 120 天最长交付周期，分 PVT/MP 两批出货。',
    goals: {
      costTarget: 380,
      qualityTargets: { massProductionYield: 0.92, inspectionPassRate: 0.95 },
      timelineTarget: '2026/1/16 MP 出货（含 NAMM Show 样机 + 日本公关样机 + 预售履约）',
      mpQuantity: 2000,
    },
    members: [
      { name: '潘XX', role: '项目经理', estimatedHours: 500, actualHours: 420 },
      { name: '郑X', role: '品质工程师', estimatedHours: 450, actualHours: 400 },
      { name: '古XX', role: '产品经理', estimatedHours: 200, actualHours: 230 },
      { name: '梅XX', role: '结构工程师', estimatedHours: 350, actualHours: 340 },
      { name: '廖XX', role: '硬件工程师', estimatedHours: 300, actualHours: 310 },
      { name: '邹XX', role: 'ID设计师', estimatedHours: 150, actualHours: 140 },
      { name: '何XX', role: '测试工程师', estimatedHours: 180, actualHours: 200 },
      { name: '林XX', role: '认证工程师', estimatedHours: 80, actualHours: 75 },
      { name: '品牌部', role: '品牌对接+包装设计', estimatedHours: 120, actualHours: 150 },
    ],
    budget: [
      { category: 'mold', name: '外壳模具（上下壳）', estimated: 28000, actual: 28000, phase: 'mp' },
      { category: 'mold', name: '水贴模具', estimated: 3500, actual: 3200, phase: 'mp' },
      { category: 'sample', name: 'EVT/DVT 打样', estimated: 15000, actual: 12000, phase: 'mp' },
      { category: 'labor', name: '人力成本', estimated: 350000, actual: 340000, phase: 'mp' },
      { category: 'cert', name: 'FCC/CE/EMC 认证', estimated: 25000, actual: 20000, phase: 'mp' },
      { category: 'patent', name: '联名授权费', estimated: 100000, actual: 100000, phase: 'mp' },
      { category: 'travel', name: '工厂差旅', estimated: 8000, actual: 6000, phase: 'mp' },
    ],
    createdAt: MIYAVI_BASE,
    updatedAt: MIYAVI_BASE + 128 * D,
  },
];

/* ============================================================
   Milestones
   ============================================================ */

function miyaviMs(name: string, type: Milestone['type'], order: number, daysFrom: number, actualDays?: number): Milestone {
  return {
    id: `demo-miyavi-ms-${order}`, projectId: 'demo-miyavi',
    name, type, order,
    plannedDate: MIYAVI_BASE + daysFrom * D,
    actualDate: actualDays ? MIYAVI_BASE + actualDays * D : MIYAVI_BASE + daysFrom * D,
    status: 'completed',
  };
}

function nanoMs(name: string, type: Milestone['type'], order: number, daysFrom: number, actualDays?: number): Milestone {
  return {
    id: `demo-nano-ms-${order}`, projectId: 'demo-nano',
    name, type, order,
    plannedDate: NANO_BASE + daysFrom * D,
    actualDate: actualDays ? NANO_BASE + actualDays * D : NANO_BASE + daysFrom * D,
    status: 'completed',
  };
}

const DEMO_MILESTONES: Milestone[] = [
  /* Pocket Nano */
  nanoMs('TR1 概念评审', 'tr', 0, 16),
  nanoMs('CDCP 概念决策', 'dcp', 1, 21),
  nanoMs('TR2 设计评审', 'tr', 2, 35),
  nanoMs('HMS 手板', 'phase-gate', 3, 49),
  nanoMs('TR3 手板评审', 'tr', 4, 51),
  nanoMs('PDCP 产品决策', 'dcp', 5, 60),
  nanoMs('EVT 工程验证', 'phase-gate', 6, 74, 90),

  /* MIYAVI */
  miyaviMs('TR1 概念评审', 'tr', 0, 0),
  miyaviMs('CDCP 概念决策', 'dcp', 1, 9, 10),
  miyaviMs('TR2 设计评审', 'tr', 2, 21, 22),
  miyaviMs('HMS 手板', 'phase-gate', 3, 29, 31),
  miyaviMs('TR3 手板评审', 'tr', 4, 34),
  miyaviMs('PDCP 产品决策', 'dcp', 5, 41, 43),
  miyaviMs('EVT 工程验证', 'phase-gate', 6, 46, 48),
  miyaviMs('TR4 设计验证评审', 'tr', 7, 55),
  miyaviMs('DVT 设计验证', 'phase-gate', 8, 62, 65),
  miyaviMs('TR5 量产就绪评审', 'tr', 9, 70, 72),
  miyaviMs('ADCP1 量产决策', 'dcp', 10, 82, 84),
  miyaviMs('PVT 试产', 'phase-gate', 11, 108, 110),
  miyaviMs('MP 量产', 'production', 12, 128, 128),
];

/* ============================================================
   Tasks
   ============================================================ */

function nanoTask(id: string, phase: string, name: string, assignee: string, daysFrom: number, daysTo: number, priority: Task['priority'], deliverable?: string, deps?: string[]): Task {
  return {
    id: `demo-nano-t-${id}`, projectId: 'demo-nano',
    phase: phase as Task['phase'], name, assignee, deliverable,
    startDate: NANO_BASE + daysFrom * D,
    endDate: NANO_BASE + daysTo * D,
    status: 'done', priority, risk: 'none',
    dependencies: deps?.map(d => `demo-nano-t-${d}`) ?? [],
    source: 'manual' as const, tags: [phase],
  };
}

function miyaviTask(id: string, phase: string, name: string, assignee: string, daysFrom: number, daysTo: number, priority: Task['priority'], deliverable?: string, deps?: string[]): Task {
  return {
    id: `demo-miyavi-t-${id}`, projectId: 'demo-miyavi',
    phase: phase as Task['phase'], name, assignee, deliverable,
    startDate: MIYAVI_BASE + daysFrom * D,
    endDate: MIYAVI_BASE + daysTo * D,
    status: 'done', priority, risk: 'none',
    dependencies: deps?.map(d => `demo-miyavi-t-${d}`) ?? [],
    source: 'manual' as const, tags: [phase],
  };
}

const DEMO_TASKS: Task[] = [
  /* === Pocket Nano WBS 任务 === */
  nanoTask('id-review', 'concept', 'ID 二次评审', '邹XX', 0, 7, 'P0', 'ID 评审记录'),
  nanoTask('3d-update', 'concept', '结构 3D 图更新', '梅XX', 7, 21, 'P0', '3D 图纸', ['id-review']),
  nanoTask('pcb-sch', 'concept', 'PCB 原理图', '廖XX', 7, 14, 'P0', '原理图'),
  nanoTask('tr1', 'concept', 'TR1 概念评审', '陈XX', 21, 37, 'P0', 'TR1 评审材料', ['3d-update']),
  nanoTask('cdcp', 'concept', 'CDCP 概念决策评审', '陈XX', 37, 42, 'P0', 'CDCP 材料', ['tr1']),
  nanoTask('pcb-layout', 'design', 'PCB Layout', '廖XX', 42, 56, 'P0', 'PCB Layout 文件', ['cdcp']),
  nanoTask('hand-board-quote', 'design', '手板样机报价', '梅XX', 21, 35, 'P1', '报价单', ['3d-update']),
  nanoTask('hand-board-build', 'hms', '手板样机制作 HMC1', '梅XX', 56, 70, 'P0', '手板样机', ['pcb-layout']),
  nanoTask('hand-board-assemble', 'hms', '手板样机组装', '梅XX', 70, 72, 'P0', '组装样机', ['hand-board-build']),
  nanoTask('structure-fix', 'evt', '结构修改', '梅XX', 72, 90, 'P0', '结构修改方案', ['hand-board-assemble']),
  nanoTask('electronics-fix', 'evt', '电子修改', '廖XX', 72, 90, 'P0', '电子修改方案', ['hand-board-assemble']),
  nanoTask('hand-board-review', 'evt', '手板样机评审', '陈XX', 90, 91, 'P0', '评审记录', ['structure-fix', 'electronics-fix']),

  /* === MIYAVI WBS 任务 === */
  miyaviTask('mold', 'concept', '模具排期（含工厂国庆6天假）', '郑X', 8, 36, 'P0', '模具排期表'),
  miyaviTask('color-confirm', 'design', '艺人确认产品颜色', '品牌部', 13, 36, 'P0', '颜色签样确认单', ['mold']),
  miyaviTask('pkg-confirm', 'design', '艺人确认包装颜色', '品牌部', 33, 44, 'P1', '包装签样确认单', ['color-confirm']),
  miyaviTask('t0-trial', 'hms', 'T0 试模及相关物料收回', '郑X', 36, 41, 'P0', 'T0 样件报告', ['mold']),
  miyaviTask('evt1-build', 'evt', 'EVT1/DVT1 样机组装', '梅XX', 41, 46, 'P0', '组装样机 4 台', ['t0-trial']),
  miyaviTask('test-reliability', 'evt', '研发可靠性测试（12 台）', '何XX', 41, 51, 'P0', '可靠性测试报告', ['evt1-build']),
  miyaviTask('pkg-sample', 'evt', '确认后包装打样', '邹XX', 44, 58, 'P1', '包装数码样', ['pkg-confirm']),
  miyaviTask('mold-fix', 'dvt', '修模改模', '梅XX', 46, 53, 'P0', '修模方案确认', ['evt1-build']),
  miyaviTask('t1-reclaim', 'dvt', 'T1 相关物料收回', '郑X', 53, 58, 'P0', 'T1 样件报告', ['mold-fix']),
  miyaviTask('evt2-build', 'dvt', 'EVT2/DVT2 样机组装', '梅XX', 58, 63, 'P0', '组装样机 4 台', ['t1-reclaim']),
  miyaviTask('test-fix-retry', 'dvt', '某项测试不通过整改（分析3d+备料7d+打样10d）', '何XX', 51, 71, 'P0', '整改方案+复测报告', ['test-reliability']),
  miyaviTask('structure-review', 'dvt', '结构评审', '梅XX', 63, 64, 'P1', '结构评审记录', ['evt2-build']),
  miyaviTask('pkg-signoff', 'dvt', '包装签样', '邹XX', 58, 68, 'P1', '签样包装', ['pkg-sample']),
  miyaviTask('artist-accept', 'dvt', '艺人验收改善后外观功能（2台）', '潘XX', 64, 71, 'P0', '艺人验收签样', ['structure-review']),
  miyaviTask('pcb-issue-fix', 'pvt', 'PCB 量产阶段新出问题修复', '廖XX', 44, 58, 'P1', 'PCB 问题报告+方案'),
  miyaviTask('rework-retest', 'pvt', '整改后再测试', '何XX', 71, 74, 'P0', '整改后测试报告', ['test-fix-retry']),
  miyaviTask('final-accept', 'pvt', '产品最终验收（外观+功能 4台）', '潘XX', 41, 42, 'P0', '验收报告'),
  miyaviTask('ship-namm', 'mp', 'NAMM Show + 日本公关样机出货', '潘XX', 120, 126, 'P0', '出货检查清单'),

  /* === Dashboard demo: tasks with live dates for chart visibility === */
  // Overdue tasks (various aging buckets)
  miyaviTask('q3-report', 'mp', 'Q3 量产良率报告', '何XX', 130, 140, 'P0', '良率分析报告'),
  miyaviTask('pkg-v2', 'mp', '包装 V2 版打样', '邹XX', 130, 142, 'P1', '包装 V2 数码样'),
  miyaviTask('supplier-audit', 'mp', '注塑供应商年度审核', '郑X', 130, 145, 'P1', '供应商审核报告'),
  miyaviTask('cert-renewal', 'mp', 'FCC 认证年审', '廖XX', 130, 138, 'P0', 'FCC 年审材料'),
  miyaviTask('firmware-ota', 'mp', '固件 OTA 升级方案', '廖XX', 130, 150, 'P2', 'OTA 升级方案文档'),

  // Tasks due this week
  miyaviTask('weekly-report', 'mp', '本周量产周报', '潘XX', 130, 145, 'P1', '周报'),
  miyaviTask('sample-ship', 'mp', '客户样品发货确认', '郑X', 130, 142, 'P0', '发货确认单'),

  // Tasks due in 7-14 days
  miyaviTask('next-batch', 'mp', '下一批次排产计划', '梅XX', 130, 145, 'P1', '排产计划表'),
  miyaviTask('quality-review', 'mp', '品质月度复盘', '陈XX', 130, 145, 'P0', '品质复盘报告'),
];

// Override task dates to be relative to today for live dashboard demo
function patchDashboardDemoDates(tasks: Task[]): Task[] {
  const D = 86400000;
  const now = Date.now();
  const today = new Date(); today.setHours(0, 0, 0, 0); const T = today.getTime();
  const overrides: Record<string, { endDate: number; startDate: number; status: Task['status'] }> = {
    'demo-miyavi-t-q3-report':     { endDate: T - 12*D, startDate: T - 30*D, status: 'todo' },
    'demo-miyavi-t-pkg-v2':        { endDate: T - 5*D,  startDate: T - 20*D, status: 'in-progress' },
    'demo-miyavi-t-supplier-audit':{ endDate: T - 2*D,  startDate: T - 21*D, status: 'todo' },
    'demo-miyavi-t-cert-renewal':  { endDate: T - 18*D, startDate: T - 35*D, status: 'in-progress' },
    'demo-miyavi-t-firmware-ota':  { endDate: T - 1*D,  startDate: T - 14*D, status: 'todo' },
    'demo-miyavi-t-weekly-report': { endDate: T + 1*D,  startDate: T - 7*D,  status: 'todo' },
    'demo-miyavi-t-sample-ship':   { endDate: T + 2*D,  startDate: T - 5*D,  status: 'in-progress' },
    'demo-miyavi-t-next-batch':    { endDate: T + 8*D,  startDate: T + 1*D,  status: 'todo' },
    'demo-miyavi-t-quality-review':{ endDate: T + 10*D, startDate: T + 3*D,  status: 'todo' },
  };
  return tasks.map(t => {
    const ov = overrides[t.id];
    if (ov) return { ...t, endDate: ov.endDate, startDate: ov.startDate, status: ov.status };
    return t;
  });
}

function patchDashboardDemoMilestones(ms: Milestone[]): Milestone[] {
  const D = 86400000;
  const today = new Date(); today.setHours(0, 0, 0, 0); const T = today.getTime();
  const overrides: Record<string, number> = {
    'demo-miyavi-ms-11': T + 3*D,   // PVT 试产 → 3 days from now
    'demo-miyavi-ms-12': T - 1*D,   // MP 量产 → yesterday (delayed)
  };
  return ms.map(m => {
    const pd = overrides[m.id];
    if (pd !== undefined) {
      const isDelayed = pd < T;
      return { ...m, plannedDate: pd, status: isDelayed ? 'delayed' as const : 'pending' as const };
    }
    return m;
  });
}

/* ============================================================
   MIL Entries
   ============================================================ */

const DEMO_MILS: MILEntry[] = [
  /* Pocket Nano */
  {
    id: 'demo-nano-mil-1', projectId: 'demo-nano', issueId: 'NANO-001',
    title: '整机厚度无法支撑两个 6.35 耳机孔',
    description: '初始 ID 方案整机过薄（上 24mm 下 20mm），两个 6.35 接口无法垂直放置。解决方案：6.35 孔改至两侧，PCB 与屏幕错落叠放。',
    severity: 'A', status: 'resolved',
    source: 'ID评审', foundAt: '概念阶段',
    responsible: '邹XX',
    resolvedAt: NANO_BASE + 14 * D,
    rootCause: 'ID 初期未充分对齐 PCB 厚度与 6.35 接口物理尺寸',
    solution: '6.35 孔移至机身两侧，加宽整机，PCB 与屏幕错落排列',
    tags: ['ID', '结构'],
    createdAt: NANO_BASE + 0 * D,
    updatedAt: NANO_BASE + 14 * D,
  },
  {
    id: 'demo-nano-mil-2', projectId: 'demo-nano', issueId: 'NANO-002',
    title: '屏幕黑边过大影响美观',
    description: '复用 Pocket X 的 28×28mm 屏幕，黑边比例偏大，与竞品 Sonicake Pocket Master 对比存在视觉劣势。',
    severity: 'B', status: 'resolved',
    source: 'ID评审', foundAt: '概念阶段',
    responsible: '邹XX',
    resolvedAt: NANO_BASE + 7 * D,
    rootCause: '复用物料与新产品 ID 定位不匹配',
    solution: '调整屏幕周边装饰框设计，视觉上缩小黑边占比',
    tags: ['ID', '屏幕'],
    createdAt: NANO_BASE + 0 * D,
    updatedAt: NANO_BASE + 7 * D,
  },

  /* MIYAVI */
  {
    id: 'demo-miyavi-mil-1', projectId: 'demo-miyavi', issueId: 'MIYAVI-001',
    title: 'Booster-Output 旋钮噪声',
    description: '红色款效果器 booster-output 旋钮旋转时出现噪声。根因：初始电路线路设计问题，后续改动旋钮和电路时未检测到。整改方案：去除电路板中两个电阻完成返工，整改周期 3 天。',
    severity: 'A', status: 'resolved',
    source: '测试', foundAt: 'PVT',
    responsible: '廖XX',
    resolvedAt: MIYAVI_BASE + 118 * D,
    rootCause: '初始电路线路设计缺陷，改动后未做全功能回归测试',
    solution: '去除特定电阻，基于产品经理最低可接受效果出货',
    tags: ['电路', '噪声'],
    createdAt: MIYAVI_BASE + 113 * D, updatedAt: MIYAVI_BASE + 118 * D,
  },
  {
    id: 'demo-miyavi-mil-2', projectId: 'demo-miyavi', issueId: 'MIYAVI-002',
    title: '蓝色款外壳色差与签样不符',
    description: '大货蓝色款外壳与上次签样存在肉眼可见色差。需重新对色后生产。',
    severity: 'B', status: 'resolved',
    source: '品质', foundAt: 'PVT',
    responsible: '邹XX',
    resolvedAt: MIYAVI_BASE + 120 * D,
    rootCause: '氧化厂颜色管控批次间差异',
    solution: '现场对色确认后继续生产',
    tags: ['外观', '氧化'],
    createdAt: MIYAVI_BASE + 115 * D, updatedAt: MIYAVI_BASE + 120 * D,
  },
  {
    id: 'demo-miyavi-mil-3', projectId: 'demo-miyavi', issueId: 'MIYAVI-003',
    title: '水贴厂产能不足导致出货延期',
    description: '水贴供应商产能不足，红色款完成后蓝色款延迟至 1/7 开始组装，1/10 完成。',
    severity: 'B', status: 'resolved',
    source: '采购', foundAt: 'PVT',
    responsible: '郑X',
    resolvedAt: MIYAVI_BASE + 121 * D,
    rootCause: '水贴厂同时供应多项目，产能排产冲突',
    solution: '红色款优先出货满足预售；蓝色款分批发货',
    tags: ['供应链', '产能'],
    createdAt: MIYAVI_BASE + 115 * D, updatedAt: MIYAVI_BASE + 121 * D,
  },
  {
    id: 'demo-miyavi-mil-4', projectId: 'demo-miyavi', issueId: 'MIYAVI-004',
    title: '预售发布节点过早',
    description: '项目于 2025/10/24（DVT 阶段前）即发布预售信息。此时量产供应商尚未完成首次整机打样验证签样，功能/结构/外观均未锁定。后续 ECN 变更导致交付周期紧张。',
    severity: 'A', status: 'resolved',
    source: '品牌', foundAt: 'DVT',
    responsible: '潘XX',
    resolvedAt: MIYAVI_BASE + 110 * D,
    rootCause: '品牌/GTM 需求与研发实际进度未同步',
    solution: '制定规则：预售发布节点至少应在 DVT 确认（量产供应商整机签样锁板）后，PVT 前进行',
    tags: ['流程', '预售', 'ECN'],
    createdAt: MIYAVI_BASE + 43 * D, updatedAt: MIYAVI_BASE + 110 * D,
  },
  {
    id: 'demo-miyavi-mil-5', projectId: 'demo-miyavi', issueId: 'MIYAVI-005',
    title: '套装款彩盒量产与签样不一致',
    description: '彩盒量产印色与签样颜色偏差，需重新确认可接受标准。',
    severity: 'C', status: 'resolved',
    source: '品质', foundAt: 'PVT',
    responsible: '邹XX',
    resolvedAt: MIYAVI_BASE + 118 * D,
    tags: ['包装', '签样'],
    createdAt: MIYAVI_BASE + 114 * D, updatedAt: MIYAVI_BASE + 118 * D,
  },
  {
    id: 'demo-miyavi-mil-6', projectId: 'demo-miyavi', issueId: 'MIYAVI-006',
    title: '测试需求未与产品经理对齐',
    description: '样品测试过程中某项测试不通过，但产品经理对该项测试需求不知情。后续发现该项测试实际不做强制要求，浪费约 10 天整改时间。',
    severity: 'C', status: 'resolved',
    source: '测试', foundAt: 'DVT',
    responsible: '何XX',
    resolvedAt: MIYAVI_BASE + 65 * D,
    rootCause: '测试需求清单未在测试开始前与产品经理确认',
    solution: '测试需求在测试开始前与产品经理核对是否有遗漏或多余的强制项',
    tags: ['测试', '需求对齐'],
    createdAt: MIYAVI_BASE + 51 * D, updatedAt: MIYAVI_BASE + 65 * D,
  },
];

/* ============================================================
   Meetings
   ============================================================ */

const DEMO_MEETINGS: Meeting[] = [
  /* Pocket Nano — 启动会 */
  {
    id: 'demo-meet-nano-1', projectId: 'demo-nano',
    title: 'Pocket Nano 项目启动 & ID 评审',
    date: NANO_BASE,
    attendees: ['陈XX', '潘XX', '邹XX', '梅XX', '廖XX'],
    transcript: `掌机/游戏机小综合，踏板不可以外接，纯手操。Pocket 系列：Pocket X 已上架，Pocket Go 正在走，两款均为贴牌。与声科产品冲突，后面把 Pocket 系列转过来自研。谈合作开发模式：我们出 UI、ID，他们完善。外观先去申请专利。

ID 评审：
- 屏幕尺寸 28×28mm，复用 Pocket X 物料
- 整机厚度上 24mm 下 20mm，可能无法支撑上端两个 6.35 孔，整机需加宽
- 考虑做磁吸背贴（参考 Sonicake Pocket Master）
- 6.35 孔建议调两侧，PCB 与屏幕错落放
- 考虑是否做配重`,
    summary: '确认 Pocket Nano 自研方向。ID 需调整：6.35 孔改两侧，整机加宽，屏幕错落排列。外观先申请专利。',
    actionItems: [
      { id: 'demo-ai-nano-1', meetingId: 'demo-meet-nano-1', content: '外观专利申请', owner: '陈XX', deadline: NANO_BASE + 14 * D, priority: 'P0', risk: 'medium', status: 'confirmed' },
      { id: 'demo-ai-nano-2', meetingId: 'demo-meet-nano-1', content: 'ID 方案调整（6.35 孔改两侧 + 加宽整机）', owner: '邹XX', deadline: NANO_BASE + 7 * D, priority: 'P0', risk: 'medium', status: 'confirmed' },
    ],
    decisions: ['Pocket 系列转自研', '合作开发模式（我方出 UI/ID）', '外观先申请专利'],
    status: 'completed',
  },

  /* MIYAVI 会议 */
  {
    id: 'demo-meet-miyavi-1', projectId: 'demo-miyavi',
    title: 'MIYAVI 联名款合作开发启动会',
    date: MIYAVI_BASE,
    attendees: ['潘XX', '郑X', '古XX', '品牌部', '研发部'],
    transcript: `项目背景：MIYAVI 与 DONNER 拟出三款联名款效果器，3 个 SKU（红、蓝、红蓝套装款）。该项目与供应商 A 进行合作开发，目前处于 EVT 功能板验收阶段，准备投模。产品不带电，无蓝牙。原预估上市时间 11 月底，品牌方希望提拉到 10/25。

讨论要点：
1. 研发需配合对接合作开发商，保证产品通过 ESD 等测试
2. 需整合输出给研发：PRD、模具图纸、ID/结构图、BOM 及成本、包装方案
3. EVT 与 DVT 样机合并进行——开模阶段研发前置内部测试
4. ID/结构已跑完，精制手板预计 9/18 给艺人确认
5. 包装设计、配件已明确，包装打样中

风险点：艺人验收不一定一次通过，存在多轮反馈的可能`,
    summary: '确认合作开发模式，EVT/DVT 合并推进，精制手板 9/18 给艺人。风险：艺人验收多轮反馈。',
    actionItems: [
      { id: 'demo-ai-miyavi-1', meetingId: 'demo-meet-miyavi-1', content: '整合输出 PRD、模具图纸、ID结构图、BOM、成本、包装方案', owner: '古XX', deadline: MIYAVI_BASE + 5 * D, priority: 'P0', risk: 'medium', status: 'confirmed' },
      { id: 'demo-ai-miyavi-2', meetingId: 'demo-meet-miyavi-1', content: '研发前置内部测试（板子 15 号到，21 号给测试）', owner: '研发部', deadline: MIYAVI_BASE + 10 * D, priority: 'P0', risk: 'medium', status: 'confirmed' },
    ],
    decisions: ['EVT/DVT 样机合并推进', '精制手板 9/18 给艺人确认', '包装打样已启动'],
    status: 'completed',
  },
  {
    id: 'demo-meet-miyavi-2', projectId: 'demo-miyavi',
    title: 'TR5 前沟通 — 结构/硬件/品质/认证进度',
    date: MIYAVI_BASE + 70 * D,
    attendees: ['潘XX', '郑X', '梅XX', '廖XX', '何XX'],
    transcript: `结构：可先做整体铝料准备，上壳型材先安排首批数量，下壳需等预计周四的跌落测试通过后才可得出备料结论。
硬件：功能方面无问题，红色款底部拨档开关偏位问题需有解决方案后才可进行备料。
品质：TR5 前需要提供红蓝至少各一台最终完整样机。
认证：EMC 测试通过，剩余认证预计 18 天出结果。`,
    summary: '结构可先备料上壳，下壳等跌落测试。硬件拨档偏位需解决。品质需最终完整样机。EMC 已通过。',
    actionItems: [
      { id: 'demo-ai-miyavi-3', meetingId: 'demo-meet-miyavi-2', content: '完成跌落测试并给出下壳备料结论', owner: '梅XX', deadline: MIYAVI_BASE + 74 * D, priority: 'P0', risk: 'medium', status: 'confirmed' },
      { id: 'demo-ai-miyavi-4', meetingId: 'demo-meet-miyavi-2', content: '解决红色款拨档开关偏位问题', owner: '廖XX', deadline: MIYAVI_BASE + 76 * D, priority: 'P1', risk: 'low', status: 'confirmed' },
    ],
    decisions: ['上壳铝料可先备料', '等跌落测试后再备下壳', '拨档开关偏位需方案后再备料'],
    status: 'completed',
  },
  {
    id: 'demo-meet-miyavi-3', projectId: 'demo-miyavi',
    title: 'MIYAVI 艺人进度同步 — FUZZ 音量争议',
    date: MIYAVI_BASE + 62 * D,
    attendees: ['潘XX', '古XX', '廖XX', '艺人团队（远程）'],
    transcript: `进度：
- FUZZ 已解决：原型音量比例不平均问题已解决，DS FUZZ 模块 dB 大于原型
- Overdrive 的音量无法与 FUZZ 一致，本身特性所决定

艺人反馈：Drive 本身未提出问题，无需修改。FUZZ 想要 +3-4dB。

技术回复：如果 FUZZ 再增加 3-4dB，Gate 会压不住，声音摇摆。三个效果同在机器上，差值只能尽量缩小，已做到最尽。

艺人结论：FUZZ 低于 Overdrive 不是常见操作，但在同一效果器上有细微差别是可接受的。海南测试需带上改善前后版本。`,
    summary: 'FUZZ 音量问题已解决到技术极限，艺人接受现状。',
    actionItems: [
      { id: 'demo-ai-miyavi-5', meetingId: 'demo-meet-miyavi-3', content: '准备改善前后版本样机供海南测试', owner: '郑X', deadline: MIYAVI_BASE + 70 * D, priority: 'P0', risk: 'medium', status: 'confirmed' },
    ],
    decisions: ['FUZZ 保持当前状态', '艺人已确认功能签样', '海南测试带改善前后版本'],
    status: 'completed',
  },
  {
    id: 'demo-meet-miyavi-4', projectId: 'demo-miyavi',
    title: '量产出货前问题跟进 — NAMM Show + 预售履约',
    date: MIYAVI_BASE + 116 * D,
    attendees: ['潘XX', '郑X', '古XX', '廖XX', '何XX'],
    transcript: `1. 已确认整改方案：主 PCB 电路板上去除特定电阻完成返工，红色款已全部按此方式完成
2. 出货以产品经理最低可接受效果作为对照标准，工厂全检挑选后出货
3. NAMM Show & 日本公关样机：1/12 去工厂人手带回（套装款 2 套，红蓝各 3 套）
4. 出货时间：套装款 1/16，蓝色款 1/14，红色款 1/16
5. 出货数量：待 1/9-1/10 工厂完成全检后确认`,
    summary: '红色款整改已完成。NAMM/公关样机 1/12 带回。量产 1/14-1/16 分批出货。',
    actionItems: [
      { id: 'demo-ai-miyavi-6', meetingId: 'demo-meet-miyavi-4', content: '1/12 工厂带回 NAMM + 公关样机', owner: '潘XX', deadline: MIYAVI_BASE + 120 * D, priority: 'P0', risk: 'high', status: 'confirmed' },
      { id: 'demo-ai-miyavi-7', meetingId: 'demo-meet-miyavi-4', content: '1/9-1/10 工厂完成全检确认可出货数量', owner: '何XX', deadline: MIYAVI_BASE + 118 * D, priority: 'P0', risk: 'high', status: 'confirmed' },
    ],
    decisions: ['红色优先出货满足预售', 'NAMM 样机 1/12 带回'],
    status: 'completed',
  },
];

/* ============================================================
   BOM
   ============================================================ */

const DEMO_BOM: BomItem[] = [
  /* Pocket Nano BOM — phase: evt */
  { id: 'demo-bom-nano-1', projectId: 'demo-nano', category: 'structure', name: '上壳', description: 'ABS 注塑 掌机形态外壳', isMold: true, quantity: 1, unitCost: 15, totalCost: 15, supplier: '供应商A', phase: 'evt', lockedAt: 0 },
  { id: 'demo-bom-nano-2', projectId: 'demo-nano', category: 'structure', name: '底壳', description: 'ABS 注塑 含电池仓', isMold: true, quantity: 1, unitCost: 12, totalCost: 12, supplier: '供应商A', phase: 'evt', lockedAt: 0 },
  { id: 'demo-bom-nano-3', projectId: 'demo-nano', category: 'structure', name: '硅胶按键', description: '导电硅胶按键组 12 键', isMold: true, quantity: 1, unitCost: 5, totalCost: 5, supplier: '供应商A', phase: 'evt', lockedAt: 0 },
  { id: 'demo-bom-nano-4', projectId: 'demo-nano', category: 'hardware', name: 'PCBA 主板', description: '含 DSP 芯片 + 编解码器', isMold: false, quantity: 1, unitCost: 45, totalCost: 45, supplier: '供应商A', phase: 'evt', lockedAt: 0 },
  { id: 'demo-bom-nano-5', projectId: 'demo-nano', category: 'hardware', name: 'LCD 屏幕', description: '28×28mm TFT 彩色屏', isMold: false, quantity: 1, unitCost: 18, totalCost: 18, phase: 'evt', lockedAt: 0 },
  { id: 'demo-bom-nano-6', projectId: 'demo-nano', category: 'packaging', name: '彩盒', description: '单色印刷+哑膜 135×85×35mm', isMold: false, quantity: 1, unitCost: 5, totalCost: 5, phase: 'evt', lockedAt: 0 },

  /* MIYAVI BOM — phase: mp */
  { id: 'demo-bom-miyavi-1', projectId: 'demo-miyavi', category: 'structure', name: '上壳（红）', description: '铝合金 喷砂150# 氧化 水贴 191×60×24mm', isMold: true, quantity: 1, unitCost: 45, totalCost: 45, supplier: '供应商A', notes: '喷砂+氧化+水贴三道工艺', phase: 'mp', lockedAt: 0 },
  { id: 'demo-bom-miyavi-2', projectId: 'demo-miyavi', category: 'structure', name: '底壳（红）', description: '铝合金 喷砂150# 氧化 水贴 193×60×25mm', isMold: true, quantity: 1, unitCost: 45, totalCost: 45, supplier: '供应商A', phase: 'mp', lockedAt: 0 },
  { id: 'demo-bom-miyavi-3', projectId: 'demo-miyavi', category: 'structure', name: '上壳（蓝）', description: '铝合金 喷砂150# 氧化 水贴 191×60×24mm', isMold: true, quantity: 1, unitCost: 45, totalCost: 45, supplier: '供应商A', phase: 'mp', lockedAt: 0 },
  { id: 'demo-bom-miyavi-4', projectId: 'demo-miyavi', category: 'structure', name: '底壳（蓝）', description: '铝合金 喷砂150# 氧化 水贴 193×60×25mm', isMold: true, quantity: 1, unitCost: 45, totalCost: 45, supplier: '供应商A', phase: 'mp', lockedAt: 0 },
  { id: 'demo-bom-miyavi-5', projectId: 'demo-miyavi', category: 'hardware', name: 'PCBA 组件（红）', description: '含踩钉螺母，6.35 螺母及对应垫片', isMold: false, quantity: 1, unitCost: 80, totalCost: 80, supplier: '供应商A', phase: 'mp', lockedAt: 0 },
  { id: 'demo-bom-miyavi-6', projectId: 'demo-miyavi', category: 'hardware', name: 'PCBA 组件（蓝）', description: '含踩钉螺母，6.35 螺母及对应垫片', isMold: false, quantity: 1, unitCost: 80, totalCost: 80, supplier: '供应商A', phase: 'mp', lockedAt: 0 },
  { id: 'demo-bom-miyavi-7', projectId: 'demo-miyavi', category: 'structure', name: '沉头螺丝', description: 'KM3×6×4.5 沉头 环保镀镍', isMold: false, quantity: 12, unitCost: 0.1, totalCost: 1.2, phase: 'mp', lockedAt: 0 },
  { id: 'demo-bom-miyavi-8', projectId: 'demo-miyavi', category: 'structure', name: '内六角螺丝', description: 'TM3×6 内六角平圆头机螺钉 304 不锈钢', isMold: false, quantity: 4, unitCost: 0.2, totalCost: 0.8, phase: 'mp', lockedAt: 0 },
  { id: 'demo-bom-miyavi-9', projectId: 'demo-miyavi', category: 'structure', name: '绝缘片', description: '黑色 PC 绝缘片防火材料 188×46.5×0.25mm', isMold: false, quantity: 2, unitCost: 0.3, totalCost: 0.6, phase: 'mp', lockedAt: 0 },
  { id: 'demo-bom-miyavi-10', projectId: 'demo-miyavi', category: 'structure', name: '配重条', description: '镀锌板 150×14.5×2.5mm 22g', isMold: false, quantity: 2, unitCost: 1, totalCost: 2, phase: 'mp', lockedAt: 0 },
  { id: 'demo-bom-miyavi-11', projectId: 'demo-miyavi', category: 'structure', name: '硅胶脚垫', description: '硅胶 12×2.5mm 黑色 单面背胶', isMold: false, quantity: 8, unitCost: 0.1, totalCost: 0.8, phase: 'mp', lockedAt: 0 },
  { id: 'demo-bom-miyavi-12', projectId: 'demo-miyavi', category: 'structure', name: '旋钮硅胶套', description: '硅胶 8.5×6mm 黑色', isMold: false, quantity: 19, unitCost: 0.1, totalCost: 1.9, phase: 'mp', lockedAt: 0 },
  { id: 'demo-bom-miyavi-13', projectId: 'demo-miyavi', category: 'packaging', name: '抽屉盒', description: '150g 银卡裱 1500g 双灰板 317×231×144mm 3C 印刷 逆向 UV', isMold: false, quantity: 1, unitCost: 25, totalCost: 25, supplier: '包装供应商', phase: 'mp', lockedAt: 0 },
  { id: 'demo-bom-miyavi-14', projectId: 'demo-miyavi', category: 'packaging', name: '套装内托', description: '黑色 EVA 312×222×48mm 35kg/m³', isMold: false, quantity: 1, unitCost: 12, totalCost: 12, supplier: '包装供应商', phase: 'mp', lockedAt: 0 },
  { id: 'demo-bom-miyavi-15', projectId: 'demo-miyavi', category: 'packaging', name: '英文铭牌', description: '哑银龙 PET 69×32mm 哑膜 高粘性', isMold: false, quantity: 1, unitCost: 0.5, totalCost: 0.5, phase: 'mp', lockedAt: 0 },
];

/* ============================================================
   Certs
   ============================================================ */

const DEMO_CERTS: CertRequirement[] = [
  { id: 'demo-cert-nano-1', projectId: 'demo-nano', market: '美国', certName: 'FCC ID', deliverable: '报告+证书', estimatedCost: 5000, sampleRequirement: '1个整机' },
  { id: 'demo-cert-nano-2', projectId: 'demo-nano', market: '欧洲', certName: 'CE-EMC', deliverable: '报告+证书', estimatedCost: 5000, sampleRequirement: '1个整机' },
  { id: 'demo-cert-miyavi-1', projectId: 'demo-miyavi', market: '美国', certName: 'FCC ID', deliverable: '报告+证书', estimatedCost: 5000, sampleRequirement: '1个整机' },
  { id: 'demo-cert-miyavi-2', projectId: 'demo-miyavi', market: '欧洲', certName: 'CE-EMC', deliverable: '报告+证书', estimatedCost: 5000, sampleRequirement: '1个整机' },
  { id: 'demo-cert-miyavi-3', projectId: 'demo-miyavi', market: '全球', certName: '外壳/表面可靠性测试', deliverable: '高低温/跌落/ESD/老化测试报告', estimatedCost: 10000, sampleRequirement: '12台整机', notes: 'EMC 11/18 通过，剩余认证 18 天出结果' },
];

/* ============================================================
   Procurement
   ============================================================ */

const DEMO_PROCUREMENT: ProcurementCandidate[] = [
  { id: 'demo-proc-nano-1', projectId: 'demo-nano', name: '供应商A', location: '东莞', summary: '合作开发供应商，外壳注塑+PCBA组装+整机测试', strengths: '合作开发模式灵活，Pocket 系列有合作基础', risks: '多项目并行产能紧张', countermeasures: '提前锁定排产窗口', isSelected: true },
  { id: 'demo-proc-miyavi-1', projectId: 'demo-miyavi', name: '供应商A', location: '东莞', summary: '合作开发供应商，外壳加工+PCBA组装+整机测试', strengths: '合作开发模式灵活，响应速度快', risks: '水贴产能不足（多项目并行）', countermeasures: '红色款优先排产，蓝色款分批交付', isSelected: true },
  { id: 'demo-proc-miyavi-2', projectId: 'demo-miyavi', name: '水贴供应商', location: '深圳', summary: '水贴工艺供应商，铝合金表面水贴加工', strengths: '工艺成熟，品质稳定', risks: '产能受多项目排期影响', countermeasures: '提前 2 周锁定产能', isSelected: true },
  { id: 'demo-proc-miyavi-3', projectId: 'demo-miyavi', name: '检测机构A', location: '深圳', summary: '第三方检测认证机构，FCC/CE/EMC 认证', strengths: '认证经验丰富，出报告速度快', risks: '样品运输时间', countermeasures: '提前寄样，预留运输时间', isSelected: true },
];

/* ============================================================
   Change Records
   ============================================================ */

const DEMO_CHANGES: ChangeRecord[] = [
  { id: 'demo-chg-nano-1', projectId: 'demo-nano', applicant: '邹XX', type: 'ID变更', content: '6.35 接口位置从顶部改至两侧，整机加宽以容纳 PCB 错落排列', reviewResult: '通过', impact: '外壳模具重新设计，周期增加约 7 天', createdAt: NANO_BASE + 7 * D },
  { id: 'demo-chg-miyavi-1', projectId: 'demo-miyavi', applicant: '艺人方', type: '需求变更', content: '外壳颜色从单色扩展为红蓝双色，新增限量套装款（含周边配件）', reviewResult: '通过', impact: '增加一套模具（蓝色氧化对色），包装方案重新设计，周期增加约 14 天', createdAt: MIYAVI_BASE + 10 * D },
  { id: 'demo-chg-miyavi-2', projectId: 'demo-miyavi', applicant: '廖XX', type: '工程变更', content: 'Booster-Output 旋钮电路去除两个电阻（噪声整改）', reviewResult: '通过', impact: 'PCBA 需返工，整改周期 3 天，红色款优先完成', createdAt: MIYAVI_BASE + 113 * D },
  { id: 'demo-chg-miyavi-3', projectId: 'demo-miyavi', applicant: '品牌部', type: 'ECN', content: '套装款彩盒设计变更：由普通彩盒升级为抽屉盒+银卡裱灰板+逆向UV', reviewResult: '通过', impact: '包装成本增加约 100%，但符合联名款定位', createdAt: MIYAVI_BASE + 30 * D },
  { id: 'demo-chg-miyavi-4', projectId: 'demo-miyavi', applicant: '邹XX', type: 'ID变更', content: '旋钮硅胶套材质确认由普通橡胶改为硅胶（手感优化）', reviewResult: '通过', impact: '成本增加约 0.1/个，无交期影响', createdAt: MIYAVI_BASE + 50 * D },
];

/* ============================================================
   Retrospectives
   ============================================================ */

const DEMO_RETROS: Retrospective[] = [
  /* MIYAVI 结项复盘 */
  {
    id: 'demo-retro-2',
    projectId: 'demo-miyavi',
    phase: 'mp',
    title: 'MIYAVI 联名效果器结项复盘',
    goalReview: '项目为中途从外采转合作开发。目标：完成与艺人的深度合作开发，DONNER 首款签名款效果器，含双 SKU + 限量套装款。时间目标：2025/9/11 启动，2026/1/16 MP 出货。成本目标：整机 BOM cost ≤ 380 CNY。',
    achievement: `核心指标达成：
- 项目周期缩短 21%（通过并行 EVT/DVT 阶段、AI 辅助甘特图自动编排）
- 整机成本偏差 1.93%-2.41%（优于 ≤3% 预设目标）
- MP 良率 92%+（PVT 阶段迭代整改后达成）
- 按时完成预售履约 + NAMM Show 样机 + 日本公关样机交付

成本汇总（含税 CNY）：
- 打样成本：~12,000
- 模具成本：~28,000
- 认证成本：~20,000
- 人力成本：因中途转合作开发，无法准确核算`,
    highlights: [
      '首次与艺人深度合作开发，建立联名项目流程基准',
      '水贴工艺首次应用于效果器外壳，拓展表面处理工艺库',
      'AI 辅助甘特图自动编排（0→1），跨时区艺人沟通效率显著提升',
      'EVT/DVT 合并推进，有效压缩开发周期',
    ],
    gaps: [
      '预售发布节点过早（DVT 前即发布，导致后续 ECN 变更压力传导至交付）',
      '项目团队中后期才介入，前期缺失项目规划，交期变动频繁',
      '艺人为需求验收方，多次需求变更导致 ECN 频繁',
      '内部验收方缺少可执行明确标准，出现反复打样行为',
      '过多部门参与最终决策，对应环节的最终决策方不明确',
    ],
    rootCauseAnalysis: `Top 3 根因分析：

1. 预售发布节点过早（A 级）
   根因：品牌/GTM 需求与研发实际进度未同步。10/24 发布预售时尚未完成量产供应商整机签样锁板。

2. 项目团队介入过晚（A 级）
   根因：项目前期为外采模式，项目团队未介入。中途转合作开发后项目团队才加入。

3. 决策方不明确（A 级）
   根因：联名项目涉及品牌、产品、研发、艺人四方，各环节缺乏明确的最终决策方。`,
    improvements: [
      '联名/重点项目在启动阶段即引入项目经理和项目团队',
      '预售发布节点至少应在 DVT 确认（量产供应商整机签样锁板）后，PVT 前进行',
      'EVT/DVT 期间明确需求是"可变项"或"冻结项"，冻结项不允许变更',
      '每次送样前由项目经理输出验收标准包（结构尺寸/外观颜色/功能）',
      '介入量产供应商打样，提供多种效果方案供选择',
      '测试需求清单在测试开始前与产品经理确认',
      '形成各环节最终验收/决策方清单',
      '新品开发以最终可实现量产样品作为签样标准',
    ],
    lessonsLearned: [
      { problem: '预售发布过早导致 ECN 失控', rootCause: '品牌/GTM 与研发进度脱节', solution: '预售发布必须等 DVT 确认量产供应商整机签样锁板' },
      { problem: '项目团队介入过晚', rootCause: '外采转合作开发的项目管理模式缺失', solution: '联名/重点项目的项目经理在启动阶段即介入' },
      { problem: 'ECN 频繁变更', rootCause: '艺人需求变更 + 内部反复调整', solution: 'DVT 后冻结非必要需求，变更需走正式 ECN 流程' },
      { problem: '内部验收标准不明确', rootCause: '缺少结构化的验收清单', solution: '每次送样前输出验收标准包' },
      { problem: '测试需求未对齐', rootCause: '测试计划未与产品经理确认', solution: '测试前核对需求，排除非强制测试项' },
      { problem: '验收决策方不明确', rootCause: '多部门参与但无最终决策人', solution: '各环节明确最终决策方' },
      { problem: '签样标准不统一', rootCause: '新品开发与量产的差异', solution: '以最终可实现量产样品作为签样标准' },
      { problem: '水贴产能不足', rootCause: '供应商同时供应多项目', solution: '关键工艺供应商提前 2 周锁定产能' },
    ],
    generatedBy: 'ai',
    createdAt: MIYAVI_BASE + 130 * D,
  },
];

const DEMO_WORK_LOGS: WorkLogEntry[] = [
  /* === MIYAVI 工作记录 === */
  {
    id: 'demo-miyavi-wl-1', projectId: 'demo-miyavi',
    items: [
      { text: '拉采购沟通项目进度，确认鑫成模具排期', done: true },
      { text: '品牌/产品预留认证费用评估是否留够预算', done: true },
      { text: '包装与产品颜色对齐，追鑫成找悦耳重新打样', done: true },
      { text: '鑫成模具排期出来后做时间倒推排期', done: true },
    ],
    createdAt: MIYAVI_BASE + 5 * D,
    updatedAt: MIYAVI_BASE + 5 * D,
  },
  {
    id: 'demo-miyavi-wl-2', projectId: 'demo-miyavi',
    items: [
      { text: '水贴工艺验证：提前打壳子验证，结构硬件风险评估', done: true },
      { text: '模具预计10月中旬出来，追悦耳排期', done: true },
      { text: '精制手板功能确认，外观未确认需跟进', done: false },
      { text: '从军团挪5W预算过来做打样', done: true },
      { text: '水贴纸打样因预算有限供应商积极性低，需沟通', done: false },
    ],
    createdAt: MIYAVI_BASE + 15 * D,
    updatedAt: MIYAVI_BASE + 15 * D,
  },
  {
    id: 'demo-miyavi-wl-3', projectId: 'demo-miyavi',
    items: [
      { text: 'DVT赶不上上海展，用4台精制手板代替', done: true },
      { text: '营销样机60台，见面会1000台排期确认', done: true },
      { text: '红色款色板打样跟进般般回样时间', done: true },
      { text: 'MIL问题库发布，PVT前需100%解决', done: false },
      { text: 'DVT样机回收问题与梓洋沟通', done: true },
    ],
    createdAt: MIYAVI_BASE + 30 * D,
    updatedAt: MIYAVI_BASE + 30 * D,
  },
  {
    id: 'demo-miyavi-wl-4', projectId: 'demo-miyavi',
    items: [
      { text: '样机生产完后先让产品测过，给MIYAVI确认', done: true },
      { text: '底壳换铝合金方案需与产品同步确认', done: true },
      { text: '多找两家供应商进行水贴打样对比', done: true },
      { text: '水贴验收标准制定，ID出图，SQE沟通控制', done: false },
      { text: '12.29去水贴厂看生产情况', done: true },
    ],
    createdAt: MIYAVI_BASE + 50 * D,
    updatedAt: MIYAVI_BASE + 50 * D,
  },
  {
    id: 'demo-miyavi-wl-5', projectId: 'demo-miyavi',
    items: [
      { text: '红色款booster-output旋钮噪声问题，电位器&电路问题导致延期', done: true },
      { text: '本批以电位器剪脚+去电阻方式整改，同步设计新layout', done: true },
      { text: '后续返单需做PCBA重新设计', done: false },
      { text: '套装款塑封问题调试完成已回仓', done: true },
      { text: '发货保护性不够导致彩盒破损，需纸箱+气泡袋发货', done: true },
    ],
    createdAt: MIYAVI_BASE + 120 * D,
    updatedAt: MIYAVI_BASE + 120 * D,
  },
  /* === Pocket Nano 工作记录 === */
  {
    id: 'demo-nano-wl-1', projectId: 'demo-nano',
    items: [
      { text: '完成二次ID评审，确定ID部分', done: true },
      { text: '结构BOM发送采购，一周内出报价', done: true },
      { text: '硬件完成原理图，出BOM给采购做成本预估', done: true },
      { text: '人力成本测算给铿伟，等APP&UI评估人力投入', done: true },
      { text: 'CDCP流程发到系统内，完成项目部分填写', done: true },
    ],
    createdAt: NANO_BASE + 10 * D,
    updatedAt: NANO_BASE + 10 * D,
  },
  {
    id: 'demo-nano-wl-2', projectId: 'demo-nano',
    items: [
      { text: '人力成本过高，看产品方是否在其他方向分摊', done: true },
      { text: '准备TR1资料：项目目标、报价、手板开发计划', done: true },
      { text: '整理结构硬件BOM，发项目团队评估风险点', done: true },
      { text: '与产品品质定义退款率，PQM输出质量策划', done: false },
      { text: '9.9开TR1信息同步会议', done: true },
    ],
    createdAt: NANO_BASE + 30 * D,
    updatedAt: NANO_BASE + 30 * D,
  },
  {
    id: 'demo-nano-wl-3', projectId: 'demo-nano',
    items: [
      { text: '与算法&APP重新评估人力投入，抽出部分做预研', done: true },
      { text: '先免喷方案，后续看要不要喷涂，做两个版本成本', done: true },
      { text: '模厂锁定阳溢，与节拍器产品同一模厂', done: true },
      { text: 'Reset按键拉通ID、硬件、结构确认', done: false },
      { text: '产品想换高分辨率屏幕，需同步风险点（算力/成本/发热）', done: true },
      { text: '更新项目排期，总体时间延后20天', done: true },
    ],
    createdAt: NANO_BASE + 45 * D,
    updatedAt: NANO_BASE + 45 * D,
  },
  {
    id: 'demo-nano-wl-4', projectId: 'demo-nano',
    items: [
      { text: '市场窗口期已过，与笙科电子沟通耗时超半年', done: true },
      { text: '友商依托现有平台快速拆分下放新品，已失先发优势', done: true },
      { text: '项目暂停决议执行', done: true },
    ],
    createdAt: NANO_BASE + 80 * D,
    updatedAt: NANO_BASE + 80 * D,
  },
];

/* ============================================================
   Demo mode helpers
   ============================================================ */

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

export async function seedDemoData() {
  const { db } = await import('@/db/database');
  await Promise.all([
    db.projects.clear(), db.tasks.clear(), db.milestones.clear(),
    db.milEntries.clear(), db.meetings.clear(), db.bomItems.clear(),
    db.certRequirements.clear(), db.procurementCandidates.clear(),
    db.changeRecords.clear(), db.retrospectives.clear(), db.workLogs.clear(),
  ]);
  await db.projects.bulkPut(DEMO_PROJECTS);
  await db.tasks.bulkPut(patchDashboardDemoDates(DEMO_TASKS));
  await db.milestones.bulkPut(patchDashboardDemoMilestones(DEMO_MILESTONES));
  await db.milEntries.bulkPut(DEMO_MILS);
  await db.meetings.bulkPut(DEMO_MEETINGS);
  await db.bomItems.bulkPut(DEMO_BOM);
  await db.certRequirements.bulkPut(DEMO_CERTS);
  await db.procurementCandidates.bulkPut(DEMO_PROCUREMENT);
  await db.changeRecords.bulkPut(DEMO_CHANGES);
  await db.retrospectives.bulkPut(DEMO_RETROS);
  await db.workLogs.bulkPut(DEMO_WORK_LOGS);
}
