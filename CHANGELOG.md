# Changelog

本文件记录 Habits 的重要变更。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 SemVer。

## [Unreleased]

## [0.1.0] - 2026-08-21

### Added

- 本地优先的任务打卡 Web 应用：周期任务、积分账本、坏习惯惩罚、奖励兑换
- 今日 / 统计 / 积分 / 我的 四个页面；手机底部导航，电脑侧栏
- 统计日历展示每日积分净变动（收入为蓝、支出为红）
- 今日页可删除当天已确认的坏习惯记录，并按快照回补积分；往日记录不可改
- 通过 GitHub Actions 构建并发布 GitHub Pages（https://volunteer1024.github.io/habits/）

### Changed

- 产品名称由「打卡」改为 Habits（页面标题、应用名、npm 包名）
- 指定使用 pnpm 11.11.0 作为包管理器，并新增 `pnpm-lock.yaml`

### Fixed

- 今日页每次渲染都写入新的 store 快照，导致页面白屏死循环
- 非安全上下文（例如用局域网 IP 访问本地开发服务）缺少 `crypto.randomUUID` 时无法生成 ID
