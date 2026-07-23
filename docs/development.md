# Developing Yesterlog

[← Back to the main README](../README.md)

Yesterlog is an Electron desktop application built with React, TypeScript,
Vite, and IndexedDB.

## Local setup

```bash
npm install
npm run dev
```

`npm run dev` starts the Vite renderer on `http://127.0.0.1:5173/`, watches the
Electron TypeScript build, and opens the desktop application against the local
renderer.

For a browser-only renderer preview:

```bash
npm run dev:renderer
```

## Common commands

```bash
npm run test          # Vitest unit and component tests
npm run e2e:renderer  # Playwright renderer E2E with demo data
npm run lint          # Type-check renderer and Electron
npm run build         # Production renderer + Electron build
npm run preview       # Preview the production renderer
npm run dist          # Package for the current platform
npm run dist:mac      # macOS DMG + ZIP
npm run dist:win      # Windows NSIS installer + ZIP
npm run dist:linux    # Linux AppImage + DEB + tar.gz
npm run dist:snap     # Linux Snap
npm run screenshots   # Capture release screenshots
npm run media:banners # Generate Snap and GitHub marketing banners
npm run check:brand   # Check for accidental legacy branding
npm audit             # Check dependency advisories
```

Regenerate platform and web icons after changing the source icon:

```bash
npm run assets:icons
```

## Architecture

```text
.
├── electron/      # Main process, preload bridge, integrations, reminders, updates
├── shared/        # Shared TypeScript contracts, release helpers, and ADF utilities
├── src/
│   ├── api/       # Renderer clients for native IPC
│   ├── app/       # Application state and route wiring
│   ├── components/# React views and UI primitives
│   ├── domain/    # Pure worklog, reconstruction, recap, and reporting logic
│   ├── storage/   # IndexedDB persistence
│   └── styles/    # Shared and feature styles
├── e2e/           # Renderer end-to-end tests
├── scripts/       # Assets, screenshots, packaging, and release helpers
├── docs/          # Product and maintainer documentation
├── plans/         # Agent-maintained implementation plans
├── AGENTS.md      # Repository-specific agent instructions
└── package.json
```

Renderer UI lives in `src/`. Jira, Bitbucket, update, and AI-provider network
access goes through the Electron main process over IPC. Shared request and
response contracts live in `shared/`.

The deterministic Day Reconstruction engine is in
`src/domain/reconstruct.ts`. Optional AI prompt and response handling stays
separate from that core. Recap aggregation and grounded format generation live
in `src/domain/recapWorkspace.ts`.

## Development rules

- Keep credentials local and do not add telemetry or a Yesterlog backend.
- Preserve Jira worklog IDs, issue keys, timestamps, durations, and comments
  across API, IPC, storage, and UI layers.
- Keep Jira API access read-only except for the existing intentional worklog
  create/edit/delete flows.
- Preserve Monday-local calculations and `[weekStart, weekEndExclusive)`
  filtering.
- Keep deterministic reconstruction and Recap behavior useful when AI is
  disabled or fails.
- Use existing design tokens and component patterns.

See [AGENTS.md](../AGENTS.md) for the full repository development guide.

## Verification

For production-affecting changes:

```bash
npm run test
npm run build
```

Run `npm run e2e:renderer` for navigation and interaction changes. Inspect
frontend work in a real browser or Electron window for clipping, overflow,
console errors, and broken states. Run `npm audit` after dependency changes.

## Demo and screenshots

The renderer supports deterministic demo data used by E2E tests and release
screenshots. A typical demo URL is:

```text
http://127.0.0.1:5173/?demo=1&view=week&theme=dark&seed=release&today=2026-06-17
```

Demo data is in-memory and does not write fake credentials or worklogs into the
normal IndexedDB database.

## Implementation plans

Agentic development plans live in [`/plans`](../plans). Update the relevant
plan when scope or decisions change so it remains useful after the work is
complete.

For packaging and publishing, see [Releasing](./releasing.md).
