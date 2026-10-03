## Why

Some daily tasks, such as 喝药, are meant to be credited every day without a manual tap. The user still has to open the app, but the completion and points should be written the same way as a check-in.

## What Changes

- In the existing task editor, the user can turn on 每天自动激励 for a task that already earns points on completion.
- When the app is opened, or the page returns to the foreground, each enabled task that is scheduled today and not already completed today is recorded once: same instance, same locked points, same `task_complete` history.
- A manual check-in and this pass share that completion, so the same local day cannot be awarded twice.
- Turning the setting off stops future automatic credits and leaves past records in place.
- A day the app was never opened is not backfilled. Only the current local day is considered.
- A failure in this pass does not block ordinary check-in and does not clear stored data.
- The setting lives on the task inside `checkin:v1`, so the existing JSON export and the daily sync backup both carry it. The export file still has no `clientId`.

## Capabilities

### New Capabilities

- `auto-daily-credit`: Automatic once-per-local-day completion for tasks the user marks as 每天自动激励, using the existing task check-in ledger.

### Modified Capabilities

- (none)

## Impact

- Task form and task create/update.
- App open and visibility handling, via the task service.
- Backup parsing accepts the new task field and keeps older files valid.
- Vitest coverage around completion, idempotency, missed days, and backup contents.

## Non-goals

- A second points balance, or automatic penalties for bad habits, or automatic reward redemption.
- Crediting a task on a day it is not scheduled.
- Filling in days the app was not opened.
- Deleting or rewriting history when the setting is turned off.
- Changing how the user undoes a completion that is already on the ledger.
