// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AppView } from "../components/Sidebar";
import { useWelcomeFlow } from "./useWelcomeFlow";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type WelcomeFlowApi = ReturnType<typeof useWelcomeFlow>;

let container: HTMLDivElement;
let root: Root;
let api: WelcomeFlowApi | undefined;
let view: AppView;

interface HarnessProps {
  isDemo?: boolean;
  isBooting?: boolean;
  isConfigured?: boolean;
  initialView?: AppView;
}

function Harness({
  isDemo = false,
  isBooting = false,
  isConfigured = false,
  initialView = "settings"
}: HarnessProps) {
  const [viewState, setView] = useState<AppView>(initialView);

  api = useWelcomeFlow({
    isDemo,
    isBooting,
    isConfigured,
    setView
  });
  view = viewState;

  return null;
}

const getApi = () => {
  if (!api) {
    throw new Error("Welcome flow hook was not rendered.");
  }
  return api;
};

const renderHarness = (props: HarnessProps = {}) => {
  act(() => {
    root.render(<Harness {...props} />);
  });
};

beforeEach(() => {
  api = undefined;
  view = "week";
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("useWelcomeFlow", () => {
  it("shows welcome only after non-demo bootstrap when Jira is missing", () => {
    renderHarness({ isConfigured: false });

    expect(getApi().isWelcomeVisible).toBe(true);

    renderHarness({ isBooting: true, isConfigured: false });

    expect(getApi().isWelcomeVisible).toBe(false);

    renderHarness({ isDemo: true, isConfigured: false });

    expect(getApi().isWelcomeVisible).toBe(false);
  });

  it("keeps configured users in the app unless the welcome connect success screen is active", () => {
    renderHarness({ isConfigured: true });

    expect(getApi().isWelcomeVisible).toBe(false);

    act(() => getApi().setWelcomeConnected(true));

    expect(getApi().welcomeConnected).toBe(true);
    expect(getApi().isWelcomeVisible).toBe(true);
  });

  it("enters the app by clearing welcome success state and returning to the week view", () => {
    renderHarness({ isConfigured: true, initialView: "settings" });

    act(() => getApi().setWelcomeConnected(true));

    expect(getApi().isWelcomeVisible).toBe(true);
    expect(view).toBe("settings");

    act(() => getApi().enterApp());

    expect(getApi().welcomeConnected).toBe(false);
    expect(getApi().isWelcomeVisible).toBe(false);
    expect(view).toBe("week");
  });
});
