## 1. 同步元数据

- [x] 1.1 增加独立于 `checkin:v1` 的同步记录（键 `checkin:sync:v1`）：`clientId`、可选 `baseUrl`、`lastSuccessDay`、`lastSyncAt`；首次读取用 `createId()` 生成并保存 `clientId`
- [x] 1.2 提供可注入的读写接口，测试使用内存实现，页面与组件不直接访问 LocalStorage

## 2. 同步行为

- [x] 2.1 用 `createBackup` 组装正文，并在发送前用 `parseBackup(serializeBackup(...))` 校验；正文额外带 `clientId`，不写 BOM，不改领域状态，也不把同步字段写入导出文件
- [x] 2.2 解析地址：用户保存的地址优先于 `VITE_SYNC_BASE_URL`，去掉空白和末尾 `/`；两者都空则不发请求
- [x] 2.3 仅当 `lastSuccessDay` 不是 `clock.today()` 时 `POST {base}/api/sync`；只有 2xx 才写入 `lastSuccessDay` 与 `lastSyncAt`；失败、超时或校验失败保持原成功日
- [x] 2.4 同一时刻只允许一次在途同步。自动同步：成功弱提示「已备份到云电脑」，跳过和失败都不提示。手动同步：今日已成功则不请求并提示「今日已同步」；失败提示「同步失败，稍后再试」

## 3. 测试

- [x] 3.1 Vitest：已配置地址且今天未成功时发出一次请求，正文含 `schemaVersion`、`exportedAt`、八个集合和稳定的 `clientId`；成功后同日再次调用不再请求
- [x] 3.2 Vitest：请求失败或非 2xx 时不改 `lastSuccessDay`，领域快照不变，随后可以再试并在成功后记今日
- [x] 3.3 Vitest：无地址不请求；用户地址覆盖默认地址；手动同步在今日已成功时不请求；导出 JSON 不含 `clientId` 与同步地址

## 4. 界面

- [x] 4.1 `AppProvider` 在 bootstrap 成功后自动检查一次，并在页面变为可见时再检查；不轮询，不在渲染期间写 store
- [x] 4.2 「我的」页可保存或清空同步地址，并有「立即同步」；文案为中文

## 5. 接收服务

- [x] 5.1 新增 `sync-server/server.py`：标准库 `ThreadingHTTPServer`，默认 `127.0.0.1:8787`（`SYNC_HOST` / `SYNC_PORT` 可覆盖）
- [x] 5.2 `POST` 与 `PUT /api/sync` 校验 `clientId`、`schemaVersion === 1`、`exportedAt` 和八个数组；通过后追加 `data/inbox.jsonl`、覆盖 `data/latest.json` 与 `data/clients/<clientId>.json`（含 `syncedAt`）；非法请求 400 且不改已有快照
- [x] 5.3 `GET /api/latest`、`GET /api/sync/<clientId>`、`OPTIONS`；CORS 为 `*`，允许 `GET, POST, PUT, OPTIONS` 与 `Content-Type`
- [x] 5.4 `sync-server/README.md` 写明启动、数据目录，以及 `cloudflared tunnel --url http://127.0.0.1:8787`；说明隧道临时，进程退出或机器休眠后公网入口失效，盘上文件仍在

## 6. 文档

- [x] 6.1 根 README 说明如何配置同步 URL、每日最多成功一次、离线仍可打卡、如何手动同步，并指向 `sync-server/`
- [x] 6.2 CHANGELOG Unreleased 记录每日同步
