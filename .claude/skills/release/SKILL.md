---
name: release
description: Use when releasing, shipping, or cutting a new version of TimeBro — bumping the version, publishing a build, tagging a release, or cutting a hotfix for 4gray/time-bro. Triggers on "release", "ship a version", "cut a release", "publish a build", "hotfix".
argument-hint: "[patch|minor|major]"
---

# Release TimeBro

End-to-end release flow for `4gray/time-bro` (private Electron + Vite + React app, npm package `timebro`). Pushing a `vX.Y.Z` tag triggers `.github/workflows/release.yml`, which tests, builds and code-signs/notarizes macOS plus builds Windows/Linux, and creates a **DRAFT** GitHub Release with the artifacts attached. You then curate the notes and hand the user the draft URL. **Do not publish unless the user explicitly asks.**

The bump type comes from `$ARGUMENTS` (`$1`): `patch`, `minor`, or `major`. **Default to `patch`** when none is given.

## Procedure

### 1. Preconditions
- Release from `main`. The `chore(release)` commits live on `main`; this project does not use release branches.
- Confirm the bump type. Map `$1` → script: `patch`→`release:patch`, `minor`→`release:minor`, `major`→`release:major`. If `$1` is empty, use `patch`.
- The working tree must be **clean** before bumping — `npm version` aborts on a dirty tree. So commit the actual fix/feature FIRST (step 2).
- (Optional, recommended) Validate locally before tagging:
  ```bash
  npm run release:dry-run
  ```
  (= `npm run test && npm run e2e:renderer && npm run build`)

### 2. Commit the change
Commit the real fix/feature with a conventional-commit subject and a body explaining the why, ending with the trailer:
```bash
git add -A
git commit -m "fix: <subject>" -m "<why this change>" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```
Verify the tree is now clean (must print nothing):
```bash
git status --porcelain
```

### 3. Bump version + create the tag
Run the project script for the chosen bump type (default `patch`):
```bash
npm run release:patch    # or: npm run release:minor / npm run release:major
```
Each expands to `npm version <type> -m "chore(release): v%s"`, which in one step:
- updates `"version"` in `package.json` **and** `package-lock.json`,
- creates a `chore(release): vX.Y.Z` commit, and
- creates the annotated tag `vX.Y.Z`.

The current version is `1.3.2`, so the next patch produces `v1.3.3`. Capture the new version and tag for later steps:
```bash
NEW=$(node -p "require('./package.json').version")   # e.g. 1.3.3
TAG="v$NEW"                                           # e.g. v1.3.3
echo "$TAG"
```

### 4. Push the commit and the tag
```bash
npm run release:push     # = git push && git push --tags
```
The tag push (`vX.Y.Z`, matching `on: push: tags: "v*.*.*"`) is what triggers the Release workflow.

### 5. Find the pipeline run, then watch it in the BACKGROUND
Resolve the run id for this tag (the workflow runs against the tag ref):
```bash
RUN_ID=$(gh run list --workflow=release.yml --branch "$TAG" --limit 1 --json databaseId -q '.[0].databaseId')
echo "$RUN_ID"
```
Watch it to completion **in the background** (the build takes ~5-6 min) so you're notified when it finishes:
```bash
gh run watch "$RUN_ID" --exit-status --interval 20
```
Run that `gh run watch` command with `run_in_background: true`.

### 6. What the pipeline does
Jobs run in order, all from the **tagged commit**:
1. `test` (ubuntu-latest) — `npm ci`, `npm run test`, `npx playwright install --with-deps chromium`, `npm run e2e:renderer`, `npm run build`.
2. `build` (`needs: test`, matrix, `fail-fast: false`) — three platforms in parallel:
   - **macOS** (`macos-latest`, artifact `timebro-macos`): runs `npm run dist:mac -- -c.mac.forceCodeSigning=true` with code-signing + notarization (the `mac` build config has `notarize: true` and `hardenedRuntime: true`). Produces `release/*.dmg`, `release/*.zip`.
   - **Windows** (`windows-latest`, artifact `timebro-windows`): `npm run dist:win`, unsigned. Produces `release/*.exe`, `release/*.zip`.
   - **Linux** (`ubuntu-latest`, artifact `timebro-linux`): `npm run dist:linux`, unsigned. Produces `release/*.AppImage`, `release/*.deb`, `release/*.tar.gz`.
3. `publish` (`needs: build`, ubuntu-latest, only when `startsWith(github.ref, 'refs/tags/v')`) — downloads all artifacts into `release-assets/`, then **creates the release if it doesn't exist, or `gh release upload --clobber` if it does**:
   ```bash
   gh release create "$TAG_NAME" "${assets[@]}" \
     --draft \
     --title "$TAG_NAME" \
     --generate-notes \
     --verify-tag
   ```
The result is a **DRAFT** GitHub Release titled `vX.Y.Z` with `.dmg/.zip/.exe/.AppImage/.deb/.tar.gz` attached and auto-generated notes.

### 7. Confirm the draft and curate the release notes
After the run succeeds, confirm the draft exists:
```bash
gh release view "$TAG" --json isDraft,url,assets -q '{isDraft, url, assets: [.assets[].name]}'
```
Replace the auto-generated notes with a **curated, user-facing changelog**. Determine the previous tag for the compare link:
```bash
PREV=$(git tag --sort=-v:refname | grep -v "^$TAG$" | head -1)   # e.g. v1.3.2
```
Write `/tmp/notes.md` (group changes under headings like **Highlights**, **Fixes**, **Improvements** — describe user-visible impact, not raw commit subjects) and ALWAYS end with the compare link:
```markdown
## What's new in vX.Y.Z

### Highlights
- ...

### Fixes
- ...

**Full changelog:** https://github.com/4gray/time-bro/compare/vPREV...vX.Y.Z
```
Apply the notes to the draft (this does not publish it):
```bash
gh release edit "$TAG" --title "$TAG" --notes-file /tmp/notes.md
```

### 8. Hand the URL to the user — leave it as a DRAFT
Give the user the draft release URL and tell them it's ready for review:
```bash
gh release view "$TAG" --json url -q .url
```
**Stop here.** The release stays a DRAFT for the user to review and Publish themselves. **Only** publish when the user explicitly asks, with:
```bash
gh release edit "$TAG" --draft=false
```

## Gotchas

- **The shipped version comes from the BUILD, not from any runtime string.** In the renderer, `import.meta.env.VITE_APP_VERSION` is injected at build time by a Vite `define` in `vite.config.ts` (`"import.meta.env.VITE_APP_VERSION": JSON.stringify(packageJson.version)`), read in `src/App.tsx` and `src/api/native.ts`. In the Electron main process, `app.getVersion()` (`electron/main.ts`) reads the bundled `package.json`. CI builds from the **tagged commit**, so the version bump must be committed + tagged BEFORE the build — which is exactly why the tag push is the trigger. Never hand-edit a version string anywhere else; bump only via `npm version` (step 3).
- **Clean tree is mandatory.** `npm version` (inside `release:patch/minor/major`) refuses a dirty working tree and aborts. Commit your real change first (step 2).
- **A local `npm run dist:mac` is UNSIGNED** (it runs with `--publish never` and no signing secrets) and is stamped with whatever `package.json` version exists at that moment. Use it only for quick personal testing — never as the release artifact. The signed/notarized macOS build only happens in CI via repo secrets (`MAC_CSC_LINK`, `MAC_CSC_KEY_PASSWORD`, `APPLE_API_KEY_BASE64`, `APPLE_API_KEY_ID`, `APPLE_API_ISSUER`, `APPLE_TEAM_ID`). If any macOS signing secret is missing, the macOS build job fails fast at the "Check macOS signing secrets" step; Windows and Linux need no signing.
- **The tag pattern must be semver `vX.Y.Z`.** Only `v*.*.*` triggers the release on push. A manual `workflow_dispatch` run executes `test` + `build` but **skips `publish`** (gated on `startsWith(github.ref, 'refs/tags/v')`), so no release is created from a branch dispatch.
- **The publish job is idempotent.** Re-running it when the release already exists uses `gh release upload --clobber` rather than recreating it, so re-runs overwrite assets instead of duplicating the release.
- **Repo slug vs package name differ:** the GitHub repo is `4gray/time-bro` (used in all `gh` and compare-link URLs), but the npm package `name` is `timebro` and the electron-builder `productName` is `TimeBro`. Use `time-bro` in URLs.
- **Validate before tagging** with `npm run release:dry-run` (= `npm run test && npm run e2e:renderer && npm run build`) to avoid pushing a tag that fails CI.