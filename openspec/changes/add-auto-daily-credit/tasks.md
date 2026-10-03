## 1. Task field and backup

- [x] 1.1 Add optional `autoDailyCredit` on `Task` and on task create/update input. Missing means off. Create and update persist a boolean.
- [x] 1.2 `createBackup` writes `autoDailyCredit` as a boolean on every task. `parseBackup` accepts a boolean, treats a missing field as off, and rejects a non-boolean value. Existing files without the field still import.
- [x] 1.3 Vitest: a task with the setting on round-trips through backup; an older task object without the field imports as off; a non-boolean value is rejected; the export document still has no `clientId`.

## 2. Automatic credit pass

- [x] 2.1 Share the in-state completion write used by manual `complete` with the automatic pass, so both produce the same instance, locked points, and `task_complete` transaction.
- [x] 2.2 Run the pass from `bootstrap` after settlement, and when the document becomes visible. Join overlapping calls. Skip the write when nothing is due. Catch failures so bootstrap still resolves and stored tasks, check-ins, and points are not cleared. Do not run the pass from `getItemsForDate`.
- [x] 2.3 Vitest: opening on a new local day records exactly one credit; a second open or a same-day manual check-in does not add another; a task that is off, archived, or not scheduled today is skipped; a missed earlier day is not backfilled; turning the setting off keeps past records; a failed pass still allows a manual check-in.

## 3. Task editor

- [x] 3.1 In the task sheet, add a checkbox labeled 每天自动激励 with the helper 打开应用时，若今天还没打卡，自动记一次完成. Saving creates or updates the task field. Do not add the control to bad habits or rewards.
