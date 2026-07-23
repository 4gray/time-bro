# Yesterlog positioning refresh

## Goal

Position Yesterlog as a local-first work memory for developers who use Jira,
with time logging as one output alongside reconstruction, recaps, and
review-ready evidence. Keep the repository front page focused by moving detailed
product, setup, privacy, development, and release material into dedicated docs.

## Decisions

- Keep the manager story and the playful "get your Friday back" payoff.
- Use `Your work, remembered.` as the primary brand promise.
- Explain the product through three outcomes: reconstruct, complete, and recap.
- Keep Jira, worklog, and time-tracking language in supporting copy for clarity
  and search intent.
- Promote the shipped Recap workspace in the README and landing page.
- Keep privacy wording accurate for local Ollama and opt-in Claude/Codex CLI
  providers.
- Treat the root README as a product landing page, not the complete manual.
- Keep essential Jira/worklog/reconstruction/Recap language in the README for
  clarity and search intent, then link to detail instead of duplicating it.
- Use five durable docs pages: getting started, features, privacy, development,
  and releasing. Keep Snap Store listing copy in its existing dedicated file.

## Work

- [x] Refresh README hero, story, feature ordering, Recap tour, and feature list.
- [x] Refresh landing-page metadata, hero, story, and tour.
- [x] Align package, Linux/Snap, and store-listing descriptions.
- [x] Update the GitHub repository About description.
- [x] Verify brand checks, build, and rendered desktop/mobile landing page.
- [x] Move the full product tour and feature inventory to `docs/features.md`.
- [x] Move connection setup to `docs/getting-started.md`.
- [x] Move storage, AI, and Jira data-flow detail to `docs/privacy.md`.
- [x] Move local build and architecture detail to `docs/development.md`.
- [x] Move release, packaging, signing, and screenshot operations to
  `docs/releasing.md`.
- [x] Reduce the root README to the product story, core workflow, install,
  privacy promise, docs navigation, and minimal local build instructions.
- [x] Validate Markdown links and re-run repository verification.

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
- Reduced the root README from 547 lines / 3,934 words to 107 lines / 487 words.
- All local links and images resolve across the README and five new docs pages.
- Re-ran `npm run check:brand`, `npm run build`, and `git diff --check`; all
  passed, with only Vite's existing large-chunk advisory.
