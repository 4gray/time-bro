# Import and Export in Settings

## Goal

Add personal note import support and move the existing CSV export affordance from Reports into Settings.

## Decisions

- Keep the existing weekly CSV export format so older exported files stay useful.
- Import only `LOCAL-NOTE` rows from exported CSV files; Jira rows remain read-only/sync-owned and are ignored.
- Reconstruct imported personal notes from CSV date, summary text, and hours, then store them by Monday-local week.
- Surface import/export from a new Settings data panel.
- Add welcome copy explaining that previous-version personal notes can be imported later from Settings.

## Pending Work

- Commit and push the verified changes.

## Completed Work

- Added CSV parsing/import helpers and storage support for saving notes across weeks.
- Wired Settings controls to export the visible week and import selected CSV files.
- Removed the Reports export action.
- Added focused tests for Settings, Welcome, and import parsing.

## Verification

- `npm run test` passed: 19 files, 63 tests.
- `npm run build` passed.
- Browser QA passed on `http://127.0.0.1:5173/` welcome screen: previous-version import copy renders, no console warnings/errors, no Vite overlay.
- Browser QA passed on `http://127.0.0.1:5173/?demo=1&view=settings&theme=dark`: Settings data panel renders, Export CSV click shows success snackbar, no console warnings/errors, no Vite overlay.
- Mobile viewport check passed at 390x844: Settings data panel stacks controls cleanly and Export CSV still works.
