# Getting started with Yesterlog

[← Back to the main README](../README.md)

Yesterlog runs as a local desktop application. Jira is the only required
connection; Bitbucket and AI providers are optional.

## Install

Download the latest installer from
[GitHub Releases](https://github.com/4gray/yesterlog/releases/latest):

- **macOS:** signed and notarized `.dmg` or `.zip`;
- **Windows:** `.exe` installer or `.zip`;
- **Linux:** AppImage, `.deb`, `.tar.gz`, or Snap.

Launch Yesterlog and open **Settings → Jira**.

## Connect Jira

For a personal local desktop app, use your Atlassian account email and a
**regular Atlassian API token**. You do not need to be a Jira administrator.

1. Open [Atlassian API tokens](https://id.atlassian.com/manage-profile/security/api-tokens).
2. Choose **Create API token**. For now, do not use the scoped-token flow.
3. Give the token a label such as `Yesterlog`.
4. Copy it once and paste it into **Settings → Jira** with your Atlassian email.
5. Enter the site as `mycompany`, `mycompany.atlassian.net`, or
   `https://mycompany.atlassian.net`.
6. Test the connection, save, and sync.

> Use an API token, not your Atlassian password.

The token acts as you, so Jira still enforces your existing project, issue
security, worklog visibility, and write permissions.

### Why a regular token?

OAuth 2.0 3LO is designed for a distributed integration with a registered
Atlassian app, consent screen, client credentials, redirect URL, and scopes.
Yesterlog is a local desktop app with no hosted authentication relay.

Scoped Atlassian tokens also require the
`api.atlassian.com/ex/jira/{cloudId}` gateway. Yesterlog currently talks
directly to the Jira site URL, so regular token authentication is the supported
setup.

If your organization requires scoped tokens, the read-only scopes Yesterlog
would need are:

- `read:jira-work` for JQL issue search and worklog items;
- `read:jira-user` for `/rest/api/3/myself`.

Scoped-token gateway support would still need to be added before those tokens
work in Yesterlog.

## Connect Bitbucket Cloud (optional)

Bitbucket unlocks the Review view and adds commits and pull-request activity to
Reconstruct and Recap.

1. Create a Bitbucket Cloud scoped API token with read-only scopes.
2. Open **Settings → Bitbucket**.
3. Enter your Bitbucket email, token, workspace, and repositories.
4. Optionally choose a Jira issue as the shared code-review bucket.
5. Test the connection and save.

Yesterlog never writes to Bitbucket. Review logging creates Jira worklogs only
after you select and confirm the sessions.

## Configure optional AI

The deterministic Reconstruct and Recap features work without any model. AI is
off by default.

Open the Local AI section in Settings and choose one provider:

- **Ollama:** fully local, using the configured localhost endpoint and model;
- **Claude CLI:** uses the Anthropic authentication already held by your local
  Claude CLI;
- **Codex CLI:** uses the OpenAI authentication already held by your local
  Codex CLI.

Cloud providers receive a best-effort-redacted prompt only after you explicitly
request an AI action. Yesterlog does not store CLI credentials or operate an AI
proxy. See [Data and privacy](./privacy.md) for details.

## Recommended first steps

1. Set your working days and weekly target.
2. Sync the current week.
3. Review Today and Week for missing worklogs.
4. Add recurring rituals such as standups or planning.
5. Connect Bitbucket if code activity should appear in Reconstruct and Recap.
6. Open Recap after Yesterlog has cached the weeks you want to summarize.

For a complete product tour, see [Features](./features.md).
