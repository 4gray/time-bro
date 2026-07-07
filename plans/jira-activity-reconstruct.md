# Jira activity in Day Reconstruction

## Goal

Add read-only Jira user activity signals to Day Reconstruction so the view can account for issue comments, created tickets, and status changes touched by the current user, not only Bitbucket activity and existing Jira worklogs.

## Decisions

- Keep Jira access read-only.
- Preserve the deterministic reconstruction core; Jira activity should enter as `kind: "jira"` signals.
- Use Jira worklogs only as locked, already-logged rows.
- Treat issue comments / created tickets / status transitions as low- or medium-confidence signals that the user can review before logging.
- Attribute "created issue" only from Jira `creator`, not `reporter`.
- Bound Jira activity detail scans and return partial metadata instead of letting startup/manual sync become unbounded.

## Pending Work

- Done: traced current weekly sync and local storage flow.
- Done: added Jira activity contracts, IPC bridge, persistence, sync lifecycle, and onboarding sync.
- Done: mapped Jira activities into reconstruct signals.
- Done: added tests for sync normalization, reconstruct signal mapping, storage, lifecycle, and sync controls.
- Done: fixed review findings for creator attribution and bounded partial activity scans.

## Verification

- Passed: `npm run test`
- Passed: `npm run build`
- Passed: rendered app inspection in the in-app browser at `http://127.0.0.1:5173/?demo=1&view=recon&today=2026-06-17&theme=dark&seed=jira-activity-qa`
