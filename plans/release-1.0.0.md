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
- Commit and push `main`. Done for the first attempt.
- Create and push tag `v1.0.0`. Done for the first attempt.
- Confirm the GitHub Actions release run started. Done for the first attempt.
- Fix CI-only timezone-sensitive TodayView test failure. Done.
- Repoint `v1.0.0` to the fixed release commit and rerun the workflow. Done for the second attempt.
- Fix Linux `.deb` maintainer metadata failure. Done.
- Repoint `v1.0.0` to the Linux metadata fix and rerun the workflow. Done.
- Add polished Markdown release notes with the dark Week screenshot to the draft GitHub release. Done.

## Verification

- `.github/workflows/release.yml` matrix includes macOS (`dist:mac`, DMG/ZIP), Windows (`dist:win`, EXE/ZIP), and Linux (`dist:linux`, AppImage/DEB/tar.gz).
- `.github/workflows/release.yml` parses as valid YAML.
- `package.json` and `package-lock.json` are set to `1.0.0`.
- `npm run release:dry-run` passed.
- First GitHub Actions run `27918104351` started from `v1.0.0` and failed in `TodayView.test.tsx` because the test hardcoded a local time range.
- `TZ=UTC npm run test` passed after making the TodayView test timezone-stable.
- `npm run release:dry-run` passed after the CI test fix.
- Second GitHub Actions run `27918159919` passed Test, macOS build, and Windows build, then failed Linux `.deb` packaging because package author/maintainer email was missing.
- `package.json` author now includes maintainer email for Linux `.deb` metadata.
- `npm run release:dry-run` passed after adding maintainer metadata.
- Third GitHub Actions run `27918300472` passed Test, macOS, Windows, Linux, and Publish jobs.
- Draft GitHub release `v1.0.0` has 7 assets: macOS DMG/ZIP, Windows installer/ZIP, Linux AppImage/DEB/tar.gz.
- Release notes were replaced with a Markdown changelog containing the `screenshots/v1.0.0/dark-week.png` raw GitHub image.
