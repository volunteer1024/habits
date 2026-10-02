# Habits

个人「任务打卡 + 积分激励 + 坏习惯惩罚」Web 应用。数据保存在浏览器 LocalStorage，无需登录。

产品说明见 [docs/prd-v0.1.md](docs/prd-v0.1.md)，架构见 [docs/architecture.md](docs/architecture.md)。

## 本地运行

```bash
npm install
npm run dev
```

打开提示的本地地址。手机和电脑浏览器均可使用。

## 在线访问

推送到 `main` 会自动跑 GitHub Actions：测试、构建，并用 **GitHub Actions** 发布 `dist`。

站点地址：https://volunteer1024.github.io/habits/

## 每日同步

打卡数据仍然只存在这台浏览器里。配置了同步地址之后，应用会在打开时、以及从后台回到前台时，把和「导出」相同的一份 JSON 备份推到云电脑上的接收服务。

- 每个本地自然日最多成功一次。同一天反复打开不会重复请求。
- 失败（断网、隧道关掉、服务没开）不会改本地打卡，也不会挡住继续使用。下次打开或回到前台会再试。
- 地址填在「我的」页的「同步地址」，保存后优先于构建变量。留空则使用构建时的 `VITE_SYNC_BASE_URL`。两个都空就不同步。
- 「我的」页的「立即同步」可以马上试一次。今天已经成功时不会再请求，并提示「今日已同步」。
- 这只是上传备份，不会把服务器上的副本合并回本机。

接收服务在 [sync-server/README.md](sync-server/README.md)。在 Grok Bot 云电脑上跑 `python3 server.py`，再用 `cloudflared` 得到临时 HTTPS 地址，把那个源填进「我的」。隧道会过期，机器休眠后公网入口会断，磁盘上的备份还在。

Pages 设置请使用：

- **Source：** GitHub Actions

不要选 Deploy from a branch 的 `main` / `(root)`，那会把源码当网站发布。

## 常用命令

```bash
npm test        # 领域与业务规则测试
npm run build   # 生产构建
```

## 技术栈

React · TypeScript · Vite · Tailwind CSS · shadcn/ui · React Router
