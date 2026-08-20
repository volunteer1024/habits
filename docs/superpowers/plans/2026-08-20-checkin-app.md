# 打卡积分 Web App Implementation Plan

> **For agentic workers:** Implement in this session. Domain and services follow TDD. UI is assembled after the service APIs exist.

**Goal:** Ship a locally persisted React check-in + points web app that matches PRD v0.1 and can be used the next day.

**Architecture:** Page → Service → Repository → AppStore → StorageAdapter. Ledger-based points. Lazy monthly settlement on bootstrap.

**Tech Stack:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Router, Vitest.

## Global Constraints

- Business dates are local `YYYY-MM-DD`, never `toISOString().slice(0, 10)`.
- UI never calls `localStorage` directly.
- Completed events keep snapshots; configuration changes must not rewrite history.
- Completion feedback is blue; incomplete days have no red/warning mark.
- Default user is 孤笑 / ID 0000001. App name 打卡, version 0.1.0.
- Seed on first empty store only.
- Points may be negative; redeem requires `currentPoints >= cost`.

---

### Task 1: Scaffold + PRD

Vite React-TS app at repo root, Tailwind, shadcn, vitest, React Router. Keep existing LICENSE.

### Task 2: Domain dates and schedule (TDD)

`src/domain/dates.ts`, `src/domain/schedule.ts` with tests covering daily/weekly/count and Monday-first weeks.

### Task 3: Store, repositories, seed (TDD)

In-memory adapter for tests; localStorage adapter for the app. Seed default tasks/habits/rewards.

### Task 4: Services (TDD)

Cover PRD cases 1–9: complete/undo, locked points, habits, redeem, max redemptions, monthly bonus idempotency, stats/calendar.

### Task 5: App shell and pages

Four tabs, responsive layout, sheets for management, today/stats/points/me.

### Task 6: Verify

`npm test` and `npm run build`. Manual checklist mapped to PRD section 53.
