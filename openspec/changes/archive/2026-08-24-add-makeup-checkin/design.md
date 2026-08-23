## Context

打卡写入目前全部使用 `clock.today()`。坏习惯删除对非今日记录抛 `HISTORY_LOCKED`。全勤奖由打开应用时的懒结算一次性写死，已结算月不会再对账。统计页已有只读月历和 `calendarGrid`，项目里没有独立日期选择组件。详见 `proposal.md` 的 Why；行为以 `specs/daily-checkin` 与 `specs/monthly-bonus` 为准。

## Goals / Non-Goals

**Goals:**

- 把「今天」从时钟常量收成显式业务日，服务层校验三天窗口。
- 列表查询避免每次渲染都写 store，防止今日页死循环再现。
- 已结算月用追加流水对账全勤，不删旧账。

**Non-Goals:**

- 不改 LocalStorage key，不做数据迁移。
- 不把选中日期写入 URL。
- 不让统计页日历跳进打卡页。
- 不重写懒结算主路径（本月仍不结算）。

## Decisions

### 1. 服务入参带业务日，窗口在领域层校验

`TaskService` / `HabitService` 的完成、撤销、记录、删除改为接受 `businessDate`，缺省为 `clock.today()`。可写范围：`today-2 <= date <= today`。窗外拒绝，不静默改写今天。

备选：只在 UI 换日期、服务仍写今天——业务日会错。备选：临时替换 clock——测试与并发日期切换都脆。

### 2. 按日列出任务：只在缺实例时写一次

把 `getTodayItems` 收成 `getItemsForDate(date)`，沿用现有「缺实例才 `update`」的守卫，禁止每次调用都克隆写入。仅打开月历不生成实例。

备选：翻历史只读、完成时再 `ensureInstance`——也可以，但今天路径已有守卫，统一代价更小。

### 3. 选中日放在打卡页本地 state

`useState` 默认为今天。日期推进导致选中日掉出窗口时，在 `useEffect` 里拨回今天，不在 render 里 `setState`。

备选：`?date=` 方便刷新保持——第一版不必，窗口只有三天。

### 4. 月历用现有格子，不引入日期库

标题旁图标用 Lucide `ChevronsUpDown`。弹出层用现有 Dialog / Drawer，格子用 `calendarGrid`。只有窗口内三天可点；窗口跨月时允许翻到上个月，不能翻到未来月。

备选：原生 `input type="date"`——难做禁用态，也不如月历直观。备选：新引入日历包——窗口只有三天，过重。

### 5. 全勤对账只追加流水

新增流水类型 `monthly_bonus_undo`，与 `task_undo` / `bad_habit_undo` 对齐。`sourceId` 仍为 `{taskId}:{yyyy-mm}`，`businessDate` 为该月最后一天，便于统计月历把补发 / 追回算进月末。

任务完成或撤销之后：若 `yearMonth(date)` 已有 settlement，则对该月每个有全勤奖的任务判断「现在该不该奖」与 `awardedTaskIds` 是否已包含。该奖未奖 → 追加 `monthly_bonus` 并写入 id；不该奖已奖 → 追加 `monthly_bonus_undo` 并移除 id；其余不动。未结算月（含本月）不走这条路径。

统计里识别某任务全勤流水时，`monthly_bonus` 与 `monthly_bonus_undo` 都按同一 `sourceId` 前缀匹配。

备选：删掉 settlement 再跑 `settleMonth`——会重复发奖或必须删旧流水，违反只追加。备选：`monthly_bonus` 直接记负 delta——账上能看，但和现有 undo 类型不对称。

### 6. 坏习惯删除改为按窗口，而不是「必须是今天」

`removeTodayLog` 改为按记录上的 `businessDate` 是否在窗口内决定能否删。`HISTORY_LOCKED` 仅用于窗外。

## Risks / Trade-offs

- [今日页再陷入写 store 的死循环] → 列表查询保持「缺实例才写」；effect 依赖实例列表与任务列表，不要依赖每次都是新对象的 `app.state`。
- [月初先结算再补签] → 启动仍先跑既有懒结算，用户补签后再对账；依赖「已有 settlement 才补发 / 追回」。
- [新流水类型漏进统计筛选] → 任务过滤同时认 `monthly_bonus` 与 `monthly_bonus_undo`。
- [余额为负造成兑奖后的心理落差] → 按规格接受，不回滚兑换。

## Migration Plan

无需迁移。旧数据没有 `monthly_bonus_undo`，union 向前兼容。已结算月在补签发生前保持原状。若实现有缺陷，回退即恢复「只能改今天」，已写下的补签流水仍按账本保留。
