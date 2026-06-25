// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JiraTicket, JiraWorklog, PersonalNote } from "../../shared/types";
import { AppTodayRoute, type AppTodayRouteProps } from "./AppTodayRoute";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { todayViewProps } = vi.hoisted(() => ({
  todayViewProps: [] as Record<string, unknown>[]
}));

vi.mock("../components/TodayView", () => ({
  TodayView: (props: Record<string, unknown>) => {
    todayViewProps.push(props);
    const selectedTicket = props.selectedTicket as JiraTicket | undefined;
    const ticketOptions = props.ticketOptions as JiraTicket[];
    const worklogs = props.todayWorklogs as JiraWorklog[];
    const notes = props.personalNotes as PersonalNote[];
    return (
      <section
        data-testid="today-view"
        data-date={(props.date as Date).toISOString()}
        data-selected={selectedTicket?.key ?? ""}
        data-options={String(ticketOptions.length)}
        data-worklogs={String(worklogs.length)}
        data-notes={String(notes.length)}
        data-tracked={String(props.todayTrackedHours)}
        data-target={String(props.dailyTargetHours)}
        data-reminder={String(props.reminderTime)}
        data-reminders-enabled={String(props.remindersEnabled)}
        data-configured={String(props.isConfigured)}
        data-logging={String(props.isLogging)}
      >
        <button
          type="button"
          onClick={() => (props.onLog as (payload: Record<string, unknown>) => void)({ issueKey: "FTDM-101" })}
        >
          log
        </button>
        <button
          type="button"
          onClick={() => (props.onAddPersonalNote as (payload: Record<string, unknown>) => void)({ text: "Local note" })}
        >
          note
        </button>
        <button type="button" onClick={() => (props.onSelectTicket as (ticket: JiraTicket) => void)(ticketOptions[0])}>
          select
        </button>
        <button type="button" onClick={() => (props.onSearchTickets as (query: string) => void)?.("FTDM")}>
          search
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

const baseProps = (): AppTodayRouteProps => ({
  currentDate,
  selectedTicket: ticket,
  ticketOptions: [ticket],
  todayWorklogs: [worklog],
  todayPersonalNotes: [note],
  issueUrlsByKey: { "FTDM-101": ticket.url },
  issueTypesByKey: {},
  todayTrackedHours: 5,
  dailyTargetHours: 8,
  touchedNotLogged: [ticket],
  reminderTime: "17:30",
  remindersEnabled: true,
  isConfigured: true,
  isLogging: false,
  handleAddWorklog: asyncTrue,
  handleAddPersonalNote: asyncTrue,
  openEditWorklog: noop,
  openEditPersonalNote: noop,
  setSelectedTicket: noop,
  searchTickets: undefined
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
    renderRoute({ isLogging: true });

    const rendered = container.querySelector("[data-testid='today-view']");
    expect(rendered?.getAttribute("data-date")).toBe(currentDate.toISOString());
    expect(rendered?.getAttribute("data-selected")).toBe("FTDM-101");
    expect(rendered?.getAttribute("data-options")).toBe("1");
    expect(rendered?.getAttribute("data-worklogs")).toBe("1");
    expect(rendered?.getAttribute("data-notes")).toBe("1");
    expect(rendered?.getAttribute("data-tracked")).toBe("5");
    expect(rendered?.getAttribute("data-target")).toBe("8");
    expect(rendered?.getAttribute("data-reminder")).toBe("17:30");
    expect(rendered?.getAttribute("data-reminders-enabled")).toBe("true");
    expect(rendered?.getAttribute("data-configured")).toBe("true");
    expect(rendered?.getAttribute("data-logging")).toBe("true");
    expect(todayViewProps[0]?.issueUrlsByKey).toEqual({ "FTDM-101": ticket.url });
    expect(todayViewProps[0]?.touchedNotLogged).toEqual([ticket]);
  });

  it("passes TodayView actions through unchanged", () => {
    const handleAddWorklog = vi.fn();
    const handleAddPersonalNote = vi.fn();
    const setSelectedTicket = vi.fn();
    const searchTickets = vi.fn();
    renderRoute({
      handleAddWorklog,
      handleAddPersonalNote,
      setSelectedTicket,
      searchTickets
    });

    act(() => {
      container.querySelectorAll("button")[0]?.click();
      container.querySelectorAll("button")[1]?.click();
      container.querySelectorAll("button")[2]?.click();
      container.querySelectorAll("button")[3]?.click();
    });

    expect(handleAddWorklog).toHaveBeenCalledWith({ issueKey: "FTDM-101" });
    expect(handleAddPersonalNote).toHaveBeenCalledWith({ text: "Local note" });
    expect(setSelectedTicket).toHaveBeenCalledWith(ticket);
    expect(searchTickets).toHaveBeenCalledWith("FTDM");
  });
});
