// Client-side AI wrappers — replaces fetch('/api/ai/*') for static production builds.
// Same logic as the server routes: prompt.ts (pure) → DeepSeek → repairJson → parse.

import { callDeepSeekClient, repairJson } from '@/lib/ai-client';
import {
  buildRiskScanPrompt, buildCostAnalysisPrompt, buildScheduleHealthPrompt,
  buildMeetingSystemPrompt, buildRetroSystemPrompt,
} from '@/lib/prompt';
import { buildExtractionPrompt } from '@/lib/graph/prompt';
import { validateExtractionOutput, fillNodeDefaults, fillEdgeDefaults } from '@/lib/graph/extract-shared';
import type { GraphNode, GraphEdge, GraphSourceType } from '@/types';

async function call<T>(systemPrompt: string, userMessage: string): Promise<T> {
  const raw = await callDeepSeekClient(systemPrompt, userMessage);
  return JSON.parse(repairJson(raw)) as T;
}

export async function aiRisk(data: string): Promise<Record<string, unknown>> {
  return call(buildRiskScanPrompt(data), '请分析以上项目数据中的风险。');
}

export async function aiCost(data: string): Promise<Record<string, unknown>> {
  return call(buildCostAnalysisPrompt(data), '请分析以上项目数据中的成本偏差。');
}

export async function aiSchedule(data: string): Promise<Record<string, unknown>> {
  return call(buildScheduleHealthPrompt(data), '请分析以上项目数据中的排期健康度。');
}

export async function aiAnalyzeMeeting(meetingText: string): Promise<Record<string, unknown>> {
  const userMessage = `<meeting_text>\n${meetingText.slice(0, 8000)}\n</meeting_text>`;
  return call(buildMeetingSystemPrompt(), userMessage);
}

export async function aiGenerateRetro(projectData: string): Promise<Record<string, unknown>> {
  return call(buildRetroSystemPrompt(projectData.slice(0, 10000)), '请根据以上项目数据生成复盘报告。');
}

export async function aiAnalyzeWorkLogs(
  logs: { text: string; done: boolean }[][],
  projectName?: string,
): Promise<Record<string, unknown>> {
  const logTexts = logs.map((items, i) =>
    `[记录 ${i + 1}]\n` + items.map(item => `${item.done ? '[已完成]' : '[待办]'} ${item.text}`).join('\n')
  ).join('\n\n');

  const systemPrompt = `你是面向硬件产品研发项目经理的复盘分析助手。
根据项目的工作记录（含待办项及其完成状态），分析其中的模式和关键事件。

## 项目名称
${projectName ?? '未命名项目'}

## 工作记录（含完成状态）
${logTexts}

## 输出格式（严格 JSON）
{
  "summary": "对工作记录的整体分析摘要，指出主要的问题领域、重复出现的模式、关键转折点。200-300字。",
  "patterns": [
    { "category": "延期原因", "count": 5, "examples": ["供应商延期", "物料缺货"] },
    { "category": "变更请求", "count": 3, "examples": ["艺人要求改色", "产品需求变更"] }
  ],
  "timeline": [
    { "event": "关键事件描述", "impact": "对项目的影响" }
  ]
}

## 注意事项
- 类别包括但不限于：延期原因、供应商问题、变更请求、沟通问题、资源问题、技术风险
- 每个类别的 examples 给出 2-3 个具体例子
- timeline 提取 3-5 个关键事件节点`;

  return call(systemPrompt, '请分析以上工作记录的模式和关键事件。');
}

export async function aiGraphExtract(
  sourceType: GraphSourceType,
  sourceId: string,
  data: string,
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const raw = await callDeepSeekClient(buildExtractionPrompt(sourceType, data), '请提取实体和关系，严格按 JSON 格式输出。');
  const cleaned = repairJson(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Extraction returned non-JSON: ${cleaned.slice(0, 200)}`);
  }

  const validation = validateExtractionOutput(parsed);
  if (validation.errors.length > 0) {
    console.warn(`Extraction dropped ${validation.errors.length} invalid item(s):`, validation.errors.slice(0, 5));
  }

  const nodes = (validation.data?.nodes || []) as GraphNode[];
  const edges = (validation.data?.edges || []) as GraphEdge[];
  for (const node of nodes) fillNodeDefaults(node, sourceType, sourceId);
  for (const edge of edges) fillEdgeDefaults(edge, sourceType, sourceId);
  return { nodes, edges };
}
