# Recap document report

## Goal

Turn Recap into a document-first reporting surface. Jira epics, projects, and repositories remain internal evidence structure, while Performance review and Manager update read as one cohesive report. Remove Standup from the Recap workspace because daily standup preparation already belongs to Today.

## Decisions

- Keep the existing Recap route, saved drafts, source traceability, coverage disclosure, exports, and explicit AI generation.
- Offer four Recap formats: Performance review, Manager update, CV bullets, and Changelog.
- Preserve the separate Today standup recap; only remove the weekly/monthly/quarterly Standup format from Recap.
- Render Performance review and Manager update as one continuous document with report-level prose and subtle paragraph breaks, not one card per Jira-derived theme.
- Keep themes as an internal generation/editing unit and expose their evidence through Sources rather than treating them as the primary reading hierarchy.
- Keep CV and Changelog structurally distinct because bullets and release entries are appropriate for those destinations.
- Preserve existing Yesterlog tokens, typography, dark mode, accessibility, and responsive behavior.

## Work

- [x] Remove Standup from Recap contracts, format selectors, serializers, prompts, and tests.
- [x] Add report-level narrative composition for Performance review and Manager update.
- [x] Replace epic-shaped narrative cards with a continuous editable document surface.
- [x] Retain CV impact editing, Changelog entries, scoped sources, exports, and version history.
- [x] Update visible copy, tests, legacy saved-draft handling, and deep-link behavior.

## Verification

- [x] `npm run lint`
- [x] `npm run test` (125 files, 823 tests)
- [x] `npm run build`
- [x] `npm run e2e:renderer` (8 scenarios)
- [x] Rendered light/dark and desktop/compact inspection with no clipping, overflow, or console errors
