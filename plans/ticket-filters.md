# Ticket filters

## Goal

Make Tickets a focused Jira work browser: functional scope/status filters, search and sorting, useful row metadata, and non-duplicated favorites.

## Decisions

- Use Jira's portable status categories (`new`, `indeterminate`, `done`) rather than workflow-specific status names.
- Present the three categories as visible toggle buttons; no dropdown is needed for only three options.
- Default to the existing overview (assigned tickets across all three categories); Done remains limited to the existing 14-day window and can now be deselected.
- Apply filters in the Electron Jira query so turning off “Assigned to me” can return accessible issues beyond the current user.
- Search the already fetched, bounded pool for instant key/summary matching; do not query Jira on every keystroke.
- Sort within status groups, defaulting to most recently updated. Preserve the status-group information architecture.
- Show workflow-specific status on every row and assignee only when browsing across assignees.
- Favorites pin to the top and are omitted from their regular status groups.
- Preserve the existing read-only behavior and bounded result limits.

## Work

- [x] Extend shared ticket request/filter contracts.
- [x] Build assignee-aware Jira JQL and cover it with tests.
- [x] Add isolated filter state and loading behavior to the tickets hook.
- [x] Wire accessible filter controls into the Tickets view and refine its states/styles.
- [x] Verify unit tests, production build, and the rendered UI.
- [x] Add Jira updated timestamps and renderer sort/search state.
- [x] Add the search/sort toolbar and row status/assignee metadata.
- [x] Remove favorite duplicates while keeping group counts honest.
- [x] Re-run automated, build, and responsive rendered-UI verification.

## Verification

- `npm run test` — 100 files / 627 tests passed on the isolated PR branch.
- `npm run build` — renderer and Electron TypeScript builds passed (existing chunk-size advisory only).
- Browser QA — dark and light themes at 1360×900, broad-assignee and search/sort interactions, plus narrow layout at 820×900; overflow and console checked.
