// Test script: Graph extraction + Agent analysis
// Run: node test-graph-agent.mjs

const BASE = 'http://localhost:3000';
const D = 86400000;
const MIYAVI_BASE = Date.now() - 270 * D;
const NANO_BASE = Date.now() - 320 * D;
const T = (d) => new Date(d).toISOString().slice(0, 10);

// ====== Build extraction payloads ======

const miyaviPayload = {
  project: { name: 'MIYAVI 联名款 3-in-1 吉他效果器', brand: 'DONNER', phase: 'mp', mode: 'odm', status: 'active' },
  budget: [
    { category: 'mold', name: '外壳模具（上下壳）', estimated: 28000, actual: 28000, phase: 'mp' },
    { category: 'mold', name: '水贴模具', estimated: 3500, actual: 3200, phase: 'mp' },
    { category: 'sample', name: 'EVT/DVT 打样', estimated: 15000, actual: 12000, phase: 'mp' },
    { category: 'labor', name: '人力成本', estimated: 350000, actual: 340000, phase: 'mp' },
    { category: 'cert', name: 'FCC/CE/EMC 认证', estimated: 25000, actual: 20000, phase: 'mp' },
    { category: 'patent', name: '联名授权费', estimated: 100000, actual: 100000, phase: 'mp' },
    { category: 'travel', name: '工厂差旅', estimated: 8000, actual: 6000, phase: 'mp' },
  ],
  tasks: [
    { name: '模具排期（含工厂国庆6天假）', status: 'done', priority: 'P0', assignee: '郑X', phase: 'concept', risk: 'none' },
    { name: '艺人确认产品颜色', status: 'done', priority: 'P0', assignee: '品牌部', phase: 'design', risk: 'none' },
    { name: '艺人确认包装颜色', status: 'done', priority: 'P1', assignee: '品牌部', phase: 'design', risk: 'none' },
    { name: 'T0 试模及相关物料收回', status: 'done', priority: 'P0', assignee: '郑X', phase: 'hms', risk: 'none' },
    { name: 'EVT1/DVT1 样机组装', status: 'done', priority: 'P0', assignee: '梅XX', phase: 'evt', risk: 'none' },
    { name: '研发可靠性测试（12 台）', status: 'done', priority: 'P0', assignee: '何XX', phase: 'evt', risk: 'none' },
    { name: '修模改模', status: 'done', priority: 'P0', assignee: '梅XX', phase: 'dvt', risk: 'none' },
    { name: 'T1 相关物料收回', status: 'done', priority: 'P0', assignee: '郑X', phase: 'dvt', risk: 'none' },
    { name: '某项测试不通过整改', status: 'done', priority: 'P0', assignee: '何XX', phase: 'dvt', risk: 'none' },
    { name: '艺人验收改善后外观功能', status: 'done', priority: 'P0', assignee: '潘XX', phase: 'dvt', risk: 'none' },
    { name: 'PCB 量产阶段新出问题修复', status: 'done', priority: 'P1', assignee: '廖XX', phase: 'pvt', risk: 'none' },
    { name: '整改后再测试', status: 'done', priority: 'P0', assignee: '何XX', phase: 'pvt', risk: 'none' },
    { name: 'NAMM Show + 日本公关样机出货', status: 'done', priority: 'P0', assignee: '潘XX', phase: 'mp', risk: 'none' },
    { name: 'Q3 量产良率报告', status: 'todo', priority: 'P0', assignee: '何XX', phase: 'mp', risk: 'none' },
    { name: '供应商年度审核', status: 'todo', priority: 'P1', assignee: '郑X', phase: 'mp', risk: 'none' },
  ],
  milestones: [
    { name: 'TR1 概念评审', status: 'completed', plannedDate: T(MIYAVI_BASE) },
    { name: 'CDCP 概念决策', status: 'completed', plannedDate: T(MIYAVI_BASE + 9*D) },
    { name: 'TR2 设计评审', status: 'completed', plannedDate: T(MIYAVI_BASE + 21*D) },
    { name: 'HMS 手板', status: 'completed', plannedDate: T(MIYAVI_BASE + 29*D) },
    { name: 'PDCP 产品决策', status: 'completed', plannedDate: T(MIYAVI_BASE + 41*D) },
    { name: 'EVT 工程验证', status: 'completed', plannedDate: T(MIYAVI_BASE + 46*D) },
    { name: 'DVT 设计验证', status: 'completed', plannedDate: T(MIYAVI_BASE + 62*D) },
    { name: 'ADCP1 量产决策', status: 'completed', plannedDate: T(MIYAVI_BASE + 82*D) },
    { name: 'PVT 试产', status: 'completed', plannedDate: T(MIYAVI_BASE + 108*D) },
    { name: 'MP 量产', status: 'completed', plannedDate: T(MIYAVI_BASE + 128*D) },
  ],
  milEntries: [
    { title: 'Booster-Output 噪声问题', severity: 'A', status: 'resolved', rootCause: '电位器&电路问题导致噪声', solution: '电位器剪脚+去电阻方式整改' },
    { title: '水贴产能不足', severity: 'A', status: 'resolved', rootCause: '供应商同时供应多项目', solution: '提前2周锁定产能，多找两家供应商对比' },
    { title: '预售发布过早导致ECN失控', severity: 'A', status: 'resolved', rootCause: '品牌/GTM与研发进度脱节', solution: 'DVT确认量产签样后再发布预售' },
  ],
  workLogs: [
    { date: T(MIYAVI_BASE + 5*D), items: [
      { text: '拉采购沟通项目进度，确认鑫成模具排期', done: true },
      { text: '包装与产品颜色对齐，追鑫成找悦耳重新打样', done: true },
      { text: '鑫成模具排期出来后做时间倒推排期', done: true },
    ]},
    { date: T(MIYAVI_BASE + 15*D), items: [
      { text: '水贴工艺验证：提前打壳子验证，结构硬件风险评估', done: true },
      { text: '精制手板功能确认，外观未确认需跟进', done: false },
      { text: '水贴纸打样因预算有限供应商积极性低，需沟通', done: false },
    ]},
    { date: T(MIYAVI_BASE + 50*D), items: [
      { text: '底壳换铝合金方案需与产品同步确认', done: true },
      { text: '多找两家供应商进行水贴打样对比', done: true },
      { text: '水贴验收标准制定，ID出图，SQE沟通控制', done: false },
    ]},
    { date: T(MIYAVI_BASE + 120*D), items: [
      { text: '红色款booster-output旋钮噪声问题，电位器&电路问题导致延期', done: true },
      { text: '本批以电位器剪脚+去电阻方式整改，同步设计新layout', done: true },
      { text: '后续返单需做PCBA重新设计', done: false },
    ]},
  ],
  meetings: [
    { title: 'MIYAVI 联名款合作开发启动会', date: T(MIYAVI_BASE), type: 'kickoff',
      summary: '确认合作开发模式，EVT/DVT合并推进。与供应商A合作开发。精制手板9/18给艺人。',
      decisions: ['EVT/DVT合并推进', '精制手板给艺人确认', '包装打样已启动'],
      keyInsights: [],
      actionItems: [
        { content: '整合输出PRD、模具图纸、ID结构图、BOM、成本、包装方案', owner: '古XX', priority: 'P0' },
      ],
    },
    { title: 'TR5 前沟通 — 结构/硬件/品质/认证进度', date: T(MIYAVI_BASE + 70*D), type: 'review',
      summary: '结构可先备料上壳，下壳等跌落测试。硬件拨档偏位需解决。EMC已通过。',
      decisions: ['上壳铝料可先备料', '等跌落测试后再备下壳'],
      actionItems: [
        { content: '完成跌落测试并给出下壳备料结论', owner: '梅XX', priority: 'P0' },
        { content: '解决红色款拨档开关偏位问题', owner: '廖XX', priority: 'P1' },
      ],
    },
    { title: 'MIYAVI 艺人进度同步 — FUZZ 音量争议', date: T(MIYAVI_BASE + 62*D), type: 'review',
      summary: 'FUZZ音量问题已解决到技术极限，艺人接受现状。',
      decisions: ['FUZZ保持当前状态', '艺人已确认功能签样'],
      actionItems: [{ content: '准备改善前后版本样机供海南测试', owner: '郑X', priority: 'P0' }],
    },
    { title: '量产出货前问题跟进', date: T(MIYAVI_BASE + 116*D), type: 'review',
      summary: '红色款整改已完成。NAMM/公关样机带回。量产分批出货。',
      decisions: ['红色优先出货满足预售'],
      actionItems: [
        { content: '工厂带回NAMM+公关样机', owner: '潘XX', priority: 'P0' },
        { content: '工厂完成全检确认可出货数量', owner: '何XX', priority: 'P0' },
      ],
    },
  ],
  retros: [
    { title: 'MIYAVI 联名效果器结项复盘', phase: 'mp',
      highlights: ['首次与艺人深度合作开发', '水贴工艺首次应用于效果器外壳', 'EVT/DVT合并推进有效压缩周期'],
      gaps: ['预售发布节点过早', '项目团队中后期才介入', '艺人多次需求变更导致ECN频繁', '内部验收标准不明确'],
      lessonsLearned: [
        { problem: '预售发布过早导致ECN失控', rootCause: '品牌/GTM与研发进度脱节', solution: '预售发布必须等DVT确认量产签样' },
        { problem: '项目团队介入过晚', rootCause: '外采转合作开发的项目管理模式缺失', solution: '重点项目启动阶段即介入项目经理' },
        { problem: '水贴产能不足', rootCause: '供应商同时供应多项目', solution: '关键工艺供应商提前2周锁定产能' },
      ],
    },
  ],
};

const nanoPayload = {
  project: { name: 'Pocket Nano 掌上吉他效果器', brand: 'DONNER', phase: 'evt', mode: 'self-develop', status: 'archived' },
  budget: [
    { category: 'mold', name: '外壳模具', estimated: 35000, actual: 32000, phase: 'evt' },
    { category: 'mold', name: '硅胶按键模具', estimated: 8000, actual: 7500, phase: 'evt' },
    { category: 'sample', name: '手板打样', estimated: 10000, actual: 9000, phase: 'evt' },
    { category: 'labor', name: '人力成本', estimated: 280000, actual: 270000, phase: 'evt' },
    { category: 'cert', name: 'FCC/CE 认证', estimated: 20000, actual: 18000, phase: 'evt' },
  ],
  tasks: [
    { name: 'ID 二次评审', status: 'done', priority: 'P0', assignee: '邹XX', phase: 'concept', risk: 'none' },
    { name: '结构 3D 图更新', status: 'done', priority: 'P0', assignee: '梅XX', phase: 'concept', risk: 'none' },
    { name: 'PCB 原理图', status: 'done', priority: 'P0', assignee: '廖XX', phase: 'concept', risk: 'none' },
    { name: 'TR1 概念评审', status: 'done', priority: 'P0', assignee: '陈XX', phase: 'concept', risk: 'none' },
    { name: 'PCB Layout', status: 'done', priority: 'P0', assignee: '廖XX', phase: 'design', risk: 'none' },
    { name: '手板样机制作 HMC1', status: 'done', priority: 'P0', assignee: '梅XX', phase: 'hms', risk: 'none' },
    { name: '结构修改', status: 'done', priority: 'P0', assignee: '梅XX', phase: 'evt', risk: 'none' },
    { name: '电子修改', status: 'done', priority: 'P0', assignee: '廖XX', phase: 'evt', risk: 'none' },
  ],
  milestones: [
    { name: 'TR1 概念评审', status: 'completed', plannedDate: T(NANO_BASE + 16*D) },
    { name: 'CDCP 概念决策', status: 'completed', plannedDate: T(NANO_BASE + 21*D) },
    { name: 'TR2 设计评审', status: 'completed', plannedDate: T(NANO_BASE + 35*D) },
    { name: 'HMS 手板', status: 'completed', plannedDate: T(NANO_BASE + 49*D) },
    { name: 'PDCP 产品决策', status: 'completed', plannedDate: T(NANO_BASE + 60*D) },
    { name: 'EVT 工程验证', status: 'completed', plannedDate: T(NANO_BASE + 74*D) },
  ],
  milEntries: [
    { title: '整机厚度无法支撑两个6.35耳机孔', severity: 'A', status: 'resolved', rootCause: 'ID初期未充分对齐PCB厚度与6.35接口物理尺寸', solution: '6.35孔移至机身两侧，加宽整机，PCB与屏幕错落排列' },
    { title: '人力成本过高', severity: 'A', status: 'resolved', rootCause: '算法&APP人力投入预估偏高', solution: '抽出部分做预研，重新评估人力投入' },
  ],
  workLogs: [
    { date: T(NANO_BASE + 10*D), items: [
      { text: '完成二次ID评审，确定ID部分', done: true },
      { text: '结构BOM发送采购，一周内出报价', done: true },
      { text: '硬件完成原理图，出BOM给采购做成本预估', done: true },
    ]},
    { date: T(NANO_BASE + 30*D), items: [
      { text: '人力成本过高，看产品方是否在其他方向分摊', done: true },
      { text: '准备TR1资料：项目目标、报价、手板开发计划', done: true },
      { text: '整理结构硬件BOM，发项目团队评估风险点', done: true },
    ]},
    { date: T(NANO_BASE + 45*D), items: [
      { text: '与算法&APP重新评估人力投入，抽出部分做预研', done: true },
      { text: '模厂锁定阳溢，与节拍器产品同一模厂', done: true },
      { text: '产品想换高分辨率屏幕，需同步风险点（算力/成本/发热）', done: true },
      { text: '更新项目排期，总体时间延后20天', done: true },
    ]},
    { date: T(NANO_BASE + 80*D), items: [
      { text: '市场窗口期已过，与笙科电子沟通耗时超半年', done: true },
      { text: '友商依托现有平台快速拆分下放新品，已失先发优势', done: true },
      { text: '项目暂停决议执行', done: true },
    ]},
  ],
  meetings: [
    { title: 'Pocket Nano 项目启动 & ID 评审', date: T(NANO_BASE), type: 'kickoff',
      summary: '确认自研方向。供应商A合作开发。ID需调整：6.35孔改两侧，整机加宽，屏幕错落排列。外观先申请专利。',
      decisions: ['Pocket系列转自研', '合作开发模式', '外观先申请专利'],
      actionItems: [
        { content: '外观专利申请', owner: '陈XX', priority: 'P0' },
        { content: 'ID方案调整（6.35孔改两侧+加宽整机）', owner: '邹XX', priority: 'P0' },
      ],
    },
  ],
  retros: [],
};

async function main() {
  console.log('=== Step 1: Extract entities for both projects ===\n');

  // Extract MIYAVI
  console.log('Extracting MIYAVI entities...');
  const miyaviRes = await fetch(`${BASE}/api/ai/graph/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sourceType: 'proj',
      sourceId: 'demo-miyavi',
      data: JSON.stringify(miyaviPayload),
    }),
  });
  const miyaviData = await miyaviRes.json();
  console.log(`MIYAVI: ${miyaviData.nodes?.length || 0} nodes, ${miyaviData.edges?.length || 0} edges`);
  if (miyaviData.error) console.log('  Error:', miyaviData.error);
  console.log('  Nodes:', JSON.stringify(miyaviData.nodes?.slice(0, 5), null, 2));

  // Extract Nano
  console.log('\nExtracting Pocket Nano entities...');
  const nanoRes = await fetch(`${BASE}/api/ai/graph/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sourceType: 'proj',
      sourceId: 'demo-nano',
      data: JSON.stringify(nanoPayload),
    }),
  });
  const nanoData = await nanoRes.json();
  console.log(`Nano: ${nanoData.nodes?.length || 0} nodes, ${nanoData.edges?.length || 0} edges`);
  if (nanoData.error) console.log('  Error:', nanoData.error);
  console.log('  Nodes:', JSON.stringify(nanoData.nodes?.slice(0, 5), null, 2));

  // Find common entities across projects
  console.log('\n=== Step 2: Cross-project entity analysis ===\n');

  const miyaviLabels = new Map();
  (miyaviData.nodes || []).forEach(n => {
    const key = `${n.entityType}::${n.label}`;
    miyaviLabels.set(key, n);
  });

  const nanoLabels = new Map();
  (nanoData.nodes || []).forEach(n => {
    const key = `${n.entityType}::${n.label}`;
    nanoLabels.set(key, n);
  });

  const common = [];
  for (const [key, node] of miyaviLabels) {
    if (nanoLabels.has(key)) {
      common.push(key);
    }
  }
  console.log(`Common entities across projects: ${common.length}`);
  common.forEach(c => console.log(`  - ${c}`));

  // Also check similar labels (not exact match)
  console.log('\nSimilar entities (one project has, other might relate):');
  const miyaviSuppliers = (miyaviData.nodes || []).filter(n => n.entityType === 'supplier').map(n => n.label);
  const nanoSuppliers = (nanoData.nodes || []).filter(n => n.entityType === 'supplier').map(n => n.label);
  console.log('  MIYAVI suppliers:', miyaviSuppliers);
  console.log('  Nano suppliers:', nanoSuppliers);
  const miyaviMaterials = (miyaviData.nodes || []).filter(n => n.entityType === 'material').map(n => n.label);
  const nanoMaterials = (nanoData.nodes || []).filter(n => n.entityType === 'material').map(n => n.label);
  console.log('  MIYAVI materials:', miyaviMaterials);
  console.log('  Nano materials:', nanoMaterials);
  const miyaviRisks = (miyaviData.nodes || []).filter(n => n.entityType === 'risk_type').map(n => n.label);
  const nanoRisks = (nanoData.nodes || []).filter(n => n.entityType === 'risk_type').map(n => n.label);
  console.log('  MIYAVI risks:', miyaviRisks);
  console.log('  Nano risks:', nanoRisks);

  // Step 3: Build graph context and call agent API
  console.log('\n=== Step 3: Build graph context & call Agent ===\n');

  // Manually build graph context similar to what collectProjectDataWithGraph would produce
  const graphCtxParts = [];

  // Cross-project entities
  for (const [key] of common) {
    const [type, label] = key.split('::');
    graphCtxParts.push(`${type}「${label}」在以下项目中也有记录：demo-nano、demo-miyavi。关联原因：used_in关联`);
  }

  // Related entities (edges from miyavi nodes)
  const relatedParts = [];
  for (const edge of (miyaviData.edges || []).slice(0, 10)) {
    const targetNode = miyaviData.nodes?.find(n => n.id === edge.targetId);
    const sourceNode = miyaviData.nodes?.find(n => n.id === edge.sourceId);
    if (targetNode && sourceNode) {
      relatedParts.push(`${targetNode.entityType}「${targetNode.label}」(关系: ${edge.relation})`);
    }
  }
  if (relatedParts.length > 0) {
    graphCtxParts.push(`知识库关联实体：${relatedParts.join('、')}`);
  }

  const graphContext = graphCtxParts.length > 0
    ? `[跨项目知识图谱]\n${graphCtxParts.join('\n')}`
    : '暂无跨项目知识图谱数据。';

  console.log('Graph context built:');
  console.log(graphContext);
  console.log();

  // Build project data (matching collectProjectData format)
  const projectData = {
    projectName: 'MIYAVI 联名款 3-in-1 吉他效果器',
    overdueTasks: [
      { name: 'Q3 量产良率报告', assignee: '何XX', overdueDays: 12, priority: 'P0', phase: 'mp' },
      { name: '供应商年度审核', assignee: '郑X', overdueDays: 2, priority: 'P1', phase: 'mp' },
    ],
    aClassMILs: [
      { title: '水贴产能不足', description: '供应商同时供应多项目', severity: 'A' },
    ],
    milestoneStatus: [
      { name: 'PVT 试产', plannedDate: T(MIYAVI_BASE + 108*D), status: 'delayed', isDelayed: true },
      { name: 'MP 量产', plannedDate: T(MIYAVI_BASE + 128*D), status: 'completed', isDelayed: false },
    ],
    budgetSummary: [
      { category: 'mold', estimated: 31500, actual: 31200 },
      { category: 'sample', estimated: 15000, actual: 12000 },
      { category: 'labor', estimated: 350000, actual: 340000 },
      { category: 'cert', estimated: 25000, actual: 20000 },
      { category: 'patent', estimated: 100000, actual: 100000 },
      { category: 'travel', estimated: 8000, actual: 6000 },
    ],
    bomTotal: 384,
    topLoadedMembers: [
      { name: '潘XX', taskCount: 8 },
      { name: '何XX', taskCount: 6 },
      { name: '郑X', taskCount: 5 },
    ],
    totalTasks: 22,
    doneTasks: 18,
  };

  const enrichedData = `项目数据：\n${JSON.stringify(projectData)}\n\n${graphContext}`;

  // Call risk agent
  console.log('=== Calling Risk Agent ===');
  const riskRes = await fetch(`${BASE}/api/ai/risk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: enrichedData }),
  });
  const riskData = await riskRes.json();
  console.log(JSON.stringify(riskData, null, 2));

  // Call cost agent
  console.log('\n=== Calling Cost Agent ===');
  const costRes = await fetch(`${BASE}/api/ai/cost`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: enrichedData }),
  });
  const costData = await costRes.json();
  console.log(JSON.stringify(costData, null, 2));

  // Call schedule agent
  console.log('\n=== Calling Schedule Agent ===');
  const schedRes = await fetch(`${BASE}/api/ai/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: enrichedData }),
  });
  const schedData = await schedRes.json();
  console.log(JSON.stringify(schedData, null, 2));
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
