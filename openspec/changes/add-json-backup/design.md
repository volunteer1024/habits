## Context

Persisted state is `AppState` in `src/domain/types.ts`, saved as JSON under LocalStorage key `checkin:v1` by `LocalStorageAdapter`. `AppStore.update` clones, writes through the adapter, and notifies subscribers. The UI reads state with `useSyncExternalStore` and never touches LocalStorage. `createApp` seeds only when hydrate finds no stored document, then runs the existing past-month settlement. `MePage` already lists 导入 and 导出; both toast「功能开发中」. There is no persisted settings object. `PROFILE` is a constant. See proposal.md for why.

## Goals / Non-Goals

**Goals:**

- Serialize the current `AppState` into a versioned backup document and parse that document back into an `AppState`.
- Replace the store only through `AppStore.update`, after validation and an explicit confirm.
- Keep a failed parse from calling `update`.

**Non-Goals:**

- Do not change the on-disk shape of `checkin:v1`. The backup envelope is a file format, not a new storage document.
- Do not merge backups, and do not re-seed or re-settle inside the import path.

## Decisions

### 1. Backup envelope sits outside `AppState`

The file is:

```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-10-01T12:00:00.000Z",
  "state": {}
}
```

`state` is the eight `AppState` arrays. `schemaVersion` is the integer `1`, not `APP_VERSION` (`0.1.0`). `exportedAt` comes from `clock.nowIso()`. Pretty-print with two-space indent. Download name: `habits-backup-YYYY-MM-DD.json`, using `clock.today()`.

Alternative: write `schemaVersion` into the LocalStorage document. `load()` treats the whole JSON as `AppState`, so that would change every save. Alternative: key the format on the app semver. Unrelated releases would then reject still-valid backups.

### 2. Pure parse and serialize in the domain layer

Add `src/domain/backup.ts` with `createBackup(state, exportedAt)`, `serializeBackup`, and `parseBackup`. `parseBackup` returns the `AppState` or throws `AppError` with code `INVALID_BACKUP` and a Chinese message. No storage access in this module.

Supported file: JSON object, `schemaVersion === 1`, `exportedAt` a non-empty string, `state` an object. Each of `tasks`, `taskInstances`, `habits`, `habitLogs`, `rewards`, `redemptions`, `pointTransactions`, and `settlements` MUST be an array of non-null objects. Required fields:

- task: `id`, `name`, `points`, `monthlyPerfectBonus`, `schedule` (`frequency`, `interval`, `startDate`, `endType`), `recordOffsetDays`, `status`, `createdAt`, `updatedAt`
- task instance: `id`, `taskId`, `businessDate`, `status`
- habit: `id`, `name`, `penalty`, `status`, `createdAt`, `updatedAt`
- habit log: `id`, `habitId`, `businessDate`, `habitNameSnapshot`, `penaltySnapshot`, `createdAt`
- reward: `id`, `name`, `cost`, `maxRedemptions` (number or null), `status`, `createdAt`, `updatedAt`
- redemption: `id`, `rewardId`, `rewardNameSnapshot`, `costSnapshot`, `redeemedAt`
- point transaction: `id`, `type` (one of the existing union), `delta`, `sourceId`, `description`, `businessDate`, `createdAt`
- settlement: `yearMonth`, `settledAt`, `awardedTaskIds` (string array)

Optional fields (`weekdays`, `count`, `archivedOn`, `completedAt`, `lockedPoints`, `taskNameSnapshot`) may be absent. Unknown top-level keys are ignored. A bare `AppState` with no `schemaVersion` is rejected. `schemaVersion` other than `1` is rejected.

Copy: not JSON or wrong shape →「无法读取备份，请选择本应用导出的 JSON 文件。」Unsupported version →「备份版本不受支持，无法恢复。」

Alternative: accept any JSON object and assign it. A bad file would then overwrite good data.

### 3. Restore replaces every collection through the store

`restoreBackup(store, state)` assigns the eight arrays inside `store.update`. That clones, saves via the current adapter, marks the store hydrated, and notifies React. It does not call `applySeed` or `settlePastMonths`.

Validate first. Open the confirm dialog only for a valid backup. `update` runs only after confirm. Cancel or a thrown `parseBackup` never calls `update`.

Alternative: `localStorage.setItem` from the page. That skips the store snapshot and breaks the rule that UI does not touch LocalStorage. Alternative: `location.reload()` after save. The next bootstrap would still settle unsettled past months, and the page would flash 加载中. In-session replace matches what a refresh does for an already-settled backup, without a second seed.

### 4. Me page owns the controls

Keep 导入 and 导出 on `MePage`. 导出 builds the file in a click handler and triggers a download, then toasts「已下载备份」. 导入 uses a hidden `<input type="file" accept="application/json,.json">`. On change, read `file.text()`, `parseBackup`, toast the `AppError` message on failure, or open the existing `Dialog` on success. Dialog title「恢复备份」. Body「这将用备份覆盖当前所有数据，且无法撤销。建议先导出当前数据。」Buttons「取消」and「覆盖并恢复」. Success toast「已恢复备份」. Reset the input value so the same file can be picked again.

Do not write the store during render. The page already gets state from `useApp`.

### 5. Tests cover the domain round-trip

`src/domain/backup.test.ts` (Vitest):

- `serializeBackup` → `parseBackup` returns the same state, and the JSON includes `schemaVersion` and `exportedAt`.
- `restoreBackup` on a bootstrapped `MemoryStorageAdapter` replaces tasks, instances, habits, logs, rewards, redemptions, transactions, and settlements; a following `load()` matches; an empty backup stays empty (no seed).
- Reject non-JSON, `schemaVersion` 2, a missing collection, a record missing a required field, and a raw `AppState` without the envelope.
- A rejected parse does not change the adapter contents.

## Risks / Trade-offs

- [User confirms the wrong file] → The dialog states that overwrite cannot be undone and suggests exporting first. There is no undo.
- [A later full page load still runs past-month settlement] → Import itself does not settle. A backup taken after settlement stays stable across reload, which is the existing bootstrap rule. An unsettled past month in a backup can gain settlement rows on the next open, same as any other stored document.
- [Required-field checks reject a hand-edited but still usable file] → Prefer a rejected file over writing a document the pages cannot render.
- [Today page write loop] → Import writes only in the confirm handler, once.

## Migration Plan

No LocalStorage migration. Existing `checkin:v1` documents load as they do now. Shipping this change does not rewrite stored data. Rollback is reverting the Me page and backup module; files already downloaded simply stop being importable. Older app builds ignore backup files because they never read them.
