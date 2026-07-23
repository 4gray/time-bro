# Snap Store packaging

## Goal

Ship Yesterlog as a strictly confined `core24` Snap, build it in the release
workflow, and prepare controlled publication through the Snap Store.

## Decisions

- Use electron-builder's Snap target so the existing desktop packaging remains
  the source of truth.
- Target `core24` with strict confinement and the GNOME extension.
- Request only `network`, `home`, and normal `browser-support` interfaces in
  addition to the desktop interfaces supplied by the GNOME extension.
- Let Snap manage Snap-package updates; never offer Snap users a GitHub `.deb`
  installer.
- Build `amd64` first. Add `arm64` later through a native or remote builder
  after the first Store release is verified.
- Upload release-tag builds to the Store's `edge` channel. Promotion to
  `candidate` or `stable` remains an explicit maintainer action.
- License the project under MIT, with `fourgray` as the copyright holder.

## Work

- [x] Register the public `yesterlog` name with the intended publisher.
- [x] Add MIT licensing.
- [ ] Configure new restricted Store credentials for `yesterlog`/`edge` in GitHub Actions.
- [x] Add Snap build configuration and scripts.
- [x] Add Snap-aware update behavior and tests.
- [x] Add Snap build and `edge` publication to release CI.
- [x] Document Store metadata, testing, and promotion.
- [x] Verify tests, production build, workflow, and packaging config.
- [x] Repair the hosted Ubuntu Snap build after the v2.7.1 LXD networking
  failure by using Canonical's supported GitHub build action.
- [ ] Verify the `v3.0.0` tagged release uploads `yesterlog` to the Store's
  `edge` channel.

## External actions

- [ ] Complete Store listing metadata and media.
- [ ] Test the Store revision on Ubuntu and promote it beyond `edge`.

## Verification

- Focused updater/settings tests: 23 passed.
- Full Vitest suite: 123 files and 813 tests passed.
- Renderer E2E: 8 tests passed.
- Production TypeScript/Vite/Electron build: passed.
- electron-builder 26.15.3 generated-descriptor assertions: passed for
  `amd64`, name, `core24`, strict confinement, stable grade, title, summary,
  command, GNOME extension, plugs, and icon.
- Release workflow YAML, Store media, and whitespace checks: passed.
- Browser review of Settings → About: no clipping, overflow, console warnings,
  or console errors.
- The established workflow uses Canonical's `snapcore/action-build` so the real
  `.snap` build runs on Ubuntu 24.04 with supported LXD/network setup.
- The first Yesterlog Store revision and public listing remain pending the
  `v3.0.0` release workflow.
- `npm audit --omit=dev` reports one existing high-severity `js-yaml` advisory
  inherited through electron-updater/build tooling; no dependencies changed in
  this packaging task.
