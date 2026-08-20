# 打卡积分 Web App PRD v0.1

## 1. 产品概述

### 1.1 产品定位

一个面向个人使用的「任务打卡 + 积分激励 + 坏习惯惩罚」Web 应用。

核心机制：

- 完成长期任务 → 获得积分 → 累积积分 → 兑换自己想要的奖励
- 发生坏习惯 → 扣除积分 → 延迟奖励兑换

第一阶段不接入服务端、不做登录注册、不做多用户，仅使用浏览器本地数据存储，但代码的数据访问层需要提前抽象，后续可以无缝替换为 HTTP API。

要求同时支持：

- Mobile Web
- PC Web
- 响应式布局
- 本地数据持久化
- PWA 暂不作为 MVP 强制要求

## 2. MVP 目标

MVP 的核心目标不是搭建完整习惯管理系统，而是确保从明天开始可以真实使用。

核心闭环：

```
创建周期任务
    ↓
每天打开首页
    ↓
查看今日任务
    ↓
逐项完成任务
    ↓
获得积分
    ↓
记录坏习惯
    ↓
扣除积分
    ↓
查看周/月完成情况
    ↓
积累足够积分
    ↓
兑换奖励
```

第一版必须保证以下链路完整：

1. 今日任务生成
2. 今日任务完成
3. 完成任务获得积分
4. 坏习惯记录并扣分
5. 查看当前积分
6. 创建/查看奖励
7. 使用积分兑换奖励
8. 周统计
9. 月统计
10. 日期视图
11. 任务设置
12. 月度全勤奖励
13. 数据刷新页面后仍然存在

## 3. 信息架构

主导航设置为 4 个 Tab：

- 今日
- 统计
- 积分
- 我的

Mobile：底部 TabBar。

PC：左侧 Sidebar。

路由：

- `/today`
- `/stats`
- `/points`
- `/me`
- `/settings/tasks`
- `/settings/tasks/new`
- `/settings/tasks/:id`
- `/settings/habits`
- `/settings/habits/new`
- `/settings/habits/:id`
- `/rewards/new`
- `/rewards/:id`

默认进入：`/today`

## 4. 今日页面

### 4.1 页面目标

每天打开应用后，用户能够立刻知道：

- 今天有哪些任务
- 哪些已经完成
- 完成可以得到多少积分
- 今天发生过哪些坏习惯
- 当前积分是多少

避免在首页展示过多统计信息。

### 4.2 今日任务

示例：

```
8 月 21 日 星期五
今天
○ 背单词                     +5
○ 早睡（昨晚）               +10
○ 喝药                       +1
```

完成后：

```
✓ 背单词                     +5
✓ 早睡（昨晚）               +10
○ 喝药                       +1
```

完成状态使用蓝色作为主要视觉反馈。未完成不使用警告色。

## 5. 「早睡」特殊规则

早睡属于一个特殊的 Daily Task。

例如业务日期 `2026-08-21` 时，首页展示「早睡（昨晚）」。这里记录的实际行为是 8 月 20 日晚上是否早睡。

为了简化任务生成、统计和积分逻辑：

```
businessDate = 2026-08-21
```

即：用户在今天确认「昨晚是否早睡」，完成记录属于今天的任务实例。

数据模型中可以增加 `recordOffsetDays: -1`。

- 普通任务：`recordOffsetDays: 0`
- 早睡：`recordOffsetDays: -1`

MVP 中该字段主要用于 UI 文案，不影响积分日期。

## 6. 任务模型

```ts
interface Task {
  id: string
  name: string
  points: number
  monthlyPerfectBonus: number
  schedule: ScheduleRule
  recordOffsetDays: number
  status: 'active' | 'archived'
  createdAt: string
  updatedAt: string
}
```

`points` 代表每次完成任务获得的积分。例如：背单词 5、早睡 10、喝药 1。

## 7. 周期规则

不使用传统 Cron 表达式。本产品需要描述的是：从某天开始，按规则执行，可在完成 N 次后结束。

数据结构采用类似 iCalendar RRULE 的方式：

```ts
interface ScheduleRule {
  frequency: 'daily' | 'weekly'
  interval: number
  startDate: string
  weekdays?: number[]
  endType: 'never' | 'count'
  count?: number
}
```

每天背单词：

```json
{
  "frequency": "daily",
  "interval": 1,
  "startDate": "2026-08-21",
  "endType": "never"
}
```

每周一三五健身：

```json
{
  "frequency": "weekly",
  "interval": 1,
  "weekdays": [1, 3, 5],
  "startDate": "2026-08-21",
  "endType": "never"
}
```

`weekdays` 使用 ISO 约定：周一 = 1，周日 = 7。

坚持 100 次：

```json
{
  "frequency": "daily",
  "interval": 1,
  "startDate": "2026-08-21",
  "endType": "count",
  "count": 100
}
```

`endType: 'count'` 表示按周期规则生成的应执行次数达到 N 次后不再生成新实例（RRULE COUNT），而不是按完成次数截断。

## 8. 新建任务

进入：我的 → 任务管理 → 新建任务

字段：

| 字段 | 规则 |
| --- | --- |
| 任务名称 | 必填 |
| 每次完成积分 | 必填，默认 5，`>= 0` |
| 月度全勤奖励 | 默认 0 |
| 开始日期 | 默认今天，`startDate >= today`，不支持新建历史任务 |
| 周期 | 每天；或每周并多选周一至周日 |
| 结束规则 | 永不结束；或完成 N 次后结束 |

暂时不实现复杂规则（每月最后一个星期五、每个月第三个工作日、每 3 个月等）。

## 9. 任务实例

Task 是任务定义。真正每天打卡的是 `TaskInstance`。

```ts
interface TaskInstance {
  id: string
  taskId: string
  businessDate: string
  status: 'pending' | 'completed'
  completedAt?: string
  lockedPoints?: number
  taskNameSnapshot?: string
}
```

例如「背单词」是 Task；`2026-08-20 背单词`、`2026-08-21 背单词` 是两个独立 TaskInstance。

## 10. 完成任务

点击未完成任务后变为已完成，同时增加积分并生成一笔积分流水。

第一次完成时锁定：`lockedPoints = 当前 Task.points`。

## 11. 积分锁定规则

修改任务永远不能改变已经发生的历史。

假设背单词原积分 5，今天已经完成 +5，随后改为 10：

- `08-21` 仍然 +5
- `08-22` 开始 +10

### 11.1 今日尚未完成

今日尚未完成时把 5 改为 10，今天完成按 +10。未完成的今日任务使用最新积分。

### 11.2 今日已经完成

今日已经完成后把 5 改为 10，今日仍然 +5。新的积分从后续未完成任务开始生效。

## 12. 撤销完成

MVP 支持当天撤销，避免误操作。历史日期不允许修改。

再次点击已完成任务会撤销：积分 -`lockedPoints`，但 `lockedPoints` 不删除。

因此第一次完成锁定 5 之后，即使 `Task.points = 10`，当天再次完成仍然 +5。

规则：今日任务只要曾经完成过，其积分就已经锁死。

## 13. 编辑任务规则

原则：修改任务永远不能改变已经发生的历史。

允许修改：名称、单次积分、月度全勤奖励、周期、结束次数。

对于已经完成的 TaskInstance：任务名称快照、积分快照、完成日期、积分流水全部保持不变。

删除任务实际执行 archive，而不是物理删除，因此历史统计仍然存在。

## 14. 坏习惯

坏习惯和普通任务分开管理。

```ts
interface BadHabit {
  id: string
  name: string
  penalty: number
  status: 'active' | 'archived'
  createdAt: string
  updatedAt: string
}
```

例如：手冲 -20，喝奶茶 -10，喝碳酸饮料 -5，喝酒 -20。`penalty` 存储为正数，记账时使用负数 delta。

## 15. 记录坏习惯

首页任务下面增加「坏习惯 / + 记录一次」。

点击后弹出列表，选择后立即扣分并生成：

```ts
interface BadHabitLog {
  id: string
  habitId: string
  businessDate: string
  habitNameSnapshot: string
  penaltySnapshot: number
  createdAt: string
}
```

同一个坏习惯一天允许记录多次。例如喝奶茶 ×2 则 -20。

## 16. 坏习惯积分修改

与任务逻辑一致。每一次 `BadHabitLog` 都保存 `penaltySnapshot`。历史记录不因后续改价而变化。

## 17. 积分系统

积分不能通过「当前任务积分 × 完成次数」实时计算，必须采用 Ledger / 积分流水模型。

```ts
interface PointTransaction {
  id: string
  type:
    | 'task_complete'
    | 'task_undo'
    | 'bad_habit'
    | 'reward_redeem'
    | 'monthly_bonus'
  delta: number
  sourceId: string
  description: string
  businessDate: string
  createdAt: string
}
```

当前积分：`SUM(PointTransaction.delta)`。

## 18. 积分允许为负数

当前积分可以 `< 0`。坏习惯仍然应该真实反映惩罚。

兑换奖励必须满足：`currentPoints >= reward.cost`。

## 19. 积分页面

顶部展示「我的积分」与当前余额。下方展示奖励列表。

积分不足时展示「当前 x / 需要 y」，兑换按钮 Disabled。

## 20. 奖励模型

```ts
interface Reward {
  id: string
  name: string
  cost: number
  maxRedemptions: number | null
  status: 'active' | 'archived'
  createdAt: string
  updatedAt: string
}
```

`maxRedemptions = null` 代表无限次。

## 21. 奖励兑换

兑换时生成：

```ts
interface RewardRedemption {
  id: string
  rewardId: string
  rewardNameSnapshot: string
  costSnapshot: number
  redeemedAt: string
}
```

并增加积分流水：`reward_redeem`，`delta = -costSnapshot`。

## 22. 修改奖励规则

已经发生的兑换使用快照成本，不因后续改价而变化。以后兑换使用新价格。

## 23. 最大兑换次数

默认无限制，也可以设置为 1 / 3 / 10 次。

规则：`historicalRedemptionCount >= maxRedemptions` 则禁止继续兑换。

如果已经兑换 3 次后把上限改为 2：历史 3 次仍然有效，不退款、不回滚、不修改积分，但以后不能继续兑换。如果改为 5，还可以兑换 2 次。

## 24. 月度全勤奖励

每个 Task 包含 `monthlyPerfectBonus`，默认 0。

## 25. 全勤判定

采用自然月。任务在该月所有「应该执行」的日期全部完成：

```
completedOccurrences = scheduledOccurrences
```

对于周一 / 周三 / 周五健身，并不要求每天健身，只要求这个月所有周一、周三、周五都完成。

## 26. 完整月规则

为避免月中建任务后靠月末几天拿全勤奖，MVP 定义：

任务必须在该自然月第一天已经处于 Active 状态，并且整个自然月没有提前结束，才有资格获得月度全勤。

例如 8 月 15 日创建背单词任务，则 8 月不参与全勤奖，9 月开始参与。

「提前结束」包括：任务在该月结束日前被归档，或 `endType: count` 使得最后一次应执行日期早于该月最后一天。

## 27. 全勤奖励结算

MVP 没有服务器，采用 Lazy Settlement：每次用户打开应用时，检查是否存在尚未结算的历史月份。

若某月尚未结算：

1. 计算全勤任务
2. 发放全勤积分
3. 写入积分流水
4. 将该月标记为 settled

重复打开不会重复发积分。当前自然月不结算。

## 28. 统计页面

页面顶部：本周 | 本月。默认本周。

## 29. 本周统计

展示本周完成率（应完成 / 实际完成 / 百分比），以及按任务拆分的次数。MVP 不需要复杂图表。

周从周一开始，到周日结束。

## 30. 本月统计

展示自然月完成率与按任务拆分。如果存在全勤任务，显示当前进度与奖励积分。

## 31. 日期视图

统计页下方提供自然月日历，表头为：一 二 三 四 五 六 日。

支持任务筛选：全部任务，以及每个活跃任务。

### 31.1 单任务模式

当天完成 → 蓝色标记；当天未完成 → 不标记；当天无任务 → 不标记。不出现红色叉号。

### 31.2 全部任务模式

如果当天所有应该执行的正向任务全部完成，则蓝色标记，否则不标记。

## 32. 积分流水

积分页面下面增加「最近记录」，按业务日期分组展示最近流水。MVP 只展示最近记录。

## 33. 我的

最右侧 Tab。顶部固定用户信息。

- 头像：孤笑（纯色圆形）
- 用户名：孤笑
- ID：`ID: 0000001`

本期没有用户体系。不要提供修改头像、修改用户名、登录、注册、退出登录。

## 34. 我的页面菜单

- 任务管理 >
- 坏习惯管理 >
- 导入 >（占位，点击提示「功能开发中」）
- 导出 >（占位，点击提示「功能开发中」）
- 关于 >（展示「打卡 / Version 0.1.0」）

任务管理、坏习惯管理为 MVP 实现。

## 35. 默认任务

首次打开应用且本地无数据时，自动初始化：

| 名称 | 周期 | 积分 | 月度全勤 | recordOffsetDays | 开始日期 | 结束 |
| --- | --- | --- | --- | --- | --- | --- |
| 背单词 | 每天 | +5 | 0 | 0 | 首次使用当天 | 永不 |
| 早睡 | 每天 | +10 | 0 | -1 | 首次使用当天 | 永不 |
| 喝药 | 每天 | +1 | 0 | 0 | 首次使用当天 | 永不 |

不默认创建健身任务。

## 36. 默认坏习惯

- 手冲 -20 / 次
- 喝奶茶 -10 / 次
- 喝碳酸饮料 -5 / 次
- 喝酒 -20 / 次

全部 `status = active`。

## 37. 默认奖励

- 按摩：600 积分，无限次
- 任意 200 元电子产品：200 积分，无限次

## 38. 初始积分

首次安装为 0。积分完全由任务、坏习惯、月度全勤、兑换奖励产生变化。

## 39. 数据存储

MVP 使用 LocalStorage。推荐单一 Store key：`checkin:v1`。

## 40. 数据访问层必须抽象

UI 层禁止直接 `localStorage.getItem()`。

```
Page → Service → Repository → LocalStorageAdapter
```

例如：

```ts
interface TaskRepository {
  list(): Promise<Task[]>
  get(id: string): Promise<Task | null>
  create(task: Task): Promise<Task>
  update(id: string, patch: Partial<Task>): Promise<Task>
  archive(id: string): Promise<void>
}
```

实现：`class LocalTaskRepository implements TaskRepository {}`

以后接服务器只需要 `class HttpTaskRepository implements TaskRepository {}`。

## 41. Service 划分

至少抽象：

- `TaskService`：周期计算、今日任务、完成、撤销、编辑
- `HabitService`：坏习惯定义、记录坏习惯
- `PointService`：积分流水、当前积分
- `RewardService`：奖励、兑换、兑换次数
- `StatsService`：周统计、月统计、日历统计
- `MonthlySettlementService`：检查完整自然月、发放全勤积分、避免重复结算

## 42. 本地数据 Key

维护一个完整 Store：

```
checkin:v1
```

```ts
interface AppState {
  tasks: Task[]
  taskInstances: TaskInstance[]
  habits: BadHabit[]
  habitLogs: BadHabitLog[]
  rewards: Reward[]
  redemptions: RewardRedemption[]
  pointTransactions: PointTransaction[]
  settlements: MonthlySettlement[]
}
```

```ts
interface MonthlySettlement {
  yearMonth: string
  settledAt: string
  awardedTaskIds: string[]
}
```

## 43. 日期标准

业务日期统一使用 `YYYY-MM-DD`。始终使用浏览器当前本地日期生成 `businessDate`。

禁止通过 `new Date().toISOString().slice(0, 10)` 计算业务日期。

## 44. 数据不可变原则

以下数据一旦产生，就不能因为配置修改而变化：

- 已经完成任务的积分
- 历史任务名称快照
- 坏习惯历史扣分
- 奖励历史兑换成本
- 历史积分流水
- 历史全勤奖励

核心原则：Configuration 可以修改，Event 不修改。

## 45. 响应式设计

Mobile：顶部页面标题、内容区域、底部 TabBar。

PC：左侧 Sidebar + 内容区。内容区 `max-width: 720px`。

## 46. MVP 页面清单

P0：今日、统计、积分、我的、任务列表、新建任务、编辑任务、坏习惯列表、新建坏习惯、编辑坏习惯、新建奖励、编辑奖励。

新建/编辑可使用 Sheet / Dialog。

## 47. 推荐交互结构

- 新建/编辑任务：Drawer / Sheet，复用 `TaskForm`
- 坏习惯记录：Bottom Sheet
- 奖励创建：Drawer / Sheet

真正的一级页面：`TodayPage`、`StatsPage`、`PointsPage`、`MePage`。

## 48. 明天可用版本——P0

- P0-1 数据基础：AppState、Repository、LocalStorageAdapter、默认数据 Seed
- P0-2 Today：今日任务、完成/撤销、积分、坏习惯
- P0-3 Points：当前积分、奖励、兑换、流水
- P0-4 Stats：周/月完成率、按任务统计、月历蓝色完成标记
- P0-5 Management：任务/坏习惯/奖励的创建、修改、归档
- P0-6 Monthly Bonus：月度全勤判断、Lazy Settlement

## 49. 第一版明确不做

登录、注册、服务端、数据库、云同步、多设备同步、社交、好友、排行榜、Push、邮件/短信/任务提醒、任务分类/标签、连续打卡 Streak、成就/等级、任务备注/图片、奖励图片、自定义头像、深色模式、导入导出、数据分析图表、复杂 RRULE、补卡、历史修改。

## 50. MVP 核心验收场景

### Case 1：首次打开

应看到背单词 +5、早睡 +10、喝药 +1，当前积分 0。

### Case 2：完成背单词

点击后 ✓，积分 0 → 5，刷新页面仍然是 ✓。

### Case 3：坏习惯

选择喝奶茶，积分 5 → -5，刷新后仍然是 -5。

### Case 4：修改积分（已完成）

背单词今日已完成 +5，改为 +10 后今天仍然 +5，明天 +10。

### Case 5：修改积分（未完成）

今日尚未完成时改为 +10，今天完成 +10。

### Case 6：兑换奖励

当前 250，兑换任意 200 元电子产品后 250 → 50，产生 -200 积分流水。

### Case 7：修改奖励价格

已兑换一次 200 后改为 300，历史兑换仍为 200，新的兑换为 300。

### Case 8：月历

完成显示蓝色，未完成无标记，禁止使用红色显示未完成。

### Case 9：全勤

某任务 `monthlyPerfectBonus = 100`，9 月所有应完成日期全部完成。10 月第一次打开应用自动生成 9 月全勤奖励 +100，再次打开不能重复 +100。

## 51. MVP 用户主链路

日常使用路径应当非常短：打开 Web App → 首页逐项完成 → 如有坏习惯则记录一次 → 关闭应用。

偶尔进入统计查看周/月，或进入积分兑换奖励。

## 52. 产品设计原则

1. 首页只负责「今天」
2. 积分必须使用 Ledger
3. 历史事件不可变：Configuration 可变化，Event 不变化

## 53. MVP 完成定义

当以下场景全部可以工作时，v0.1 即可认为完成：

- 手机打开正常使用
- PC 打开正常使用
- 首次进入生成默认任务
- 首页展示今日任务
- 任务可以完成
- 任务可以撤销
- 完成获得积分
- 坏习惯可以重复记录
- 坏习惯自动扣积分
- 积分刷新后不丢失
- 可以新建任务
- 可以编辑任务
- 修改任务积分不污染历史
- 可以查看本周完成率
- 可以查看本月完成率
- 可以查看月历
- 完成日期显示蓝色
- 未完成日期没有标记
- 可以创建奖励
- 积分足够可以兑换
- 积分不足不能兑换
- 修改奖励积分不污染历史
- 最大兑换次数生效
- 可以设置月度全勤积分
- 月度全勤自动结算
- 我的页面展示孤笑 / 0000001
- 导入 / 导出 / 关于存在入口
