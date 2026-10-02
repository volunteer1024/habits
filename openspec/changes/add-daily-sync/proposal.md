## Why

打卡数据只在本机 LocalStorage（`checkin:v1`）。换机、清站点数据或浏览器损坏会丢掉任务、打卡、积分和奖惩。已有 JSON 全量导出/导入，但要人手动下载。用户要求：打开应用时，每个自然日最多成功把同一份备份推一次到「Grok Bot 云电脑」上的接收服务，作为当日备份。

## What Changes

- 前端复用现有导出 pack（`schemaVersion`、`exportedAt`、`state`）做校验与序列化，另带本机生成的 `clientId`。
- 用独立于 `checkin:v1` 的本地记录保存 `lastSyncAt`、`clientId` 和可选的同步地址。同一本地自然日已成功同步则不再请求；失败不改 `lastSyncAt`，下次打开或回到前台再试。
- App 完成加载后，以及页面变为可见时做一次检查。成功只给弱提示。失败不打断打卡。
- 「我的」页可填写同步 base URL，并提供手动同步。未配置地址时不同步。
- 仓库提供可在 Grok Bot 云电脑上运行的 Python 标准库接收服务：`POST`/`PUT /api/sync` 按 `clientId` 存最新快照和 `syncedAt`，并追加日志。CORS 在原型期放开 `*`（覆盖 GitHub Pages 域名）。
- README 写明如何配置地址、每日限频、离线行为、手动触发，以及云电脑启动、落盘和 `cloudflared` 临时隧道（机器休眠或隧道停止后公网入口失效）。

## Capabilities

### New Capabilities

- `daily-sync`: 每个本地自然日最多成功上传一次完整备份；失败不改本地数据；可配置接收地址并手动再试。

### Modified Capabilities

- （无。导出文件格式、导入确认和打卡规则不变。）

## Non-goals

- 不做多端 CRDT 或实时双向合并。服务器副本不自动覆盖本机。
- 本期不改用 Cloudflare Workers、Vercel 或其他托管作为接收端。用户明确要求同步到这台 Grok Bot 云电脑；临时隧道不是长期生产入口。
- 不新增账号体系。`clientId` 只标识这一浏览器。
- 不改 `checkin:v1` 的文档形状，也不把同步元数据写进导出文件。
- 不在界面直接读写 LocalStorage。

## Impact

- 前端：同步服务、可见性检查、「我的」页地址与手动同步；`VITE_SYNC_BASE_URL` 作为默认地址。
- 测试：Vitest 覆盖同日跳过、失败可重试、断网不改本地状态。
- 新增 `sync-server/`：标准库 HTTP 服务与说明。
- 文档：根 README 与 CHANGELOG。
