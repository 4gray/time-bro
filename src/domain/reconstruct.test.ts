import { describe, expect, it } from "vitest";
import {
  autoDistribute,
  buildReconstructDay,
  buildSignals,
  formatReconDuration,
  getReconstructSummary,
  type ReconstructInput,
  type ReconstructReviewSession,
  type ReconstructWorklog
} from "./reconstruct";

const review = (overrides: Partial<ReconstructReviewSession> = {}): ReconstructReviewSession => ({
  id: "team/web#511:2026-06-15",
  jiraIssueKey: "ftdm-395",
  pullRequestId: 511,
  pullRequestTitle: "schema migration",
  repositoryName: "web-app",
  startedISO: "2026-06-15T11:00:00",
  endedISO: "2026-06-15T11:40:00",
  estimatedSeconds: 40 * 60,
  commentCount: 9,
  confidence: "high",
  ...overrides
});

const worklog = (overrides: Partial<ReconstructWorklog> = {}): ReconstructWorklog => ({
  issueKey: "FTDM-100",
  issueSummary: "Daily standup",
  startedISO: "2026-06-15T13:00:00",
  timeSpentSeconds: 75 * 60,
  ...overrides
});

const input = (overrides: Partial<ReconstructInput> = {}): ReconstructInput => ({
  dateKey: "2026-06-15",
  weekdayIso: 1,
  isToday: false,
  workingDays: [1, 2, 3, 4, 5],
  targetMinutes: 480,
  worklogs: [],
  reviewSessions: [],
  ...overrides
});

describe("formatReconDuration", () => {
  it("formats hours and minutes", () => {
    expect(formatReconDuration(150)).toBe("2h 30m");
    expect(formatReconDuration(60)).toBe("1h");
    expect(formatReconDuration(40)).toBe("40m");
    expect(formatReconDuration(0)).toBe("0m");
  });

  it("supports an estimate prefix", () => {
    expect(formatReconDuration(110, { estimate: true })).toBe("~1h 50m");
  });
});

describe("buildSignals", () => {
  it("maps unlogged review sessions, sorts by start, normalises confidence and key", () => {
    const signals = buildSignals([
      review({ id: "b", startedISO: "2026-06-15T14:00:00", confidence: "medium" }),
      review({ id: "a", startedISO: "2026-06-15T09:00:00", confidence: "high" })
    ]);

    expect(signals.map((s) => s.id)).toEqual(["a", "b"]);
    expect(signals[0]).toMatchObject({ kind: "pr", key: "FTDM-395", confidence: "high", startHour: 9 });
    expect(signals[1].confidence).toBe("med");
    expect(signals[0].title).toBe("Review: schema migration");
  });

  it("excludes already-logged sessions (never offered twice)", () => {
    const signals = buildSignals([review({ id: "logged", logged: true }), review({ id: "open" })]);
    expect(signals.map((s) => s.id)).toEqual(["open"]);
  });
});

describe("buildReconstructDay", () => {
  it("returns a calm rest state for a non-working day with no activity", () => {
    const day = buildReconstructDay(input({ weekdayIso: 6 }));
    expect(day.kind).toBe("weekend");
    expect(day.signals).toHaveLength(0);
    expect(day.rows).toHaveLength(0);
    expect(getReconstructSummary(day)).toMatchObject({ bigLabel: "Weekend", bigWord: "rest day" });
  });

  it("renders a weekend that has real signals as a normal day", () => {
    const day = buildReconstructDay(input({ weekdayIso: 7, reviewSessions: [review()] }));
    expect(day.kind).toBe("past");
    expect(day.signals).toHaveLength(1);
  });

  it("reconstructs an active day from signals + already-logged worklogs", () => {
    const day = buildReconstructDay(
      input({
        reviewSessions: [
          review({ id: "open-1", startedISO: "2026-06-15T09:00:00", estimatedSeconds: 110 * 60, confidence: "high" }),
          review({ id: "open-2", startedISO: "2026-06-15T11:00:00", estimatedSeconds: 40 * 60, confidence: "medium" }),
          review({ id: "done", logged: true })
        ],
        worklogs: [worklog()]
      })
    );

    expect(day.kind).toBe("past");
    expect(day.signals).toHaveLength(2); // logged session excluded
    expect(day.reconstructedMinutes).toBe(150);
    expect(day.loggedMinutes).toBe(75);
    expect(day.gapMinutes).toBe(255);
    expect(day.sendCount).toBe(2);

    const nine = day.rows.find((row) => row.hour === "09:00");
    expect(nine).toMatchObject({ kind: "filled", durationMinutes: 110 });
    expect(nine?.naiveDescription).toContain("pull request #");

    const standup = day.rows.find((row) => row.kind === "locked");
    expect(standup).toMatchObject({ hour: "13:00", durationMinutes: 75, sub: "already in Jira · 1h 15m" });

    expect(day.rows.some((row) => row.kind === "empty")).toBe(true);

    const summary = getReconstructSummary(day);
    expect(summary).toMatchObject({
      bigLabel: "2h 30m",
      bigWord: "reconstructed",
      sub: "· 3h 45m of 8h accounted",
      gapLabel: "4h 15m",
      sendBtnLabel: "Log 2 entries in Jira",
      dayTag: "PAST DAY"
    });
  });

  it("marks today", () => {
    const day = buildReconstructDay(input({ isToday: true, reviewSessions: [review()] }));
    expect(day.kind).toBe("today");
    expect(getReconstructSummary(day).dayTag).toBe("TODAY");
  });

  it("treats a fully-logged day as complete with no gap rows", () => {
    const day = buildReconstructDay(
      input({
        worklogs: [
          worklog({ issueKey: "A", startedISO: "2026-06-15T09:00:00", timeSpentSeconds: 240 * 60 }),
          worklog({ issueKey: "B", startedISO: "2026-06-15T14:00:00", timeSpentSeconds: 240 * 60 })
        ]
      })
    );

    expect(day.kind).toBe("complete");
    expect(day.loggedMinutes).toBe(480);
    expect(day.rows.every((row) => row.kind === "locked")).toBe(true);
    expect(getReconstructSummary(day)).toMatchObject({ bigLabel: "8h", bigWord: "logged", sendBtnLabel: "Everything is logged" });
  });

  it("labels a fully-logged current day as TODAY, not PAST DAY", () => {
    const day = buildReconstructDay(
      input({
        isToday: true,
        worklogs: [worklog({ startedISO: "2026-06-15T09:00:00", timeSpentSeconds: 480 * 60 })]
      })
    );
    expect(day.kind).toBe("complete");
    expect(getReconstructSummary(day).dayTag).toBe("TODAY");
  });

  it("never drops rows on a very busy day, and totals match what is rendered", () => {
    const reviewSessions = Array.from({ length: 12 }, (_, index) =>
      review({ id: `s${index}`, startedISO: "2026-06-15T09:00:00", estimatedSeconds: 30 * 60, confidence: "low" })
    );
    const day = buildReconstructDay(input({ worklogs: [], reviewSessions }));

    const filled = day.rows.filter((row) => row.kind === "filled");
    expect(filled).toHaveLength(12); // all rendered, none silently dropped
    expect(day.sendCount).toBe(12);
    expect(day.reconstructedMinutes).toBe(360);
  });
});

describe("autoDistribute", () => {
  it("fills empty gap rows toward the daily target without a model", () => {
    const base = buildReconstructDay(
      input({ worklogs: [worklog()], reviewSessions: [review({ estimatedSeconds: 60 * 60 })] })
    );
    expect(base.gapMinutes).toBeGreaterThan(0);
    const emptyBefore = base.rows.filter((row) => row.kind === "empty").length;
    expect(emptyBefore).toBeGreaterThan(0);

    const distributed = autoDistribute(base);
    expect(distributed.rows.filter((row) => row.kind === "empty").length).toBeLessThan(emptyBefore);
    expect(distributed.reconstructedMinutes).toBeGreaterThan(base.reconstructedMinutes);
    expect(distributed.gapMinutes).toBeLessThanOrEqual(base.gapMinutes);
  });

  it("is a no-op for a complete day", () => {
    const complete = buildReconstructDay(
      input({ worklogs: [worklog({ startedISO: "2026-06-15T09:00:00", timeSpentSeconds: 480 * 60 })] })
    );
    expect(autoDistribute(complete)).toBe(complete);
  });
});
