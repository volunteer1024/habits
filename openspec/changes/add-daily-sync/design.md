## Context

领域数据经 `LocalStorageAdapter` 存在 `checkin:v1`。导出信封在 `src/domain/backup.ts`：`createBackup` / `serializeBackup` / `parseBackup`，模式版本为 `1`。`MePage` 已接导入与导出。界面不直接碰 LocalStorage。见 proposal.md。

用户否决了「不要把接收服务放在 Grok Bot」的旧建议。本期接收端是仓库里的 `sync-server/`，在该云电脑上跑，并用临时 HTTPS 隧道给 GitHub Pages 调用。

## Goals / Non-Goals

**Goals:**

- 用现有备份信封组请求，成功日按 `clock.today()` 的本地日历日去重。
- 同步元数据与领域文档分开，页面只调服务。
- 提供与感知演示相同风格的标准库 HTTP 服务：追加日志、覆盖最新记录，并按 `clientId` 留快照。

**Non-Goals:**

- 不从服务器拉回并覆盖本机。
- 不把隧道域名写进仓库。隧道地址每次启动都会变，由用户填到「我的」或构建变量。

## Decisions

### 1. 元数据用单独的本地键

键名 `checkin:sync:v1`，JSON：`clientId`、`baseUrl`（用户保存的地址，可空）、`lastSuccessDay`（`YYYY-MM-DD`）、`lastSyncAt`（成功时的 ISO 时间）。缺省时生成一次 `clientId`（优先 `crypto.randomUUID`，否则沿用应用里已有的非安全上下文回退）。

页面与同步服务都不读 `checkin:v1` 的原始字符串。同步服务只读 `AppStore.getSnapshot()`。写元数据不调用 `AppStore.update`，避免打卡订阅被同步刷新带进循环。

备选：把 `lastSuccessDay` 放进 `AppState`。那会改变 `checkin:v1`，并进入导出文件。

### 2. 请求正文是备份信封加 clientId

```json
{
  "clientId": "…",
  "schemaVersion": 1,
  "exportedAt": "2026-10-02T00:00:00.000Z",
  "state": {}
}
```

`schemaVersion`、`exportedAt`、`state` 来自 `createBackup(snapshot, clock.nowIso())`。发送前用 `parseBackup(serializeBackup(pack))` 走同一套校验；校验失败则视为本次失败，不改领域数据，也不记成功日。HTTP 正文是 UTF-8 JSON，不附加文件导出用的 BOM。

地址解析：去掉首尾空白和末尾 `/`。用户保存的 `baseUrl` 优先于 `import.meta.env.VITE_SYNC_BASE_URL`。空字符串表示未配置。请求 `POST {base}/api/sync`，`Content-Type: application/json`。仅 2xx 算成功。

备选：滚动 24 小时。用户要求的是自然日，测试也更好写。

### 3. 检查时机与在途锁

`AppProvider` 在 `bootstrap` 成功后调用一次自动同步，并监听 `visibilitychange`，仅在 `document.visibilityState === 'visible'` 时再查。用模块级在途标记合并「刚加载又立刻可见」的两次触发。不使用定时轮询。

自动结果：`ok` 时 `toast.success('已备份到云电脑')`；`skipped` 与失败都不提示。手动结果：`ok` 同样弱提示；今日已成功则 `toast('今日已同步')` 且不发请求；失败则 `toast.error('同步失败，稍后再试')`。两种路径都不抛到打卡流程。

### 4. 「我的」页

在导入/导出附近增加同步地址输入、保存，以及「立即同步」。保存只写元数据。清空地址后自动与手动都不再请求。

### 5. 接收服务

`sync-server/server.py`，只依赖 Python 标准库，结构照 `sense-demo` 的 `ThreadingHTTPServer`。

- 默认 `127.0.0.1:8787`，可用环境变量 `SYNC_HOST`、`SYNC_PORT` 覆盖。
- `POST` 与 `PUT /api/sync`：JSON 对象必须有非空 `clientId`（`^[A-Za-z0-9_-]{8,80}$`）、`schemaVersion === 1`、非空 `exportedAt`，以及含八个数组的 `state`。通过后加锁：追加 `data/inbox.jsonl` 一行 `{clientId, syncedAt}`，覆盖 `data/latest.json`，覆盖 `data/clients/<clientId>.json`（含 `clientId`、`syncedAt`、收到的信封）。`syncedAt` 为 UTC ISO，后缀 `Z`。
- 非法正文返回 400，不改已有文件。
- `GET /api/latest`、`GET /api/sync/<clientId>`。
- `OPTIONS` 返回 204。`Access-Control-Allow-Origin: *`，方法含 `GET, POST, PUT, OPTIONS`，允许 `Content-Type`。
- `data/` 不提交快照，只保留目录说明。

备选：再包一层账号 token。本期没有账号，规格不要求。

### 6. 云电脑暴露方式

`sync-server/README.md` 写明：后台启动 `server.py`、数据在 `sync-server/data/`、用 `cloudflared tunnel --url http://127.0.0.1:8787` 得到 `https://*.trycloudflare.com`，把该源（不含路径）填进应用。注明链接临时、进程退出或机器休眠后公网入口断开，盘上文件还在。

## Risks / Trade-offs

- [隧道域名经常变] → 不写死域名；「我的」页可改，改完即可再同步。
- [机器休眠后 Pages 上传失败] → 失败不记成功日，醒来并重新开隧道后下次打开会再试。
- [CORS `*` 谁都能写这份盘] → 原型期接受；快照没有登录口令，README 写明不要把隧道链接公开散播。
- [打开时读快照并请求网络] → 请求不写 store；在途锁避免同一次可见性打两次。
- [GitHub Pages 构建变量是空的] → 默认同步关闭，直到用户在「我的」填写当前隧道地址。不在 Actions 里绑死会过期的域名。

## Migration Plan

现有 `checkin:v1` 不用迁移。回滚时去掉自动同步调用即可，领域数据不受影响。接收服务是旁路进程，不部署也不影响 Pages。

## Open Questions

无。隧道的具体主机名要等云电脑当次启动后才知道，不阻塞实现。
