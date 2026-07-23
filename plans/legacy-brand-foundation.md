# Legacy Brand Foundation

## Goal

Rename the local Jira worklog tracker to Yesterlog and refresh the app icon in the Yesterlog clock/watch style.

## Decisions

- Use `Yesterlog` for visible app and package branding.
- Keep Jira/worklog behavior unchanged.
- Implement the final app icon as the existing source SVG so generated `png`, `icns`, and `ico` assets remain deterministic.
- Use the generated image as concept direction, then keep the checked-in icon vector-native.
- Keep the final app icon mostly flat: restore the macOS/iOS-style background gradient, but keep the clock elements free of gloss arcs, shadows, and central pivot highlights.
- Expose the preload bridge only as `window.yesterlog`.
- Move theme persistence to `yesterlog-theme`, with a fallback read from the legacy `sprintf-theme` key.

## Pending work

- Done: updated Electron/package/HTML/UI/docs branding.
- Done: replaced the app icon source SVG.
- Done: regenerated icon assets.
- Done: flattened the icon source and regenerated icon assets again.
- Done: renamed preload/theme internals with compatibility fallbacks.
- Done: added a sync guard so fresh installs do not call Jira before settings are configured.
- Done: ran tests, build, renderer QA, packaged QA, and macOS distribution.

## Verification

- `npm run assets:icons`
- `npm run test`
- `npm run build`
- `npm run dist:mac`
- `agent-browser` renderer preview check at `http://127.0.0.1:5173/`
- `agent-browser` packaged app check against `release/mac-arm64/Yesterlog.app` with CDP on port `9333`
