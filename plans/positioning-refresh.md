# Yesterlog positioning refresh

## Goal

Position Yesterlog as a local-first work memory for developers who use Jira,
with time logging as one output alongside reconstruction, recaps, and
review-ready evidence.

## Decisions

- Keep the manager story and the playful "get your Friday back" payoff.
- Use `Your work, remembered.` as the primary brand promise.
- Explain the product through three outcomes: reconstruct, complete, and recap.
- Keep Jira, worklog, and time-tracking language in supporting copy for clarity
  and search intent.
- Promote the shipped Recap workspace in the README and landing page.
- Keep privacy wording accurate for local Ollama and opt-in Claude/Codex CLI
  providers.

## Work

- [x] Refresh README hero, story, feature ordering, Recap tour, and feature list.
- [x] Refresh landing-page metadata, hero, story, and tour.
- [x] Align package, Linux/Snap, and store-listing descriptions.
- [x] Update the GitHub repository About description.
- [x] Verify brand checks, build, and rendered desktop/mobile landing page.

## Verification

- `npm run check:brand` passed.
- `npm run build` passed; Vite retained its existing large-chunk advisory.
- Package and web-manifest JSON parsed successfully; `git diff --check` passed.
- Regenerated and visually inspected the Snap featured banner and GitHub social
  preview.
- Browser QA passed at 1440×960 and 390×844: no horizontal overflow, broken
  images, console errors, or page errors; the Recap screenshot loaded at its
  expected 1440×1000 source size.
- Confirmed the live GitHub About description after updating it.
