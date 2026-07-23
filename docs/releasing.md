# Releasing Yesterlog

[← Back to the main README](../README.md)

Use the repository `/release` skill for the canonical end-to-end release flow.
Commit product changes before bumping the version; `npm version` requires a
clean working tree.

## Release flow

Run the complete local verification:

```bash
npm run release:dry-run
```

Then create the release commit and tag:

```bash
npm run release:patch     # or release:minor / release:major
npm run release:push      # push commit and tag
```

`npm version` updates `package.json` and `package-lock.json`, creates the
release commit, and tags `vX.Y.Z`.

## GitHub Actions

Pushes to `main` run unit tests, renderer E2E, and the production build through
[`ci.yml`](../.github/workflows/ci.yml).

Pushing a version tag triggers
[`release.yml`](../.github/workflows/release.yml). The workflow tests, builds,
and packages Yesterlog on native macOS, Windows, and Linux runners. It creates
or updates a **draft** GitHub Release with installers, updater metadata, and
blockmaps attached.

Leave the GitHub Release as a draft unless publication is explicitly intended.

## Local packaging

```bash
npm run dist:mac
npm run dist:win
npm run dist:linux
```

Artifacts are written under `release/`.

## Snap Store

Yesterlog uses electron-builder's `core24` Snap target with strict confinement.
The Snap has outbound network access for configured integrations, home access
for imports and exports, and the normal Electron desktop interfaces.

Build and install a local Snap:

```bash
npm run dist:snap
sudo snap install --dangerous release/*.snap
snap connections yesterlog
yesterlog
```

One-time Store setup:

1. Sign in and reserve the name:

   ```bash
   snapcraft login
   snapcraft register yesterlog
   ```

2. Export a restricted login. Set `SNAP_LOGIN_EXPIRES` to an ISO-8601 UTC
   timestamp:

   ```bash
   export SNAP_LOGIN_EXPIRES="YYYY-MM-DDTHH:MM:SSZ"
   snapcraft export-login \
     --snaps=yesterlog \
     --channels=edge \
     --acls=package_access,package_push,package_update,package_release \
     --expires="$SNAP_LOGIN_EXPIRES" \
     snapcraft-login.txt
   ```

3. Save the file contents as the GitHub Actions secret
   `SNAPCRAFT_STORE_CREDENTIALS`.
4. Set the repository variable `SNAP_STORE_PUBLISH_ENABLED=true`.
5. Use [the Snap listing checklist](./snap-store-listing.md) for copy and media.

Tagged builds publish to `edge` when Store publication is enabled. After
testing the exact revision, promote it without rebuilding:

```bash
snapcraft revisions yesterlog
snapcraft release yesterlog <revision> candidate
snapcraft release yesterlog <revision> stable
```

Test both Wayland and X11. Verify launch and icon integration, Jira reads and
writes, Bitbucket sync, optional AI, links, reminders, clipboard, import/export,
settings persistence, and Snap-managed update behavior.

## Release screenshots

Generate deterministic light and dark screenshots:

```bash
npm run screenshots
```

Install the Playwright browser once if needed:

```bash
npm run screenshots:install-browser
```

Useful overrides:

```bash
npm run screenshots -- --seed blog-1 --today 2026-06-17 --viewport 1600x1000
npm run screenshots -- --views week,reports,recap --themes dark --out screenshots/blog-1
```

The script uses in-memory demo data and writes PNGs to the configured output
directory.

Generate the Snap featured banner and GitHub social preview:

```bash
npm run media:banners
```

The command composites the Yesterlog icon and a real product screenshot over
the art-directed plates in `assets/marketing/`, validates output dimensions and
file-size limits, and writes the PNGs to `docs/media/`.

## macOS signing and notarization

The release workflow signs and notarizes macOS packages with an Apple Developer
ID. Configure these repository secrets:

| Secret | Value |
| --- | --- |
| `MAC_CSC_LINK` | Base64-encoded `.p12` containing the Developer ID Application certificate and private key |
| `MAC_CSC_KEY_PASSWORD` | Password used when exporting the `.p12` |
| `APPLE_API_KEY_BASE64` | Base64-encoded App Store Connect API key `.p8` |
| `APPLE_API_KEY_ID` | App Store Connect API key ID |
| `APPLE_API_ISSUER` | App Store Connect issuer ID |
| `APPLE_TEAM_ID` | Apple Developer Team ID |

Create the Developer ID Application certificate in Apple Developer, install it
in Keychain Access, and export it from **My Certificates** as a
password-protected `.p12`.

Create the notarization key in App Store Connect under **Users and Access →
Integrations → App Store Connect API → Team Keys** with the Developer role.

Encode the files before adding them as secrets:

```bash
base64 -i DeveloperIDApplication.p12 | tr -d '\n' | pbcopy
base64 -i AuthKey_XXXXXXXXXX.p8 | tr -d '\n' | pbcopy
```

Windows packages are currently unsigned.
