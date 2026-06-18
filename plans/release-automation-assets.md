# Release Automation And App Assets

## Goal

Generate branded app assets, wire them into the Electron app, add cross-platform build commands, and automate GitHub releases from tags.

## Decisions

- Use one generated square app icon as the source asset for Electron packaging and the in-app brand mark.
- Keep the icon free of Atlassian/Jira trademarks and text.
- Use electron-builder scripts for per-platform local builds.
- Use GitHub Actions tag-based releases to minimize manual release work.
- Prefer GitHub CLI in the workflow for release creation/upload so we do not depend on a third-party release action.

## Work Items

- Generate app icon and project-bound assets. Done.
- Derive `png`, `icns`, and `ico` packaging icons. Done.
- Update Electron window/package metadata to use the icon. Done.
- Update the renderer brand mark to use the generated asset. Done.
- Add `dist:mac`, `dist:win`, `dist:linux`, and release helper scripts. Done.
- Add GitHub Actions workflow for tag releases across macOS, Windows, and Linux. Done.
- Update README with release/tag workflow. Done.
- Verify tests/build and inspect the generated icon. In progress.

## Verification

- Generated icon inspected with `view_image`.
- `npm run assets:icons` passed.
- `npm run test` passed.
- `npm run build` passed.
- `npm audit` reported 0 vulnerabilities.
- `npm run dist:mac` produced a DMG and ZIP locally.
- `.github/workflows/release.yml` parsed as valid YAML.
- Renderer loaded the generated brand icon with natural size 256x256 and no console warnings.

## Notes

- Current release packages are unsigned. Add Apple Developer ID/notarization and Windows signing secrets later for public distribution.
- Linux and Windows package jobs are configured for CI but were not built locally on this macOS machine.
