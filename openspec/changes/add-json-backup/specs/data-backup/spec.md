## Purpose

Let the user download a JSON backup of every persisted habit record and later import that file to replace the data in this browser.

## ADDED Requirements

### Requirement: Export downloads a complete versioned backup

The system SHALL let the user download a JSON file of all persisted domain data from the 我的 page. The file MUST include every persisted collection needed to restore the app: tasks, task check-ins, bad habits, bad habit logs, rewards, reward redemptions, point transactions, and monthly settlements. The file MUST include a schema version and an export timestamp. The file MUST NOT depend on a separate settings record; profile name and ID are not part of the backup.

#### Scenario: Download current data

- **WHEN** the user chooses 导出 on 我的
- **THEN** the browser downloads a JSON file
- **AND** the file contains the current tasks, check-ins, bad habits, logs, rewards, redemptions, point transactions, and settlements
- **AND** the file contains a schema version and an export timestamp

#### Scenario: Empty collections are still exported

- **WHEN** the user exports and one or more collections have no records
- **THEN** the file still includes those collections as empty lists

### Requirement: Import replaces data only after confirmation

The system SHALL let the user pick a JSON backup from 导入 on 我的. Before any stored data is replaced, the system MUST show a Chinese confirmation that the current data will be overwritten. The system MUST replace the full persisted state only after the user confirms. Cancelling MUST leave the current data unchanged. A successful import MUST show the restored tasks, check-ins, points, bad habits, rewards, and settlements in place of the previous data, including when the backup is empty.

#### Scenario: Confirm overwrite

- **WHEN** the user picks a valid backup and confirms the overwrite warning
- **THEN** the current persisted data is replaced by the backup
- **AND** tasks, check-ins, point transactions, bad habits, rewards, and settlements match the backup

#### Scenario: Cancel leaves data in place

- **WHEN** the user picks a valid backup and dismisses the overwrite warning
- **THEN** tasks, check-ins, points, bad habits, rewards, and settlements stay as they were

#### Scenario: Restored empty backup is not refilled with defaults

- **WHEN** the user confirms import of a valid backup whose collections are all empty
- **THEN** the app shows no seeded tasks, habits, or rewards from that import

### Requirement: Invalid backups are rejected without writing

The system SHALL reject a file that is not JSON, that is not a backup of the supported schema version, or whose shape is missing a persisted collection or a record the app needs in order to restore. Rejection MUST show a Chinese error a person can understand. Rejection MUST NOT change stored data. A raw dump of app data without the backup schema version MUST be rejected.

#### Scenario: File is not JSON

- **WHEN** the user picks a file that is not valid JSON
- **THEN** the system shows a Chinese error
- **AND** the current data is unchanged

#### Scenario: Unsupported schema version

- **WHEN** the user picks a JSON backup whose schema version is not the version this app can restore
- **THEN** the system shows a Chinese error
- **AND** the current data is unchanged

#### Scenario: Incomplete shape

- **WHEN** the user picks JSON that lacks a required collection or is missing fields needed to restore a record
- **THEN** the system shows a Chinese error
- **AND** the current data is unchanged
