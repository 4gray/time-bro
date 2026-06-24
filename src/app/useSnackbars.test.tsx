// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSnackbars } from "./useSnackbars";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type SnackbarsApi = ReturnType<typeof useSnackbars>;

let container: HTMLDivElement;
let root: Root;
let api: SnackbarsApi | undefined;

function Harness({ maxSnackbars }: { maxSnackbars?: number }) {
  api = useSnackbars(maxSnackbars);
  return null;
}

const getApi = () => {
  if (!api) {
    throw new Error("Snackbar hook was not rendered.");
  }
  return api;
};

const renderHarness = (maxSnackbars?: number) => {
  act(() => {
    root.render(<Harness maxSnackbars={maxSnackbars} />);
  });
};

beforeEach(() => {
  api = undefined;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  renderHarness();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("useSnackbars", () => {
  it("trims messages and ignores empty notifications", () => {
    act(() => {
      getApi().showInfo("   ");
      getApi().showSuccess("  Saved locally  ");
    });

    expect(getApi().snackbars).toMatchObject([{ id: 1, kind: "success", message: "Saved locally" }]);
  });

  it("keeps only the newest notifications when the queue reaches the limit", () => {
    act(() => {
      getApi().showInfo("One");
      getApi().showInfo("Two");
      getApi().showInfo("Three");
      getApi().showInfo("Four");
      getApi().showInfo("Five");
    });

    expect(getApi().snackbars.map((notification) => notification.id)).toEqual([2, 3, 4, 5]);
    expect(getApi().snackbars.map((notification) => notification.message)).toEqual(["Two", "Three", "Four", "Five"]);
  });

  it("supports a custom queue limit", () => {
    renderHarness(2);

    act(() => {
      getApi().showError("First");
      getApi().showError("Second");
      getApi().showError("Third");
    });

    expect(getApi().snackbars.map((notification) => notification.message)).toEqual(["Second", "Third"]);
  });

  it("dismisses notifications by id", () => {
    act(() => {
      getApi().showSuccess("Saved");
      getApi().showError("Failed");
    });

    const firstId = getApi().snackbars[0].id;
    act(() => {
      getApi().dismissSnackbar(firstId);
    });

    expect(getApi().snackbars).toMatchObject([{ id: 2, kind: "error", message: "Failed" }]);
  });

  it("preserves explicit snackbar actions and dismiss behavior options", () => {
    const onAction = vi.fn();

    act(() => {
      getApi().showSnackbar("info", "Update available", {
        actions: [{ label: "Download", icon: "download", onAction }],
        autoDismiss: false
      });
    });

    expect(getApi().snackbars[0]).toMatchObject({
      id: 1,
      kind: "info",
      message: "Update available",
      autoDismiss: false,
      actions: [{ label: "Download", icon: "download" }]
    });
    getApi().snackbars[0].actions?.[0].onAction();
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
