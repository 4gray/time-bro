# README Release Polish

## Goal

Make the README more engaging for the 1.0.0 release, lead with the dark Week screenshot, clearly explain the visible UI, and list the current app views and feature set.

## Decisions

- Use `screenshots/v1.0.0/dark-week.png` as the main README image instead of the app icon.
- Keep emoji usage light and relevant.
- Keep release screenshot documentation aligned with the new `screenshots/` location.

## Work Items

- Refresh the README opening section and screenshot caption. Done.
- Expand the feature/view overview for Today, Week, Tickets, Reports, Settings, and Add Time. Done.
- Verify README links and run the relevant project checks. Done.
- Commit and push the branch. Done.

## Verification

- `screenshots/v1.0.0/dark-week.png` exists and is a 1440x1000 PNG.
- README no longer uses the app icon as the hero image.
- `npm run build` passed.
- `npm run test` passed.
- Committed on `codex/release-screenshots-readme`.
