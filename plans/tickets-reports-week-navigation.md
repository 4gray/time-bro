# Tickets Current View and Global Tracking Shortcut

## Goal

Keep Tickets focused on current assigned/favorite tickets, keep historical week switching in Week and Reports, and move `Command/Ctrl-K` to a global tracking shortcut that opens Add Time for today.

## Decisions

- Tickets is a current workload view: assigned/open, recently closed, local TimeBro favorites, and current-week logged hours.
- Week and Reports keep week navigation because those views are genuinely week-scoped.
- `Command/Ctrl-K` is global and opens the existing Add Time dialog for today.
- Jira ticket search stays inside the existing ticket picker in Add Time/Today instead of becoming a second Tickets-specific search surface.
- Keep Jira search read-only; logging still goes through the existing intentional worklog flow.

## Pending Work

- Done: added shared week navigation component for Week and Reports.
- Done: removed Tickets-specific week navigation and search UI.
- Done: added global `Command/Ctrl-K` tracking shortcut.
- Done: reset Today/Tickets navigation to current week because they are current views.
- Done: guarded week state and derived ticket-hour maps against stale sync/override data from another week.
- Done: updated tests for the simplified Tickets view and stale-week guard.
- Done: ran tests, build, and rendered UI verification.

## Verification

- `npm run test` passed: 16 files, 55 tests.
- `npm run build` passed.
- Browser QA passed on `http://127.0.0.1:5180/?demo=1&view=tickets&theme=dark&today=2026-06-17`.
- Verified Tickets header shows current assigned tickets and `25h logged this week`, with no `THIS WEEK`, previous/next arrows, or `⌘K SEARCH` control.
- Verified global `Ctrl-K` opens Add Time dialog on `WED · 17 JUN`.
- Verified Add Time dialog still exposes existing Jira ticket picker search; query `ops` shows `OPS-77` under `JIRA SEARCH`.
- Verified Reports still has week navigation and previous week changes to `REPORTS — WEEK 24`.
- Verified navigating from historical Reports back to Tickets restores current-week Tickets context.
- Verified 390x760 narrow viewport has no horizontal scroll and no console warnings/errors.
