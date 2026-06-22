# Today personal notes

Goal: let the Today view add local personal notes directly, without routing through the Add Time modal.

Decisions:
- Reuse the existing local personal-note save handler in `App.tsx` so storage, validation, and snackbar feedback stay consistent.
- Add a compact mode switch to the Today composer: Jira worklog or personal note.
- Keep the existing duration and started controls shared between both modes.

Completed work:
- Wired `TodayView` to call `onAddPersonalNote`.
- Added a Today composer mode switch for Jira worklogs and personal notes.
- Added Today-specific styling for the mode switch and local note target.
- Updated component coverage for the new mode switch.

Verification:
- `npm run test` passed.
- `npm run build` passed.
- Rendered the demo Today view in the in-app browser, saved a local personal note, confirmed the entry count updated, confirmed the snackbar disappeared after its timeout, and checked that browser console warnings/errors were empty.
