# PM OS — 研发项目经理全流程工作台

AI 辅助的 IPD 研发项目全流程管理工具。桌面优先，本地存储，离线可用。

## 技术栈

Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + Dexie.js (IndexedDB) + GSAP + DeepSeek API

## 开发

```bash
npm run dev      # 开发服务器 (localhost:3000)
npm run build    # 生产构建
```

## 部署（双部署）

- **Demo**（静态导出，国内直连）: Cloudflare Pages → https://demo.pm-os.pages.dev
  构建：`NEXT_PUBLIC_DEMO_MODE=true NEXT_STATIC_EXPORT=true npm run build`，部署：`npx wrangler pages deploy out/ --project-name pm-os --branch demo`
- **完整版**（SSR + AI API 路由）: Vercel → https://pm-os-eight.vercel.app
  构建：`npm run build`，部署：`npx vercel@latest --prod --token $VERCEL_TOKEN`
- 部署后必须按 `01-Projects/pm-os/_memory/pm-os-deploy.md` 验证清单走浏览器检查

## 项目结构

- `src/types/index.ts` — 所有数据模型类型
- `src/db/database.ts` — Dexie IndexedDB schema
- `src/lib/ipd.ts` — IPD 阶段/里程碑/准出标准定义
- `src/lib/ai.ts` — DeepSeek API 调用封装（含重试/JSON 修复）
- `src/lib/prompt.ts` — AI prompt 模板
- `src/lib/insights.ts` — 客户端数据收集 + 预检查逻辑（逻辑判断在客户端，AI 只做自然语言解读）
- `src/lib/graph/` — 知识图谱：抽取（extract-api.ts server / extraction.ts client）、BFS 遍历（traversal.ts）、存储（store.ts）、类型注册表（types.ts）
- `src/components/layout/` — AppShell, Sidebar, ProjectHeader
- `src/components/schedule/` — TaskList, TaskForm, GanttChart
- `src/components/dashboard/` — AIInsightsCard（三 Agent 结果展示）
- `src/app/api/ai/` — AI API routes（risk/cost/schedule/generate-retro/analyze-meeting/analyze-work-logs + graph/extract）

## 数据模型

15 张表：projects, milestones, tasks, meetings, retrospectives, changeRecords, bomItems, procurementCandidates, certRequirements, milEntries, workLogs + 图 4 张（graphNodes, graphEdges, extractionMeta, kbImages）。当前 schema 版本 v5。

## 已知设计约束（别破坏）

- **Demo 模式**：`NEXT_PUBLIC_DEMO_MODE` 静态导出，编辑功能用 NonDemoOnly 包裹；Demo 预灌 IndexedDB 数据
- **API 路由禁止 import Dexie**（Edge runtime 会 500）——图检索全在客户端，API 只收已组装的字符串
- **抽取节点 ID 格式**：`proj--{entityType}--{label}--{projectId前8位}`（prompt 要求，但 LLM 不总是遵守——跨项目合并不依赖此格式）
- **Edge ID 必须用完整节点 ID 拼接**（短切片会碰撞覆盖同型边，2026-08-01 修复）
