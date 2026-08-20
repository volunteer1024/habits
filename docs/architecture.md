# 打卡积分 v0.1 架构

## 目标

实现 [PRD v0.1](./prd-v0.1.md) 的个人打卡积分 Web 应用。第一阶段纯前端，本地持久化，但业务层不依赖 LocalStorage。

## 技术栈

- React 19 + TypeScript + Vite
- React Router
- Tailwind CSS v4
- shadcn/ui（Radix 原语）
- Vitest（领域与服务层）

## 分层

```
pages / components
        ↓
     services
        ↓
    repositories
        ↓
  AppStore + StorageAdapter
        ↓
   localStorage | memory
```

UI 禁止直接读写 `localStorage`。

## 目录

```
src/
  domain/          类型、日期、周期、ID
  data/            Store、Adapter、Repository、Seed
  services/        Task / Habit / Point / Reward / Stats / Settlement
  app/             组合根、React 订阅
  components/      布局与业务组件（ui/ 为 shadcn）
  pages/           一级页面与设置页
  lib/             cn、格式化
```

## 数据

单一 key：`checkin:v1`。

`AppStore.update` 使用 `structuredClone` 后写入，保证 React `useSyncExternalStore` 快照不可变。

Repository 接口按实体拆分（`TaskRepository`、`HabitRepository` 等），便于日后替换为 HTTP。复合写操作（完成任务 = 更新实例 + 写入流水）走 `AppStore.update`，保证一次写入。

## 周期

- `daily`：从 `startDate` 起每隔 `interval` 天
- `weekly`：ISO 周一=1 … 周日=7；从 `startDate` 所在周起每隔 `interval` 周，落在 `weekdays` 上且 `>= startDate`
- `endType: count`：按应执行次数（RRULE COUNT）截断，不是按实际完成次数

## 结算

应用启动时 `MonthlySettlementService.settleUpTo(previousMonth)`：

- 只结算早于当前自然月的月份
- 已 settled 的月份跳过
- 全勤奖按结算当时的 `monthlyPerfectBonus` 入账，并快照任务名

## UI

- 视觉参考 v0 / shadcn：CSS 变量主题、清晰层级、充足留白、石色中性底 + 蓝色完成态
- Mobile 底栏，PC 侧栏，内容 `max-width: 720px`
- 表单用 Sheet；记录坏习惯用底部 Drawer
- 完成勾选只用蓝色，未完成不加警告色
