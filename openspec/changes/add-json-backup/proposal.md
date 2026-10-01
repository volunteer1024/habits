## Why

All habit data lives only in this browser under LocalStorage key `checkin:v1`. Clearing site data, switching devices, or losing the browser drops tasks, check-ins, points, bad habits, rewards, and settlements. The Me page already lists 导入 and 导出, but both only toast「功能开发中」. Users need a file they can download and later restore in full.

## What Changes

- Export downloads a JSON file of the complete persisted app state, plus a schema version and an export timestamp.
- Import lets the user pick that file. After a clear confirmation that current data will be overwritten, the app validates version and shape, then replaces stored state.
- An invalid or incompatible file is rejected with a friendly error. Storage is left unchanged.
- Wire the existing 我的「导出」and「导入」entries. Chinese copy stays consistent with the rest of the app.
- Vitest covers a serialize → parse → restore round-trip and rejection of bad files.
- Record the feature under Unreleased in CHANGELOG.md.

## Non-goals

- No account, cloud sync, or merge of two datasets.
- No partial import of a single task, habit, or date range.
- No automatic or scheduled backups.
- No change to the LocalStorage key `checkin:v1`.
- Profile name and ID stay hardcoded constants and are not part of the backup. There is no separate persisted settings object.
- No second storage path beside AppStore and StorageAdapter. The UI does not read LocalStorage directly.

## Capabilities

### New Capabilities

- `data-backup`: Export a versioned JSON snapshot of all persisted domain state, and import a validated snapshot that replaces current data only after confirmation.

### Modified Capabilities

- (none. `daily-checkin` and `monthly-bonus` requirements stay as they are.)

## Impact

- UI: `MePage` placeholders for 导入 and 导出; confirmation and error copy in Chinese.
- Domain/service: backup serialize, parse, and restore, persisting through the existing store and adapter.
- Tests: Vitest for the round-trip and invalid files.
- Docs: CHANGELOG Unreleased section.
