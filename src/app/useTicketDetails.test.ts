import { describe, expect, it } from "vitest";
import type { SyncResult, WeekState } from "../../shared/types";
import { buildLocalTicketDetails, buildTicketWeekStats } from "./useTicketDetails";

const weekState = {
  weekKey: "2026-06-22",
  weekRangeLabel: "Jun 22 - 28, 2026",
  days: [
    {
      dateKey: "2026-06-22",
      issues: [
        {
          id: "10001",
          key: "OPS-77",
          summary: "Pair on incident review notes",
          url: "https://example.atlassian.net/browse/OPS-77",
          loggedSeconds: 1800
        }
      ]
    },
    {
      dateKey: "2026-06-23",
      issues: [
        {
          id: "10001",
          key: "OPS-77",
          summary: "Pair on incident review notes",
          url: "https://example.atlassian.net/browse/OPS-77",
          loggedSeconds: 3600
        }
      ]
    }
  ]
} as WeekState;

const syncResult = {
  weekKey: "2026-06-22",
  weekStartISO: "2026-06-22T00:00:00.000Z",
  weekEndExclusiveISO: "2026-06-29T00:00:00.000Z",
  syncedAt: "2026-06-24T12:00:00.000Z",
  accountId: "me",
  trackedSeconds: 12_600,
  issueCount: 2,
  worklogCount: 4,
  daySummaries: {
    "2026-06-22": {
      trackedSeconds: 1800,
      issues: [],
      worklogs: [
        {
          id: "1",
          issueId: "10001",
          issueKey: "OPS-77",
          issueSummary: "Pair on incident review notes",
          authorAccountId: "me",
          started: "2026-06-22T09:00:00.000Z",
          timeSpentSeconds: 1800
        }
      ]
    },
    "2026-06-23": {
      trackedSeconds: 3600,
      issues: [],
      worklogs: [
        {
          id: "2",
          issueId: "10001",
          issueKey: "OPS-77",
          issueSummary: "Pair on incident review notes",
          authorAccountId: "me",
          started: "2026-06-23T09:00:00.000Z",
          timeSpentSeconds: 3600
        },
        {
          id: "3",
          issueId: "10002",
          issueKey: "OPS-78",
          issueSummary: "Different work",
          authorAccountId: "me",
          started: "2026-06-23T11:00:00.000Z",
          timeSpentSeconds: 7200
        }
      ]
    },
    "2026-06-29": {
      trackedSeconds: 7200,
      issues: [],
      worklogs: [
        {
          id: "4",
          issueId: "10001",
          issueKey: "OPS-77",
          issueSummary: "Outside visible week",
          authorAccountId: "me",
          started: "2026-06-29T09:00:00.000Z",
          timeSpentSeconds: 7200
        }
      ]
    }
  }
} as SyncResult;

describe("ticket details helpers", () => {
  it("builds local issue details from the visible week", () => {
    expect(buildLocalTicketDetails({ issueKey: "ops-77", weekState })?.summary).toBe(
      "Pair on incident review notes"
    );
  });

  it("sums only visible-week worklogs for the selected ticket", () => {
    expect(buildTicketWeekStats({ issueKey: "ops-77", weekState, syncResult })).toEqual({
      loggedSeconds: 5400,
      worklogCount: 2
    });
  });
});
