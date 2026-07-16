# Configurable day timeline

## Goal

Make Today and Week timelines usable for early, late, and overnight work without
hiding hours that fall outside a fixed daytime window.

## Decisions

- Render the full 00:00–24:00 day in both timelines.
- Keep the useful compact framing by scrolling to a saved focus time rather than
  cropping the day.
- Add a Tracking setting for the focus time and a toggle that centers the current
  day/week on the live time.
- Default the focus time to 08:00, which keeps roughly the former 07:00 opening
  while allowing every hour to remain reachable.
- Preserve existing event expansion, drag/drop, and read-only behavior.

## Work

- [x] Add persisted timeline preferences and settings controls.
- [x] Change shared day geometry to a full-day window.
- [x] Apply deterministic initial scrolling in Today and Week timeline views.
- [x] Add/update tests for geometry, settings, and view wiring.
- [x] Verify tests, build, and the rendered UI.

## Verification

- `npm run test` — 106 files / 674 tests passed.
- `npm run build` — renderer and Electron production builds passed.
- `npm run e2e:renderer` — 7 renderer flows passed.
- Browser QA at 1440×1000 — Today, Week timeline, and Tracking settings
  inspected with no clipping, document overflow, or console errors.
- Interaction QA — disabling "center on now" and saving a `03:00` focus time
  reopened Today at the expected early-morning position.
