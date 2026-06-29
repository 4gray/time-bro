# Ticket Details Dialog

## Goal

Open an in-app dialog when the user clicks a Jira ticket key, while keeping the existing adjacent external-link icon opening the ticket in the user's browser.

## Decisions

- Use the existing Jira API token and Electron main-process Jira access only.
- Add a read-only issue details IPC endpoint for summary, description, status, assignee, project, type, epic, Jira aggregate time fields, and the current user's all-time worklog total for that issue.
- Jira Cloud `description` is Atlassian Document Format (ADF) JSON, not HTML or Markdown. Keep a plain-text fallback but render the raw ADF subset safely in React for headings, paragraphs, lists, blockquotes, code, links, and text marks.
- Sum "my time this week" from the already-synced worklogs for the visible week so the dialog is useful immediately and does not require extra worklog writes or bulk Jira changes.
- Keep `TicketKeyLink` as the shared interaction point, using app-level context so every ticket key can open the same dialog without prop-drilling through every view.

## Completed Work

- Added shared request/response types.
- Added Electron Jira fetch function, IPC handler, preload bridge, and renderer API wrapper.
- Added dialog component, app state hook, ADF description renderer, and overlay wiring.
- Updated ticket key rendering styles and focused tests.
- Verified tests/build and inspected desktop/mobile rendered UI.

## Verification

- `npm run test` passed: 88 files, 448 tests.
- `npm run build` passed.
- Rendered QA passed in demo tickets view at desktop and 390px mobile viewport. Ticket-key click opens the details dialog; the adjacent Jira external-link icon remains an `href` link; description fallback/scrolling is visible; console errors/warnings were empty.
