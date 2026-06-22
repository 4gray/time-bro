# Add Time Ticket Sort

## Goal

- Widen the Add time modal so the ticket picker and search list breathe better.
- Add a ticket picker sort control for Jira created date.
- Remove the visible focus highlight around the ticket search input while keeping normal typing focus.
- Add lazy loading/reveal in the ticket picker so the dropdown is not effectively capped at the first handful of tickets, including real Electron/Jira data.
- Add created-date ascending and descending sort controls, and persist the selected sort across picker openings.
- Add a persisted search filter toggle for "Assigned to me" vs all accessible Jira search results.

## Decisions

- Keep Jira calls in Electron main over IPC.
- Add optional `JiraTicket.createdAt` from Jira's `created` field, so renderer sorting uses structured data instead of parsing labels.
- Apply the sort inside `TicketPicker` to both assigned/favorite options and live Jira search results.
- Use only created-date directions: oldest first and newest first.
- Persist the ticket picker sort in localStorage so Today and Add Time reuse the user's last choice.
- Persist the search assignee filter in localStorage separately from sorting.
- When the picker is open with an empty input, browse Jira tickets by created date through the same IPC search endpoint so real Jira results can exceed the initial assigned/favorites list.
- Keep the one-character typed state as a no-search state; empty browse must be explicitly requested with `allowEmptyQuery`.

## Pending Work

- None.

## Completed

- Updated shared Jira ticket contract and Jira field mapping with optional `createdAt`.
- Added sort UI and tests for ticket grouping order.
- Updated CSS for modal width, picker controls, and focus highlight.
- Added lazy reveal in the picker: initial 12 tickets, then +12 on near-bottom scroll.
- Extended Jira search requests so scroll can raise search limits up to 100.
- Added persisted sort mode with created-date `Oldest` and `Newest` controls.
- Added persisted `Assigned to me` search filter toggle.
- Added Jira JQL `assignee = currentUser()` scoping when the filter is active.
- Added empty-query Jira browse mode for the picker, so initial Add Time results can page beyond the six assigned/favorite tickets returned by the weekly ticket preload.

## Verification

- `npm run test` passed: 16 files, 51 tests.
- `npm run build` passed.
- `agent-browser` QA passed on `http://127.0.0.1:5174/?demo=1&view=week&theme=dark&today=2026-06-22`.
- Verified Add Time modal width is 680px and the picker can overflow/scroll instead of being clipped.
- Verified the picker shows `SORT BY CREATED` with only `Oldest` and `Newest`; `Default` is absent.
- Verified the search input focus has no visible box shadow/outline.
- Verified lazy reveal: 12 visible tickets initially, 17 after scrolling to the bottom.
- Verified selected `Oldest` sort and `Assigned to me` persist after reload and reopening the picker.
- Follow-up verification after real Electron/Jira bug report:
  - `npm run test` passed: 16 files, 54 tests.
  - `npm run build` passed.
  - Restarted Electron with the updated main process and verified against the real app at `http://127.0.0.1:5173/`, not demo fixtures.
  - Confirmed the Add Time picker now shows `JIRA TICKETS` from empty-query Jira browse with real Jira keys.
  - Confirmed the real Electron picker starts with 12 rendered Jira rows and is scrollable; after scrolling, it renders 24 rows.
  - Captured screenshot: `/tmp/timebro-electron-jira-picker-scroll.png`.
