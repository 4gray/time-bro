import { describe, expect, it } from "vitest";
import type { WeekState } from "../../shared/types";
import { buildWeekCsv, parsePersonalNotesCsv } from "./personalNotesCsv";

const weekState: WeekState = {
  weekKey: "2026-06-15",
  weekStartISO: "2026-06-15T00:00:00.000Z",
  weekEndExclusiveISO: "2026-06-22T00:00:00.000Z",
  weekRangeLabel: "Jun 15 - 21, 2026",
  weeklyTargetHours: 40,
  trackedWeekHours: 3.25,
  jiraTrackedWeekHours: 2,
  personalNoteHours: 1.25,
  remainingWeekHours: 36.75,
  dailyTargetHours: 8,
  activeWorkingDates: ["2026-06-18"],
  skippedDates: [],
  days: [
    {
      dateKey: "2026-06-18",
      dateLabel: "Jun 18",
      weekdayName: "Thursday",
      isToday: false,
      isConfiguredWorkingDay: true,
      isSkipped: false,
      targetHours: 8,
      trackedHours: 3.25,
      missingHours: 4.75,
      issues: [
        {
          id: "10001",
          key: "TB-12",
          summary: 'Fix CSV, including "quotes"',
          loggedSeconds: 7200
        }
      ],
      personalNotes: [
        {
          id: "note-1",
          weekKey: "2026-06-15",
          dateKey: "2026-06-18",
          text: "Planning, notes",
          timeSpentSeconds: 4500,
          startedISO: "2026-06-18T09:00:00.000Z",
          createdAt: "2026-06-18T09:00:00.000Z",
          updatedAt: "2026-06-18T09:00:00.000Z"
        }
      ]
    }
  ]
};

describe("personal notes CSV", () => {
  it("exports weekly rows with escaped Jira summaries and local note rows", () => {
    const csv = buildWeekCsv(weekState);

    expect(csv).toContain('TB-12,"Fix CSV, including ""quotes""",2.00');
    expect(csv).toContain('LOCAL-NOTE,"Planning, notes",1.25');
  });

  it("imports only local personal note rows from TimeBro CSV", () => {
    const csv = [
      "Date,Weekday,Issue,Summary,Hours",
      "2026-06-18,Thursday,TB-12,Ignored Jira work,2.00",
      '2026-06-18,Thursday,LOCAL-NOTE,"Personal, note",1.50',
      '2026-06-19,Friday,LOCAL,"Second ""note""",0.25'
    ].join("\n");

    const result = parsePersonalNotesCsv(csv, {
      importedAtISO: "2026-06-23T10:00:00.000Z",
      idPrefix: "note-import-test"
    });

    expect(result.ignoredRows).toBe(1);
    expect(result.notes).toHaveLength(2);
    expect(result.notes[0]).toMatchObject({
      id: "note-import-test-3",
      weekKey: "2026-06-15",
      dateKey: "2026-06-18",
      text: "Personal, note",
      timeSpentSeconds: 5400,
      createdAt: "2026-06-23T10:00:00.000Z",
      updatedAt: "2026-06-23T10:00:00.000Z"
    });
    expect(result.notes[1]).toMatchObject({
      id: "note-import-test-4",
      weekKey: "2026-06-15",
      dateKey: "2026-06-19",
      text: 'Second "note"',
      timeSpentSeconds: 900
    });
  });

  it("rejects CSV files without the expected report columns", () => {
    expect(() => parsePersonalNotesCsv("Date,Summary\n2026-06-18,Planning")).toThrow(
      "CSV must include Date, Issue, Summary, and Hours columns."
    );
  });
});
