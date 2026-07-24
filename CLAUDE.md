# PM OS — 研发项目经理全流程工作台

AI 辅助的 IPD 研发项目全流程管理工具。桌面优先，本地存储，离线可用。

## 技术栈

Next.js 15 (App Router) + TypeScript + Tailwind CSS + Dexie.js (IndexedDB) + DeepSeek API

## 开发

```bash
npm run dev      # 开发服务器 (localhost:3000)
npm run build    # 生产构建
```

## 部署

Cloudflare Pages，国内直连。

## 项目结构

- `src/types/index.ts` — 所有数据模型类型
- `src/db/database.ts` — Dexie IndexedDB schema
- `src/lib/ipd.ts` — IPD 阶段/里程碑/准出标准定义
- `src/lib/ai.ts` — DeepSeek API 调用封装
- `src/lib/prompt.ts` — AI prompt 模板
- `src/components/layout/` — AppShell, Sidebar, ProjectHeader
- `src/components/schedule/` — TaskList, TaskForm, GanttChart
- `src/app/api/ai/` — AI API routes

## 数据模型

9 张表：projects, milestones, tasks, meetings, retrospectives, changeRecords, bomItems, procurementCandidates, certRequirements
