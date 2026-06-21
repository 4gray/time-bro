import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { AppSettings } from "../../shared/types";
import { SettingsView } from "./SettingsView";

const settings: AppSettings = {
  jiraBaseUrl: "https://example.atlassian.net",
  jiraEmail: "dev@example.com",
  jiraApiToken: "jira-token-123",
  weeklyTargetHours: 40,
  workingDays: [1, 2, 3, 4, 5],
  reminderTime: "17:00",
  remindersEnabled: true
};

describe("SettingsView", () => {
  it("keeps the Jira token hidden by default and exposes a visibility toggle", () => {
    const markup = renderToStaticMarkup(
      <SettingsView
        draft={settings}
        onDraftChange={() => undefined}
        onSave={() => undefined}
        onTestConnection={() => undefined}
        isTesting={false}
        effectiveTheme="dark"
        onSelectTheme={() => undefined}
      />
    );

    expect(markup).toContain("Jira API token");
    expect(markup).toContain('type="password"');
    expect(markup).toContain('aria-label="Show Jira API token"');
    expect(markup).toContain("jira-token-123");
  });
});
