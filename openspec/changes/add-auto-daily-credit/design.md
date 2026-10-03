## Context

Points are awarded by completing a task. `TaskService.complete` writes a `TaskInstance` and a `task_complete` transaction with locked points. Bad habits only deduct points. Rewards spend points. Seed data already includes the task 喝药. See proposal.md for why this is automatic. Behavior is specified in `specs/auto-daily-credit/spec.md`.

`checkin:v1` is the whole `AppState`. `createBackup` / `parseBackup` round-trip that state for the export file. Daily sync posts the same envelope plus a `clientId` that stays out of the export file. The app already runs sync on bootstrap-ready and on `visibilitychange`.

## Goals / Non-Goals

**Goals:**

- Store 每天自动激励 on the task and edit it in the existing task sheet.
- Run one pass on app open and when the document becomes visible. The pass completes today through the same completion write as a manual check-in.
- Keep one in-flight pass so overlapping opens cannot apply two updates from the same snapshot.
- Let a missing or failed pass leave stored data usable for manual check-in.

**Non-Goals:**

- Crediting on save itself. The next open or foreground return runs the pass.
- Changing undo. Undoing a completion leaves the task incomplete, so a later pass may credit that day again, the same as completing it by hand.
- Backfilling, or treating `recordOffsetDays` as a different business date. That field only changes the display name. The business date stays the local day being checked in.

## Decisions

### Put `autoDailyCredit` on `Task`

The task is the object that already has 每次完成积分 and a schedule. A missing field means off, so existing `checkin:v1` documents and old backup files load without a migration. Create and update always persist a boolean. `createBackup` writes `true` or `false` for every task so an export or sync body is not missing the setting even if an older task was never re-saved. `parseBackup` accepts a boolean, treats absence as off, and rejects a non-boolean value.

Alternative: a separate settings map. That would be a second place to forget during export. Rejected.

Alternative: enable it on bad habits. Those records are penalties, not the daily reward the user described. Rejected.

### One completion function for manual and automatic

Extract the in-state completion used by `complete` and call it from the automatic pass. The pass selects active tasks with the flag on that `isScheduledOn` today and whose instance is not already `completed`, then applies that write. `complete` stays idempotent when the instance is already completed, so a later manual check-in does not add a second transaction.

The pass does not run inside `getItemsForDate`. That read already creates missing instances, and writing credits from a render effect is how the today page previously looped.

### When the pass runs

`bootstrap` calls it after hydrate, seed, and past-month settlement, so opening the app credits today before the UI reads today. `AppProvider` calls it again when `document.visibilityState` becomes `visible`, next to the existing sync call. A module-local in-flight promise joins overlapping calls. If no task needs a credit, the pass does not write.

Each task is applied inside the store update with its own catch, and the whole pass catches as well. A thrown update must not reject `bootstrap` and must not clear collections.

### Form copy

The task sheet uses the same checkbox row as 记作昨晚的行为. Label: 每天自动激励. Helper: 打开应用时，若今天还没打卡，自动记一次完成.

## Risks / Trade-offs

- [User undoes an automatic completion, then returns to the app] → The day is incomplete, so the pass credits it again. Undo stays the existing control; turning the setting off is how they stop that.
- [Concurrent `store.update` from two passes] → In-flight lock. `complete` also no-ops when the instance is already completed.
- [Pass throws] → Caught. Manual `complete` still uses its own update. Storage is not replaced with an empty document.
- [Old backups omit the field] → Import still succeeds; those tasks stay off until the user turns the setting on.

## Migration Plan

No storage migration. Older documents keep working. Rollback is ignoring `autoDailyCredit`; already written completions remain ordinary check-ins.

## Open Questions

None.
