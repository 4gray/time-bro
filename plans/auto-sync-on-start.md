# Auto Sync On Start

## Goal

Automatically sync Jira work logs so WeeklyView has fresh data after app startup and immediately after the first successful Jira connection.

## Decisions

- Reuse the existing sync path instead of adding a separate Jira fetch flow.
- Keep sync read-only and scoped to the configured Jira site.
- Avoid duplicate concurrent syncs if startup and connect events happen close together.

## Pending Work

- Done.

## Verification

- `npm run test` passed: 9 files, 26 tests.
- `npm run build` passed.
- Renderer preview checked at `http://127.0.0.1:5173/` in the in-app browser.
- Desktop and mobile welcome screens rendered without framework overlays or console errors.
- Welcome form interaction enabled the Connect button and showed the expected browser-preview Electron message with no console errors.
