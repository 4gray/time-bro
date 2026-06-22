# Jira Token Scope Copy

## Goal

Clarify in Welcome and Settings that users should use Jira's plain `Create token` button, not the scoped token flow.

## Decisions

- Keep the copy short and adjacent to existing Jira API token guidance.
- Do not change auth behavior; the app continues to use regular Atlassian API token auth.

## Pending Work

- None.

## Verification

- Passed: `npm run test` (18 files, 58 tests).
- Passed: `npm run build`.
- Passed: Playwright rendered checks for Welcome and Settings; token copy is visible, no relevant text overflow, no console warnings/errors.
- Captured screenshots in `output/playwright/welcome-token-no-scopes.png` and `output/playwright/settings-token-no-scopes.png`.
