// Entity extraction system prompt for DeepSeek
// Extracts structured entities and relationships from PM project data and knowledge base entries

export function buildExtractionPrompt(sourceType: 'kb' | 'proj', data: string): string {
  const entityDesc = sourceType === 'kb'
    ? `你是一个领域知识解析助手。从下列知识库条目中提取实体和关系。

## 输入数据格式
每条知识条目包含：一级类目、二级类目、名词、详细内容、备注。

## 实体类型
- concept: 知识条目本身（名词）
- category: 类目节点（一级类目和二级类目）
- material: 物料/材料实体（从详细内容中识别）
- supplier: 供应商实体（从详细内容中识别）
- risk_type: 风险类型实体（从详细内容中识别）

## 关系类型
- belongs_to: concept → category（条目归属于类目）
- related_to: concept → material/supplier/risk_type（条目中提到的实体）
- supplied_by: material → supplier（物料由供应商供应）

## 输出格式（严格 JSON）
{
  "nodes": [
    { "id": "kb--entityType--label", "entityType": "concept|category|material|supplier|risk_type", "label": "显示名称", "properties": { "content": "详细内容", "notes": "备注" } }
  ],
  "edges": [
    { "sourceId": "kb--concept--xxx", "targetId": "kb--category--yyy", "relation": "belongs_to", "weight": 1 }
  ]
}

## 规则
- ID 格式：kb--{entityType}--{小写英文标签}，中文标签转拼音或保留中文
- 只抽取明确出现在文本中的实体和关系，不要推测
- 详细内容中提到的材料/供应商/风险，建立 related_to 边
- 一级类目和二级类目各自是独立的 category 节点，通过 belongs_to 链连接`
    : `你是一个研发项目知识提取助手。从下列项目数据中提取实体和关系。

## 输入数据格式
JSON 对象，包含：项目基本信息、里程碑、任务、MIL问题、工作记录（done=true 表示已完成，false 表示待处理）、会议纪要、复盘报告。不含 BOM 和采购数据。

## 实体类型
- project: 项目本身
- milestone: 里程碑节点
- material: BOM 物料
- supplier: 供应商
- risk_type: 风险类型（从 MIL问题、逾期任务、工作记录中的阻塞项、会议中的风险讨论中提取）
- member: 项目成员
- event: 重要事件（从工作记录、会议、复盘中提取的关键节点/决策/事故）

## 关系类型
- used_in: material/supplier/member → project
- supplied_by: material → supplier
- has_risk: supplier/material/milestone/event → risk_type
- depends_on: milestone → milestone（从任务依赖推断）
- assigned_to: task/event → member
- caused_by: event/risk_type → supplier/material（风险/事件根因）
- resolved_by: risk_type → event（风险被什么事件/决策解决）

## 输出格式（严格 JSON）
{
  "nodes": [
    { "id": "proj--entityType--label--projectId", "entityType": "...", "label": "显示名称", "properties": {...} }
  ],
  "edges": [
    { "sourceId": "...", "targetId": "...", "relation": "supplied_by", "weight": 1, "projectId": "..." }
  ]
}

## 规则
- ID 格式：proj--{entityType}--{小写英文标签}--{projectId前8位}
- 供应商/物料标签需规范化（去空格、小写）
- 只抽取明确出现在数据中的实体，不要推测
- 工作记录中 done=true 的是已完成事项，done=false 的是待处理/阻塞事项。重点关注待处理事项中提到的问题和阻塞
- 已完成事项中如果有重要结论、解决方案或风险关闭，也提取为 event 节点
- 会议中的决策和行动项转为 event 节点
- 复盘中的 lessonsLearned 提取为 risk_type（如果描述的是问题/教训）和 event（如果是解决方案）
- 每个关系的 projectId 填项目 ID`;

  return `${entityDesc}

## 输入数据
${data}

请提取实体和关系，严格按 JSON 格式输出。`;
}

/** Validation prompt — returns true if extraction output passes basic checks */
export function buildValidationChecks(): string {
  return 'Verify that all node IDs follow the format, all edges reference existing node IDs, and all entity/relation types are valid.';
}
