// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useAppReviewTargetState } from "./useAppReviewTargetState";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type AppReviewTargetStateApi = ReturnType<typeof useAppReviewTargetState>;

let container: HTMLDivElement;
let root: Root;
let api: AppReviewTargetStateApi | undefined;

function Harness() {
  api = useAppReviewTargetState();
  return null;
}

const getApi = () => {
  if (!api) {
    throw new Error("App review target state hook was not rendered.");
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

describe("useAppReviewTargetState", () => {
  it("starts with reviewed-ticket target mode", () => {
    renderHarness();

    expect(getApi().reviewTargetMode).toBe("reviewed-ticket");
  });

  it("tracks review target mode changes", () => {
    renderHarness();

    act(() => {
      getApi().setReviewTargetMode("review-bucket");
    });

    expect(getApi().reviewTargetMode).toBe("review-bucket");

    act(() => {
      getApi().setReviewTargetMode("reviewed-ticket");
    });

    expect(getApi().reviewTargetMode).toBe("reviewed-ticket");
  });
});
