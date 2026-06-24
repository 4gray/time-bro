// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { JiraWorklog } from "../../shared/types";
import { useAppTimeEntryModalState } from "./useAppTimeEntryModalState";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type TimeEntryModalStateApi = ReturnType<typeof useAppTimeEntryModalState>;

const worklog: JiraWorklog = {
  id: "10001",
  issueId: "20001",
  issueKey: "TB-42",
  issueSummary: "Refactor modal state",
  authorAccountId: "account-1",
  started: "2026-06-24T10:00:00.000Z",
  timeSpentSeconds: 3600,
  comment: "Existing worklog"
};

let container: HTMLDivElement;
let root: Root;
let api: TimeEntryModalStateApi | undefined;

function Harness() {
  api = useAppTimeEntryModalState();
  return null;
}

const getApi = () => {
  if (!api) {
    throw new Error("Time entry modal state hook was not rendered.");
  }
  return api;
};

const renderHarness = () => {
  act(() => {
    root.render(<Harness />);
  });
};

beforeEach(() => {
  api = undefined;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("useAppTimeEntryModalState", () => {
  it("starts with no active add or edit modal", () => {
    renderHarness();

    expect(getApi().addModalDate).toBeUndefined();
    expect(getApi().editingWorklog).toBeUndefined();
  });

  it("tracks the Add Time date and editing worklog independently", () => {
    const addDate = new Date(2026, 5, 24, 14, 30);
    renderHarness();

    act(() => {
      getApi().setAddModalDate(addDate);
      getApi().setEditingWorklog(worklog);
    });

    expect(getApi().addModalDate).toBe(addDate);
    expect(getApi().editingWorklog).toBe(worklog);

    act(() => {
      getApi().setAddModalDate(undefined);
      getApi().setEditingWorklog(undefined);
    });

    expect(getApi().addModalDate).toBeUndefined();
    expect(getApi().editingWorklog).toBeUndefined();
  });
});
