# GitHub Release Update Notices

## Goal

Add a lightweight, cross-platform update checker that shows the current app version, the latest GitHub release version, and a persistent snackbar when a newer release is available.

## Decisions

- Use Electron main-process IPC for app metadata, GitHub release fetching, and opening external release URLs.
- Use `app.getVersion()` for the installed/current version instead of reading `package.json` in the renderer.
- Query GitHub Releases for `4gray/time-bro` and treat the release tag/name as the latest version.
- Keep this as a manual download/open-release flow rather than a packaged auto-updater.
- Reuse the existing snackbar layer with an optional action button for the release link.

## Pending Work

- None.

## Verification

- `npm run test` passes.
- `npm run build` passes.
- Browser QA with Browser plugin at `http://127.0.0.1:5173/?demo=1&view=settings&theme=dark&seed=release&today=2026-06-17`:
  - Desktop `1280x720`: Settings loads, Version panel renders current/latest `v1.0.0`, manual Check updates shows a snackbar, and console warn/error logs are empty.
  - Mobile `390x844`: Settings uses a compact top sidebar, Version panel and buttons fit without horizontal overflow, snackbar fits within the viewport, dismiss button removes it, and console warn/error logs are empty.
