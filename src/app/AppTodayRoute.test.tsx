// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppSettings, JiraTicket, JiraWorklog, PersonalNote } from "../../shared/types";
import { AppTodayRoute, type AppTodayRouteProps } from "./AppTodayRoute";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { todayViewProps } = vi.hoisted(() => ({
  todayViewProps: [] as Record<string, unknown>[]
}));

vi.mock("../components/TodayView", () => ({
  TodayView: (props: Record<string, unknown>) => {
    todayViewProps.push(props);
    const ticketOptions = props.ticketOptions as JiraTicket[];
    const worklogs = props.todayWorklogs as JiraWorklog[];
    const notes = props.personalNotes as PersonalNote[];
    const signals = props.detectedSignals as unknown[];
    return (
      <section
        data-testid="today-view"
        data-date={(props.date as Date).toISOString()}
        data-options={String(ticketOptions.length)}
        data-worklogs={String(worklogs.length)}
        data-signals={String(signals.length)}
        data-notes={String(notes.length)}
        data-tracked={String(props.todayTrackedHours)}
        data-target={String(props.dailyTargetHours)}
        data-reminder={String(props.reminderTime)}
        data-reminders-enabled={String(props.remindersEnabled)}
      >
        <button
          type="button"
          onClick={() => (props.onCreateAt as (prefill: Record<string, unknown>) => void)({ startedISO: "iso" })}
        >
          create
        </button>
        <button
          type="button"
          onClick={() =>
            (props.onMoveWorklog as (worklog: JiraWorklog, patch: Record<string, unknown>) => void)(worklogs[0], {
              startedISO: "iso2",
              timeSpentSeconds: 60
            })
          }
        >
          move
        </button>
        <button type="button" onClick={() => (props.onEditWorklog as (worklog: JiraWorklog) => void)(worklogs[0])}>
          edit
        </button>
      </section>
    );
  }
}));

const currentDate = new Date(2026, 5, 17, 12);

const ticket: JiraTicket = {
  id: "10001",
  key: "FTDM-101",
  summary: "Refactor today route",
  projectKey: "FTDM",
  projectName: "TimeBro",
  statusName: "In Progress",
  statusCategory: "indeterminate",
  loggedSecondsTotal: 3600,
  url: "https://example.atlassian.net/browse/FTDM-101"
};

const worklog = {
  id: "wl-1",
  issueKey: "FTDM-101"
} as JiraWorklog;

const note = {
  id: "note-1",
  text: "Local work"
} as PersonalNote;

const noop = () => undefined;
const asyncTrue = async () => true;

const settings = { aiEnabled: false, ollamaEndpoint: "http://localhost:11434", ollamaModel: "llama3.1:8b" } as AppSettings;

const baseProps = (): AppTodayRouteProps => ({
  currentDate,
  ticketOptions: [ticket],
  todayWorklogs: [worklog],
  todaySignals: [],
  todayPersonalNotes: [note],
  todayTrackedHours: 5,
  dailyTargetHours: 8,
  touchedNotLogged: [ticket],
  recapDaySummary: undefined,
  settings,
  reminderTime: "17:30",
  remindersEnabled: true,
  handleMoveWorklog: asyncTrue,
  openAddTime: noop,
  openEditWorklog: noop,
  openEditPersonalNote: noop
});

let container: HTMLDivElement;
let root: Root;

const renderRoute = (props: Partial<AppTodayRouteProps> = {}) => {
  act(() => {
    root.render(<AppTodayRoute {...baseProps()} {...props} />);
  });
};

beforeEach(() => {
  todayViewProps.length = 0;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("AppTodayRoute", () => {
  it("maps app-level today state to TodayView props", () => {
    renderRoute();

    const rendered = container.querySelector("[data-testid='today-view']");
    expect(rendered?.getAttribute("data-date")).toBe(currentDate.toISOString());
    expect(rendered?.getAttribute("data-options")).toBe("1");
    expect(rendered?.getAttribute("data-worklogs")).toBe("1");
    expect(rendered?.getAttribute("data-signals")).toBe("0");
    expect(rendered?.getAttribute("data-notes")).toBe("1");
    expect(rendered?.getAttribute("data-tracked")).toBe("5");
    expect(rendered?.getAttribute("data-target")).toBe("8");
    expect(rendered?.getAttribute("data-reminder")).toBe("17:30");
    expect(rendered?.getAttribute("data-reminders-enabled")).toBe("true");
    expect(todayViewProps[0]?.touchedNotLogged).toEqual([ticket]);
  });

  it("forwards detected signals to the calendar ghost layer", () => {
    const signals = [{ id: "sig-1" }] as AppTodayRouteProps["todaySignals"];
    renderRoute({ todaySignals: signals });
    expect(todayViewProps[0]?.detectedSignals).toBe(signals);
  });

  it("forwards the previous working day's summary to TodayView", () => {
    const recapDaySummary = { dateKey: "2026-06-16", trackedHours: 6 } as AppTodayRouteProps["recapDaySummary"];
    renderRoute({ recapDaySummary });
    expect(todayViewProps[0]?.recapDaySummary).toBe(recapDaySummary);
  });

  it("wires calendar actions through to the app handlers", () => {
    const openAddTime = vi.fn();
    const handleMoveWorklog = vi.fn();
    const openEditWorklog = vi.fn();
    renderRoute({ openAddTime, handleMoveWorklog, openEditWorklog });

    act(() => {
      container.querySelectorAll("button")[0]?.click(); // create
      container.querySelectorAll("button")[1]?.click(); // move
      container.querySelectorAll("button")[2]?.click(); // edit
    });

    // onCreateAt anchors the Add-Time popup to the current day.
    expect(openAddTime).toHaveBeenCalledWith(currentDate, { startedISO: "iso" });
    expect(handleMoveWorklog).toHaveBeenCalledWith(worklog, { startedISO: "iso2", timeSpentSeconds: 60 });
    expect(openEditWorklog).toHaveBeenCalledWith(worklog);
  });
});
