// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useWeekViewMode, WEEK_VIEW_MODE_STORAGE_KEY } from "./useWeekViewMode";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const Harness = () => {
  const { mode, selectMode } = useWeekViewMode();
  return (
    <button type="button" data-mode={mode} onClick={() => selectMode(mode === "summary" ? "timeline" : "summary")}>
      {mode}
    </button>
  );
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  window.localStorage.clear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  window.localStorage.clear();
});

describe("useWeekViewMode", () => {
  it("defaults to Summary and persists a Timeline choice", () => {
    act(() => root.render(<Harness />));
    const button = container.querySelector("button");

    expect(button?.dataset.mode).toBe("summary");
    act(() => button?.click());
    expect(button?.dataset.mode).toBe("timeline");
    expect(window.localStorage.getItem(WEEK_VIEW_MODE_STORAGE_KEY)).toBe("timeline");
  });

  it("restores the last selected mode", () => {
    window.localStorage.setItem(WEEK_VIEW_MODE_STORAGE_KEY, "timeline");
    act(() => root.render(<Harness />));

    expect(container.querySelector("button")?.dataset.mode).toBe("timeline");
  });
});
