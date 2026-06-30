import { describe, expect, it } from "vitest";
import type { DayTrackingSummary, JiraIssueSummary, PersonalNote, RecurringEntry } from "../../shared/types";
import { dayActivitySeconds } from "./activity";
import { buildRecap, previousWorkingDayKey, recapToMarkdown, recapToPlainText } from "./recap";

const issue = (key: string, summary: string, loggedSeconds: number): JiraIssueSummary => ({
  id: `i-${key}`,
  key,
  summary,
  loggedSeconds
});

const note = (
  text: string,
  timeSpentSeconds: number,
  category?: PersonalNote["category"],
  title?: string
): PersonalNote => ({
  id: `n-${text}`,
  weekKey: "2026-06-15",
  dateKey: "2026-06-19",
  text,
  title,
  timeSpentSeconds,
  startedISO: "2026-06-19T10:00:00.000Z",
  category,
  createdAt: "2026-06-19T10:00:00.000Z",
  updatedAt: "2026-06-19T10:00:00.000Z"
});

const recurring = (title: string, timeSpentSeconds: number): RecurringEntry => ({
  eventId: `e-${title}`,
  dateKey: "2026-06-19",
  title,
  localTime: "09:15",
  timeSpentSeconds
});

// 2026-06-19 is a Friday.
const day = (partial: Partial<DayTrackingSummary> = {}): DayTrackingSummary => ({
  dateKey: "2026-06-19",
  dateLabel: "Jun 19",
  weekdayName: "Friday",
  isToday: false,
  isConfiguredWorkingDay: true,
  isSkipped: false,
  targetHours: 8,
  trackedHours: 0,
  missingHours: 0,
  issues: [],
  personalNotes: [],
  recurringEntries: [],
  pendingRecurring: [],
  ...partial
});

const populated = () =>
  day({
    issues: [
      issue("PROJ-412", "Refactor auth guard", 2 * 3600 + 10 * 60),
      issue("PROJ-408", "Fix token refresh race", 3600 + 20 * 60),
      issue("PROJ-419", "Review queue triage", 3600)
    ],
    recurringEntries: [recurring("Sprint planning", 3600)],
    personalNotes: [
      note("1:1 with Dana", 3600, "meeting"),
      note("Prod alert — payment webhook", 3600, "firefighting")
    ]
  });

describe("buildRecap", () => {
  it("groups by ticket / meeting / firefighting in canonical order", () => {
    const model = buildRecap(populated());
    expect(model.groups.map((group) => group.key)).toEqual(["ticket", "meeting", "fire"]);
    expect(model.weekdayLabel).toBe("Friday");
    expect(model.isEmpty).toBe(false);
  });

  it("keeps group totals in lockstep with dayActivitySeconds (no drift)", () => {
    const source = populated();
    const model = buildRecap(source);
    const seconds = dayActivitySeconds(source);
    const total = (key: "ticket" | "meeting" | "fire") =>
      model.groups.find((group) => group.key === key)!.lines.reduce((sum, line) => sum + line.seconds, 0);
    expect(total("ticket")).toBe(seconds.ticket);
    expect(total("meeting")).toBe(seconds.meeting);
    expect(total("fire")).toBe(seconds.fire);
    expect(model.totalSeconds).toBe(seconds.ticket + seconds.meeting + seconds.fire);
  });

  it("folds recurring entries and meeting-tagged notes into Meetings", () => {
    const model = buildRecap(populated());
    const meetings = model.groups.find((group) => group.key === "meeting")!;
    // Both are 1h, so the tie-break sorts alphabetically by summary.
    expect(meetings.lines.map((line) => line.summary)).toEqual(["1:1 with Dana", "Sprint planning"]);
    expect(meetings.seconds).toBe(2 * 3600);
  });

  it("treats an undefined-category note as firefighting", () => {
    const model = buildRecap(day({ personalNotes: [note("Mentored a teammate", 1800)] }));
    expect(model.groups.find((group) => group.key === "fire")!.seconds).toBe(1800);
    expect(model.groups.find((group) => group.key === "meeting")!.seconds).toBe(0);
  });

  it("prefers a note title over its body and collapses whitespace", () => {
    const model = buildRecap(
      day({ personalNotes: [note("line one\n  line two", 600, "firefighting", "  Ops  toil  ")] })
    );
    expect(model.groups.find((group) => group.key === "fire")!.lines[0].summary).toBe("Ops toil");
  });

  it("sorts lines by seconds descending", () => {
    const model = buildRecap(populated());
    const tickets = model.groups.find((group) => group.key === "ticket")!;
    expect(tickets.lines.map((line) => line.key)).toEqual(["PROJ-412", "PROJ-408", "PROJ-419"]);
  });

  it("marks a day with no tracked work as empty", () => {
    const model = buildRecap(day());
    expect(model.isEmpty).toBe(true);
    expect(model.totalSeconds).toBe(0);
  });
});

describe("recapToPlainText", () => {
  it("renders a read-aloud block with header and groups", () => {
    const text = recapToPlainText(buildRecap(populated()));
    expect(text).toContain("Yesterday (Fri Jun 19) — 7h 30m tracked.");
    expect(text).toContain("Tickets (4h 30m):");
    expect(text).toContain("• PROJ-412 Refactor auth guard — 2h 10m");
    expect(text).toContain("Meetings (2h):");
    expect(text).toContain("• Sprint planning — 1h");
    expect(text).toContain("Firefighting (1h):");
    // meeting / firefighting lines carry no ticket key prefix
    expect(text).not.toContain("• undefined");
  });

  it("renders sub-hour durations without a leading 0h (reads cleanly aloud)", () => {
    const text = recapToPlainText(
      buildRecap(day({ personalNotes: [note("Quick ops fix", 40 * 60, "firefighting")] }))
    );
    expect(text).toContain("Firefighting (40m):");
    expect(text).toContain("• Quick ops fix — 40m");
    expect(text).not.toContain("0h 40m");
  });

  it("renders a single line when the day is empty", () => {
    expect(recapToPlainText(buildRecap(day()))).toBe("Yesterday (Fri Jun 19) — nothing tracked.");
  });
});

describe("recapToMarkdown", () => {
  it("wraps ticket keys in backticks and uses dash bullets", () => {
    const md = recapToMarkdown(buildRecap(populated()));
    expect(md).toContain("**Yesterday** (Fri Jun 19) — 7h 30m tracked.");
    expect(md).toContain("**Tickets** · 4h 30m");
    expect(md).toContain("- `PROJ-412` Refactor auth guard — 2h 10m");
    expect(md).toContain("- Sprint planning — 1h");
  });

  it("renders a single line when the day is empty", () => {
    expect(recapToMarkdown(buildRecap(day()))).toBe("**Yesterday** (Fri Jun 19) — nothing tracked.");
  });
});

describe("previousWorkingDayKey", () => {
  it("returns the prior day within the week (Wed → Tue)", () => {
    expect(previousWorkingDayKey("2026-06-17", [1, 2, 3, 4, 5])).toBe("2026-06-16");
  });

  it("steps over the weekend (Mon → prior Fri)", () => {
    expect(previousWorkingDayKey("2026-06-15", [1, 2, 3, 4, 5])).toBe("2026-06-12");
  });

  it("honours a custom working-day pattern (Wed → Mon for Mon/Wed/Fri)", () => {
    expect(previousWorkingDayKey("2026-06-17", [1, 3, 5])).toBe("2026-06-15");
  });

  it("falls back to Mon–Fri for an empty working-day list", () => {
    expect(previousWorkingDayKey("2026-06-15", [])).toBe("2026-06-12");
  });

  it("returns null when no working day is found within the lookback window", () => {
    // From Wed with a Sunday-only week, a 2-day lookback only sees Tue + Mon.
    expect(previousWorkingDayKey("2026-06-17", [7], 2)).toBeNull();
  });
});
