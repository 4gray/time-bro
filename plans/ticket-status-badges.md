# Ticket Status Badges

## Goal

Show each Jira ticket's workflow status in the ticket search/picker list, preferably as a compact badge aligned to the right of the row.

## API Check

- Confirmed: Jira issue search supports requesting selected `fields`; the current ticket search already requests `status`.
- Confirmed: `JiraTicket` already carries `statusName` and `statusCategory`.

## Decisions

- Preserve the existing Jira search endpoint and read-only behavior.
- Keep the UI compact and use existing style tokens/patterns.
- Render the human-readable Jira workflow status as a right-aligned badge in `TicketPicker`.
- Normalize newer/alternate Jira status category keys such as `completed` and `in-flight` into existing app categories for styling.

## Pending Work

- None.

## Verification

- Passed: `npm run test` (17 files, 57 tests).
- Passed: `npm run build`.
- Passed: renderer demo check in Playwright at desktop and mobile widths; ticket picker showed one status badge per visible row with no row overflow, no badge escaping its row, and no console warnings/errors.
