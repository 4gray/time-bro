// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AppSettings,
  PersonalNote,
  RecurringEvent,
  RecurringOccurrence,
  SyncResult,
  WeekOverride,
  WeekState
} from "../../shared/types";
import { buildWeekState } from "../domain/week";
import { toLocalDateKey } from "../utils/date";
import type { MonthStateStorageClient } from "./useMonthState";
import { usePrevWorkingDay } from "./usePrevWorkingDay";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const settings: AppSettings = {
  jiraBaseUrl: "https://example.atlassian.net",
  jiraEmail: "person@example.com",
  jiraApiToken: "token",
  bitbucketEmail: "person@example.com",
  bitbucketApiToken: "token",
  bitbucketWorkspace: "timebro",
  bitbucketRepositories: "app",
  bitbucketReviewBucketIssueKey: "REV-1",
  weeklyTargetHours: 40,
  workingDays: [1, 2, 3, 4, 5],
  reminderTime: "16:30",
  remindersEnabled: true,
  aiEnabled: false,
  ollamaEndpoint: "http://localhost:11434",
  ollamaModel: "llama3.1:8b"
};

const emptyRecurringEvents: RecurringEvent[] = [];
const emptyRecurringOccurrences: RecurringOccurrence[] = [];

const buildSyncResult = (weekKey: string, dateKey: string, hours: number): SyncResult => ({
  weekKey,
  weekStartISO: `${weekKey}T00:00:00.000Z`,
  weekEndExclusiveISO: `${weekKey}T00:00:00.000Z`,
  syncedAt: "2026-06-12T12:00:00.000Z",
  accountId: "account-1",
  trackedSeconds: hours * 3600,
  issueCount: 1,
  worklogCount: 1,
  daySummaries: {
    [dateKey]: { trackedSeconds: hours * 3600, issues: [], worklogs: [] }
  }
});

const buildVisibleWeek = (start: Date, today: Date): WeekState => {
  const weekKey = toLocalDateKey(start);
  return buildWeekState(start, settings, { weekKey, skippedDates: [] }, undefined, [], today, [], []);
};

// Visible week of Mon 2026-06-15; the prior week's Monday is 2026-06-08.
const visibleWeekStart = new Date(2026, 5, 15);
const monday = new Date(2026, 5, 15, 12);
const wednesday = new Date(2026, 5, 17, 12);
// Stable reference — must NOT be rebuilt per render, or the visibleWeekState
// effect dep would change every render and loop (production memoizes weekState).
const defaultVisibleWeek = buildVisibleWeek(visibleWeekStart, monday);

type Api = ReturnType<typeof usePrevWorkingDay>;

let container: HTMLDivElement;
let root: Root;
let prevDay: Api;
let storage: MonthStateStorageClient;
let getWeekOverride: ReturnType<typeof vi.fn<MonthStateStorageClient["getWeekOverride"]>>;
let getSyncResult: ReturnType<typeof vi.fn<MonthStateStorageClient["getSyncResult"]>>;
let getPersonalNotes: ReturnType<typeof vi.fn<MonthStateStorageClient["getPersonalNotes"]>>;
let getRecurringOccurrences: ReturnType<typeof vi.fn<MonthStateStorageClient["getRecurringOccurrences"]>>;
let onError: ReturnType<typeof vi.fn<(message: string) => void>>;

interface HarnessProps {
  isTodayView?: boolean;
  isBooting?: boolean;
  currentDate?: Date;
  visibleWeekState?: WeekState;
  demoWeekStart?: Date;
  demoWeekOverride?: WeekOverride;
  demoSyncResult?: SyncResult;
}

function Harness({
  isTodayView = true,
  isBooting = false,
  currentDate = monday,
  visibleWeekState = defaultVisibleWeek,
  demoWeekStart,
  demoWeekOverride,
  demoSyncResult
}: HarnessProps) {
  prevDay = usePrevWorkingDay({
    isTodayView,
    isBooting,
    currentDate,
    settings,
    visibleWeekState,
    recurringEvents: emptyRecurringEvents,
    recurringOccurrences: emptyRecurringOccurrences,
    demoWeekStart,
    demoWeekOverride,
    demoSyncResult,
    storage,
    onError
  });
  return null;
}

const renderHarness = (props: HarnessProps = {}) => {
  act(() => {
    root.render(<Harness {...props} />);
  });
};

const flush = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const waitFor = async (assertion: () => void) => {
  let lastError: unknown;
  for (let index = 0; index < 20; index += 1) {
    await flush();
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
};

beforeEach(() => {
  prevDay = undefined;
  getWeekOverride = vi.fn(async (weekKey) => ({ weekKey, skippedDates: [] }) as WeekOverride);
  // Prior week (2026-06-08) has worklogs logged on Friday 2026-06-12.
  getSyncResult = vi.fn(async (weekKey) =>
    weekKey === "2026-06-08" ? buildSyncResult(weekKey, "2026-06-12", 6) : undefined
  );
  getPersonalNotes = vi.fn(async () => [] as PersonalNote[]);
  getRecurringOccurrences = vi.fn(async () => [] as RecurringOccurrence[]);
  onError = vi.fn();
  storage = { getWeekOverride, getSyncResult, getPersonalNotes, getRecurringOccurrences };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe("usePrevWorkingDay", () => {
  it("loads the prior week's last working day on Monday (cross-week)", async () => {
    renderHarness({ currentDate: monday });

    await waitFor(() => expect(prevDay).toBeDefined());

    expect(prevDay?.dateKey).toBe("2026-06-12"); // prior Friday
    expect(prevDay?.trackedHours).toBe(6);
    expect(getSyncResult).toHaveBeenCalledWith("2026-06-08");
    expect(onError).not.toHaveBeenCalled();
  });

  it("stays idle mid-week when an in-week previous day exists", async () => {
    renderHarness({ currentDate: wednesday });

    await flush();

    expect(prevDay).toBeUndefined();
    expect(getWeekOverride).not.toHaveBeenCalled();
  });

  it("stays idle outside the Today view", async () => {
    renderHarness({ isTodayView: false, currentDate: monday });

    await flush();

    expect(prevDay).toBeUndefined();
    expect(getWeekOverride).not.toHaveBeenCalled();
  });

  it("builds the prior week from demo data without reading storage", async () => {
    const demoWeekStart = new Date(2026, 5, 8);
    const demoWeekKey = toLocalDateKey(demoWeekStart);
    renderHarness({
      currentDate: monday,
      demoWeekStart,
      demoWeekOverride: { weekKey: demoWeekKey, skippedDates: [] },
      demoSyncResult: buildSyncResult(demoWeekKey, "2026-06-12", 4)
    });

    await waitFor(() => expect(prevDay).toBeDefined());

    expect(prevDay?.dateKey).toBe("2026-06-12");
    expect(prevDay?.trackedHours).toBe(4);
    expect(getWeekOverride).not.toHaveBeenCalled();
    expect(getSyncResult).not.toHaveBeenCalled();
  });

  it("reports storage failures without setting a day", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    getWeekOverride.mockRejectedValue(new Error("IndexedDB unavailable"));
    renderHarness({ currentDate: monday });

    await waitFor(() => expect(onError).toHaveBeenCalledWith("Unable to load yesterday's recap."));

    expect(prevDay).toBeUndefined();
    expect(consoleError).toHaveBeenCalled();
  });
});
