-- PM OS 同步存储
-- 单表 JSON 列：所有查询在前端 IndexedDB，D1 只做存储/备份/跨设备传输

CREATE TABLE IF NOT EXISTS sync_rows (
  tbl        TEXT NOT NULL,               -- 15 张业务表名（白名单校验）
  id         TEXT NOT NULL,               -- 行主键
  data       TEXT NOT NULL,               -- 整行 JSON（含 id）
  updated_at INTEGER NOT NULL,            -- 客户端单调时钟（last-write-wins 依据）
  PRIMARY KEY (tbl, id)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS sync_meta (
  k TEXT PRIMARY KEY,                     -- 'revision' | 'device_id'
  v TEXT NOT NULL
);
