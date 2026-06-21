# Edit icons and personal note editing

Goal: stabilize edit icon placement, remove unreachable actions from the worklog hover popover, and add an edit affordance for personal notes.

Decisions:
- Keep Jira worklog edit actions on the visible weekly/today row itself, not inside the non-interactive hover popover.
- Use a fixed action slot that becomes visible on row hover so the pencil position does not shift between entries.
- Reuse the existing add-time modal surface for personal note editing where practical, storing updates locally in IndexedDB.

Pending work:
- Done.

Verification:
- `npm run test -- --run` passed.
- `npm run build` passed.
- Rendered demo week in the in-app browser, added a local personal note, verified fixed action slots, confirmed the worklog popover has no Jira link/edit controls, and opened the personal note edit modal with the saved note text.
