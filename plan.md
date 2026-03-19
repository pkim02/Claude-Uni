# Claude University → LearNUS Replacement

**Philosophy**: Don't let school get in the way of your education. Maximize learning, eliminate busywork.

**User preferences**: Auto-draft all assignments. Auto-sync on app open.

---

## The Vision

When you open Claude Uni, you see everything that matters:
- **3 assignments due this week** — drafts already generated, just review and personalize
- **New lecture slides uploaded** — already ingested, ready to learn from
- **Midterm in 12 days** — study plan auto-generated

You never open LearNUS except to click "Submit."

---

## Implementation Plan

### Phase 1: Data Layer — Assignment Workflow & Sync State

**1a. Evolve `lib/learnus/types.ts`**
- Add `AssignmentStatus` enum: `new → drafting → draft_ready → reviewed → submitted`
- Evolve `HomeworkTask` into `Assignment` with richer fields:
  - `learnusId` (for dedup on re-sync)
  - `status: AssignmentStatus`
  - `draftSolution: string` (auto-generated)
  - `finalSolution: string` (after user edits)
  - `attachments: string[]` (file names from LearNUS)
  - `sourceUrl: string` (LearNUS link for easy submission)
- Add `SyncState` type: `lastSyncedAt`, `syncInProgress`, `courseIds[]`
- Add `Activity` type for the unified feed (replaces notifications):
  - `type: 'assignment' | 'material' | 'announcement' | 'grade'`
  - `courseId`, `courseName`, `title`, `description`, `detectedAt`
  - `handled: boolean` (true once auto-drafted or ingested)

**1b. Evolve `lib/learnus/task-store.ts` → `assignment-store.ts`**
- Rename task operations to assignment operations
- Add `getAssignmentByLearnusId()` for dedup
- Add `getPendingAssignments()` — not yet submitted
- Add `getDraftReadyAssignments()` — drafts generated, need review
- Keep backward compat: old task API still works

**1c. Add `lib/learnus/sync-store.ts`**
- Store sync state (last synced timestamp, in-progress flag)
- `getSyncState()`, `setSyncing()`, `setSynced()`, `needsSync()`
- Simple logic: `needsSync()` = true if last sync > 30 min ago or never synced

**1d. Merge notification store into activity store**
- Evolve `notification-store.ts` → `activity-store.ts`
- Same basic operations but typed as `Activity` instead of `LearnUSNotification`
- Keep unread count logic

### Phase 2: Sync Engine

**2a. Unified sync endpoint: `app/api/learnus/sync/route.ts`**
- POST with `{ username, password }` (or uses saved credentials)
- Returns SSE stream with progress events
- Logic:
  1. If first sync (no courses): full scrape (existing agent, ~150 steps)
  2. If re-sync: lightweight notification check (existing agent, ~40 steps)
  3. After either: process results into activities
  4. For each new assignment activity: auto-queue draft generation
  5. For each new material activity: already ingested during scrape
- Reuses existing `agent.ts` and `notification-agent.ts` — no rewrite needed

**2b. Auto-draft queue: `app/api/learnus/auto-draft/route.ts`**
- POST with `{ assignmentId }`
- Fetches assignment details + course context
- Calls existing `buildHomeworkSolverPrompt()` in solve mode
- Saves draft to assignment record
- Updates status: `new → drafting → draft_ready`

**2c. Background auto-draft trigger**
- After sync detects new assignments, fire off draft generation for each
- Can be sequential (simpler) — draft one at a time
- Frontend shows "Drafting..." status with spinner

### Phase 3: Smart Dashboard

**3a. Redesign `app/(app)/dashboard/page.tsx`**

Replace the current course grid with a **home screen**:

```
┌─────────────────────────────────────────────┐
│  🔄 Last synced: 5 min ago    [Sync Now]    │
├─────────────────────────────────────────────┤
│                                             │
│  ACTION ITEMS                               │
│  ┌─────────────────────────────────────┐    │
│  │ 📝 HW3: Data Structures Analysis    │    │
│  │    CS201 · Due Mar 22 · Draft Ready │    │
│  │    [Review Draft] [Learn Topic]     │    │
│  ├─────────────────────────────────────┤    │
│  │ 📝 Essay: Korean War Impact         │    │
│  │    HIST101 · Due Mar 25 · Drafting… │    │
│  ├─────────────────────────────────────┤    │
│  │ 📄 New slides: Week 8 Probability   │    │
│  │    MATH301 · Uploaded today         │    │
│  │    [Study This]                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  UPCOMING DEADLINES                         │
│  ─── This Week ───                          │
│  Mar 22  CS201 HW3           ✅ Draft Ready │
│  Mar 23  PHYS201 Lab Report  ⏳ Drafting    │
│  ─── Next Week ───                          │
│  Mar 25  HIST101 Essay       ✅ Draft Ready │
│  Mar 28  CS201 Midterm       📚 Study Plan  │
│                                             │
│  COURSES                                    │
│  [Course grid — same as current but smaller]│
│                                             │
│  RECENT ACTIVITY                            │
│  • New announcement in CS201 (2h ago)       │
│  • Grade posted: MATH301 HW2 — 95 (1d ago) │
│  • Materials uploaded: PHYS201 (1d ago)     │
│                                             │
└─────────────────────────────────────────────┘
```

**3b. Auto-sync on open**
- Dashboard `useEffect` checks `needsSync()`
- If true, triggers sync in background
- Shows subtle "Syncing..." indicator in header
- New items appear as they're detected

### Phase 4: Assignment Workflow Page

**4a. Evolve `app/(app)/learnus/tasks/page.tsx` → Assignment Board**

Replace the manual task creation form with a workflow-focused board:

- **No manual creation needed** — assignments come from sync
- Group by status: Draft Ready (review these) → Drafting → Submitted
- Each assignment card shows:
  - Title, course, due date, time remaining
  - Status badge with color
  - Quick actions based on status:
    - **Draft Ready**: [Review & Edit] [Learn About This] [Mark Submitted]
    - **Drafting**: spinner, ETA
    - **Submitted**: checkmark, submission date
- Click "Review & Edit" → opens draft in an editor view:
  - Shows the auto-generated solution
  - Markdown rendered with edit capability
  - "Make it yours" tips shown alongside
  - "I've submitted this" button to mark done
- Click "Learn About This" → goes to tutor with assignment context pre-loaded

**4b. Keep manual task creation as secondary option**
- Small "+ Add manually" button for anything not on LearNUS
- Uses the existing form but simplified

### Phase 5: Simplify Navigation

**5a. Evolve sidebar in `app/(app)/layout.tsx`**

Current:
- Dashboard
- LearNUS Import
- Homework Board
- Notifications
- Settings

New:
- **Home** (smart dashboard with action items + deadlines + activity feed)
- **Courses** (course grid, click into course for learn/quiz/plan)
- **Assignments** (workflow board — the evolved homework page)
- **Settings** (includes LearNUS connection setup)

Notifications and LearNUS Import get absorbed:
- Notifications → Activity feed on Home
- LearNUS Import → First-time setup flow on Home + Settings page

**5b. First-time experience**
- If no courses and no credentials: show setup card on Home
- "Connect to LearNUS" → enter credentials → full sync starts
- Progress shown inline on Home page
- After first sync: Home populates with everything

### Phase 6: Polish

**6a. Assignment detail view**
- When reviewing a draft, show:
  - Original assignment instructions (from LearNUS)
  - Auto-generated draft (editable)
  - "Personalization tips" sidebar
  - Direct link to LearNUS submission page

**6b. Smart status indicators**
- Overdue assignments highlighted in red
- "Due soon" (< 24h) in yellow
- Submitted in green
- Draft ready in blue (action needed)

**6c. Sync status always visible**
- Small indicator in sidebar/header: "Synced 5m ago" or "Syncing..."
- Click to manually re-sync

---

## File Changes Summary

### New Files
- `lib/learnus/assignment-store.ts` — evolved from task-store
- `lib/learnus/sync-store.ts` — sync state management
- `lib/learnus/activity-store.ts` — evolved from notification-store
- `app/api/learnus/sync/route.ts` — unified sync endpoint
- `app/api/learnus/auto-draft/route.ts` — auto-draft generation
- `app/(app)/assignments/page.tsx` — assignment workflow board

### Modified Files
- `lib/learnus/types.ts` — new types for assignments, sync, activities
- `lib/learnus/prompts.ts` — sync-aware prompts
- `app/(app)/dashboard/page.tsx` — complete redesign as smart home
- `app/(app)/layout.tsx` — simplified navigation
- `app/(app)/settings/page.tsx` — add LearNUS connection section
- `app/(app)/course/[id]/page.tsx` — minor: link to related assignments

### Removed/Deprecated (redirect to new)
- `app/(app)/learnus/page.tsx` → absorbed into Home first-time flow
- `app/(app)/learnus/tasks/page.tsx` → replaced by `/assignments`
- `app/(app)/learnus/notifications/page.tsx` → replaced by Home activity feed

---

## Implementation Order

1. **Types & stores** (Phase 1) — foundation, no UI changes yet
2. **Sync engine** (Phase 2) — unified sync + auto-draft
3. **Assignment board** (Phase 4) — the workflow page
4. **Smart dashboard** (Phase 3) — the new home screen
5. **Navigation** (Phase 5) — simplify sidebar, remove old pages
6. **Polish** (Phase 6) — status indicators, first-time flow

Each phase is independently testable. The app keeps working after each phase.
