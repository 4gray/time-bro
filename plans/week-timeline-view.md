# Week timeline view

## Goal

Add a timeline mode to Week that makes every day directly editable like Today, while preserving the current compact summary as an equal, easy-to-return-to mode.

## Decisions

- Put a two-option `Summary` / `Timeline` segmented control in the Week header and persist the preference locally.
- Use one shared vertical time scale for the full week, with aligned day columns and horizontal overflow on narrow windows.
- Keep the Week hero, navigation, active-work dock, vacation state, recurring suggestions, and existing Summary mode intact.
- Reuse the Today calendar interaction rules: drag empty time to create, drag a worklog to move it, resize either edge, and click to edit.
- Keep future and skipped days visible but read-only in Timeline mode.

## Work

- [x] Produce and inspect a TimeBro-aligned visual concept.
- [x] Implement the mode control and week timeline surface.
- [x] Connect Add Time prefills and worklog move/resize actions through the Week route.
- [x] Add component and route coverage for the new behavior.
- [x] Run tests and build, then inspect the rendered dark/light layouts and interactions.

## Verification

- `npm run test`: 102 files, 624 tests passed on the isolated PR branch.
- `npm run e2e:renderer`: 7 renderer scenarios passed, including mode switching and persistence.
- `npm run build`: passed; Vite retains its existing large-chunk advisory.
- Browser QA: inspected dark desktop and light compact layouts; checked shared alignment, sticky headers, scrolling, exact-time dock drops, add/move interactions, future/vacation read-only states, and responsive overflow.
- Browser console: no application errors or warnings.
