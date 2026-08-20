# 打卡

个人「任务打卡 + 积分激励 + 坏习惯惩罚」Web 应用。数据保存在浏览器 LocalStorage，无需登录。

产品说明见 [docs/prd-v0.1.md](docs/prd-v0.1.md)，架构见 [docs/architecture.md](docs/architecture.md)。

## 本地运行

```bash
npm install
npm run dev
```

打开提示的本地地址。手机和电脑浏览器均可使用。

## 在线访问

推送到 `main` 会自动跑 GitHub Actions：测试、构建，并发布到 GitHub Pages。

站点地址：https://volunteer1024.github.io/habits/

如果第一次部署失败，到仓库 **Settings → Pages → Build and deployment**，把 Source 设为 **GitHub Actions** 后再推一次或手动跑 `Deploy GitHub Pages`。

## 常用命令

```bash
npm test        # 领域与业务规则测试
npm run build   # 生产构建
```

## 技术栈

React · TypeScript · Vite · Tailwind CSS · shadcn/ui · React Router
