// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AppSettings } from "../../shared/types";
import { DEFAULT_SETTINGS } from "../domain/week";
import { useAppConnectionState } from "./useAppConnectionState";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type AppConnectionStateApi = ReturnType<typeof useAppConnectionState>;

const connectedSettings: AppSettings = {
  ...DEFAULT_SETTINGS,
  jiraBaseUrl: "https://example.atlassian.net",
  jiraEmail: "person@example.com",
  jiraApiToken: "token",
  bitbucketEmail: "person@example.com",
  bitbucketApiToken: "bb-token",
  bitbucketWorkspace: "timebro",
  bitbucketRepositories: "web, core"
};

let container: HTMLDivElement;
let root: Root;
let api: AppConnectionStateApi | undefined;

function Harness({ settings }: { settings: AppSettings }) {
  api = useAppConnectionState(settings);
  return null;
}

const getApi = () => {
  if (!api) {
    throw new Error("App connection state hook was not rendered.");
  }
  return api;
};

const renderHarness = (settings: AppSettings) => {
  act(() => {
    root.render(<Harness settings={settings} />);
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

describe("useAppConnectionState", () => {
  it("starts disconnected when app settings are empty", () => {
    renderHarness(DEFAULT_SETTINGS);

    expect(getApi()).toEqual({
      isConfigured: false,
      isBitbucketReady: false
    });
  });

  it("tracks Jira and Bitbucket readiness from settings", () => {
    renderHarness({
      ...connectedSettings,
      jiraApiToken: "",
      bitbucketRepositories: ""
    });

    expect(getApi()).toEqual({
      isConfigured: false,
      isBitbucketReady: false
    });

    renderHarness(connectedSettings);

    expect(getApi()).toEqual({
      isConfigured: true,
      isBitbucketReady: true
    });
  });
});
