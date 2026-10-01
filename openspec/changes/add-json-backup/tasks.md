## 1. Backup document

- [x] 1.1 Add `src/domain/backup.ts` with schema version `1`, `createBackup`, `serializeBackup` (two-space JSON with `schemaVersion`, `exportedAt`, and `state`), and `parseBackup`
- [x] 1.2 Reject non-JSON, a schema version other than `1`, a missing collection, a non-array collection, and a record missing a required field from design.md; throw `AppError` code `INVALID_BACKUP` with the Chinese messages in that design
- [x] 1.3 Add `restoreBackup(store, state)` that replaces all eight `AppState` arrays inside `store.update`, and does not seed or settle

## 2. Tests

- [x] 2.1 Vitest: `serializeBackup` → `parseBackup` returns the same state, the JSON includes `schemaVersion` and `exportedAt`, and empty collections stay empty lists
- [x] 2.2 Vitest: `restoreBackup` on a bootstrapped `MemoryStorageAdapter` replaces tasks, instances, habits, logs, rewards, redemptions, transactions, and settlements; a later `load()` matches; an empty backup stays empty
- [x] 2.3 Vitest: reject non-JSON, schema version `2`, a missing collection, a record missing a required field, and a raw `AppState` without the envelope; the adapter contents stay unchanged

## 3. Me page

- [x] 3.1 Wire 导出 on `MePage` to download `habits-backup-YYYY-MM-DD.json` from the current app state and toast「已下载备份」
- [x] 3.2 Wire 导入 to read the picked file, toast the Chinese `AppError` message on failure without writing, and open the overwrite `Dialog` only after `parseBackup` succeeds
- [x] 3.3 Confirm runs `restoreBackup` and toasts「已恢复备份」; cancel leaves state unchanged; reset the file input so the same file can be picked again

## 4. Changelog

- [x] 4.1 Add JSON backup export and import under `CHANGELOG.md` Unreleased
