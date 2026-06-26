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
import {
  useMonthState,
  type MonthStateStorageClient
} from "./useMonthState";

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
  ollamaModel: "llama3.1:8b",
};

const emptyRecurringEvents: RecurringEvent[] = [];
const emptyRecurringOccurrences: RecurringOccurrence[] = [];

const buildSyncResult = (weekKey: string, dateKey: string, hours: number): SyncResult => ({
  weekKey,
  weekStartISO: `${weekKey}T00:00:00.000Z`,
  weekEndExclusiveISO: `${weekKey}T00:00:00.000Z`,
  syncedAt: "2026-06-17T12:00:00.000Z",
  accountId: "account-1",
  trackedSeconds: hours * 3600,
  issueCount: 1,
  worklogCount: 1,
  daySummaries: {
    [dateKey]: {
      trackedSeconds: hours * 3600,
      issues: [],
      worklogs: []
    }
  }
});

const buildVisibleWeek = (start: Date, today: Date, syncResult?: SyncResult): WeekState => {
  const weekKey = toLocalDateKey(start);
  return buildWeekState(start, settings, { weekKey, skippedDates: [] }, syncResult, [], today, [], []);
};

const defaultCurrentDate = new Date(2026, 5, 17, 12);
const defaultMonthAnchor = new Date(2026, 5, 1);
const defaultVisibleWeekState = buildVisibleWeek(new Date(2026, 5, 15), defaultCurrentDate);

type MonthStateApi = ReturnType<typeof useMonthState>;

let container: HTMLDivElement;
let root: Root;
let monthState: MonthStateApi;
let storage: MonthStateStorageClient;
let getWeekOverride: ReturnType<typeof vi.fn<MonthStateStorageClient["getWeekOverride"]>>;
let getSyncResult: ReturnType<typeof vi.fn<MonthStateStorageClient["getSyncResult"]>>;
let getPersonalNotes: ReturnType<typeof vi.fn<MonthStateStorageClient["getPersonalNotes"]>>;
let getRecurringOccurrences: ReturnType<typeof vi.fn<MonthStateStorageClient["getRecurringOccurrences"]>>;
let onError: ReturnType<typeof vi.fn<(message: string) => void>>;

interface HarnessProps {
  isMonthView?: boolean;
  isBooting?: boolean;
  monthAnchor?: Date;
  currentDate?: Date;
  visibleWeekState?: WeekState;
  demoWeekStart?: Date;
  demoWeekOverride?: WeekOverride;
  demoSyncResult?: SyncResult;
}

function Harness({
  isMonthView = true,
  isBooting = false,
  monthAnchor = defaultMonthAnchor,
  currentDate = defaultCurrentDate,
  visibleWeekState = defaultVisibleWeekState,
  demoWeekStart,
  demoWeekOverride,
  demoSyncResult
}: HarnessProps) {
  monthState = useMonthState({
    isMonthView,
    isBooting,
    monthAnchor,
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

const waitFor = async (assertion: () => void) => {
  let lastError: unknown;
  for (let index = 0; index < 20; index += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
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
  monthState = undefined;
  getWeekOverride = vi.fn(async (weekKey) => ({ weekKey, skippedDates: [] }));
  getSyncResult = vi.fn(async (weekKey) =>
    weekKey === "2026-06-01" ? buildSyncResult(weekKey, "2026-06-02", 3) : undefined
  );
  getPersonalNotes = vi.fn(async () => [] as PersonalNote[]);
  getRecurringOccurrences = vi.fn(async () => [] as RecurringOccurrence[]);
  onError = vi.fn();
  storage = {
    getWeekOverride,
    getSyncResult,
    getPersonalNotes,
    getRecurringOccurrences
  };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe("useMonthState", () => {
  it("loads persisted month weeks while reusing the visible week state", async () => {
    const currentDate = new Date(2026, 5, 17, 12);
    const visibleWeekStart = new Date(2026, 5, 15);
    const visibleWeekKey = toLocalDateKey(visibleWeekStart);
    const visibleWeekState = buildVisibleWeek(
      visibleWeekStart,
      currentDate,
      buildSyncResult(visibleWeekKey, "2026-06-17", 2)
    );
    renderHarness({ currentDate, visibleWeekState });

    await waitFor(() => expect(monthState).toBeDefined());

    expect(monthState?.monthKey).toBe("2026-06-01");
    expect(monthState?.weeks).toHaveLength(5);
    expect(monthState?.trackedHours).toBe(5);
    expect(monthState?.weeks.find((week) => week.weekKey === visibleWeekKey)?.trackedHours).toBe(2);
    expect(getWeekOverride).not.toHaveBeenCalledWith(visibleWeekKey);
    expect(getSyncResult).not.toHaveBeenCalledWith(visibleWeekKey);
    expect(onError).not.toHaveBeenCalled();
  });

  it("builds demo month weeks without reading storage", async () => {
    const currentDate = new Date(2026, 6, 8, 12);
    const demoWeekStart = new Date(2026, 6, 6);
    const demoWeekKey = toLocalDateKey(demoWeekStart);
    renderHarness({
      monthAnchor: new Date(2026, 6, 1),
      currentDate,
      visibleWeekState: buildVisibleWeek(new Date(2026, 5, 15), currentDate),
      demoWeekStart,
      demoWeekOverride: { weekKey: demoWeekKey, skippedDates: [] },
      demoSyncResult: buildSyncResult(demoWeekKey, "2026-07-08", 4)
    });

    await waitFor(() => expect(monthState).toBeDefined());

    expect(monthState?.monthKey).toBe("2026-07-01");
    expect(monthState?.weeks.find((week) => week.weekKey === demoWeekKey)?.trackedHours).toBe(4);
    expect(getWeekOverride).not.toHaveBeenCalled();
    expect(getSyncResult).not.toHaveBeenCalled();
    expect(getPersonalNotes).not.toHaveBeenCalled();
    expect(getRecurringOccurrences).not.toHaveBeenCalled();
  });

  it("reports storage failures without setting a month state", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    getWeekOverride.mockRejectedValue(new Error("IndexedDB unavailable"));
    renderHarness();

    await waitFor(() => expect(onError).toHaveBeenCalledWith("Unable to load the selected month."));

    expect(monthState).toBeUndefined();
    expect(consoleError).toHaveBeenCalled();
  });

  it("stays idle outside the month view", async () => {
    renderHarness({ isMonthView: false });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(monthState).toBeUndefined();
    expect(getWeekOverride).not.toHaveBeenCalled();
  });
});
