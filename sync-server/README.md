# Habits 同步接收服务

跑在 Grok Bot 云电脑上的小服务。浏览器把当日备份 `POST` 到这里，数据写在这台机器的磁盘上。它不是 Cloudflare Workers 或 Vercel。

只使用 Python 标准库。

## 启动

```bash
cd sync-server
python3 server.py
```

默认监听 `127.0.0.1:8787`。需要改地址或端口时：

```bash
SYNC_HOST=127.0.0.1 SYNC_PORT=8787 python3 server.py
```

后台运行可以：

```bash
cd sync-server
nohup python3 server.py > server.log 2>&1 &
echo $! > server.pid
```

占用端口时可以先执行 `fuser -k 8787/tcp`。

## 数据放在哪

全部在 `sync-server/data/`（也可用环境变量 `SYNC_DATA` 指到别的目录）：

- `inbox.jsonl`：每次成功接收追加一行
- `latest.json`：最新一条完整记录
- `clients/<clientId>.json`：按浏览器保存的最新快照和 `syncedAt`

这些 json / jsonl 已在仓库 `.gitignore` 里，留在云电脑本地即可。

## 接口

- `POST /api/sync` 或 `PUT /api/sync`：正文为导出备份信封加上 `clientId`
- `GET /api/latest`：最近一次成功接收
- `GET /api/sync/<clientId>`：该浏览器的最新快照
- 跨域：`Access-Control-Allow-Origin: *`，因此 GitHub Pages（`https://volunteer1024.github.io`）可以直接调用

原型期没有登录。拿到隧道地址的人都能写入，不要把链接公开散播。

## 用 cloudflared 暴露 HTTPS

GitHub Pages 上的页面只能请求 HTTPS。在云电脑上另开一个终端：

```bash
cloudflared tunnel --url http://127.0.0.1:8787 --no-autoupdate
```

终端里出现的 `https://*.trycloudflare.com` 就是当次公网入口。把这个源（不要带路径，不要带末尾斜杠）填到应用「我的」页的同步地址，或在构建前端时设置 `VITE_SYNC_BASE_URL`。

这条隧道是临时的。`cloudflared` 退出、云电脑休眠或进程被关掉之后，公网入口会失效，页面上的同步会失败并等到下次再试。磁盘上的 `sync-server/data/` 还在；机器醒来后重新跑服务和隧道，把新的 `https://….trycloudflare.com` 填回「我的」即可。
