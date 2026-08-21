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
