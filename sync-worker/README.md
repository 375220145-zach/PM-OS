# pm-os-sync — PM OS 数据同步 + AI 转发 Worker

Cloudflare Workers + D1。三路由：

| 路由 | 方法 | 说明 |
|---|---|---|
| `/api/sync/pull` | GET | 全量拉取 `{ revision, rows: { tbl: [...] } }` |
| `/api/sync/push` | POST | 增量变更 `{ changes: [{ t, k, op, obj, ts }] }`，batch 原子 |
| `/api/ai/chat` | POST | DeepSeek 转发 `{ systemPrompt, userMessage } → { content }` |

## 部署（一次性）

```bash
cd sync-worker

# 1. 创建 D1 数据库，把输出的 database_id 填入 wrangler.toml
npx wrangler d1 create pm-os-db

# 2. 建表
npx wrangler d1 execute pm-os-db --remote --file=schema.sql

# 3. 密钥（CLIENT_SECRET 用 32+ 字符随机串，与前端 NEXT_PUBLIC_CLIENT_SECRET 同值；
#    DEEPSEEK_API_KEY 是 DeepSeek 官方 key）
npx wrangler secret put CLIENT_SECRET
npx wrangler secret put DEEPSEEK_API_KEY

# 4. 部署，拿 workers.dev URL 填入前端 NEXT_PUBLIC_API_BASE
npx wrangler deploy
```

本地联调：`npx wrangler dev`（local D1，数据可 `npx wrangler d1 execute pm-os-db --local --command "SELECT count(*) FROM sync_rows"` 查看）。

## 安全与限制（必须知道）

- **CLIENT_SECRET 在前端 bundle 中可见**（构建时注入）。泄露 = 任何人可读写你的数据。个人使用接受此风险，但：用长随机串、不与其他项目复用、必要时换密钥
- **last-write-wins**：双设备同时编辑同一行，后推送者覆盖。个人使用请避免同时开两个 tab/设备编辑
- **D1 是备份/恢复介质 + 跨设备传输层**，不是可查询数据库（JSON 黑盒）；要查询请回到前端应用或手动导出
- **数据存储位置**：Cloudflare 全球网络（D1 默认节点）
- push 单请求上限 1000 条变更（个人使用远低）

## 手动逃生门

- 全量导出：`npx wrangler d1 execute pm-os-db --remote --command "SELECT tbl, id, data FROM sync_rows"`
- 清空云端：`npx wrangler d1 execute pm-os-db --remote --command "DELETE FROM sync_rows"`
