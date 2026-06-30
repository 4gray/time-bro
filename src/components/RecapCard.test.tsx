// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppSettings, DayTrackingSummary } from "../../shared/types";
import type { RecapPolishState } from "../app/useRecapPolish";
import { RecapCard } from "./RecapCard";

const { polishState } = vi.hoisted(() => ({
  polishState: { current: null as RecapPolishState | null }
}));

vi.mock("../app/useRecapPolish", () => ({
  useRecapPolish: () => polishState.current
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const settings = { aiEnabled: false, ollamaEndpoint: "x", ollamaModel: "llama3.1:8b" } as AppSettings;

// 2026-06-19 is a Friday.
const daySummary: DayTrackingSummary = {
  dateKey: "2026-06-19",
  dateLabel: "Jun 19",
  weekdayName: "Friday",
  isToday: false,
  isConfiguredWorkingDay: true,
  isSkipped: false,
  targetHours: 8,
  trackedHours: 2,
  missingHours: 6,
  issues: [{ id: "i1", key: "ABC-1", summary: "Build the thing", loggedSeconds: 2 * 3600 }],
  personalNotes: [],
  recurringEntries: [],
  pendingRecurring: []
};

const polish = vi.fn();
const reset = vi.fn();

const baseState: RecapPolishState = {
  aiOn: false,
  polished: undefined,
  isPolishing: false,
  polish,
  reset,
  aiModel: "llama3.1:8b"
};

let container: HTMLDivElement;
let root: Root;

const render = (state: Partial<RecapPolishState>, day: DayTrackingSummary | undefined = daySummary) => {
  polishState.current = { ...baseState, ...state };
  act(() => {
    root.render(<RecapCard daySummary={day} settings={settings} />);
  });
  // Expand the collapsed card.
  const bar = container.querySelector<HTMLButtonElement>(".recap-bar");
  if (bar) {
    act(() => bar.click());
  }
};

beforeEach(() => {
  polish.mockReset();
  reset.mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("RecapCard", () => {
  it("renders nothing without a previous day", () => {
    polishState.current = baseState;
    act(() => root.render(<RecapCard daySummary={undefined} settings={settings} />));
    expect(container.querySelector(".recap-card")).toBeNull();
  });

  it("shows the grouped list and Copy but no Polish when AI is off", () => {
    render({ aiOn: false });
    expect(container.querySelector(".recap-list")).not.toBeNull();
    const labels = [...container.querySelectorAll(".recap-btn")].map((b) => b.textContent);
    expect(labels.some((l) => l?.includes("COPY"))).toBe(true);
    expect(labels.some((l) => l?.includes("POLISH"))).toBe(false);
  });

  it("offers a Polish button when AI is on", () => {
    render({ aiOn: true });
    const polishBtn = [...container.querySelectorAll(".recap-btn")].find((b) => b.textContent?.includes("POLISH"));
    expect(polishBtn).toBeTruthy();
    act(() => (polishBtn as HTMLButtonElement).click());
    expect(polish).toHaveBeenCalledTimes(1);
  });

  it("overlays prose and collapses the list when polished", () => {
    render({ aiOn: true, polished: "I shipped ABC-1 yesterday." });
    expect(container.querySelector(".recap-prose")?.textContent).toBe("I shipped ABC-1 yesterday.");
    expect(container.querySelector(".recap-prose-meta")?.textContent).toContain("llama3.1:8b");
    // List is hidden until "Show list" is toggled.
    expect(container.querySelector(".recap-list")).toBeNull();
    const polishedBtn = [...container.querySelectorAll(".recap-btn")].find((b) => b.textContent?.includes("POLISHED"));
    act(() => (polishedBtn as HTMLButtonElement).click());
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("reveals the list from the polished state via Show list", () => {
    render({ aiOn: true, polished: "Prose." });
    const showList = container.querySelector<HTMLButtonElement>(".recap-show-list");
    expect(showList?.textContent).toBe("Show list");
    act(() => showList!.click());
    expect(container.querySelector(".recap-list")).not.toBeNull();
  });
});
