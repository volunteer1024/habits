这个目录存放云电脑上的同步数据，快照文件不要提交到 git。

- `inbox.jsonl`：每次成功接收追加一行，含 `clientId` 和 `syncedAt`
- `latest.json`：最近一次成功接收的完整记录（覆盖写）
- `clients/<clientId>.json`：每个浏览器一份最新快照，含 `syncedAt` 和备份正文
