# Snackbar Notifications

## Goal

Move transient app notifications from inline/top callouts into bottom overlay snackbars that appear briefly and dismiss automatically.

## Decisions

- Keep persistent form validation and connection test feedback inline when it belongs to a form.
- Route transient app-level events such as sync, save, and log success/error messages through a shared snackbar layer.
- Use existing design tokens and dark/light theme styles.

## Pending Work

- None.

## Verification

- `npm run test` passes.
- `npm run build` passes.
- Browser QA at `http://127.0.0.1:5173/?demo=1&view=settings&theme=dark&seed=release&today=2026-06-17`:
  - Save settings shows a bottom overlay snackbar.
  - Test Jira connection shows a bottom overlay snackbar with no inline Settings callout.
  - Snackbar is 24px from the bottom, with no old top callout.
  - Snackbar auto-dismisses after the timeout.
  - Fresh console log check had no warnings or errors.
  - Mobile viewport `390x844` check confirmed the snackbar fits without horizontal overflow.
