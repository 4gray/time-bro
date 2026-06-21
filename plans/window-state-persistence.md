# Window state persistence

## Goal

Remember the Electron main window position and size between app launches.

## Decisions

- Keep the implementation in the Electron main process.
- Avoid adding `electron-window-state`; the app only needs one small persisted bounds file.
- Store window bounds under Electron `userData`.
- Restore saved bounds only when they intersect an available display, so the app does not reopen off-screen after monitor changes.

## Status

- Done: added local window-state persistence helpers.
- Done: wired saved bounds into `BrowserWindow` creation.
- Done: saved bounds on move/resize/close.
- Done: verified with tests, build, and a rendered Electron smoke launch.

## Verification

- `npm run test`
- `npm run build`
- Electron smoke launch of `dist-electron/electron/main.js`
