import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps } from "react";
import { describe, expect, it } from "vitest";
import type { AppSettings, AppUpdateInfo } from "../../shared/types";
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

const updateInfo: AppUpdateInfo = {
  currentVersion: "1.0.0",
  latestVersion: "1.1.0",
  releaseName: "v1.1.0",
  releasePageUrl: "https://github.com/4gray/time-bro/releases/tag/v1.1.0",
  checkedAt: "2026-06-22T12:00:00.000Z",
  updateAvailable: true
};

const renderSettings = (overrides: Partial<ComponentProps<typeof SettingsView>> = {}) =>
  renderToStaticMarkup(
    <SettingsView
      draft={settings}
      onDraftChange={() => undefined}
      onSave={() => undefined}
      onTestConnection={() => undefined}
      isTesting={false}
      effectiveTheme="dark"
      onSelectTheme={() => undefined}
      updateInfo={updateInfo}
      isCheckingUpdates={false}
      onCheckForUpdates={() => undefined}
      onOpenReleasePage={() => undefined}
      {...overrides}
    />
  );

describe("SettingsView", () => {
  it("keeps the Jira token hidden by default and exposes a visibility toggle", () => {
    const markup = renderSettings();

    expect(markup).toContain("Jira API token");
    expect(markup).toContain('type="password"');
    expect(markup).toContain('aria-label="Show Jira API token"');
    expect(markup).toContain("jira-token-123");
  });

  it("renders current and latest app versions", () => {
    const markup = renderSettings();

    expect(markup).toContain("Version");
    expect(markup).toContain("v1.0.0");
    expect(markup).toContain("v1.1.0");
    expect(markup).toContain("v1.1.0 is available.");
    expect(markup).toContain("GitHub Releases");
  });
});
