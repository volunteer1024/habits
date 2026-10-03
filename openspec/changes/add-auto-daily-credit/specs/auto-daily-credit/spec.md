## Purpose

Credit a task that already earns points once on the current local day when the app is opened, using the existing check-in ledger rather than a second points system.

## ADDED Requirements

### Requirement: Task editor can turn on automatic daily credit

The task editor SHALL offer a control labeled 每天自动激励. Turning it on marks that task for automatic completion on scheduled local days. Turning it off MUST stop later automatic credits and MUST leave existing completions and point history in place. Bad habits and reward redemptions MUST NOT gain this control. A task saved before this setting existed MUST be treated as off.

#### Scenario: Turn the setting on

- **WHEN** the user edits a task that already awards points, turns on 每天自动激励, and saves
- **THEN** the task stores that setting as on
- **AND** the points awarded remain that task's existing completion points

#### Scenario: Turn the setting off

- **WHEN** the user turns 每天自动激励 off and saves
- **THEN** later opens do not automatically complete that task
- **AND** completions and point transactions already recorded stay in place

### Requirement: Open or foreground credits the current local day once

When the app opens, and when the page becomes visible again, the system MUST check each active task with 每天自动激励 on. If that task is scheduled today and is not already completed today, the system MUST record today the same way a manual check-in would: the same completion record, the same locked points, and the same completion point transaction. The check MUST NOT record a task that is not scheduled today, is archived, or is already completed today. Days the app was not opened MUST NOT be backfilled.

#### Scenario: Opening on a new local day records one credit

- **WHEN** a daily task has 每天自动激励 on, the user opens the app on a new local day, and that task is not yet completed today
- **THEN** the task is completed for today
- **AND** points gain one completion transaction identical to a manual check-in
- **AND** only today is recorded, not earlier days the app was not opened

#### Scenario: A second open the same day does not record again

- **WHEN** today was already recorded by automatic credit, and the user opens the app again or brings the page back to the foreground
- **THEN** the completion stays as it is
- **AND** no further point transaction is added

#### Scenario: A day that is not scheduled is skipped

- **WHEN** a task has 每天自动激励 on but today is not on its schedule
- **THEN** this check does not complete that task
- **AND** no points are added

### Requirement: Automatic and manual check-in share one credit per day

A task MUST have at most one effective completion on a given local day. A manual check-in followed by this pass, or this pass followed by a manual check-in, MUST NOT add a second completion award.

#### Scenario: Already checked in manually today

- **WHEN** the user has already completed the task manually today, and the app then opens or returns to the foreground
- **THEN** no second completion award is added

#### Scenario: Manual check-in after automatic credit

- **WHEN** today was already completed by automatic credit, and the user completes that task again
- **THEN** no second completion award is added
- **AND** the point balance matches a single completion

### Requirement: A failed pass does not block check-in or wipe data

If the automatic-credit pass fails, the system MUST NOT block a later manual check-in and MUST NOT clear saved tasks, check-ins, or points.

#### Scenario: Manual check-in still works after a failed pass

- **WHEN** the automatic-credit pass cannot finish writing
- **THEN** the data already saved is still there
- **AND** the user can still complete the task manually and receive its points

### Requirement: Backups include the setting and the export file has no client id

每天自动激励 MUST be stored on the task and MUST travel with `checkin:v1` in the existing JSON export and in the daily sync backup. A backup written before this field existed MUST still import, with those tasks treated as off. The user-facing export file MUST NOT contain `clientId`.

#### Scenario: Export and sync include the setting

- **WHEN** the user turns 每天自动激励 on for a task and then exports a backup or runs the daily sync
- **THEN** that task in the backup includes the setting as on
- **AND** the export file does not contain `clientId`

#### Scenario: An older backup has no such field

- **WHEN** the user imports a backup whose tasks omit this setting
- **THEN** the import succeeds
- **AND** 每天自动激励 is off for those tasks
