// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppSettings, JiraConnectionResult } from "../../shared/types";
import { AppWelcomeScreen } from "./AppWelcomeScreen";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("../components/WelcomeView", () => ({
  WelcomeView: ({
    initialSettings,
    isConnected,
    connectedSettings,
    onConnect,
    onEnterApp
  }: {
    initialSettings: AppSettings;
    isConnected: boolean;
    connectedSettings: AppSettings;
    onConnect: (payload: Pick<AppSettings, "jiraBaseUrl" | "jiraEmail" | "jiraApiToken">) => Promise<unknown>;
    onEnterApp: () => void;
  }) => (
    <section data-testid="welcome-view" data-connected={String(isConnected)}>
      <span>{initialSettings.jiraEmail}</span>
      <span>{connectedSettings.jiraBaseUrl}</span>
      <button
        type="button"
        onClick={() =>
          void onConnect({
            jiraBaseUrl: initialSettings.jiraBaseUrl,
            jiraEmail: initialSettings.jiraEmail,
            jiraApiToken: initialSettings.jiraApiToken
          })
        }
      >
        connect
      </button>
      <button type="button" onClick={onEnterApp}>
        enter
      </button>
    </section>
  )
}));

vi.mock("../components/SnackbarStack", () => ({
  SnackbarStack: ({
    notifications,
    onDismiss
  }: {
    notifications: Array<{ id: number; message: string }>;
    onDismiss: (id: number) => void;
  }) => (
    <section data-testid="snackbar-stack">
      <span>{notifications.length}</span>
      {notifications[0] && (
        <button type="button" onClick={() => onDismiss(notifications[0].id)}>
          dismiss
        </button>
      )}
    </section>
  )
}));

const settings: AppSettings = {
  jiraBaseUrl: "https://example.atlassian.net",
  jiraEmail: "person@example.com",
  jiraApiToken: "token",
  bitbucketEmail: "",
  bitbucketApiToken: "",
  bitbucketWorkspace: "",
  bitbucketRepositories: "",
  bitbucketReviewBucketIssueKey: "",
  weeklyTargetHours: 40,
  workingDays: [1, 2, 3, 4, 5],
  reminderTime: "16:30",
  remindersEnabled: true
};

let container: HTMLDivElement;
let root: Root;

const renderScreen = ({
  onConnect = vi.fn(async () => ({ ok: true, message: "Connected" })),
  onEnterApp = vi.fn(),
  onDismissNotification = vi.fn()
}: {
  onConnect?: (payload: Pick<AppSettings, "jiraBaseUrl" | "jiraEmail" | "jiraApiToken">) => Promise<JiraConnectionResult>;
  onEnterApp?: () => void;
  onDismissNotification?: (id: number) => void;
} = {}) => {
  act(() => {
    root.render(
      <AppWelcomeScreen
        theme="dark"
        initialSettings={settings}
        isConnected
        connectedSettings={settings}
        onConnect={onConnect}
        onEnterApp={onEnterApp}
        notifications={[{ id: 9, kind: "info", message: "Welcome" }]}
        onDismissNotification={onDismissNotification}
      />
    );
  });

  return { onConnect, onEnterApp, onDismissNotification };
};

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("AppWelcomeScreen", () => {
  it("renders the welcome shell with theme, view, and notifications", () => {
    renderScreen();

    const shell = container.querySelector<HTMLElement>(".app-shell");

    expect(shell?.dataset.theme).toBe("dark");
    expect(shell?.dataset.view).toBe("welcome");
    expect(container.querySelector("[data-testid='welcome-view']")?.getAttribute("data-connected")).toBe("true");
    expect(container.querySelector("[data-testid='snackbar-stack']")?.textContent).toContain("1");
  });

  it("wires welcome connect, enter, and snackbar dismiss actions", () => {
    const actions = renderScreen();
    const buttons = container.querySelectorAll("button");

    act(() => {
      buttons[0]?.click();
      buttons[1]?.click();
      buttons[2]?.click();
    });

    expect(actions.onConnect).toHaveBeenCalledWith({
      jiraBaseUrl: settings.jiraBaseUrl,
      jiraEmail: settings.jiraEmail,
      jiraApiToken: settings.jiraApiToken
    });
    expect(actions.onEnterApp).toHaveBeenCalledTimes(1);
    expect(actions.onDismissNotification).toHaveBeenCalledWith(9);
  });
});
