# GitHub Auto Updater

## Goal

Replace the current manual GitHub release download path with an in-app updater that can download a new release and restart Yesterlog to install it where the packaged format supports that flow.

## Decisions

- Use `electron-updater` with GitHub Releases; no paid service or extra backend.
- Keep one Electron main-process updater implementation and expose it through IPC.
- Enable auto-install for signed macOS packages and Linux AppImage.
- Keep Linux `.deb` / `.tar.gz` and Windows NSIS as manual download fallbacks for this phase.
- Preserve the existing release notes, GitHub Releases link, snackbar, and Settings → Version surface.
- Never run update installation in renderer-only preview, development mode, or unsupported package formats.

## Implementation

- Add runtime `electron-updater` dependency and configure `electron-builder` `publish` metadata for `4gray/yesterlog`.
- Extend shared update contracts with updater capability/status, download progress, and install results.
- In `electron/updates.ts`, keep GitHub release metadata fetching, add an `autoUpdater` controller, and report supported install modes.
- In Electron IPC/preload/native API, add handlers for downloading an update and restarting to install.
- Update renderer hook/UI so available updates show either `Download update` / `Restart to install` or the existing installer download fallback.
- Update GitHub Actions release asset globs so updater metadata (`latest*.yml`) and blockmaps are uploaded to the GitHub Release.

## Verification

- Add/adjust unit tests for platform asset selection, updater capability, renderer update actions, and Settings rendering.
- `npm run test` passes.
- `npm run build` passes.
- `npm audit` reports `found 0 vulnerabilities`.
- Browser QA at `http://127.0.0.1:5174/?demo=1&view=settings&theme=dark&seed=release&today=2026-06-17&update=available`:
  - Desktop `1280x720`: Settings → About shows Version panel, update available state, Release notes opens the modal, no horizontal overflow, and no warn/error console logs.
  - Mobile `390x844`: Version panel buttons stack cleanly with no horizontal body overflow and no warn/error console logs.
- Automatic install is verified by unit tests; renderer preview remains a manual-download fallback because it is not a packaged macOS/AppImage build.
