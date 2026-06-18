import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DayCard } from "./DayCard";
import type { DayTrackingSummary } from "../../shared/types";

const day: DayTrackingSummary = {
  dateKey: "2026-06-18",
  dateLabel: "Jun 18",
  weekdayName: "Thursday",
  isToday: true,
  isConfiguredWorkingDay: true,
  isSkipped: false,
  targetHours: 8,
  trackedHours: 2.5,
  missingHours: 5.5,
  issues: [
    {
      id: "10000",
      key: "APP-123",
      summary: "Investigate and fix a very long Jira worklog title that should not wrap inside the day card",
      url: "https://example.atlassian.net/browse/APP-123",
      loggedSeconds: 9000,
      comments: ["Paired with QA on regression checks for weekly sync"]
    }
  ]
};

describe("DayCard issue rows", () => {
  it("renders the Jira key link with the ticket title on a second line", () => {
    const markup = renderToStaticMarkup(<DayCard day={day} onToggleSkipped={() => undefined} />);

    expect(markup).toContain('href="https://example.atlassian.net/browse/APP-123"');
    expect(markup).toContain('class="issue-key"');
    expect(markup).toContain("APP-123");
    expect(markup).toContain('class="issue-title"');
    expect(markup).toContain(day.issues[0].summary);
    expect(markup).toContain('class="worklog-comment"');
    expect(markup).toContain(day.issues[0].comments?.[0]);
  });

  it("keeps ticket titles single-line and ellipsized", () => {
    const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
    const issueTitleRule = styles.match(/\.issue-title\s*\{[^}]+\}/)?.[0] ?? "";

    expect(issueTitleRule).toContain("overflow: hidden");
    expect(issueTitleRule).toContain("text-overflow: ellipsis");
    expect(issueTitleRule).toContain("white-space: nowrap");
  });

  it("keeps worklog comments compact and ellipsized", () => {
    const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
    const worklogCommentRule = styles.match(/\.worklog-comment\s*\{[^}]+\}/)?.[0] ?? "";

    expect(worklogCommentRule).toContain("overflow: hidden");
    expect(worklogCommentRule).toContain("text-overflow: ellipsis");
    expect(worklogCommentRule).toContain("white-space: nowrap");
  });
});
