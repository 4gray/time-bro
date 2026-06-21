# Release 1.0.0

## Goal

Prepare and trigger the GitHub Actions release for `v1.0.0`, producing draft GitHub release assets for macOS, Windows, and Linux.

## Decisions

- Use the existing tag-triggered `.github/workflows/release.yml`.
- Update package metadata to `1.0.0` before tagging so Electron packages carry the release version.
- Change the GitHub release creation step to create a draft release.
- Trigger the workflow by pushing annotated tag `v1.0.0` after `main` is updated.

## Work Items

- Verify platform matrix and artifact outputs. Done.
- Update workflow publish step to create a draft release. Done.
- Bump package metadata to `1.0.0`. Done.
- Run tests/build. Done.
- Commit and push `main`. In progress.
- Create and push tag `v1.0.0`. Pending.
- Confirm the GitHub Actions release run started. Pending.

## Verification

- `.github/workflows/release.yml` matrix includes macOS (`dist:mac`, DMG/ZIP), Windows (`dist:win`, EXE/ZIP), and Linux (`dist:linux`, AppImage/DEB/tar.gz).
- `.github/workflows/release.yml` parses as valid YAML.
- `package.json` and `package-lock.json` are set to `1.0.0`.
- `npm run release:dry-run` passed.
